// POST /api/mail - email ONE user (admin/SPEC.md §5.4). v1: one recipient, never "everyone".
// Two steps: { confirm: false } returns the exact preview; only { confirm: true } sends. The recipient must be an
// existing user of the chosen network - the admin is not an open mail relay. Every send (or failed send) is logged.
import { json, netParam, circleGet, isEmail } from './_lib.js'
import { sendMail } from '../../../functions/api/_mail.js'
import { writeLog } from './_log.js'

const MAX_SUBJECT = 150, MAX_TEXT = 5000
const FOOTER = 'This message was sent by the ezwallet team. We will never ask for your PIN or your sign-in code.'

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function renderMail(subject, text) {
  const paras = text.split(/\n\s*\n/).map(p => `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;color:#000">${paras}`
    + `<p style="color:#667085;font-size:14px;margin:24px 0 0">${esc(FOOTER)}</p></div>`
  return { subject, text: `${text}\n\n--\n${FOOTER}`, html }
}

export async function onRequestPost(ctx) {
  let body
  try { body = await ctx.request.json() } catch { return json({ error: 'bad JSON' }, 400) }
  let net
  try { net = netParam(body.net) } catch (e) { return json({ error: e.message }, 400) }

  const to = String(body.to || '').trim().toLowerCase()
  const subject = String(body.subject || '').trim()
  const text = String(body.text || '').trim()
  if (!isEmail(to)) return json({ error: 'Enter one valid email' }, 400)
  if (!subject || subject.length > MAX_SUBJECT) return json({ error: `Subject: 1-${MAX_SUBJECT} characters` }, 400)
  if (!text || text.length > MAX_TEXT) return json({ error: `Message: 1-${MAX_TEXT} characters` }, 400)

  const user = await circleGet(ctx.env, net, `/users/${encodeURIComponent(to)}`)
  if (user.status !== 200) return json({ error: `${to} is not an ezwallet user` }, 400)

  const mail = renderMail(subject, text)
  if (body.confirm !== true) return json({ preview: { from: 'ezwallet <no-reply@ezwallet.cash>', to, ...mail } })

  if (!ctx.env.EZ_ADMIN) return json({ error: 'KV binding EZ_ADMIN missing - nothing is sent without an audit log' }, 503)
  const entry = { action: 'mail', by: ctx.data.adminEmail, net: net.target, to, subject, text }
  try {
    await sendMail({ ...ctx.env, NETWORK: net.key }, { to, ...mail })
  } catch (e) {
    await writeLog(ctx.env, { ...entry, ok: false, error: e.message })
    return json({ error: e.message }, 502)
  }
  await writeLog(ctx.env, { ...entry, ok: true })
  return json({ sent: true })
}
