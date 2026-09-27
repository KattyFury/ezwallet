// GET /api/health → { network, chainId, ok, problems[] }
// The client calls this once at start-up and refuses to send or swap when `ok` is false or when `network`
// differs from its own build-time network (MAINNET-AUDIT.md C2). The check itself (chainId + contract code at
// every configured address) lives in src/network.js so it is identical for every caller.
import { checkNetwork } from '../../src/network.js'
import { netFrom, netError, JSON_CORS } from './_net.js'

export async function onRequestGet(ctx) {
  let net
  try { net = netFrom(ctx) } catch (e) { return netError(e) }
  const { ok, problems } = await checkNetwork(net)
  return new Response(JSON.stringify({ network: net.key, chainId: net.chainId, ok, problems }), {
    headers: { ...JSON_CORS, 'Cache-Control': 'no-store' },
  })
}
