// ══════════════════════════════════════════════════════════════════════════════
// CIRCLE - what is LEFT of it after the move to Privy (2026-08-30, MIGRATION-PRIVY.md).
//
// This file used to be ~330 lines and was the spine of the app: it built the W3S SDK, minted and
// refreshed a userToken that died every 60 minutes, traded refreshTokens for Google users, opened
// PIN challenges, and translated two dozen Circle error codes into sentences. All of that was
// Circle-the-WALLET, and all of it is gone - Privy keeps its own session and signs in the browser
// (see src/privy.js).
//
// What remains is Circle-the-ROUTING-PRODUCT, which the migration never touched and had no reason
// to: the Stablecoin Kit is how a swap finds its route, it does not care which wallet signs the
// result, and its KIT_KEY is a secret that stays in the Worker behind /api/swap. So the file keeps
// its name because the name is still true - this really is Circle, just not the wallet part.
// ══════════════════════════════════════════════════════════════════════════════
import { MOCK, MOCK_RATES } from './mock'

// MOCK: estimate the conversion from MOCK_RATES (USD per unit): amountOut = amountIn·rateIn/rateOut
function mockSwapOut(tokenIn, tokenOut, amountIn) {
  const rIn = MOCK_RATES[tokenIn] ?? 1, rOut = MOCK_RATES[tokenOut] ?? 1
  return String((Number(amountIn) * rIn / rOut).toFixed(6))
}

export async function estimateSwap({ walletAddress, tokenIn, tokenOut, amountIn }) {
  if (MOCK) return { amountOut: mockSwapOut(tokenIn, tokenOut, amountIn) }
  const res = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'estimate', walletAddress, tokenIn, tokenOut, amountIn }),
  })
  return res.json()
}

// ⚠️ THIS PREPARES A SWAP, IT NO LONGER EXECUTES ONE (2026-08-30). It returns { to, data, value,
// amountOut } - the calldata for the [approve, adapter.execute] batch - and the CALLER signs and
// sends it through Privy. It used to return a challengeId for Circle's PIN iframe, and it no longer
// needs a userToken or a walletId because there is no Circle session involved in signing.
export async function executeSwap({ walletAddress, tokenIn, tokenOut, amountIn }) {
  if (MOCK) return { to: '0x0', data: '0x', value: '0x0', amountOut: mockSwapOut(tokenIn, tokenOut, amountIn) }
  const res = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'execute', walletAddress, tokenIn, tokenOut, amountIn }),
  })
  return res.json()
}
