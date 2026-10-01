// GET /api/health → { network, chainId }
// Tells the client which network this server runs; the client refuses to send or swap when it differs from its own
// build-time network (MAINNET-AUDIT.md C2). The chain check itself (chainId + contract code at every configured
// address, src/network.js checkNetwork) now runs IN THE BROWSER (src/clientNet.js), not here: measured 2026-10-01,
// the public Arc RPC (itself behind Cloudflare) rate-limits subrequests from Cloudflare Functions - eth_chainId
// passed, the next eth_getCode got "rate limit exceeded" 5/5 times on mainnet, 2/3 on testnet - while the same calls
// from a home PC passed 30/30. Cloudflare labels every Function subrequest (CF-Worker header) so the receiving site
// can filter it (developers.cloudflare.com/fundamentals/reference/http-headers). docs.arc.io/arc/references/rpc-endpoints:
// the primary endpoint "accepts anonymous requests with open CORS", so the browser can call it directly.
import { netFrom, netError, JSON_HEADERS_BASE } from './_net.js'

export async function onRequestGet(ctx) {
  let net
  try { net = netFrom(ctx) } catch (e) { return netError(e) }
  return new Response(JSON.stringify({ network: net.key, chainId: net.chainId }), {
    headers: { ...JSON_HEADERS_BASE, 'Cache-Control': 'no-store' },
  })
}
