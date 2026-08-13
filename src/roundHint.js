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
// ══ BƯỚC LÀM TRÒN — user chốt 2026-08-13 (bản thứ 3, đọc hết trước khi sửa) ══
//
//   số ≥ 30   → bước 1     (làm tròn HÀNG ĐƠN VỊ)      101 → 100 · 101 · 102
//   3 ≤ số < 30 → bước 0,5                             17,3 → 17 · 17,5 · 18
//   số < 3    → co nhỏ tiếp theo độ lớn                0,0083 → 0,008 · 0,0085 · 0,009
//
// Rồi lấy bội GẦN NHẤT của bước làm tâm, kèm 1 bước mỗi bên.
// ⚠️ GẦN NHẤT chứ không phải SÀN (user chốt "Luật A" 08-13): 9,15 → 8,5 · 9 · 9,5.
// Lấy sàn thì 9,15 ra "9 · 9,5 · 10", user đã loại.
//
// ⚠️ LỊCH SỬ 2 LẦN SỬA HỎNG — ĐỪNG QUAY LẠI:
//  · 07-17e: ghim bước 0,5 cho MỌI số → trượt tới 39.000 gợi ý "39.000,5" (user bắt lỗi).
//  · 08-04: đổi sang u = 0,5 × 10^floor(log10(số)) → bước NHẢY GẤP 10 LẦN ngay tại mốc 10:
//    9,99 bước 0,5 mà 10,0 bước thành 5 ⇒ kéo 14,55 lại gợi ý "10 · 15 · 20" (user báo 08-13).
//    Bài học: bước làm tròn theo LUỸ THỪA 10 thì mỗi thập phân chỉ có 1 bậc — quá thô.
// Bản này chỉ có MỘT bậc nhảy duy nhất (0,5 → 1 tại mốc 30) và nhảy 2 lần chứ không phải 10 lần,
// nên không còn hiện tượng nhích 1 xu mà gợi ý đổi hẳn hàng.
//
// ⚠️ Nhánh "< 3" BẮT BUỘC GIỮ: cirBTC chỉ vài phần nghìn, ghim bước 0,5 thì tâm làm tròn về 0 →
// mọi gợi ý bị lọc sạch (v > 0) → hàng chip TRỐNG TRƠN.
export function roundHints(amount, avail, dec = 2) {
  if (!(amount > 0) || !(avail > 0)) return []
  const eps = 10 ** -dec / 2

  const u = amount >= 30 ? 1
    : amount >= 3 ? 0.5
    : 0.5 * 10 ** Math.floor(Math.log10(amount / 3))
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
