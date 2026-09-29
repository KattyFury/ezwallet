// Runs in front of EVERY request to the admin project - the page, its assets and every /api call.
// No valid Cloudflare Access ticket for ADMIN_EMAIL → 403, nothing else is served. See _access.js.
import { verifyAccessJwt } from './_access.js'

export async function onRequest(ctx) {
  try {
    const { email } = await verifyAccessJwt(ctx.request.headers.get('Cf-Access-Jwt-Assertion'), ctx.env)
    ctx.data.adminEmail = email
  } catch (e) {
    return new Response(`Forbidden (${e.message})`, {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  }
  const res = await ctx.next()
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', 'no-store')
  return out
}
