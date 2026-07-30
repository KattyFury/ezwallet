// ══════════════════════════════════════════════════════════════════════════════
// SAO LƯU DANH BẠ + KHO QR (client) — cặp với functions/api/sync.js
//
// LUẬT GỘP = BẢN SỬA MỚI NHẤT THẮNG (last-write-wins theo cả cụm, mốc `updatedAt`).
// Chọn cách này vì nó DỰ ĐOÁN ĐƯỢC và giải thích được cho người dùng phổ thông:
// "máy nào sửa sau thì máy đó đúng". Kiểu gộp union (nhập 2 bên) nghe an toàn hơn nhưng
// XOÁ SẼ KHÔNG BAO GIỜ ĂN — xoá 1 người ở máy A, mở máy B là họ sống lại → còn khó hiểu hơn.
//
// AVATAR không lên server (xem lý do ở functions/api/sync.js). Khi restore từ máy khác,
// contact về đủ tên + địa chỉ nhưng KHÔNG có ảnh; ảnh ở máy cũ vẫn được GIỮ LẠI khi ghi đè
// (ghép theo id) để đừng mất ảnh vì một lần pull.
//
// MỌI LỖI ĐỀU IM LẶNG: sao lưu là tính năng phụ, KHÔNG được làm app đứng hay hiện lỗi.
// Chưa tạo KV binding → server trả 503 → chỗ này bỏ qua, app chạy y như cũ.
// ══════════════════════════════════════════════════════════════════════════════
import { MOCK } from './mock'

const API = '/api/sync'
const acct = () => (localStorage.getItem('ez_wallet_addr') || '').toLowerCase()
const stampKey = () => `ez_sync_at_${acct()}`

export const localStamp = () => Number(localStorage.getItem(stampKey()) || 0)
export const setLocalStamp = (ts) => localStorage.setItem(stampKey(), String(ts))

let pushTimer = null
let disabled = false   // server báo sync-disabled (chưa có KV) → thôi không gọi nữa cả phiên

async function call(action, payload) {
  if (disabled || MOCK) return null
  const userToken = localStorage.getItem('ez_user_token')
  if (!userToken || !acct()) return null
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, userToken, payload }),
  })
  if (res.status === 503) { disabled = true; return null }
  if (!res.ok) return null
  return res.json()
}

// PUSH có debounce 1.5s: thêm/sửa/xoá liên tiếp (vd sửa tên rồi đổi ảnh) chỉ tốn 1 lượt ghi KV.
export function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { pushNow().catch(() => {}) }, 1500)
}

export async function pushNow() {
  const { loadContacts, loadSavedQRs } = await import('./store')
  const updatedAt = localStamp() || Date.now()
  await call('push', { updatedAt, contacts: loadContacts(), savedQrs: loadSavedQRs() })
}

// PULL lúc mở app: bản trên server MỚI HƠN local thì ghi đè local (giữ avatar theo id),
// local mới hơn thì đẩy lên. Trả true nếu vừa ghi đè local (để màn đang mở tự nạp lại).
export async function pullOnce() {
  const res = await call('pull').catch(() => null)
  if (!res) return false
  const remote = res.data
  const mine = localStamp()

  if (!remote) { if (mine) schedulePush(); return false }        // server trống → đẩy bản local lên
  if (remote.updatedAt <= mine) { if (remote.updatedAt < mine) schedulePush(); return false }

  const { loadContacts, saveContactsLocal, saveSavedQRsLocal } = await import('./store')
  // Giữ ảnh đang có ở máy này cho contact cùng id — server không giữ avatar.
  const avatars = new Map(loadContacts().filter(c => c.avatar).map(c => [c.id, c.avatar]))
  saveContactsLocal((remote.contacts || []).map(c => (avatars.has(c.id) ? { ...c, avatar: avatars.get(c.id) } : c)))
  saveSavedQRsLocal(remote.savedQrs || [])
  setLocalStamp(remote.updatedAt)
  return true
}
