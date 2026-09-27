// The network this BUILD targets (VITE_NETWORK in .env.development / .env.mock / .env.production, or the Pages
// build environment). getNetwork throws on an unset/unknown name - a misbuilt app fails closed instead of
// quietly talking to the wrong chain. See src/network.js.
import { getNetwork } from './network'
import { MOCK } from './mock'

export const NET = getNetwork(import.meta.env.VITE_NETWORK)

// ── The send/swap guard (MAINNET-AUDIT.md C2) ──
// Asks the server once which network it runs and whether every configured contract really exists on that chain.
// Money is only allowed to move when BOTH sides agree and the check passed. Cached for the session; a failed
// fetch is not cached, so the next attempt asks again.
let _health = null
export function netHealth() {
  if (MOCK) return Promise.resolve({ ok: true, problems: [] })
  if (!_health) {
    _health = fetch('/api/health')
      .then(r => r.json())
      .then(h => {
        if (h.error) return { ok: false, problems: [h.error] }
        if (h.network !== NET.key) return { ok: false, problems: [`server runs ${h.network}, this app was built for ${NET.key}`] }
        return h
      })
      .catch(e => { _health = null; return { ok: false, problems: [`cannot verify the network (${e.message})`] } })
  }
  return _health
}

// Throws a plain-English error when money must not move. Call it BEFORE creating any Circle challenge.
export async function assertNetworkReady() {
  const h = await netHealth()
  if (!h.ok) throw new Error(`Sending is paused for safety: ${h.problems[0]}`)
}
