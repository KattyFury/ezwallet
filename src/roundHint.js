// GỢI Ý SỐ CHẴN cho thanh trượt % (màn Swap, user chốt 07-17).
//
// Vấn đề: kéo theo % số dư thì ra số lẻ. Ví có $732 → 1% = $7.32, 54% = $395.28 — đọc rất khó chịu.
// Giải: khi số đang kéo GẦN một số chẵn đẹp, gợi ý "Release to use $7.50" → thả tay là ăn đúng số đó.
//
// NGƯỠNG = nhỏ hơn giữa 2 cái (cần CẢ HAI, thiếu 1 là gợi ý bậy — đã đo):
//   1. MỘT BƯỚC TRƯỢT (avail/100): thanh chạy 1%/bước → số chẵn xa hơn 1 nấc là chỗ user KHÔNG định
//      tới; gợi ý tới đó = tự ý đổi ý user. Ngưỡng cứng (vd luôn ±$5) thì vô lý cả 2 đầu: ví $50 nhảy
//      cả 10% số dư, ví $50.000 không bao giờ gợi ý nổi.
//   2. 25% CỦA CHÍNH SỐ ĐANG KÉO: chặn nhảy quá xa khi số còn nhỏ. Ví $732 kéo 1% = $7.32, nếu chỉ
//      có ngưỡng (1) = $7.32 thì $10 lọt → gợi ý tăng 36% số tiền, user giật mình. Có (2) = $1.83 →
//      ra $7 / $7.50 đúng như user mô tả.
// Đo lại mỗi khi đổi 2 hằng số này (test/roundHint.test.mjs).
const STEPS = [0.5, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
const REL_CAP = 0.25

// amount, avail: cùng đơn vị TIỀN HIỂN THỊ ($/€). Trả số chẵn nên gợi ý, hoặc null nếu không có gì hay.
// ⚠️ Kéo ĐÚNG 100% thì ĐỪNG gọi hàm này — "đổi hết" mà gợi ý số nhỏ hơn là sai ý user (xem Swap.jsx).
export function roundHint(amount, avail) {
  if (!(amount > 0) || !(avail > 0)) return null
  const tol = Math.min(avail / 100, amount * REL_CAP)
  let best = null
  for (const step of STEPS) {
    const cand = Math.round(amount / step) * step
    if (cand <= 0 || cand > avail) continue
    if (Math.abs(cand - amount) > tol) continue
    best = cand                    // STEPS tăng dần → cái cuối lọt = số CHẴN NHẤT trong tầm với
  }
  if (best === null) return null
  // Đã đứng sẵn trên số chẵn rồi thì đừng gợi ý (tránh "Release to use $7.50" khi đang đúng $7.50)
  if (Math.abs(best - amount) < Math.max(avail * 1e-6, 1e-9)) return null
  return best
}
