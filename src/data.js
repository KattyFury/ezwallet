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
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`
}

// Số dạng (không kèm ký hiệu) theo tiền tệ hiển thị — để layout số to + ký hiệu treo riêng
export function displayNum(vnd, cur, rates) {
  if (!cur || cur === 'VND') return Math.round(vnd || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const rate = (rates && rates[cur]) || 1
  return ((vnd || 0) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
