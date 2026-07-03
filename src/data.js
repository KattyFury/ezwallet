export function fmtVND(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VND'
}

// ⚠️ Gas trên Arc trả bằng USDC → LUÔN chừa lại 1 USDC không cho tiêu (gửi/swap),
// kẻo khách bấm "gửi hết"/"swap hết" xong không còn phí giao dịch, kẹt ví (user chốt 2026-07-03).
// Chỉ áp cho USDC (token gas); EURC/cirBTC tiêu hết được. Dùng ở MỌI chỗ tính "khả dụng".
export const GAS_RESERVE_USDC = 1
export function spendableOf(symbol, balance) {
  const b = balance || 0
  return symbol === 'USDC' ? Math.max(0, b - GAS_RESERVE_USDC) : b
}

// Ký hiệu tiền tệ THÂN THIỆN cho người dùng phổ thông: USDC≈USD, EURC≈EUR (stablecoin 1:1).
// Người già biết $/€ chứ không biết USDC/EURC → chỉ đổi CHỮ HIỂN THỊ (tiền tố, vd "$127.66");
// chain/API/lưu trữ vẫn dùng symbol thật (USDC/EURC). CHỈ dùng cho TIỀN HIỂN THỊ (tổng, quy
// đổi, phí) — KHÔNG áp cho tên token thật (USDC/EURC/cirBTC vẫn hiện nguyên trong danh sách token).
const CURRENCY_LABEL = { USDC: '$', EURC: '€' }
export function displaySymbol(sym) { return CURRENCY_LABEL[sym] || sym }

// Format tiền MỘT CHUỖI MỘT STYLE: "$2" (không phải "2 USD" tách số đậm + đơn vị thường —
// user chốt 2026-07-03: lệch font weight/size giữa số và đơn vị là LỖI). USD/EUR đứng TRƯỚC
// dạng ký hiệu; token thật (USDC/EURC/cirBTC) đứng SAU cách 1 space.
export function fmtMoney(amount, currency) {
  if (currency === 'USD' || currency === 'USDC') return `$${amount}`
  if (currency === 'EUR') return `€${amount}`
  return `${amount} ${currency}`
}

// Tiền tệ hiển thị toàn app (số dư, quy đổi, phí) — anh chọn ở Onboarding/Cài đặt.
// Hiện chỉ hỗ trợ stablecoin USDC/EURC (mặc định USDC). Giá trị cũ (VND/CNY) tự quy về USDC.
const SUPPORTED_CURRENCIES = ['USDC', 'EURC']
export function getDisplayCurrency() {
  const c = localStorage.getItem('ez_currency')
  return SUPPORTED_CURRENCIES.includes(c) ? c : 'USDC'
}

// Số dạng (không kèm ký hiệu) theo tiền tệ hiển thị — để layout số to + ký hiệu treo riêng.
// rates = { USDC, EURC, cirBTC, CNY } (VND mỗi 1 đơn vị, từ getDisplayRates).
export function displayNum(vnd, cur, rates) {
  if (!cur || cur === 'VND') return Math.round(vnd || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const rate = (rates && rates[cur]) || 1
  return ((vnd || 0) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
