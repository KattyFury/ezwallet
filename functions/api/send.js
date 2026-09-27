const CIRCLE_API = 'https://api.circle.com/v1/w3s'

// ERC-20 transfer ABI function signature
const TRANSFER_SIG = 'transfer(address,uint256)'

// Arc Transaction Memos - the predeployed Memo contract (testnet, from docs.arc.io)
// memo(address target, bytes data, bytes32 memoId, bytes memoData) → forward call qua
// The CallFrom precompile (preserving msg.sender) + emitting a Memo event on chain.
const MEMO_CONTRACT = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505'
const MEMO_SIG = 'memo(address,bytes,bytes32,bytes)'

// Token contract addresses on Arc Testnet
const TOKEN_CONTRACTS = {
  USDC:   { address: '0x3600000000000000000000000000000000000000', decimals: 6 },
  EURC:   { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6 },
  cirBTC: { address: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf', decimals: 8 },
}

// Encode the ERC-20 transfer(address,uint256) calldata by hand (selector + 2 32-byte words)
function encodeTransfer(to, amountRaw) {
  const selector = 'a9059cbb'
  const addr = to.toLowerCase().replace(/^0x/, '').padStart(64, '0')
  const amt = BigInt(amountRaw).toString(16).padStart(64, '0')
  return '0x' + selector + addr + amt
}

function utf8ToHex(str) {
  const bytes = new TextEncoder().encode(str)
  return '0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

// memoId: a random bytes32 so the Memo event can be looked up later
function randomMemoId() {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return '0x' + [...b].map(x => x.toString(16).padStart(2, '0')).join('')
}

async function circleReq(method, path, body, apiKey, userToken) {
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  if (userToken) headers['X-User-Token'] = userToken
  const res = await fetch(`${CIRCLE_API}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
  const { userToken, walletId, toAddress, token, amountDecimal, memo, idempotencyKey } = await ctx.request.json()
  // A fixed idempotencyKey from the client → Circle dedupes, so a repeated call does not create 2 transactions
  const idemKey = idempotencyKey || crypto.randomUUID()

  if (!userToken || !walletId || !toAddress || !token || !amountDecimal) {
    return new Response(JSON.stringify({ error: 'missing params' }), { status: 400, headers: JSON_HEADERS })
  }

  const tokenInfo = TOKEN_CONTRACTS[token]
  if (!tokenInfo) return new Response(JSON.stringify({ error: 'unknown token' }), { status: 400, headers: JSON_HEADERS })

  // Convert decimal amount to smallest unit (uint256)
  const amountRaw = BigInt(Math.round(parseFloat(amountDecimal) * Math.pow(10, tokenInfo.decimals))).toString()

  const memoText = (memo || '').trim()
  let execBody
  if (memoText) {
    // With a note → send through the Memo contract (Arc Transaction Memos)
    const transferData = encodeTransfer(toAddress, amountRaw)
    execBody = {
      idempotencyKey: idemKey,
      walletId,
      contractAddress: MEMO_CONTRACT,
      abiFunctionSignature: MEMO_SIG,
      abiParameters: [tokenInfo.address, transferData, randomMemoId(), utf8ToHex(memoText)],
      feeLevel: 'MEDIUM',
    }
  } else {
    // Without a note → a direct transfer (the path already verified on chain)
    execBody = {
      idempotencyKey: idemKey,
      walletId,
      contractAddress: tokenInfo.address,
      abiFunctionSignature: TRANSFER_SIG,
      abiParameters: [toAddress, amountRaw],
      feeLevel: 'MEDIUM',
    }
  }

  const txResp = await circleReq('POST', '/user/transactions/contractExecution', execBody, apiKey, userToken)

  const challengeId = txResp?.data?.challengeId
  if (!challengeId) {
    // A missing challengeId in txResp.data means Circle rejected the request (balance, parameters, rate limit...).
    // Log the full response for investigation, and return Circle's real message instead of a vague "no challengeId".
    console.error('[send] contractExecution returned no challengeId:', JSON.stringify(txResp))
    const msg = txResp?.message || txResp?.error?.message || (txResp?.code ? `Circle error ${txResp.code}` : 'no challengeId')
    return new Response(JSON.stringify({ error: msg, detail: txResp }), { status: 500, headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
