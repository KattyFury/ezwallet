// Hàng đợi thông báo in-app (localStorage). Dùng cho HomeSend hiển thị ở vùng hint.
const KEY = 'ez_notifs'

export function getNotifs() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '[]')
    const cutoff = Date.now() - 2 * 60 * 60 * 1000  // tự ẩn sau 2 tiếng
    return all.filter(n => !n.ts || n.ts > cutoff)
  } catch { return [] }
}

// dedupeKey: chống thông báo bị NHÂN ĐÔI — chủ yếu do React.StrictMode (dev) gọi useEffect 2 lần
// (mount→unmount ảo→mount lại), khiến addNotif() gọi 2 lần cho CÙNG 1 sự kiện thật. Có dedupeKey
// trùng với thông báo đã có → bỏ qua, không thêm nữa.
export function addNotif(text, type = 'info', hash = null, dedupeKey = null) {
  const list = getNotifs()
  if (dedupeKey && list.some(n => n.dedupeKey === dedupeKey)) return
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, type, hash, dedupeKey, ts: Date.now() })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)))
}

export function dismissNotif(id) {
  localStorage.setItem(KEY, JSON.stringify(getNotifs().filter(n => n.id !== id)))
}
