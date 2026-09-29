// The network for this request: env.NETWORK ("testnet" | "mainnet"), resolved through src/network.js.
// No default - an unset/unknown value throws, and every endpoint turns that into a 503 (fail closed).
import { getNetwork } from '../../src/network.js'

export function netFrom(ctx) {
  return getNetwork(ctx.env.NETWORK)
}

export const JSON_HEADERS_BASE = { 'Content-Type': 'application/json' }

export const netError = (e) =>
  new Response(JSON.stringify({ error: `Network misconfigured: ${e.message}` }), { status: 503, headers: JSON_HEADERS_BASE })
