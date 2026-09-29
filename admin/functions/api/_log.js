// Audit log of every admin action that reaches users (admin/SPEC.md §6.5): who, when, to whom, what.
// KV binding EZ_ADMIN. Keys sort newest-first (inverted timestamp) so the log page reads the latest with one list call.
const MAX_TS = 9999999999999

export async function writeLog(env, entry) {
  if (!env.EZ_ADMIN) throw new Error('KV binding EZ_ADMIN missing - refusing to act without an audit log')
  const at = Date.now()
  const key = `log:${String(MAX_TS - at).padStart(13, '0')}:${crypto.randomUUID().slice(0, 8)}`
  await env.EZ_ADMIN.put(key, JSON.stringify({ at: new Date(at).toISOString(), ...entry }))
}

export async function readLog(env, limit = 50) {
  if (!env.EZ_ADMIN) return []
  const { keys } = await env.EZ_ADMIN.list({ prefix: 'log:', limit })
  return Promise.all(keys.map(k => env.EZ_ADMIN.get(k.name, 'json')))
}
