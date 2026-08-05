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

// amount, avail: CÙNG ĐƠN VỊ. dec = số lẻ (2 cho USDC/EURC, 6 cho cirBTC, 0 cho VND).
// Trả MẢNG số chẵn (tăng dần, tối đa 3) để user bấm chọn. Không có gì hay → [].
//
// ⚠️ SỬA 2026-08-04: đơn vị làm tròn phải CO GIÃN THEO ĐỘ LỚN của số. Bản cũ ghim u = 1 cho mọi
// số ≥ 1 → trượt tới 39.000 thì gợi ý "39.000,5" và "39.001" (đo thật, user bắt lỗi). Số càng lớn
// thì bước làm tròn càng phải lớn theo — không ai chọn tiền theo nửa đồng khi đang ở mức mấy chục
// nghìn.
//   u = 10^floor(log10(amount)) / 2  →  7.35 → 0.5 · 39.000 → 5.000 · 0.0083 → 0.0005
// Rồi lấy bội GẦN NHẤT của u làm tâm, kèm 1 bước mỗi bên:
//   7,35    → 7 · 7,5 · 8
//   39.000  → 35.000 · 40.000 · 45.000   (đúng ví dụ user đưa)
//   0,0083  → 0,008 · 0,0085 · 0,009     (cirBTC, dec=6)
//
// ⚠️ ĐÁNH ĐỔI ĐÃ CHỐT (user chọn phương án A, 2026-08-04): 24,4 giờ ra "20 · 25 · 30" chứ KHÔNG
// còn "24 · 24,5 · 25" như spec 07-17e. Một công thức KHÔNG THỂ vừa cho bước 0,5 ở mức 24 vừa
// cho bước 5.000 ở mức 39.000. User đã xem bảng so sánh và chọn giữ MỘT công thức duy nhất thay
// vì tách hai nhánh theo độ lớn. ĐỪNG "sửa lại cho giống 07-17" — đó là quyết định cũ đã bị thay.
export function roundHints(amount, avail, dec = 2) {
  if (!(amount > 0) || !(avail > 0)) return []
  const eps = 10 ** -dec / 2

  const u = 10 ** Math.floor(Math.log10(amount)) / 2
  // Bội GẦN NHẤT của u (không phải sàn) → tâm của bộ ba nằm sát số đang trượt nhất.
  const mid = clean(Math.round(amount / u) * u, dec)

  return [clean(mid - u, dec), mid, clean(mid + u, dec)].filter(v =>
    v > 0 &&
    v <= avail + 1e-12 &&                 // KHÔNG BAO GIỜ gợi ý vượt số dư
    Math.abs(v - amount) >= eps           // đang đứng đúng số đó rồi → khỏi gợi ý lại
  )
}

// Số chẵn → chuỗi gọn: 7 → "7", 7.5 → "7.5", 0.0154 → "0.0154" (không kéo lê ".00")
export function fmtHint(v, dec = 2) {
  return String(clean(v, dec))
}
