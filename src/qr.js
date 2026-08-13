// ══ ĐỊNH DẠNG QR CỦA EZWALLET — NGUỒN SỰ THẬT DUY NHẤT ══
// Mọi chỗ VẼ QR (HomeReceive · ShowQR · SavedQRList) và chỗ ĐỌC QR (QRScanner) đều đi qua file
// này. ĐỪNG tự nối chuỗi `ezwallet:...` ở màn nào nữa — trước đây rải 3 chỗ, sửa 1 chỗ là lệch.
//
// ⚠️ KHOÁ THEO MẠNG ARC (user chốt 08-13: "cho nó only Arc, mạng khác quét không được").
// Vấn đề đang có: QR mặc định màn Nhận vẽ ĐỊA CHỈ TRẦN `0x…`. Địa chỉ EVM giống hệt nhau trên
// MỌI chuỗi, nên ví bất kỳ (MetaMask đang ở Ethereum/Base/BSC…) quét cái QR đó vẫn gửi được —
// tiền đi sang chuỗi khác là MẤT LUÔN, không ai lấy lại hộ được. Người dùng EZwallet là người
// lớn tuổi, không có cửa để họ tự nhận ra sai chuỗi.
//
// Cách khoá: bọc trong scheme RIÊNG `ezwallet:` + gắn `@<chainId>`.
//   ezwallet:0xABC…@5042002
//   ezwallet:0xABC…@5042002?amount=25&cur=USD
// Vì `ezwallet:` không phải scheme chuẩn nên ví khác KHÔNG hiểu → chúng không gửi được, đúng ý.
//
// ⚠️ CỐ TÌNH KHÔNG DÙNG EIP-681 (`ethereum:0x…@5042002`): chuẩn đó CÓ trường chainId thật, nhưng
// khá nhiều ví cài ẩu — chúng đọc địa chỉ rồi BỎ QUA `@chainId` và gửi trên chuỗi đang mở. Như
// vậy còn nguy hơn địa chỉ trần vì mình tưởng đã khoá mà thật ra không. Scheme lạ thì ví khác
// chỉ có một cửa là từ chối.
export const ARC_CHAIN_ID = 5042002

// Địa chỉ EVM hợp lệ (dùng chung cho cả vẽ lẫn đọc)
export const isEvmAddress = a => /^0x[0-9a-fA-F]{40}$/.test(String(a || '').trim())

// ── VẼ ────────────────────────────────────────────────────────────────────────────────────────
// buildQR(addr)                                → 'ezwallet:0x…@5042002'
// buildQR(addr, { amount: 25, currency: 'USD' }) → 'ezwallet:0x…@5042002?amount=25&cur=USD'
// amount không có/không hợp lệ → bỏ hẳn phần query (QR "địa chỉ trần" của app).
export function buildQR(addr, { amount, currency } = {}) {
  const base = `ezwallet:${addr}@${ARC_CHAIN_ID}`
  const amt = Number(amount)
  if (!(amt > 0)) return base
  return `${base}?amount=${amt}&cur=${currency || 'USD'}`
}

// ── ĐỌC ───────────────────────────────────────────────────────────────────────────────────────
// Trả { address, amount, currency } · null nếu không đọc được · { wrongChain: <id> } nếu là QR
// EZwallet nhưng của chuỗi KHÁC (để màn quét nói rõ lý do thay vì "QR không hợp lệ" chung chung).
//
// Nhận 3 dạng, theo thứ tự:
//   1. ezwallet:0x…@<chainId>[?amount=&cur=]   ← dạng CHUẨN hiện nay
//   2. ezwallet:0x…[?amount=&cur=]             ← dạng CŨ (trước 08-13, chưa có @chain).
//      VẪN NHẬN vì QR cũ đã in/gửi/lưu ảnh của người dùng phải còn quét được — coi như Arc.
//   3. 0x… trần                                ← QR địa chỉ từ NGUỒN NGOÀI (ví khác, sàn).
//      VẪN NHẬN: đây là QR mình quét ĐỂ GỬI ĐI, khoá nó lại thì user hết đường gửi cho người
//      ngoài. Việc khoá Arc là cho QR MÌNH PHÁT RA, không phải cho thứ mình đọc vào.
//
// Tiền tệ mặc định 'USD' — ĐỪNG đổi thành 'VND' (bug 08-12: QR không ghi tiền tệ mà mặc định VND
// làm màn nhập tiền mở ra VND dù app đang chạy English/USD).
export function parseQR(text) {
  const raw = String(text || '').trim()

  const m = raw.match(/^ezwallet:(0x[0-9a-fA-F]{40})(?:@(\d+))?(?:\?amount=([\d.]+))?(?:&cur=(\w+))?$/)
  if (m) {
    const chain = m[2] ? Number(m[2]) : ARC_CHAIN_ID   // QR cũ không ghi chuỗi → coi như Arc
    if (chain !== ARC_CHAIN_ID) return { wrongChain: chain }
    return { address: m[1], amount: m[3] ? parseFloat(m[3]) : null, currency: m[4] || 'USD' }
  }

  if (isEvmAddress(raw)) return { address: raw.trim(), amount: null, currency: 'USD' }
  return null
}
