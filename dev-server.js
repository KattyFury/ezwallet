// Local dev server (Windows) - proxies the Circle API actions that Vite calls through /api/*.
// Do NOT use `wrangler pages dev` on Windows (the "write EOF" error - see HANDOFF).
// It imports the REAL handlers from functions/api/*.js DIRECTLY (no copy-paste) → local logic
// and the Cloudflare deploy always match, with no hand-syncing to forget.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
// session.js, wallet.js and send.js were all DELETED on 2026-08-30. Each existed for the same
// reason - to hold the Circle API key somewhere the browser could not see it - and Privy needs no
// such key: it keeps its own session and signs in the browser. What is left here is what genuinely
// still needs a server: the Stablecoin Kit (KIT_KEY), the KV-backed backup, and bug reports.
import * as swap from './functions/api/swap.js'
import * as sync from './functions/api/sync.js'
import * as bug from './functions/api/bug.js'

const PORT = 8787

// A FAKE KV for local use (Cloudflare KV only exists on a deploy): enough of the `get`/`put`/`delete` API for sync.js.
// `expirationTtl` is genuinely honoured (nonces/session tokens expire) so the PIN-signature auth flow behaves
// locally like it does on a deploy. The data lives in RAM → restarting dev-server clears it, which is the point: local is only for trying flows.
const fakeKV = (() => {
  const m = new Map()
  return {
    get: async k => {
      const rec = m.get(k)
      if (!rec) return null
      if (rec.exp && Date.now() > rec.exp) { m.delete(k); return null }
      return rec.v
    },
    put: async (k, v, opts) => {
      m.set(k, { v, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 })
      console.log(`[dev-server] KV put ${k} (${v.length} bytes)`)
    },
    delete: async k => { m.delete(k) },
  }
})()

function loadEnv() {
  const env = {}
  for (const file of ['.env.txt', '.dev.vars']) {
    try {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8')
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
        if (m) env[m[1]] = m[2]
      }
    } catch {}
  }
  return env
}
const env = loadEnv()
// Warns about KIT_KEY, not API_KEY: since 2026-08-30 nothing here talks to the Circle W3S API, and
// the Stablecoin Kit key is the only secret the remaining endpoints actually need.
if (!env.KIT_KEY) console.warn('[dev-server] KIT_KEY missing from .env.txt - swap quotes and swaps will fail')

const ROUTES = {
  '/api/swap': swap,
  '/api/sync': sync,
  '/api/bug': bug,
}

const server = createServer(async (req, res) => {
  const mod = ROUTES[req.url.split('?')[0]]
  if (!mod) { res.writeHead(404).end('not found'); return }

  try {
    if (req.method === 'OPTIONS') {
      const r = await mod.onRequestOptions()
      res.writeHead(r.status, Object.fromEntries(r.headers))
      res.end()
      return
    }

    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = Buffer.concat(chunks).toString('utf8')

    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: body || undefined,
    })

    const r = await mod.onRequestPost({ request, env: { ...env, EZ_SYNC: fakeKV } })
    const text = await r.text()
    res.writeHead(r.status, Object.fromEntries(r.headers))
    res.end(text)
  } catch (e) {
    console.error('[dev-server] error:', e)
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ error: e.message }))
  }
})

server.listen(PORT, () => console.log(`[dev-server] proxying the Circle API at http://localhost:${PORT}`))
