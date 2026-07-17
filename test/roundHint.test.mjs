// Test gợi ý số chẵn cho thanh trượt Swap: node test/roundHint.test.mjs
// Chạy lại mỗi khi đụng STEPS / REL_CAP / ngưỡng trong src/roundHint.js.
import { roundHint } from '../src/roundHint.js'

let pass = 0, fail = 0
const eq = (got, want, label) => {
  const ok = got === want || (typeof got === 'number' && typeof want === 'number' && Math.abs(got - want) < 1e-9)
  if (ok) { pass++; return }
  fail++
  console.log(`  ✗ ${label}\n      muốn: ${want}   nhận: ${got}`)
}
const at = (avail, pct) => roundHint(avail * pct / 100, avail)

// ── Ví dụ CHÍNH user đưa: ví $732, 1% = $7.32 lẻ → phải gợi ý số chẵn kiểu $7 / $7.50
eq(at(732, 1), 7, 'ví $732 kéo 1% ($7.32) → $7')

// ── Ví dụ trong spec: ví $753 kéo 54% ($406.62) → gần $400 thì gợi ý $400
eq(at(753, 54), 400, 'ví $753 kéo 54% ($406.62) → $400')

// ── Số lẻ sát số chẵn → gợi ý cắt cho tròn
eq(at(753, 20), 150, 'ví $753 kéo 20% ($150.60) → $150')

// ── Đứng ĐÚNG trên số chẵn rồi thì im (đừng gợi ý "dùng $10.000" khi đang đúng $10.000)
eq(at(50000, 20), null, 'ví $50.000 kéo 20% ($10.000) → đã chẵn sẵn, im')
eq(roundHint(150, 753), null, 'đang đúng $150 → im')

// ── KHÔNG BAO GIỜ gợi ý quá số dư
for (const pct of [90, 95, 99]) {
  const h = at(1234.56, pct)
  if (h !== null && h > 1234.56) { fail++; console.log(`  ✗ ví $1234.56 kéo ${pct}% gợi ý $${h} > số dư`) } else pass++
}

// ── Ví nhỏ: đừng bịa số to hơn tiền thật
eq(at(12, 7), null, 'ví $12 kéo 7% ($0.84) → không có số chẵn nào trong tầm, im')
eq(at(12, 50), null, 'ví $12 kéo 50% ($6.00) → đã chẵn, im')

// ── Biên: 0 / âm / số dư 0 → im, KHÔNG nổ
eq(roundHint(0, 100), null, 'số tiền 0 → im')
eq(roundHint(5, 0), null, 'số dư 0 → im')
eq(roundHint(-5, 100), null, 'số tiền âm → im')
eq(roundHint(NaN, 100), null, 'NaN → im')

// ── Gợi ý luôn PHẢI chẵn hơn số gốc: quét toàn dải, không được ra số xấu hơn
let ugly = 0
for (let pct = 1; pct <= 99; pct++) {
  for (const avail of [12, 87.4, 732, 753, 1234.56, 50000]) {
    const amt = avail * pct / 100
    const h = roundHint(amt, avail)
    if (h === null) continue
    if (h > avail + 1e-9) { ugly++; console.log(`  ✗ ví $${avail} ${pct}% → $${h} VƯỢT số dư`) }
    if (Math.abs(h - amt) > Math.min(avail / 100, amt * 0.25) + 1e-9) { ugly++; console.log(`  ✗ ví $${avail} ${pct}% → $${h} xa quá ngưỡng`) }
  }
}
if (ugly === 0) pass++; else fail++

console.log(`\n${fail === 0 ? '✓ TẤT CẢ ĐẠT' : '✗ CÓ LỖI'} — đạt ${pass}, hỏng ${fail}`)
process.exit(fail === 0 ? 0 : 1)
