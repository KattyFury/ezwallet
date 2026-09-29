// GET /api/log - the latest admin actions (mail sends), newest first.
import { json } from './_lib.js'
import { readLog } from './_log.js'

export async function onRequestGet(ctx) {
  return json({ entries: await readLog(ctx.env) })
}
