// GET /api/users?net= - every user's email and account state, newest first (owner request 2026-09-29).
import { json, netParam, listUsers } from './_lib.js'

export async function onRequestGet(ctx) {
  let net
  try { net = netParam(new URL(ctx.request.url).searchParams.get('net')) } catch (e) { return json({ error: e.message }, 400) }
  let users, truncated
  try { ({ users, truncated } = await listUsers(ctx.env, net)) } catch (e) { return json({ error: e.message }, 502) }
  return json({
    network: net.target, truncated,
    users: users
      .map(u => ({
        email: u.id, created: u.createDate, status: u.status, pin: u.pinStatus,
        pinFails: u.pinDetails?.failedAttempts ?? 0, securityQuestions: u.securityQuestionStatus,
      }))
      .sort((a, b) => (a.created < b.created ? 1 : -1)),
  })
}
