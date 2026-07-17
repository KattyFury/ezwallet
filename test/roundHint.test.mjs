// Test gợi ý số chẵn cho thanh trượt Swap: node test/roundHint.test.mjs
// Spec 07-17e (user chốt): BỘ BA sàn · sàn+0.5 · trần — "hint nhiệt tình, đầu đuôi và 0.5 giữa".
// ⚠️ Mọi số ở đây là ĐƠN VỊ TOKEN (không phải USD) — xem đầu roundHint.js.
import { roundHints, fmtHint } from '../src/roundHint.js'

let pass = 0, fail = 0
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; return }
  fail++
  console.log(`  ✗ ${label}\n      muốn: ${w}\n      nhận: ${g}`)
}

// ── 2 ví dụ CHÍNH user đưa (07-17e)
eq(roundHints(24.40, 1000), [24, 24.5, 25], '24.40 → [24, 24.5, 25] (ví dụ user)')
eq(roundHints(23.3, 1000), [23, 23.5, 24], '23.3 → [23, 23.5, 24] (ví dụ user)')

// ── Ví dụ cũ 07-17c vẫn phải hợp lý: 735 EURC kéo 1% = 7.35 → thêm đuôi 8
eq(roundHints(7.35, 735), [7, 7.5, 8], '7.35 → [7, 7.5, 8]')

// ── Gợi ý phải TĂNG DẦN
const asc = roundHints(24.40, 1000)
eq(asc.every((v, i) => i === 0 || v > asc[i - 1]), true, 'gợi ý xếp tăng dần')

// ── KHÔNG BAO GIỜ vượt số dư: trần vượt thì rụng, sàn + 0.5 giữ lại
eq(roundHints(24.40, 24.6), [24, 24.5], 'số dư 24.6: trần 25 rụng → [24, 24.5]')
let over = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).some(v => v > avail + 1e-9)) over++
  }
}
eq(over, 0, 'quét 1-100% × 5 ví: không gợi ý nào vượt số dư')

// ── Đang đứng ĐÚNG số chẵn → đừng gợi ý lại chính nó (2 số còn lại vẫn hiện)
eq(roundHints(150, 750, 2), [150.5, 151], 'đang đúng 150 → [150.5, 151] (không lặp 150)')
eq(roundHints(24.5, 1000), [24, 25], 'đang đúng 24.5 → [24, 25] (không lặp 24.5)')

// ── cirBTC (số rất nhỏ, 6 số lẻ) — đơn vị tự co theo độ lớn, KHÔNG rỗng, không vượt số dư
eq(roundHints(0.008327, 0.01542, 6), [0.008, 0.0085, 0.009], 'cirBTC 0.008327 → [0.008, 0.0085, 0.009]')

// ── Biên: 0 / âm / NaN / số dư 0 → mảng rỗng, KHÔNG nổ
eq(roundHints(0, 100, 2), [], 'số tiền 0 → rỗng')
eq(roundHints(5, 0, 2), [], 'số dư 0 → rỗng')
eq(roundHints(-5, 100, 2), [], 'số tiền âm → rỗng')
eq(roundHints(NaN, 100, 2), [], 'NaN → rỗng')

// ── Số lượng gợi ý không quá 3 (chật hàng 7)
let tooMany = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).length > 3) tooMany++
  }
}
eq(tooMany, 0, 'tối đa 3 gợi ý')

// ── fmtHint: không kéo lê ".00"
eq(fmtHint(7, 2), '7', 'fmtHint 7 → "7"')
eq(fmtHint(7.5, 2), '7.5', 'fmtHint 7.5 → "7.5"')
eq(fmtHint(0.30000000000000004, 6), '0.3', 'fmtHint dọn sai số dấu phẩy động')

console.log(`\n${fail === 0 ? '✓ TẤT CẢ ĐẠT' : '✗ CÓ LỖI'} — đạt ${pass}, hỏng ${fail}`)
process.exit(fail === 0 ? 0 : 1)
