// Announcements to EVERY user of a network, shown in the app's notification area (admin/SPEC.md §5.5, v1 = broadcast
// only). Stored in the APP's own KV (binding EZ_SYNC_TESTNET / EZ_SYNC_MAINNET here = EZ_SYNC in that app), key
// `inbox:all`; the app reads it through functions/api/inbox.js.
//   GET  ?net=                                  → active announcements
//   POST { net, action:'add', text, confirm }    → confirm:false = validate + preview, confirm:true = publish
//   POST { net, action:'remove', id }            → take one down (apps that already showed it keep it until 24h/dismiss)
// Rules (owner decision 2026-09-29): ≤ 200 characters, NO links - users learn "ezwallet notices never contain a link",
// which is what makes a fake one easy to spot. Every add/remove is written to the audit log.
import { json, netParam } from './_lib.js'
import { writeLog } from './_log.js'

const KEY = 'inbox:all', MAX_LEN = 200, KEEP_MS = 7 * 86400000, MAX_ACTIVE = 20
const LINKISH = /(https?:|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|cash|app|co|me|info|gg|to|ly|site|online|link|finance|vn)\b)/i

function kvFor(env, net) {
  const kv = env[`EZ_SYNC_${net.key.toUpperCase()}`]
  if (!kv) throw new Error(`The ${net.key} app storage is not connected to the admin yet`)
  return kv
}
const active = list => (list || []).filter(m => m.exp > Date.now())

export function checkText(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!text) return { error: 'Write the announcement first' }
  if (text.length > MAX_LEN) return { error: `Too long: ${text.length}/${MAX_LEN} characters` }
  if (LINKISH.test(text)) return { error: 'No links or web addresses - ezwallet announcements never contain one' }
  return { text }
}

export async function onRequestGet(ctx) {
  let net, kv
  try { net = netParam(new URL(ctx.request.url).searchParams.get('net')); kv = kvFor(ctx.env, net) } catch (e) { return json({ error: e.message }, 400) }
  return json({ network: net.key, messages: active(await kv.get(KEY, 'json')).sort((a, b) => b.ts - a.ts) })
}

export async function onRequestPost(ctx) {
  let body
  try { body = await ctx.request.json() } catch { return json({ error: 'bad JSON' }, 400) }
  let net, kv
  try { net = netParam(body.net); kv = kvFor(ctx.env, net) } catch (e) { return json({ error: e.message }, 400) }
  if (!ctx.env.EZ_ADMIN) return json({ error: 'KV binding EZ_ADMIN missing - nothing changes without an audit log' }, 503)
  const list = active(await kv.get(KEY, 'json'))
  const log = { by: ctx.data.adminEmail, net: net.key, to: 'everyone' }

  if (body.action === 'remove') {
    const gone = list.find(m => m.id === body.id)
    if (!gone) return json({ error: 'Not found (maybe already expired)' }, 404)
    await kv.put(KEY, JSON.stringify(list.filter(m => m.id !== body.id)))
    await writeLog(ctx.env, { ...log, action: 'announce-remove', subject: gone.text, ok: true })
    return json({ removed: true })
  }

  if (body.action !== 'add') return json({ error: 'unknown action' }, 400)
  const { text, error } = checkText(body.text)
  if (error) return json({ error }, 400)
  if (list.length >= MAX_ACTIVE) return json({ error: `Already ${MAX_ACTIVE} active announcements - remove one first` }, 400)
  if (body.confirm !== true) return json({ preview: { text, to: `every ${net.key} user` } })

  const now = Date.now()
  await kv.put(KEY, JSON.stringify([...list, { id: crypto.randomUUID(), text, ts: now, exp: now + KEEP_MS }]))
  await writeLog(ctx.env, { ...log, action: 'announce', subject: text, ok: true })
  return json({ sent: true })
}
