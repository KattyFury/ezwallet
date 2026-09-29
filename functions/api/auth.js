// POST /api/auth
//   { action: 'start',  email }        → emails a 6-digit code        → { sent: true }
//   { action: 'verify', email, code }  → checks it                    → { authToken }
// The authToken is what /api/session now requires (MAINNET-AUDIT.md C1). Logic + limits live in _auth.js.
import { normEmail, isEmail, startChallenge, verifyChallenge, requireSecret } from './_auth.js'
import { sendMail, codeEmail } from './_mail.js'
import { JSON_HEADERS_BASE } from './_net.js'

const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS_BASE })

export async function onRequestPost(ctx) {
  let secret
  try { secret = requireSecret(ctx.env) } catch (e) { return reply({ error: `Sign-in is not configured: ${e.message}` }, 503) }
  const kv = ctx.env.EZ_SYNC
  if (!kv) return reply({ error: 'Sign-in is not configured: KV binding EZ_SYNC missing' }, 503)

  let body
  try { body = await ctx.request.json() } catch { return reply({ error: 'bad request' }, 400) }
  const email = normEmail(body.email)
  if (!isEmail(email)) return reply({ error: 'Please enter a valid email address' }, 400)

  if (body.action === 'start') {
    const ip = ctx.request.headers.get('CF-Connecting-IP') || null
    const r = await startChallenge({ kv, secret, email, ip })
    if (!r.ok) return reply({ error: r.error }, r.status)
    try {
      await sendMail(ctx.env, { to: email, ...codeEmail(r.code) })
    } catch (e) {
      console.error('[auth] sending the code failed:', e.message)
      return reply({ error: 'Could not send the code right now - please try again in a minute' }, 502)
    }
    return reply({ sent: true })
  }

  if (body.action === 'verify') {
    const r = await verifyChallenge({ kv, secret, email, code: String(body.code || '').trim() })
    if (!r.ok) return reply({ error: r.error }, r.status)
    return reply({ authToken: r.authToken })
  }

  return reply({ error: 'unknown action' }, 400)
}

