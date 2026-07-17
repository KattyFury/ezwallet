// GỢI Ý SỐ CHẴN cho thanh trượt % (màn Swap, user chốt 07-17).
//
// Vấn đề: kéo theo % số dư thì ra số lẻ. Ví 735 EURC → 1% = 7.35 EURC, 54% = 396.9 EURC.
// Giải: hiện vài SỐ CHẴN gần đó để BẤM CHỌN — "cho những người thích sự tròn số" (user).
//
// ⚠️ TÍNH THEO ĐƠN VỊ TOKEN ĐANG PAY, KHÔNG theo USD (user chốt 07-17c: "nó phải là % của đơn vị
// Pay chứ, hiện tại thanh trượt lại lấy USD là chuẩn"). 1% của 735 EURC = 7.35 EURC → gợi ý
// "7 EURC" / "7.5 EURC". Quy sang USD rồi làm tròn sẽ ra số chẵn theo USD nhưng LẺ theo token
// (vd $7 = 6.48 EURC) — đúng cái user không muốn.
//
// NGƯỠNG = nhỏ hơn giữa 2 cái (cần CẢ HAI, thiếu 1 là gợi ý bậy — đã đo):
//   1. MỘT BƯỚC TRƯỢT (avail/100): thanh chạy 1%/bước → số chẵn xa hơn 1 nấc là chỗ user KHÔNG
//      định tới; gợi ý tới đó = tự ý đổi ý user.
//   2. 25% CỦA CHÍNH SỐ ĐANG KÉO: chặn nhảy quá xa khi số còn nhỏ. Ví 732 kéo 1% = 7.32, nếu chỉ
//      có ngưỡng (1) = 7.32 thì 10 lọt → gợi ý tăng 36%, user giật mình. Có (2) = 1.83 → ra 7 / 7.5.
// Đo lại mỗi khi đổi (test/roundHint.test.mjs).
// Bước chẵn = 1 hoặc 5 × 10^k → …0.1, 0.5, 1, 5, 10, 50, 100… tức "số nguyên" và "số rưỡi".
// ⚠️ ĐỪNG thêm mantissa 2: 7.35 sẽ đẻ ra gợi ý "8" (bước 2) và vì 8 chẵn hơn 7.5 (bước lớn hơn)
// nên nó ĐẨY 7.5 ra khỏi danh sách → mất đúng con số user muốn ("7 EURC / 7.5 EURC", user chốt 07-17c).
const MANTISSAS = [1, 5]
const REL_CAP = 0.25
const MAX_HINTS = 2   // hàng 7 hẹp + user chỉ cần 2 lựa chọn (số nguyên & số rưỡi)

// Sinh thang bước CHẴN bám theo ĐỘ LỚN của chính số đang kéo → chạy đúng cho cả EURC (7.35) lẫn
// cirBTC (0.0154). Thang cứng [0.5,1,5,10…] chỉ hợp token giá ~$1, cirBTC sẽ không bao giờ có gợi ý.
function stepsFor(amount) {
  const out = []
  const top = Math.floor(Math.log10(amount))
  for (let k = top - 2; k <= top + 1; k++) {
    for (const m of MANTISSAS) out.push(m * 10 ** k)
  }
  return out.filter(s => s > 0).sort((a, b) => a - b)
}

// Làm sạch sai số dấu phẩy động khi nhân/chia (0.1*3 = 0.30000000000000004 → chip hiện số xấu).
const clean = (v, dec) => Math.round(v * 10 ** dec) / 10 ** dec

// amount, avail: CÙNG ĐƠN VỊ TOKEN. dec = số lẻ token (2 cho USDC/EURC, 6 cho cirBTC).
// Trả MẢNG số chẵn (tăng dần, tối đa MAX_HINTS) để user bấm chọn. Không có gì hay → [].
export function roundHints(amount, avail, dec = 2) {
  if (!(amount > 0) || !(avail > 0)) return []
  const tol = Math.min(avail / 100, amount * REL_CAP)
  const eps = 10 ** -dec / 2

  const found = new Map()   // value → step (step to = số càng chẵn)
  for (const step of stepsFor(amount)) {
    const cand = clean(Math.round(amount / step) * step, dec)
    if (cand <= 0 || cand > avail + 1e-12) continue
    if (Math.abs(cand - amount) > tol) continue
    if (Math.abs(cand - amount) < eps) continue          // đang đứng đúng số đó rồi → khỏi gợi ý
    if (!found.has(cand) || found.get(cand) < step) found.set(cand, step)
  }
  if (!found.size) return []

  // Chọn MAX_HINTS số CHẴN NHẤT (step lớn nhất), rồi xếp TĂNG DẦN cho dễ đọc ("7 EURC  7.5 EURC")
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_HINTS)
    .map(([v]) => v)
    .sort((a, b) => a - b)
}

// Số chẵn → chuỗi gọn: 7 → "7", 7.5 → "7.5", 0.0154 → "0.0154" (không kéo lê ".00")
export function fmtHint(v, dec = 2) {
  return String(clean(v, dec))
}
