// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS + QR LIBRARY BACKUP (client side) - the counterpart of functions/api/sync.js
//
// MERGE RULE = THE MOST RECENT EDIT WINS (last-write-wins over the whole bundle, by the `updatedAt` stamp).
// Chosen because it is PREDICTABLE and explainable to an everyday user:
// "whichever device edited last is the right one". A union merge sounds safer, but DELETES WOULD NEVER STICK -
// delete someone on device A, open device B and they are alive again → far more confusing.
//
// AVATARS do not go to the server (reason in functions/api/sync.js). Restoring on another device brings contacts
// back with names + addresses but NO pictures; pictures on the old device are KEPT when overwriting
// (matched by id) so one pull cannot lose them.
//
// AUTH = PIN SIGNATURE (2026-08-06). The session token is fetched by PinGate after the user enters their PIN
// (see `prepareUnlockMessage` + `openSession` below) and lives in sessionStorage → it dies with the
// app session, and reopening the app signs again. NO token = every sync call silently does nothing and
// the app behaves exactly as before (just like when KV was not enabled).
//
// EVERY ERROR IS SILENT: backup is a side feature and must NEVER stall the app or surface an error.
// No KV binding yet → the server returns 503 → this code skips, and the app runs exactly as before.
// ══════════════════════════════════════════════════════════════════════════════
import { MOCK } from './mock'

const API = '/api/sync'
const TOKEN_KEY = 'ez_sync_token'
const acct = () => (localStorage.getItem('ez_wallet_addr') || '').toLowerCase()
const stampKey = () => `ez_sync_at_${acct()}`

export const localStamp = () => Number(localStorage.getItem(stampKey()) || 0)
export const setLocalStamp = (ts) => localStorage.setItem(stampKey(), String(ts))

let pushTimer = null
let disabled = false   // server reported sync-disabled (no KV) → stop calling for the rest of the session

const token = () => sessionStorage.getItem(TOKEN_KEY) || ''

// Call the sync API. `auth = false` for the 2 session-opening calls (nonce/session) - they have no token yet.
// timeoutMs exists because the nonce step sits ON THE APP UNLOCK PATH: if the network hangs, drop the backup
// rather than ever leaving the user stuck on the PIN screen.
async function call(action, payload, { auth = true, timeoutMs = 0, extra } = {}) {
  if (disabled || MOCK) return null
  const body = { action, payload, ...extra }
  if (auth) {
    if (!token() || !acct()) return null
    body.token = token()
  }
  const ctrl = timeoutMs ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  let res
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl?.signal,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (res.status === 503) { disabled = true; return null }
  // Token expired/invalid → throw it away, do not keep calling with a dead token. The next session signs again.
  if (res.status === 401 && auth) { sessionStorage.removeItem(TOKEN_KEY); return null }
  if (!res.ok) return null
  return res.json()
}

// ── OPENING THE BACKUP SESSION (called from PinGate, folded into the PIN entry that already happens) ───────
// Step 1: ask for a nonce + the sentence to sign. Failure / no KV / slow network → return null,
// PinGate signs the default sentence and the app carries on normally, just without backup this session.
export async function prepareUnlockMessage() {
  try {
    const res = await call('nonce', undefined, { auth: false, timeoutMs: 4000 })
    return res?.nonce && res?.message ? res : null
  } catch { return null }
}

// Step 2: trade the signature for a session token. The signature comes back from Circle once the PIN is correct.
// The server rebuilds the sentence from the nonce and recovers the address - the client never declares its own address.
export async function openSession(nonce, signature) {
  if (!nonce || !signature) return false
  try {
    const res = await call('session', undefined, { auth: false, timeoutMs: 8000, extra: { nonce, signature } })
    if (!res?.token) return false
    // SAFETY CHECK: the address the server recovers MUST be the wallet that is open. A mismatch means Circle's signing
    // convention does not match the server's EIP-191 assumption → data would land under the wrong KV key. If it happens,
    // DISABLE backup for this session entirely (the app keeps working) rather than writing anything blindly.
    if (res.address && acct() && res.address.toLowerCase() !== acct()) {
      console.error('[sync] address recovered from signature does NOT match the open wallet — disabling backup for this session', res.address, acct())
      return false
    }
    sessionStorage.setItem(TOKEN_KEY, res.token)
    return true
  } catch { return false }
}

// PUSH is debounced by 1.5s: consecutive add/edit/delete actions (e.g. renaming then changing the picture) cost one KV write.
export function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { pushNow().catch(() => {}) }, 1500)
}

export async function pushNow() {
  const { loadContacts, loadSavedQRs } = await import('./store')
  const updatedAt = localStamp() || Date.now()
  await call('push', { updatedAt, contacts: loadContacts(), savedQrs: loadSavedQRs() })
}

// PULL at startup: if the server copy is NEWER than local, overwrite local (keeping avatars by id);
// if local is newer, push it up. Returns true when local was just overwritten (so an open screen can reload).
export async function pullOnce() {
  const res = await call('pull').catch(() => null)
  if (!res) return false
  const remote = res.data
  const mine = localStamp()

  if (!remote) { if (mine) schedulePush(); return false }        // server empty → push the local copy up
  if (remote.updatedAt <= mine) { if (remote.updatedAt < mine) schedulePush(); return false }

  const { loadContacts, saveContactsLocal, saveSavedQRsLocal } = await import('./store')
  // Keep the pictures this device already has for contacts with the same id - the server holds no avatars.
  const avatars = new Map(loadContacts().filter(c => c.avatar).map(c => [c.id, c.avatar]))
  saveContactsLocal((remote.contacts || []).map(c => (avatars.has(c.id) ? { ...c, avatar: avatars.get(c.id) } : c)))
  saveSavedQRsLocal(remote.savedQrs || [])
  setLocalStamp(remote.updatedAt)
  return true
}
