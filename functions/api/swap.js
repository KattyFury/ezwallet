// KIT_KEY ở server-side, gọi Circle Stablecoin Kit API
// App Kit SDK = wrapper của các API này, gọi thẳng = cùng kết quả
const CIRCLE_API = 'https://api.circle.com'
const W3S_API   = 'https://api.circle.com/v1/w3s'

const TOKEN_ADDR = {
  USDC:   '0x3600000000000000000000000000000000000000',
  EURC:   '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf',
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
  const kitKey = ctx.env.KIT_KEY
  const { action, userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn } = await ctx.request.json()

  const fromAddr = TOKEN_ADDR[tokenIn]
  const toAddr   = TOKEN_ADDR[tokenOut]

  if (action === 'estimate') {
    if (!kitKey) return new Response(JSON.stringify({ error: 'KIT_KEY not configured' }), { status: 500, headers: JSON_HEADERS })
    if (!fromAddr || !toAddr) return new Response(JSON.stringify({ error: 'unknown token' }), { status: 400, headers: JSON_HEADERS })
    const params = new URLSearchParams({
      tokenInAddress: fromAddr, tokenInChain: 'ARC-TESTNET',
      tokenOutAddress: toAddr,  tokenOutChain: 'ARC-TESTNET',
      fromAddress: walletAddress || '0x0000000000000000000000000000000000000001',
      amount: String(amountIn), slippageBps: '300',
    })
    const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/quote?${params}`, {
      headers: { 'Authorization': `Bearer ${kitKey}` },
    })
    const data = await res.json()
    return new Response(JSON.stringify({ estimate: data?.data || data }), { headers: JSON_HEADERS })
  }

  if (action === 'execute') {
    if (!userToken || !walletId || !walletAddress || !fromAddr || !toAddr) {
      return new Response(JSON.stringify({ error: 'missing params' }), { status: 400, headers: JSON_HEADERS })
    }
    // Bước 1: lấy swap transaction từ Circle Stablecoin Kit
    const swapRes = await fetch(`${CIRCLE_API}/v1/stablecoinKits/swap`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kitKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenInAddress: fromAddr, tokenInChain: 'ARC-TESTNET',
        tokenOutAddress: toAddr,  tokenOutChain: 'ARC-TESTNET',
        fromAddress: walletAddress, toAddress: walletAddress,
        amount: String(amountIn), slippageBps: 300,
      }),
    })
    const swapData = await swapRes.json()
    const tx = swapData?.data?.transaction
    if (!tx?.target || !tx?.callData) {
      return new Response(JSON.stringify({ error: 'no tx data', detail: swapData }), { status: 500, headers: JSON_HEADERS })
    }
    // Bước 2: tạo Circle user challenge từ calldata
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken }
    const txRes = await fetch(`${W3S_API}/user/transactions/contractExecution`, {
      method: 'POST', headers,
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        walletId, contractAddress: tx.target, callData: tx.callData,
        fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      }),
    })
    const txData = await txRes.json()
    const challengeId = txData?.data?.challengeId
    if (!challengeId) return new Response(JSON.stringify({ error: 'no challengeId', detail: txData }), { status: 500, headers: JSON_HEADERS })
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: JSON_HEADERS })
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
