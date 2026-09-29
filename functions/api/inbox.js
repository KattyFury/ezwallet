// GET /api/inbox - announcements the ezwallet team sends to EVERYONE (admin.ezwallet.cash → Announce tab).
// Public on purpose: v1 is broadcast only (owner decision 2026-09-29), never anything about one person, so there is
// nothing to authenticate. KV EZ_SYNC key `inbox:all` = [{ id, text, ts, exp }], written only by the admin project
// (max 200 chars, no links, kept 7 days). The app shows each id once per account - see src/inbox.js.
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }

export async function onRequestGet(ctx) {
  const kv = ctx.env.EZ_SYNC
  if (!kv) return new Response(JSON.stringify({ messages: [] }), { headers: HEADERS })
  const list = (await kv.get('inbox:all', 'json')) || []
  const now = Date.now()
  const messages = list.filter(m => m.exp > now).map(({ id, text, ts }) => ({ id, text, ts }))
  return new Response(JSON.stringify({ messages }), { headers: HEADERS })
}
