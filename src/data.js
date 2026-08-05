export function fmtVND(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VND'
}

// ⚠️ Gas trên Arc trả bằng USDC → LUÔN chừa lại 1 USDC không cho tiêu (gửi/swap),
// kẻo khách bấm "gửi hết"/"swap hết" xong không còn phí giao dịch, kẹt ví (user chốt 2026-07-03).
// Chỉ áp cho USDC (token gas); EURC/cirBTC tiêu hết được. Dùng ở MỌI chỗ tính "khả dụng".
export const GAS_RESERVE_USDC = 1

// Địa chỉ này CÓ PHẢI ví của chính user không? (user chốt 07-31: "phải không cho phép tao gửi
// tiền vào ví mình chứ"). Gửi cho chính mình chỉ tốn phí mạng, số dư không đổi, và còn làm rối
// lịch sử — chặn ngay ở chỗ NHẬP địa chỉ thay vì để user phát hiện sau khi mất tiền phí.
// Thiếu địa chỉ trong localStorage → trả false (KHÔNG chặn nhầm); màn SendAmount có chốt chặn
// cuối bằng địa chỉ lấy từ Circle nên vẫn an toàn.
export function isOwnAddress(addr) {
  const me = (localStorage.getItem('ez_wallet_addr') || '').trim().toLowerCase()
  return !!me && !!addr && addr.trim().toLowerCase() === me
}
export function spendableOf(symbol, balance) {
  const b = balance || 0
  return symbol === 'USDC' ? Math.max(0, b - GAS_RESERVE_USDC) : b
}

// Cỡ chữ số tiền AUTO CO NHỎ theo độ dài chuỗi (Barlow ~0.5em/ký tự) để số dài KHÔNG tràn/bể
// layout (vd nhập "0.00000001"). base = cỡ tối đa (px); maxChars = số ký tự vừa khít ở base;
// dài hơn thì co tuyến tính xuống, có sàn minPx để không nhỏ quá đọc không nổi.
export function amountFontSize(str, base, maxChars, minPx = 20) {
  const len = (str || '').length || 1
  return len <= maxChars ? base : Math.max(minPx, Math.round(base * maxChars / len))
}

// Làm tròn XUỐNG tới `dec` chữ số thập phân — dùng cho nút Max/100%: toFixed() làm tròn LÊN nên
// số ra có thể > số dư thật → bị chặn "vượt số dư". floor thì luôn ≤ số dư, gửi/swap được.
export function floorTo(n, dec) {
  const p = 10 ** dec
  return Math.floor((n || 0) * p) / p
}

// Ký hiệu tiền tệ THÂN THIỆN cho người dùng phổ thông: USDC≈USD, EURC≈EUR (stablecoin 1:1).
// Người già biết $/€ chứ không biết USDC/EURC → chỉ đổi CHỮ HIỂN THỊ (tiền tố, vd "$127.66");
// chain/API/lưu trữ vẫn dùng symbol thật (USDC/EURC). CHỈ dùng cho TIỀN HIỂN THỊ (tổng, quy
// đổi, phí) — KHÔNG áp cho tên token thật (USDC/EURC/cirBTC vẫn hiện nguyên trong danh sách token).
// ⚠️ CẤU HÌNH TIỀN TỆ HIỂN THỊ — nguồn sự thật DUY NHẤT cho ký hiệu / số lẻ / cách viết số.
// Thêm tiền tệ mới thì thêm 1 dòng ở đây, ĐỪNG rải if/else "nếu là VND thì..." khắp các màn.
//   symbol : ký hiệu hiển thị
//   after  : true = ký hiệu đứng SAU số (1.250.000 ₫ — đúng chính tả tiếng Việt).
//            false = đứng TRƯỚC ($127.66). Đây là lý do phải có hàm fmtDisplay() dùng chung:
//            trước đây mọi màn tự nối `${symbol}${số}` nên mặc định ký hiệu luôn đứng trước.
//   dec    : số chữ số thập phân. VND = 0 (không ai ghi "1.250.000,00 ₫").
//   locale : quy tắc dấu phân cách — 'vi-VN' dùng DẤU CHẤM ngăn nghìn (1.250.000),
//            'en-US' dùng dấu phẩy (1,250,000).
const CURRENCY_CFG = {
  USDC: { symbol: '$', after: false, dec: 2, locale: 'en-US' },
  EURC: { symbol: '€', after: false, dec: 2, locale: 'en-US' },
  VND:  { symbol: '₫', after: true,  dec: 0, locale: 'vi-VN' },
}
const cfgOf = cur => CURRENCY_CFG[cur] || CURRENCY_CFG.USDC

export function displaySymbol(sym) { return CURRENCY_CFG[sym]?.symbol || sym }
// Ký hiệu đứng sau số? (BalanceHeader treo ký hiệu riêng để layout số to nên cần biết bên nào)
export function symbolAfter(cur) { return cfgOf(cur).after }
export function decimalsOfCurrency(cur) { return cfgOf(cur).dec }

// Chuỗi tiền HOÀN CHỈNH (số + ký hiệu đúng vị trí) từ giá trị USD. Dùng hàm này thay cho việc
// tự nối `${displaySymbol(cur)}${displayNum(...)}` — nối tay sẽ đặt sai vị trí ký hiệu VND.
export function fmtDisplay(usd, cur, rates) {
  const c = cfgOf(cur)
  const n = displayNum(usd, cur, rates)
  return c.after ? `${n} ${c.symbol}` : `${c.symbol}${n}`
}

// Format tiền MỘT CHUỖI MỘT STYLE: "$2" (không phải "2 USD" tách số đậm + đơn vị thường —
// user chốt 2026-07-03: lệch font weight/size giữa số và đơn vị là LỖI). USD/EUR đứng TRƯỚC
// dạng ký hiệu; token thật (USDC/EURC/cirBTC) đứng SAU cách 1 space.
export function fmtMoney(amount, currency) {
  if (currency === 'USD' || currency === 'USDC') return `$${amount}`
  if (currency === 'EUR') return `€${amount}`
  return `${amount} ${currency}`
}

// Tiền tệ hiển thị toàn app (số dư, quy đổi, phí) — chọn ở màn Language & Currency.
// USDC/EURC = stablecoin có thật trong ví. VND = tiền pháp định, CHỈ để hiển thị/nhập cho dễ hình
// dung — thứ THỰC SỰ chạy trên chain vẫn là USDC (xem SendAmount/SendConfirm). CNY còn khoá vì
// chưa wire tỷ giá (mở: thêm 'CNY' vào đây + 1 dòng CURRENCY_CFG + tỷ giá ở chain.js fetchPrices).
const SUPPORTED_CURRENCIES = ['USDC', 'EURC', 'VND']
export function getDisplayCurrency() {
  const c = localStorage.getItem('ez_currency')
  return SUPPORTED_CURRENCIES.includes(c) ? c : 'USDC'
}

// Số dạng (không kèm ký hiệu) theo tiền tệ hiển thị — để layout số to + ký hiệu treo riêng.
// usd = giá trị USD (từ token.usd / getDisplayRates cùng nguồn). rates = { USDC:1, EURC:~1.08, cirBTC } (USD/đơn vị).
// Quy ra tiền hiển thị = usd / rate[cur]: cur=USDC → chính usd ($); cur=EURC → usd/1.08 (€). Stablecoin ra ĐÚNG 1:1.
export function displayNum(usd, cur, rates) {
  const rate = (rates && rates[cur]) || 1
  const c = cfgOf(cur)
  return ((usd || 0) / rate).toLocaleString(c.locale, { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec })
}
