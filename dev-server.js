// Dev server local (Windows) — proxy các action Circle API mà Vite gọi qua /api/*.
// KHÔNG dùng `wrangler pages dev` trên Windows (lỗi "write EOF" — xem HANDOFF).
// Import TRỰC TIẾP handler thật trong functions/api/*.js (KHÔNG copy-paste) → logic
// local và Cloudflare deploy luôn khớp nhau, không có chuyện quên đồng bộ tay.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import * as session from './functions/api/session.js'
import * as wallet from './functions/api/wallet.js'
import * as send from './functions/api/send.js'
import * as swap from './functions/api/swap.js'

const PORT = 8787

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
if (!env.API_KEY) console.warn('[dev-server] thiếu API_KEY trong .env.txt — luồng cần Circle API sẽ lỗi')

const ROUTES = {
  '/api/session': session,
  '/api/wallet': wallet,
  '/api/send': send,
  '/api/swap': swap,
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

    const r = await mod.onRequestPost({ request, env })
    const text = await r.text()
    res.writeHead(r.status, Object.fromEntries(r.headers))
    res.end(text)
  } catch (e) {
    console.error('[dev-server] lỗi:', e)
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ error: e.message }))
  }
})

server.listen(PORT, () => console.log(`[dev-server] proxy Circle API tại http://localhost:${PORT}`))
