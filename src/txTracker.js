// TRANSACTION TRACKING - "no double send, no false receipt" (MAINNET-AUDIT.md C3/C4).
//
// The old flow treated "the PIN challenge resolved" as "sent" and ANY thrown error as "failed". Both are wrong:
//   · a resolved challenge only means Circle accepted the signature - the transfer can still FAIL on chain;
//   · a network drop AFTER the PIN leaves the money possibly already moving while the screen said "Send failed"
//     with the button re-enabled → the customer paid twice.
// Now every payment attempt carries a `refId` (a UUID Circle stores on the transaction). After the PIN - and after
// any doubtful error - the app asks Circle for THAT transaction's real state and only then decides. The attempt is
// persisted per account until its outcome is final, so no new payment can start while an earlier one is unresolved,
// even after the app is closed and reopened.
import { MOCK } from './mock'
import { refreshSession } from './circle'
import { acct } from './store'

const OK = new Set(['COMPLETE'])
const BAD = new Set(['FAILED', 'DENIED', 'CANCELLED'])
const KEEP_MS = 24 * 3600 * 1000     // forget an unresolved attempt after a day (it will be in History anyway)
const key = () => `ez_pending_tx_${acct()}`

export function newAttempt(kind, meta) {
  const attempt = {
    refId: crypto.randomUUID(),
    // Circle's list filter is "created since"; start a minute early so clock skew cannot hide the transaction.
    since: new Date(Date.now() - 60000).toISOString(),
    walletId: localStorage.getItem('ez_wallet_id'),
    kind, meta, createdAt: Date.now(),
  }
  localStorage.setItem(key(), JSON.stringify(attempt))
  return attempt
}

export function getPending() {
  try {
    const a = JSON.parse(localStorage.getItem(key()) || 'null')
    if (a && Date.now() - a.createdAt < KEEP_MS) return a
  } catch {}
  return null
}

export function clearPending(refId) {
  const a = getPending()
  if (!a || !refId || a.refId === refId) localStorage.removeItem(key())
}

// One lookup → { found, state, txHash, ... }. Throws on a network/API error (the caller must treat that as
// "unknown", never as "not sent").
export async function lookup(attempt, userToken) {
  if (MOCK) return mockLookup(attempt)
  const token = userToken || (await refreshSession()).userToken
  const res = await fetch('/api/wallet', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'txByRef', userToken: token, walletId: attempt.walletId, refId: attempt.refId, since: attempt.since }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

// 'ok' | 'failed' | 'pending' | 'none'
export function classify(r) {
  if (!r?.found) return 'none'
  if (OK.has(r.state)) return 'ok'
  if (BAD.has(r.state)) return 'failed'
  return 'pending'
}

// Poll until the transaction is final or the time runs out.
// → { outcome: 'ok' | 'failed' | 'pending' (exists, not final yet) | 'none' (never seen) | 'unknown' (could not ask), tx }
export async function waitFinal(attempt, { timeoutMs = 90000, intervalMs = 2000 } = {}) {
  const end = Date.now() + timeoutMs
  let last = null, asked = false
  let token = null
  try { token = (await refreshSession()).userToken } catch {}
  while (Date.now() < end) {
    try {
      last = await lookup(attempt, token)
      asked = true
      const c = classify(last)
      if (c === 'ok' || c === 'failed') return { outcome: c, tx: last }
    } catch { /* a network hiccup - keep asking until the deadline */ }
    await new Promise(r => setTimeout(r, intervalMs))
  }
  if (!asked) return { outcome: 'unknown', tx: null }
  return { outcome: last?.found ? 'pending' : 'none', tx: last }
}

// MOCK: every attempt completes; set localStorage ez_mock_tx_state=FAILED|SENT to rehearse other outcomes.
function mockLookup(attempt) {
  const state = localStorage.getItem('ez_mock_tx_state') || 'COMPLETE'
  return { found: true, state, txHash: '0x' + attempt.refId.replace(/-/g, '').padEnd(64, '0') }
}
