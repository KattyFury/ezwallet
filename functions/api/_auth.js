// EMAIL OWNERSHIP - MAINNET-AUDIT.md C1.
//
// Circle's PIN flow (userId = email) has NO authentication of its own: /users/token hands a token for ANY userId
// to whoever holds our API key. So OUR server must prove the person owns the email BEFORE asking Circle for a
// token. This is NOT Circle's "Email OTP" auth mode (that one replaces the PIN - never use it): Circle still sees
// the same userId = email + PIN user as before.
//
// Flow: start(email) → a 6-digit code is emailed (10 min, 5 tries, rate limited) → verify(email, code) → a signed
// auth token (HMAC, 30 days) → /api/session only mints a Circle token for the email INSIDE a valid auth token.
//
// Storage: the EZ_SYNC KV binding (prefixes otp:/otprl:/otpip:). Secret: env.AUTH_SECRET (≥ 32 chars).

const enc = new TextEncoder()
const CODE_TTL_S = 600
const MAX_TRIES = 5
const RESEND_GAP_S = 45
const MAX_SENDS_PER_HOUR = 5
const MAX_SENDS_PER_IP_HOUR = 20
const TOKEN_TTL_S = 30 * 24 * 3600

export const normEmail = (e) => String(e || '').trim().toLowerCase()
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0))

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', key, enc.encode(data))
}
function sameBytes(a, b) {   // constant-time compare
  const x = new Uint8Array(a), y = new Uint8Array(b)
  if (x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]
  return d === 0
}

export function requireSecret(env) {
  const s = env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET missing or shorter than 32 characters')
  return s
}

// 6 random digits, uniform (rejection sampling - no modulo bias).
export function newCode() {
  const buf = new Uint32Array(1)
  let n
  do { crypto.getRandomValues(buf); n = buf[0] } while (n >= 4294000000)
  return String(n % 1000000).padStart(6, '0')
}

const codeHash = async (secret, email, code) => b64url(await hmac(secret, `otp:${email}:${code}`))

// → { ok: true, code } (the caller emails it) or { ok: false, status, error }
export async function startChallenge({ kv, secret, email, ip, now = Date.now() }) {
  const rlKey = `otprl:${email}`
  const rl = (await kv.get(rlKey, 'json')) || { sends: [] }
  const hourAgo = now - 3600e3
  rl.sends = rl.sends.filter(t => t > hourAgo)
  const last = rl.sends[rl.sends.length - 1]
  if (last && now - last < RESEND_GAP_S * 1000) {
    return { ok: false, status: 429, error: `Please wait ${Math.ceil((RESEND_GAP_S * 1000 - (now - last)) / 1000)}s before asking for a new code` }
  }
  if (rl.sends.length >= MAX_SENDS_PER_HOUR) return { ok: false, status: 429, error: 'Too many codes requested - try again in an hour' }
  if (ip) {
    const ipKey = `otpip:${ip}`
    const n = Number(await kv.get(ipKey)) || 0
    if (n >= MAX_SENDS_PER_IP_HOUR) return { ok: false, status: 429, error: 'Too many requests - try again later' }
    await kv.put(ipKey, String(n + 1), { expirationTtl: 3600 })
  }
  const code = newCode()
  await kv.put(`otp:${email}`, JSON.stringify({ h: await codeHash(secret, email, code), exp: now + CODE_TTL_S * 1000, tries: 0 }), { expirationTtl: CODE_TTL_S })
  rl.sends.push(now)
  await kv.put(rlKey, JSON.stringify(rl), { expirationTtl: 3600 })
  return { ok: true, code }
}

// → { ok: true, authToken } or { ok: false, status, error }
export async function verifyChallenge({ kv, secret, email, code, now = Date.now() }) {
  const key = `otp:${email}`
  const rec = await kv.get(key, 'json')
  if (!rec || rec.exp < now) return { ok: false, status: 400, error: 'This code has expired - ask for a new one' }
  if (rec.tries >= MAX_TRIES) { await kv.delete(key); return { ok: false, status: 429, error: 'Too many wrong codes - ask for a new one' } }
  const good = /^\d{6}$/.test(String(code || '')) && sameBytes(fromB64url(await codeHash(secret, email, String(code))), fromB64url(rec.h))
  if (!good) {
    rec.tries += 1
    await kv.put(key, JSON.stringify(rec), { expirationTtl: Math.max(60, Math.ceil((rec.exp - now) / 1000)) })
    const left = MAX_TRIES - rec.tries
    return { ok: false, status: 400, error: left > 0 ? `Wrong code - ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Too many wrong codes - ask for a new one' }
  }
  await kv.delete(key)   // one use only
  return { ok: true, authToken: await issueToken(secret, email, now) }
}

export async function issueToken(secret, email, now = Date.now()) {
  const body = b64url(enc.encode(JSON.stringify({ e: email, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + TOKEN_TTL_S })))
  return `${body}.${b64url(await hmac(secret, body))}`
}

// → the verified email, or null (bad signature, expired, malformed).
export async function readToken(secret, token, now = Date.now()) {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null
  try {
    if (!sameBytes(await hmac(secret, body), fromB64url(sig))) return null
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body)))
    if (!p.e || !p.exp || p.exp * 1000 < now) return null
    return p.e
  } catch { return null }
}
