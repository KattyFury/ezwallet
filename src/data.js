export const TOKENS = [
  { symbol: 'USDC',   name: 'USD Coin',   vnd: 1_234_567, amount: 50.0,  color: '#2775CA' },
  { symbol: 'EURC',   name: 'EUR Coin',   vnd: 0,         amount: 0,     color: '#1A56DB' },
  { symbol: 'cirBTC', name: 'Circle BTC', vnd: 0,         amount: 0,     color: '#F7931A' },
]

export const SWAP_PAIRS = [
  ['USDC', 'EURC'],
  ['USDC', 'cirBTC'],
  ['EURC', 'cirBTC'],
]

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

// Tiền tệ hiển thị toàn app (số dư, quy đổi, phí) — anh chọn ở Onboarding/Cài đặt.
// Hiện chỉ hỗ trợ stablecoin USDC/EURC (mặc định USDC). Giá trị cũ (VND/CNY) tự quy về USDC.
const SUPPORTED_CURRENCIES = ['USDC', 'EURC']
export function getDisplayCurrency() {
  const c = localStorage.getItem('ez_currency')
  return SUPPORTED_CURRENCIES.includes(c) ? c : 'USDC'
}

// Quy 1 giá trị VND về tiền tệ hiển thị. rates = { USDC, EURC, CNY } (VND mỗi 1 đơn vị).
// VND → giữ nguyên (chấm ngăn nghìn). Token → 2 số lẻ.
export function fmtDisplay(vnd, cur, rates) {
  if (!cur || cur === 'VND') return fmtVND(Math.round(vnd || 0))
  const rate = (rates && rates[cur]) || 1
  const v = (vnd || 0) / rate
  return `${displaySymbol(cur)}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Số dạng (không kèm ký hiệu) theo tiền tệ hiển thị — để layout số to + ký hiệu treo riêng
export function displayNum(vnd, cur, rates) {
  if (!cur || cur === 'VND') return Math.round(vnd || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const rate = (rates && rates[cur]) || 1
  return ((vnd || 0) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
