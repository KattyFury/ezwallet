// In-app notification queue (localStorage). Used by HomeSend to render in the hint area.
import { acct } from './store'
// SPLIT PER WALLET (bug fix 2026-09-11, same root cause store.js already fixed once for contacts/QR
// storage - see its own top comment): this used to be one global 'ez_notifs' key, so signing out and
// into a DIFFERENT/older account on the same device still showed the PREVIOUS account's notifications
// for up to 24h (the user reported an old, long-unused account showing notifications that could not be
// its own). Namespaced by wallet address exactly like loadContacts()/loadSavedQRs() already are.
function key() { return `ez_notifs_${acct()}` }
const DAY_MS = 24 * 60 * 60 * 1000

// KEPT FOR 24H ONLY (user decision 07-19, overriding the 07-15 "never expires" call - old swap/send/
// receive notifications piled up and looked messy): anything older than 24h drops off the list by
// itself, with no manual dismiss needed.
export function getNotifs() {
  try {
    const list = JSON.parse(localStorage.getItem(key()) || '[]')
    return list.filter(n => Date.now() - (n.ts || 0) <= DAY_MS)
  } catch { return [] }
}

// dedupeKey: guards against DUPLICATED notifications - mainly React.StrictMode (dev) running useEffect
// twice (mount→fake unmount→mount again), so addNotif() fires twice for ONE real event. If a dedupeKey
// matches an existing notification → skip, do not add it again.
export function addNotif(text, type = 'info', hash = null, dedupeKey = null) {
  const list = getNotifs()
  if (dedupeKey && list.some(n => n.dedupeKey === dedupeKey)) return
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, type, hash, dedupeKey, ts: Date.now() })
  localStorage.setItem(key(), JSON.stringify(list.slice(0, 10)))
}

export function dismissNotif(id) {
  localStorage.setItem(key(), JSON.stringify(getNotifs().filter(n => n.id !== id)))
}
