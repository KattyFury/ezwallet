// GET /api/stats?net= - user statistics from Circle's user list (admin/SPEC.md §5.1). No transaction totals in v1.
import { json, netParam, circleGet } from './_lib.js'

// A Pages Function may make ~50 outbound requests per call (Workers free plan) → at most 45 pages of 50 users.
// Past that the numbers are marked "truncated" instead of silently wrong.
const PAGE_SIZE = 50, MAX_PAGES = 45
const DAY = 86400000

function weekStart(d) {   // Monday 00:00 UTC of the date's week
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return t.toISOString().slice(0, 10)
}

export async function onRequestGet(ctx) {
  let net
  try { net = netParam(new URL(ctx.request.url).searchParams.get('net')) } catch (e) { return json({ error: e.message }, 400) }

  const users = []
  let truncated = false, after = null
  for (let page = 0; ; page++) {
    if (page === MAX_PAGES) { truncated = true; break }
    const qs = `pageSize=${PAGE_SIZE}` + (after ? `&pageAfter=${encodeURIComponent(after)}` : '')
    const { status, body } = await circleGet(ctx.env, net, `/users?${qs}`)
    if (status !== 200) return json({ error: `Circle HTTP ${status}` }, 502)
    const list = body?.data?.users || []
    users.push(...list)
    if (list.length < PAGE_SIZE) break
    after = list[list.length - 1].id
  }

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
    network: net.key, total: users.length, truncated,
    pinSet, pinNotSet: users.length - pinSet, securityQuestionSet,
    byDay, byWeek,
  })
}
