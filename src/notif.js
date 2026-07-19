// Hàng đợi thông báo in-app (localStorage). Dùng cho HomeSend hiển thị ở vùng hint.
const KEY = 'ez_notifs'
const DAY_MS = 24 * 60 * 60 * 1000

// CHỈ GIỮ 24H (user chốt 07-19, đè quyết định "không hết hạn" 07-15 — thông báo swap/gửi/nhận cũ
// dồn đống nhìn rối): thông báo quá 24h tự rớt khỏi danh sách hiện ra, không cần dismiss tay.
export function getNotifs() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return list.filter(n => Date.now() - (n.ts || 0) <= DAY_MS)
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
