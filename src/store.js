// Lưu trữ cục bộ TÁCH THEO TỪNG VÍ — danh bạ & kho QR riêng cho mỗi tài khoản.
// Trước đây dùng key chung (ez_contacts, ez_saved_qrs) → đăng nhập tài khoản khác
// vẫn thấy danh bạ tài khoản cũ. Giờ key gắn theo địa chỉ ví đang đăng nhập.
//
// localStorage VẪN LÀ NGUỒN SỰ THẬT (app đọc/ghi ở đây, offline vẫn chạy). Từ 07-29 có thêm
// SAO LƯU lên Cloudflare KV: mỗi lần ghi sẽ đóng mốc thời gian + hẹn đẩy lên (xem `sync.js`).
// Đây chỉ là bản sao chống mất khi đổi máy/xoá cache/đổi domain — KHÔNG phải database chính.
// `*Local()` = ghi THUẦN local, KHÔNG đẩy lên server (dùng khi vừa kéo bản mới từ server về,
// tránh vòng lặp pull → save → push → pull).

function acct() {
  return (localStorage.getItem('ez_wallet_addr') || 'anon').toLowerCase()
}

// Migrate 1 lần: dữ liệu key-chung cũ → gán cho tài khoản đang đăng nhập, rồi xóa key chung
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

// Ghi THUẦN local (không đẩy lên server) — dành cho luồng restore trong sync.js
export function saveContactsLocal(list) { save('contacts', list) }
export function saveSavedQRsLocal(list) { save('saved_qrs', list) }

// Ghi + đóng mốc + hẹn sao lưu. import() động để store.js không kéo sync.js vào mọi màn.
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
