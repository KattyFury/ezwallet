// Local storage SPLIT PER WALLET - contacts & QR library are separate for each account.
// It used to use shared keys (ez_contacts, ez_saved_qrs) → signing in with another account
// still showed the previous account's contacts. Keys are now tied to the signed-in wallet address.
//
// localStorage IS STILL THE SOURCE OF TRUTH (the app reads/writes here, works offline). Since 07-29
// there is also a BACKUP to Cloudflare KV: every write stamps a timestamp and schedules a push (see `sync.js`).
// That is only a copy to survive a new machine / cleared cache / changed domain - NOT the main database.
// `*Local()` = write PURELY local, do NOT push to the server (used right after pulling a fresh copy
// from the server, to avoid the pull → save → push → pull loop).

function acct() {
  return (localStorage.getItem('ez_wallet_addr') || 'anon').toLowerCase()
}

// One-time migration: old shared-key data → assigned to the signed-in account, then the shared key is removed
function migrate(base) {
  const oldKey = `ez_${base}`
  const newKey = `ez_${base}_${acct()}`
  const old = localStorage.getItem(oldKey)
  if (old && acct() !== 'anon' && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, old)
    localStorage.removeItem(oldKey)
  }
}

function load(base) {
  migrate(base)
  try { return JSON.parse(localStorage.getItem(`ez_${base}_${acct()}`) || '[]') } catch { return [] }
}
function save(base, list) {
  localStorage.setItem(`ez_${base}_${acct()}`, JSON.stringify(list))
}

export function loadContacts() { return load('contacts') }
export function loadSavedQRs() { return load('saved_qrs') }

// Write PURELY local (no push to server) - for the restore flow in sync.js
export function saveContactsLocal(list) { save('contacts', list) }
export function saveSavedQRsLocal(list) { save('saved_qrs', list) }

// Write + stamp + schedule backup. Dynamic import() so store.js does not drag sync.js into every screen.
function saveAndBackup(base, list) {
  save(base, list)
  import('./sync').then(s => { s.setLocalStamp(Date.now()); s.schedulePush() }).catch(() => {})
}
export function saveContacts(list) { saveAndBackup('contacts', list) }
export function saveSavedQRs(list) { saveAndBackup('saved_qrs', list) }

export function findContactName(addr) {
  try {
    return loadContacts().find(c => c.address?.toLowerCase() === addr?.toLowerCase())?.name || null
  } catch { return null }
}
