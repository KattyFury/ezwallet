// Swap qua Circle Stablecoin Kit REST — endpoint Cloudflare Pages Function.
// The encode/verify core lives in ./_swapCore.js (shared with dev-server.js). See that file for THE CORRECT WAY
// to call the ADAPTER contract (do not unpack the instructions and run them by hand - the old way LOST MONEY).
// Actions: estimate (a quote), simulate (verify with eth_simulateV1, no PIN and no cost),
// execute (create a contractExecution challenge → the user signs with one PIN).
import {
  CIRCLE_API, TOKEN_ADDR, MULTICALL3FROM, toBase, fromBase,
  fetchSwapIntent, buildSwapBatch, simulateSwap,
} from './_swapCore.js'

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const err = (msg, detail, status = 500) =>
  new Response(JSON.stringify({ error: msg, detail }), { status, headers: JSON_HEADERS })

export async function onRequestPost(ctx) {
  try {
    // API_KEY (the Circle W3S key) is no longer needed here: nothing in this file talks to W3S any
    // more. KIT_KEY, for the Stablecoin Kit, is the only secret this endpoint still uses.
    const kitKey = ctx.env.KIT_KEY
    const body = await ctx.request.json()
    const { action, walletAddress, tokenIn, tokenOut, amountIn } = body

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

    // The verify gate: only allow a swap when the wallet's tokenOut balance RISES (HANDOFF: never trust tx status=1).
    if (action === 'simulate') {
      if (!kitKey) return err('KIT_KEY not configured')
      const out = await simulateSwap({ kitKey, tokenIn, tokenOut, walletAddress, amountIn })
      if (out.error) return err(out.error, out.detail, 400)
      return new Response(JSON.stringify(out), { headers: JSON_HEADERS })
    }

    // ⚠️ THIS NO LONGER EXECUTES ANYTHING - it PREPARES (2026-08-30, the move to Privy).
    // It used to hand the batch to Circle's contractExecution and return a challengeId for the PIN
    // iframe to sign. Privy signs in the browser, so the endpoint now returns the calldata and
    // Swap.jsx sends it. What did NOT change is the part that has to be here: fetching the swap
    // intent from the Stablecoin Kit needs KIT_KEY, which is a secret and stays server-side.
    // (The Circle API_KEY is no longer read by this action at all - only KIT_KEY is.)
    if (action === 'execute') {
      if (!kitKey) return err('KIT_KEY not configured')
      if (!walletAddress || !fromAddr || !toAddr) return err('missing params', null, 400)
      const amountBase = toBase(amountIn, tokenIn)
      const intent = await fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase)
      if (!intent.ok) return err(`Stablecoin Kit ${intent.status}: ${intent.data?.message || 'swap failed'}`, intent.data)
      const built = buildSwapBatch(intent.data, fromAddr, amountBase)
      if (built.error) return err(built.error, built.swapData)

      const amountOut = built.estOut ? fromBase(built.estOut, tokenOut) : null
      return new Response(JSON.stringify({
        to: MULTICALL3FROM,
        data: built.batchData,
        // BigInt does not survive JSON.stringify, so it goes as a hex string. For same-chain ERC20
        // swaps it is always 0 (see buildSwapBatch), but it is passed through rather than assumed.
        value: '0x' + built.totalValue.toString(16),
        batched: true,
        amountOut,
      }), { headers: JSON_HEADERS })
    }

    return err('unknown action', null, 400)
  } catch (e) {
    return err('unhandled', { message: e.message, stack: e.stack?.slice(0, 300) })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
