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
  try {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
  const kitKey = ctx.env.KIT_KEY
  const body = await ctx.request.json()
  const { action, userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn } = body

  const fromAddr = TOKEN_ADDR[tokenIn]
  const toAddr   = TOKEN_ADDR[tokenOut]

  if (action === 'estimate') {
    if (!kitKey) return new Response(JSON.stringify({ error: 'KIT_KEY not configured' }), { status: 500, headers: JSON_HEADERS })
    if (!fromAddr || !toAddr) return new Response(JSON.stringify({ error: 'unknown token' }), { status: 400, headers: JSON_HEADERS })
    try {
      const params = new URLSearchParams({
        tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
        tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
        fromAddress: walletAddress || '0x0000000000000000000000000000000000000001',
        amount: String(amountIn), slippageBps: '300',
      })
      const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/quote?${params}`, {
        headers: { 'Authorization': `Bearer ${kitKey}` },
      })
      const data = await res.json()
      if (!res.ok) return new Response(JSON.stringify({ error: `Circle API ${res.status}`, detail: data }), { status: 500, headers: JSON_HEADERS })
      return new Response(JSON.stringify({ estimate: data?.data || data }), { headers: JSON_HEADERS })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: JSON_HEADERS })
    }
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
        tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
        tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
        fromAddress: walletAddress, toAddress: walletAddress,
        amount: String(amountIn), slippageBps: 300,
      }),
    })
    const swapData = await swapRes.json()
    // API trả instructions[] (multi-step: approve + swap)
    const instructions = swapData?.transaction?.executionParams?.instructions
      || swapData?.data?.transaction?.executionParams?.instructions
    if (!instructions?.length) {
      return new Response(JSON.stringify({ error: 'no instructions', detail: swapData }), { status: 500, headers: JSON_HEADERS })
    }
    // Tạo challenge cho từng instruction (approve + swap), trả về mảng challengeIds
    const w3sHeaders = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken }
    const challengeIds = []
    for (const instr of instructions) {
      const txRes = await fetch(`${W3S_API}/user/transactions/contractExecution`, {
        method: 'POST', headers: w3sHeaders,
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          walletId,
          contractAddress: instr.target,
          callData: instr.data,
          fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
        }),
      })
      const txData = await txRes.json()
      const cid = txData?.data?.challengeId
      if (!cid) return new Response(JSON.stringify({ error: 'no challengeId', detail: txData, instruction: instr.target }), { status: 500, headers: JSON_HEADERS })
      challengeIds.push(cid)
    }
    return new Response(JSON.stringify({ challengeIds }), { headers: JSON_HEADERS })
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: JSON_HEADERS })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unhandled', message: e.message, stack: e.stack?.slice(0, 300) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
