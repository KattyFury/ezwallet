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
// AUTH = CHỮ KÝ PIN (2026-08-06). Token phiên do PinGate lấy về sau khi user nhập PIN
// (xem `prepareUnlockMessage` + `openSession` bên dưới) và nằm ở sessionStorage → chết
// cùng phiên app, mở lại app là ký lại. KHÔNG có token = mọi lệnh sync im lặng bỏ qua,
// app chạy y như cũ (đúng như lúc chưa bật KV).
//
// MỌI LỖI ĐỀU IM LẶNG: sao lưu là tính năng phụ, KHÔNG được làm app đứng hay hiện lỗi.
// Chưa tạo KV binding → server trả 503 → chỗ này bỏ qua, app chạy y như cũ.
// ══════════════════════════════════════════════════════════════════════════════
import { MOCK } from './mock'

const API = '/api/sync'
const TOKEN_KEY = 'ez_sync_token'
const acct = () => (localStorage.getItem('ez_wallet_addr') || '').toLowerCase()
const stampKey = () => `ez_sync_at_${acct()}`

export const localStamp = () => Number(localStorage.getItem(stampKey()) || 0)
export const setLocalStamp = (ts) => localStorage.setItem(stampKey(), String(ts))

let pushTimer = null
let disabled = false   // server báo sync-disabled (chưa có KV) → thôi không gọi nữa cả phiên

const token = () => sessionStorage.getItem(TOKEN_KEY) || ''

// Gọi API sync. `auth = false` cho 2 lệnh mở phiên (nonce/session) — chúng chưa có token.
// timeoutMs tồn tại vì bước nonce nằm TRÊN ĐƯỜNG MỞ KHOÁ APP: mạng treo thì thà bỏ sao lưu
// chứ tuyệt đối không được giữ user đứng ở màn PIN.
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
  // Token hết hạn/không hợp lệ → vứt đi, đừng gọi tiếp bằng token chết. Phiên sau ký lại là có.
  if (res.status === 401 && auth) { sessionStorage.removeItem(TOKEN_KEY); return null }
  if (!res.ok) return null
  return res.json()
}

// ── MỞ PHIÊN SAO LƯU (gọi từ PinGate, xen vào đúng lượt nhập PIN sẵn có) ───────
// Bước 1: xin nonce + câu chữ để đem đi ký. Hỏng/không có KV/mạng chậm → trả null,
// PinGate ký câu mặc định và app chạy tiếp bình thường, chỉ là không có sao lưu phiên này.
export async function prepareUnlockMessage() {
  try {
    const res = await call('nonce', undefined, { auth: false, timeoutMs: 4000 })
    return res?.nonce && res?.message ? res : null
  } catch { return null }
}

// Bước 2: đổi chữ ký lấy token phiên. Chữ ký do Circle trả về sau khi user nhập PIN đúng.
// Server tự dựng lại câu chữ từ nonce rồi recover địa chỉ — client không khai địa chỉ của mình.
export async function openSession(nonce, signature) {
  if (!nonce || !signature) return false
  try {
    const res = await call('session', undefined, { auth: false, timeoutMs: 8000, extra: { nonce, signature } })
    if (!res?.token) return false
    // CHỐT AN TOÀN: địa chỉ server recover được PHẢI đúng ví đang mở. Lệch = chuẩn ký của Circle
    // không khớp giả định EIP-191 ở server → dữ liệu sẽ chui vào nhầm khoá KV. Gặp thì TẮT hẳn
    // sao lưu phiên này (app vẫn chạy bình thường) chứ tuyệt đối không ghi bừa.
    if (res.address && acct() && res.address.toLowerCase() !== acct()) {
      console.error('[sync] address recovered from signature does NOT match the open wallet — disabling backup for this session', res.address, acct())
      return false
    }
    sessionStorage.setItem(TOKEN_KEY, res.token)
    return true
  } catch { return false }
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
