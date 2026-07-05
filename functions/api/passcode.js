// App-level passcode (KHOÁ MỞ VÍ) — lưu SERVER (Cloudflare KV) theo userId, KHÔNG trên máy.
// Mục đích: bịt lỗ "gõ email người khác để soi tiền" cho MỌI cách login, MỌI máy → phải nhập
// passcode sau khi login mới vào ví. Đây là lớp của app (không đụng Circle PIN/Confirmation UI).
// KV binding tên PASSCODES (cấu hình ở Cloudflare Pages → Settings → Functions → KV bindings).
// Bản ghi: pc:<userId> → { hash, attempts, lockedUntil }. hash = SHA-256(secret:userId:code).
//
// ⚠️ Đây là khoá TRUY CẬP tầng app (chặn người cầm máy / gõ email lạ), KHÔNG phải khoá tầng
// blockchain. Ký giao dịch vẫn do Circle (PIN cho user email, Confirmation UI cho social/OTP).

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const MAX_ATTEMPTS = 5
const LOCK_MS = 30 * 60 * 1000   // sai 5 lần → khoá 30 phút (chống dò 4 số)

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
const kkey = (userId) => `pc:${String(userId).toLowerCase().trim()}`
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS })

export async function onRequestPost(ctx) {
  const KV = ctx.env.PASSCODES
  // KV chưa bind (chưa làm homework) → báo để client FAIL-OPEN (không khoá, đỡ brick app).
  if (!KV) return json({ error: 'kv_unavailable' }, 503)

  const body = await ctx.request.json()
  const { action, userId, code } = body
  if (!userId) return json({ error: 'userId required' }, 400)
  const k = kkey(userId)
  const secret = ctx.env.PASSCODE_SECRET || ctx.env.API_KEY || 'ezwallet'   // muối cho hash
  const rec = JSON.parse((await KV.get(k)) || 'null')
  const hashOf = (c) => sha256(`${secret}:${k}:${c}`)

  if (action === 'status') {
    return json({ hasPasscode: !!rec })
  }

  if (action === 'set') {
    if (!/^\d{6}$/.test(code || '')) return json({ error: 'bad_code' }, 400)
    if (rec) return json({ error: 'already_set' }, 409)   // đã có → phải dùng reset (qua xác minh)
    await KV.put(k, JSON.stringify({ hash: await hashOf(code), attempts: 0, lockedUntil: 0 }))
    return json({ ok: true })
  }

  if (action === 'verify') {
    if (!rec) return json({ ok: false, error: 'not_set' })
    const now = Date.now()
    if (rec.lockedUntil && now < rec.lockedUntil) return json({ ok: false, locked: true, lockedUntil: rec.lockedUntil })
    if ((await hashOf(code || '')) === rec.hash) {
      if (rec.attempts || rec.lockedUntil) { rec.attempts = 0; rec.lockedUntil = 0; await KV.put(k, JSON.stringify(rec)) }
      return json({ ok: true })
    }
    rec.attempts = (rec.attempts || 0) + 1
    let locked = false
    if (rec.attempts >= MAX_ATTEMPTS) { rec.lockedUntil = now + LOCK_MS; rec.attempts = 0; locked = true }
    await KV.put(k, JSON.stringify(rec))
    return json({ ok: false, locked, lockedUntil: rec.lockedUntil, remaining: locked ? 0 : MAX_ATTEMPTS - rec.attempts })
  }

  // reset: ĐẶT LẠI passcode. GUARD: chỉ gọi sau khi client đã xác minh danh tính (OTP email /
  // Circle PIN). Client tự chịu trách nhiệm gọi đúng lúc (v1). TODO: gắn bằng chứng server-side.
  if (action === 'reset') {
    if (!/^\d{6}$/.test(code || '')) return json({ error: 'bad_code' }, 400)
    await KV.put(k, JSON.stringify({ hash: await hashOf(code), attempts: 0, lockedUntil: 0 }))
    return json({ ok: true })
  }

  return json({ error: 'unknown action' }, 400)
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
