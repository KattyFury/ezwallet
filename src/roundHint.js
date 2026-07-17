// GỢI Ý SỐ CHẴN cho thanh trượt % (màn Swap).
//
// Vấn đề: kéo theo % số dư thì ra số lẻ. Ví 735 EURC → 1% = 7.35 EURC.
// Giải: hiện vài SỐ CHẴN gần đó để BẤM CHỌN — "cho những người thích sự tròn số" (user).
//
// ⚠️ TÍNH THEO ĐƠN VỊ TOKEN ĐANG PAY, KHÔNG theo USD (user chốt 07-17c: "nó phải là % của đơn vị
// Pay chứ"). Quy sang USD rồi làm tròn sẽ ra số chẵn theo USD nhưng LẺ theo token — đúng cái
// user không muốn.
//
// SPEC MỚI (user chốt 07-17e — "hint NHIỆT TÌNH vào, hint đầu đuôi và số 0.5 giữa luôn"):
// luôn gợi ý ĐỦ BỘ BA quanh số đang kéo: sàn (floor) · sàn+0.5 · trần (ceil).
//   24.40 → [24, 24.5, 25]        23.3 → [23, 23.5, 24]        7.35 → [7, 7.5, 8]
// Bản cũ lọc theo ngưỡng "gần" (1 bước trượt / 25% số kéo) nên 24.40 chỉ ra [24, 25] thiếu 24.5,
// có khi thiếu cả đuôi — user chê "hơi thiếu". ĐỪNG thêm ngưỡng lọc lại: floor/ceil vốn đã cách
// số kéo < 1 đơn vị nên không bao giờ "nhảy quá xa" như nỗi lo cũ.
// Vẫn lọc: > 0, KHÔNG vượt số dư, không gợi ý lại đúng số đang đứng.

// Làm sạch sai số dấu phẩy động khi nhân/chia (0.1*3 = 0.30000000000000004 → chip hiện số xấu).
const clean = (v, dec) => Math.round(v * 10 ** dec) / 10 ** dec

// amount, avail: CÙNG ĐƠN VỊ TOKEN. dec = số lẻ token (2 cho USDC/EURC, 6 cho cirBTC).
// Trả MẢNG số chẵn (tăng dần, tối đa 3) để user bấm chọn. Không có gì hay → [].
export function roundHints(amount, avail, dec = 2) {
  if (!(amount > 0) || !(avail > 0)) return []
  const eps = 10 ** -dec / 2

  // Đơn vị làm tròn: số ≥ 1 → 1 (số nguyên, đúng ví dụ user). Số < 1 (cirBTC: 0.008327) mà làm
  // tròn theo 1 thì sàn = 0 → co đơn vị theo độ lớn (10^k): 0.008327 → [0.008, 0.0085, 0.009].
  const k = Math.floor(Math.log10(amount))
  const u = k >= 0 ? 1 : 10 ** k

  // +1e-9 trước khi floor: 24/1 có thể ra 23.999… do dấu phẩy động → sàn tụt nhầm 1 đơn vị
  const base = clean(Math.floor(amount / u + 1e-9) * u, dec)
  return [base, clean(base + u / 2, dec), clean(base + u, dec)].filter(v =>
    v > 0 &&
    v <= avail + 1e-12 &&                 // KHÔNG BAO GIỜ gợi ý vượt số dư
    Math.abs(v - amount) >= eps           // đang đứng đúng số đó rồi → khỏi gợi ý lại
  )
}

// Số chẵn → chuỗi gọn: 7 → "7", 7.5 → "7.5", 0.0154 → "0.0154" (không kéo lê ".00")
export function fmtHint(v, dec = 2) {
  return String(clean(v, dec))
}
