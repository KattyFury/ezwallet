// Swap qua Circle Stablecoin Kit REST — endpoint Cloudflare Pages Function.
// Lõi encode/verify ở ./_swapCore.js (dùng chung với dev-server.js). Xem file đó cho CÁCH ĐÚNG
// gọi ADAPTER contract (không bóc instructions chạy tay — cách cũ đã MẤT TIỀN).
// Actions: estimate (quote), simulate (verify eth_simulateV1, không PIN/không tốn tiền),
// execute (tạo contractExecution challenge → user ký 1 PIN).
import {
  CIRCLE_API, TOKEN_ADDR, MULTICALL3FROM, toBase, fromBase,
  fetchSwapIntent, buildSwapBatch, simulateSwap,
} from './_swapCore.js'

const W3S_API = 'https://api.circle.com/v1/w3s'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const err = (msg, detail, status = 500) =>
  new Response(JSON.stringify({ error: msg, detail }), { status, headers: JSON_HEADERS })

export async function onRequestPost(ctx) {
  try {
    const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
    const kitKey = ctx.env.KIT_KEY
    const body = await ctx.request.json()
    const { action, userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn } = body

    const fromAddr = TOKEN_ADDR[tokenIn]
    const toAddr   = TOKEN_ADDR[tokenOut]

    if (action === 'estimate') {
      if (!kitKey) return err('KIT_KEY not configured')
      if (!fromAddr || !toAddr) return err('unknown token', null, 400)
      const params = new URLSearchParams({
        tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
        tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
        fromAddress: walletAddress || '0x0000000000000000000000000000000000000001',
        amount: toBase(amountIn, tokenIn).toString(), slippageBps: '300',
      })
      const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/quote?${params}`, {
        headers: { 'Authorization': `Bearer ${kitKey}` },
      })
      const data = await res.json()
      if (!res.ok) return err(data?.message || `Circle API ${res.status}`, data)
      const q = data?.data?.quote || data?.quote || data?.data || data
      const amountOut = q?.estimatedAmount ? fromBase(q.estimatedAmount, tokenOut) : null
      return new Response(JSON.stringify({ estimate: data?.data || data, amountOut }), { headers: JSON_HEADERS })
    }

    // Cổng verify: chỉ bật swap khi số dư tokenOut của ví TĂNG (HANDOFF: đừng tin tx status=1).
    if (action === 'simulate') {
      if (!kitKey) return err('KIT_KEY not configured')
      const out = await simulateSwap({ kitKey, tokenIn, tokenOut, walletAddress, amountIn })
      if (out.error) return err(out.error, out.detail, 400)
      return new Response(JSON.stringify(out), { headers: JSON_HEADERS })
    }

    if (action === 'execute') {
      if (!userToken || !walletId || !walletAddress || !fromAddr || !toAddr) {
        return err('missing params', null, 400)
      }
      const amountBase = toBase(amountIn, tokenIn)
      const intent = await fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase)
      if (!intent.ok) return err(`Stablecoin Kit ${intent.status}: ${intent.data?.message || 'swap failed'}`, intent.data)
      const built = buildSwapBatch(intent.data, fromAddr, amountBase)
      if (built.error) return err(built.error, built.swapData)

      const txRes = await fetch(`${W3S_API}/user/transactions/contractExecution`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          walletId, contractAddress: MULTICALL3FROM, callData: built.batchData,
          feeLevel: 'MEDIUM',
        }),
      })
      const txData = await txRes.json()
      const challengeId = txData?.data?.challengeId
      if (!challengeId) {
        console.error('[swap] contractExecution không trả challengeId:', txRes.status, JSON.stringify(txData))
        const msg = `${txData?.message || txData?.error?.message || 'no challengeId'} (HTTP ${txRes.status}${txData?.code ? `, code ${txData.code}` : ''})`
        return err(msg, txData)
      }
      const amountOut = built.estOut ? fromBase(built.estOut, tokenOut) : null
      return new Response(JSON.stringify({ challengeId, batched: true, amountOut }), { headers: JSON_HEADERS })
    }

    return err('unknown action', null, 400)
  } catch (e) {
    return err('unhandled', { message: e.message, stack: e.stack?.slice(0, 300) })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
