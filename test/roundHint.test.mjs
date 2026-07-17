// Test gợi ý số chẵn cho thanh trượt Swap: node test/roundHint.test.mjs
// Chạy lại mỗi khi đụng MANTISSAS / REL_CAP / ngưỡng trong src/roundHint.js.
// ⚠️ Mọi số ở đây là ĐƠN VỊ TOKEN (không phải USD) — xem đầu roundHint.js.
import { roundHints, fmtHint } from '../src/roundHint.js'

let pass = 0, fail = 0
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; return }
  fail++
  console.log(`  ✗ ${label}\n      muốn: ${w}\n      nhận: ${g}`)
}
const at = (avail, pct, dec = 2) => roundHints(avail * pct / 100, avail, dec)

// ── Ví dụ CHÍNH user đưa (07-17c): 735 EURC, 1% = 7.35 EURC → phải gợi ý 7 và 7.5
eq(at(735, 1), [7, 7.5], '735 EURC kéo 1% (7.35) → [7, 7.5]')

// ── Gợi ý phải TĂNG DẦN
const asc = at(735, 1)
eq(asc.every((v, i) => i === 0 || v > asc[i - 1]), true, 'gợi ý xếp tăng dần')

// ── KHÔNG BAO GIỜ vượt số dư
let over = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).some(v => v > avail + 1e-9)) over++
  }
}
eq(over, 0, 'không gợi ý nào vượt số dư')

// ── Đang đứng ĐÚNG số chẵn → đừng gợi ý lại chính nó
eq(roundHints(150, 750, 2).includes(150), false, 'đang đúng 150 → không gợi ý 150')

// ── cirBTC (số rất nhỏ, 6 số lẻ) — thang bước phải tự co theo độ lớn, KHÔNG được rỗng
const btc = roundHints(0.01542 * 0.54, 0.01542, 6)
eq(btc.length > 0, true, `cirBTC 0.01542 kéo 54% (0.008327) → có gợi ý (nhận ${JSON.stringify(btc)})`)
eq(btc.every(v => v > 0 && v <= 0.01542), true, 'gợi ý cirBTC nằm trong số dư')

// ── Biên: 0 / âm / NaN / số dư 0 → mảng rỗng, KHÔNG nổ
eq(roundHints(0, 100, 2), [], 'số tiền 0 → rỗng')
eq(roundHints(5, 0, 2), [], 'số dư 0 → rỗng')
eq(roundHints(-5, 100, 2), [], 'số tiền âm → rỗng')
eq(roundHints(NaN, 100, 2), [], 'NaN → rỗng')

// ── Số lượng gợi ý không quá 2 (chật hàng 7)
let tooMany = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).length > 2) tooMany++
  }
}
eq(tooMany, 0, 'tối đa 2 gợi ý')

// ── fmtHint: không kéo lê ".00"
eq(fmtHint(7, 2), '7', 'fmtHint 7 → "7"')
eq(fmtHint(7.5, 2), '7.5', 'fmtHint 7.5 → "7.5"')
eq(fmtHint(0.30000000000000004, 6), '0.3', 'fmtHint dọn sai số dấu phẩy động')

console.log(`\n${fail === 0 ? '✓ TẤT CẢ ĐẠT' : '✗ CÓ LỖI'} — đạt ${pass}, hỏng ${fail}`)
process.exit(fail === 0 ? 0 : 1)
