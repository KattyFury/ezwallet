// SECOND LOCK (admin/SPEC.md §6.2). Cloudflare Access is the front door of admin.ezwallet.cash, but the code does not
// trust the door: every request must carry Access's signed ticket (header Cf-Access-Jwt-Assertion), and we verify it
// here ourselves - signature (RS256, keys from the team's certs endpoint), audience, issuer, expiry, and the email.
// Why: a mis-configured Access policy, the *.pages.dev URL or a preview URL (none of which Access covers) must still
// get nothing. Any missing setting → fail closed.
//
// Env: ACCESS_TEAM_DOMAIN (e.g. plain-fog-e653.cloudflareaccess.com), ACCESS_AUD (the Access application's AUD tag),
// ADMIN_EMAIL (the only email allowed in).

const CERTS_TTL_MS = 60 * 60 * 1000
let certsCache = { domain: null, at: 0, keys: [] }

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const b64urlJson = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))

async function getCerts(domain, fetchImpl, force) {
  if (!force && certsCache.domain === domain && Date.now() - certsCache.at < CERTS_TTL_MS) return certsCache.keys
  const res = await fetchImpl(`https://${domain}/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error(`certs ${res.status}`)
  const { keys } = await res.json()
  certsCache = { domain, at: Date.now(), keys: keys || [] }
  return certsCache.keys
}

// Returns { email } on success; throws with a short reason otherwise.
export async function verifyAccessJwt(token, env, { fetchImpl = fetch, now = Date.now() } = {}) {
  const domain = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD, admin = (env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!domain || !aud || !admin) throw new Error('admin is not configured')
  if (!token) throw new Error('no Access token')

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed token')
  const [h, p, sig] = parts
  const header = b64urlJson(h)
  if (header.alg !== 'RS256' || !header.kid) throw new Error('unexpected token algorithm')

  let jwk = (await getCerts(domain, fetchImpl, false)).find(k => k.kid === header.kid)
  if (!jwk) jwk = (await getCerts(domain, fetchImpl, true)).find(k => k.kid === header.kid)   // keys rotate
  if (!jwk) throw new Error('unknown signing key')

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) throw new Error('bad signature')

  const claims = b64urlJson(p)
  const nowS = Math.floor(now / 1000)
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!auds.includes(aud)) throw new Error('wrong audience')
  if (claims.iss !== `https://${domain}`) throw new Error('wrong issuer')
  if (typeof claims.exp !== 'number' || claims.exp <= nowS) throw new Error('token expired')
  if (typeof claims.nbf === 'number' && claims.nbf > nowS + 60) throw new Error('token not yet valid')
  const email = String(claims.email || '').toLowerCase()
  if (email !== admin) throw new Error('email not allowed')
  return { email }
}

// test hook
export function _resetCertsCache() { certsCache = { domain: null, at: 0, keys: [] } }
