import { netFrom, netError } from './_net.js'
import { toBaseUnits, isValidAddress } from '../../src/money.js'

const CIRCLE_API = 'https://api.circle.com/v1/w3s'

// ERC-20 transfer ABI function signature
const TRANSFER_SIG = 'transfer(address,uint256)'

// Arc Transaction Memos - the predeployed Memo contract (address per network in src/network.js)
// memo(address target, bytes data, bytes32 memoId, bytes memoData) → forward call through
// the CallFrom precompile (preserving msg.sender) + emitting a Memo event on chain.
const MEMO_SIG = 'memo(address,bytes,bytes32,bytes)'

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

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function onRequestPost(ctx) {
  let net
  try { net = netFrom(ctx) } catch (e) { return netError(e) }
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
  const { action, userToken, walletId, toAddress, token, amountDecimal, memo, idempotencyKey, refId } = await ctx.request.json()
  const isFee = action === 'fee'
  // A fixed idempotencyKey from the client → Circle dedupes, so a repeated call does not create 2 transactions
  const idemKey = idempotencyKey || crypto.randomUUID()

  // refId = the client's confirmation id (a UUID). Circle stores it on the transaction, so after the PIN the client
  // can find THIS transaction and learn its real state - the basis of "no double send" (MAINNET-AUDIT C3/C4).
  if (!isFee && (!refId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refId))) {
    return new Response(JSON.stringify({ error: 'refId (uuid) required' }), { status: 400, headers: JSON_HEADERS })
  }
  if (!userToken || !walletId || !toAddress || !token || !amountDecimal) {
    return new Response(JSON.stringify({ error: 'missing params' }), { status: 400, headers: JSON_HEADERS })
  }

  const tokenInfo = net.tokens[token]   // a token this network does not list → rejected below
  if (!tokenInfo) return new Response(JSON.stringify({ error: 'unknown token' }), { status: 400, headers: JSON_HEADERS })

  // MAINNET-AUDIT H1/H6: validate, never round. The memo path hand-encodes calldata, so a malformed address
  // must never reach encodeTransfer (padStart would silently turn it into a DIFFERENT address).
  if (!isValidAddress(toAddress)) {
    return new Response(JSON.stringify({ error: 'invalid recipient address' }), { status: 400, headers: JSON_HEADERS })
  }
  let amountRaw
  try { amountRaw = toBaseUnits(amountDecimal, tokenInfo.decimals).toString() }
  catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: JSON_HEADERS }) }

  const memoText = (memo || '').trim()
  let execBody
  if (memoText) {
    // With a note → send through the Memo contract (Arc Transaction Memos)
    const transferData = encodeTransfer(toAddress, amountRaw)
    execBody = {
      idempotencyKey: idemKey,
      walletId,
      contractAddress: net.contracts.memo,
      abiFunctionSignature: MEMO_SIG,
      abiParameters: [tokenInfo.address, transferData, randomMemoId(), utf8ToHex(memoText)],
      feeLevel: 'MEDIUM',
      refId,
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
      refId,
    }
  }

  // 'fee' = THE NETWORK FEE OF THIS EXACT SEND (owner 2026-10-04: no guessed numbers). Same contract call as below,
  // asked to Circle POST /v1/w3s/transactions/contractExecution/estimateFee (user-controlled-wallets OpenAPI) - no
  // challenge, no PIN. feeMax = medium.networkFee (gasLimit × maxFee, "the maximum … you will pay"), feeNow =
  // networkFeeRaw. Measured 2026-10-04 on the owner's wallet: 0.1 USDC 0.0031 / with a note 0.0043 / EURC 0.0041.
  if (isFee) {
    const { idempotencyKey: _i, refId: _r, feeLevel: _f, ...call } = execBody
    const est = await circleReq('POST', '/transactions/contractExecution/estimateFee', call, apiKey, userToken)
    const m = est?.data?.medium   // the send itself uses feeLevel MEDIUM
    if (!m?.networkFee) {
      console.error('[send fee] estimateFee failed:', JSON.stringify(est))
      return new Response(JSON.stringify({ error: est?.message || 'could not estimate the fee', code: est?.code }), { status: 502, headers: JSON_HEADERS })
    }
    return new Response(JSON.stringify({ feeMax: m.networkFee, feeNow: m.networkFeeRaw || null }), { headers: JSON_HEADERS })
  }

  const txResp = await circleReq('POST', '/user/transactions/contractExecution', execBody, apiKey, userToken)

  const challengeId = txResp?.data?.challengeId
  if (!challengeId) {
    // A missing challengeId in txResp.data means Circle rejected the request (balance, parameters, rate limit...).
    // Log the full response for investigation, and return Circle's real message instead of a vague "no challengeId".
    console.error('[send] contractExecution returned no challengeId:', JSON.stringify(txResp))
    const msg = txResp?.message || txResp?.error?.message || (txResp?.code ? `Circle error ${txResp.code}` : 'no challengeId')
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
}

