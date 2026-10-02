// GET /api/health?net= - is each part of the system answering? (admin/SPEC.md §5.3)
import { json, netParam, SITE, circleGet, rpc } from './_lib.js'

async function check(fn) {
  try { return await fn() } catch (e) { return { ok: false, error: e.message } }
}

export async function onRequestGet(ctx) {
  let net
  try { net = netParam(new URL(ctx.request.url).searchParams.get('net')) } catch (e) { return json({ error: e.message }, 400) }
  const env = ctx.env

  const [site, circle, chain, mail] = await Promise.all([
    // The app answers and runs the expected network. (Its chain/contract self-check now runs in the user's
    // browser - the public RPC rate-limits Cloudflare Functions, see functions/api/health.js of the app.)
    check(async () => {
      const res = await fetch(`${SITE[net.target]}/api/health`, { headers: { Accept: 'application/json' } })
      let h
      try { h = JSON.parse(await res.text()) } catch { return { ok: false, error: `${SITE[net.target]} does not run a build with /api/health (HTTP ${res.status})` } }
      if (h.network !== net.key) return { ok: false, error: `${SITE[net.target]} runs "${h.network}", expected "${net.key}"`, detail: h }
      return { ok: true, detail: h }
    }),
    check(async () => {
      const { status } = await circleGet(env, net, '/config/entity')
      return { ok: status === 200, error: status === 200 ? undefined : `HTTP ${status}` }
    }),
    // Chain: right chainId and a recent block.
    check(async () => {
      const [chainId, block] = await Promise.all([rpc(net, 'eth_chainId'), rpc(net, 'eth_getBlockByNumber', ['latest', false])])
      const ageSec = Math.round(Date.now() / 1000 - Number(BigInt(block.timestamp)))
      const rightChain = Number(BigInt(chainId)) === net.chainId
      return { ok: rightChain && ageSec < 120, block: Number(BigInt(block.number)), ageSec,
        error: !rightChain ? `RPC chainId ${Number(BigInt(chainId))}, expected ${net.chainId}` : ageSec >= 120 ? 'no new block for 2 minutes' : undefined }
    }),
    // Resend: is the sending domain still verified? A send-only key cannot read domains - reported, not failed.
    check(async () => {
      if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not set' }
      const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } })
      if (res.status === 401 || res.status === 403) return { ok: null, error: 'the Resend key can only send - domain status not readable' }
      const j = await res.json()
      const d = (j.data || []).find(x => x.name === 'ezwallet.cash')
      if (!d) return { ok: false, error: 'ezwallet.cash is not in Resend' }
      return { ok: d.status === 'verified', status: d.status }
    }),
  ])

  return json({ network: net.target, checkedAt: new Date().toISOString(), site, circle, chain, mail })
}
