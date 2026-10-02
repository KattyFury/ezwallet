// GET /api/stats?net= - user statistics from Circle's user list (admin/SPEC.md §5.1). No transaction totals in v1.
import { json, netParam, listUsers } from './_lib.js'

const DAY = 86400000

function weekStart(d) {   // Monday 00:00 UTC of the date's week
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return t.toISOString().slice(0, 10)
}

export async function onRequestGet(ctx) {
  let net
  try { net = netParam(new URL(ctx.request.url).searchParams.get('net')) } catch (e) { return json({ error: e.message }, 400) }

  let users, truncated
  try { ({ users, truncated } = await listUsers(ctx.env, net)) } catch (e) { return json({ error: e.message }, 502) }

  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const byDay = {}, byWeek = {}
  for (let i = 13; i >= 0; i--) byDay[new Date(today - i * DAY).toISOString().slice(0, 10)] = 0
  for (let i = 7; i >= 0; i--) byWeek[weekStart(new Date(today - i * 7 * DAY))] = 0

  let pinSet = 0, securityQuestionSet = 0
  for (const u of users) {
    if (u.pinStatus === 'ENABLED') pinSet++
    if (u.securityQuestionStatus === 'ENABLED') securityQuestionSet++
    const c = new Date(u.createDate)
    const day = c.toISOString().slice(0, 10), wk = weekStart(c)
    if (day in byDay) byDay[day]++
    if (wk in byWeek) byWeek[wk]++
  }

  return json({
    network: net.target, total: users.length, truncated,
    pinSet, pinNotSet: users.length - pinSet, securityQuestionSet,
    byDay, byWeek,
  })
}
