// Test gợi ý số chẵn cho thanh trượt Swap: node test/roundHint.test.mjs
//
// ⚠️ SPEC HIỆN HÀNH — user chốt 2026-08-13 (bản thứ 3):
//   số ≥ 30 → bước 1 (hàng đơn vị) · 3 ≤ số < 30 → bước 0,5 · số < 3 → co nhỏ theo độ lớn.
// Lấy bội GẦN NHẤT của bước làm tâm, kèm 1 bước mỗi bên. Xem đầy đủ ở đầu src/roundHint.js.
// Bản 08-04 (u = 0,5 × 10^floor(log10(số))) ĐÃ BỎ: bước nhảy GẤP 10 ngay tại mốc 10 nên kéo
// 14,55 lại gợi ý "10 · 15 · 20" — user báo lỗi 08-13.
//
// 📌 File này TỪNG BỊ BỎ QUÊN: commit 08-04 (ae8979e) sửa roundHint.js nhưng KHÔNG sửa test →
// 5 case dưới đây kẹt ở spec 07-17e, `npm test` đỏ suốt từ đó tới 08-13 dù app chạy đúng.
// Sửa roundHint.js lần sau thì SỬA LUÔN FILE NÀY trong CÙNG commit.
//
// ⚠️ Mọi số ở đây là ĐƠN VỊ TOKEN (không phải USD) — xem đầu roundHint.js.
import { roundHints, fmtHint } from '../src/roundHint.js'

let pass = 0, fail = 0
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; return }
  fail++
  console.log(`  ✗ ${label}\n      muốn: ${w}\n      nhận: ${g}`)
}

// ── Bước 0,5 giữ nguyên trong khoảng 3–30 (chính là ca user báo lỗi 08-13)
eq(roundHints(24.40, 1000), [24, 24.5, 25], '24.40 → [24, 24.5, 25]')
eq(roundHints(23.3, 1000), [23, 23.5, 24], '23.3 → [23, 23.5, 24]')
eq(roundHints(14.55, 1000), [14, 14.5, 15], '14.55 → [14, 14.5, 15] (ca user báo lỗi)')
eq(roundHints(17.3, 1000), [17, 17.5, 18], '17.3 → [17, 17.5, 18] (ca user báo lỗi)')
eq(roundHints(9.15, 1000), [8.5, 9, 9.5], '9.15 → [8.5, 9, 9.5] — bội GẦN NHẤT, không phải sàn')
// ── Từ 30 trở lên: bước 1, làm tròn HÀNG ĐƠN VỊ
eq(roundHints(101.3, 1000), [100, 101, 102], '101.3 → [100, 101, 102] (hàng đơn vị)')
// Kéo ĐÚNG 101 thì 101 bị bộ lọc "đừng gợi ý lại chính nó" loại — còn 2 chip, đúng ý đồ
eq(roundHints(101, 1000), [100, 102], 'đang đúng 101 → [100, 102] (không lặp 101)')
eq(roundHints(30.1, 1000), [29, 30, 31], '30.1 → [29, 30, 31] (vừa qua mốc 30)')
eq(roundHints(29.9, 1000), [29.5, 30, 30.5], '29.9 → [29.5, 30, 30.5] (còn dưới mốc 30)')
eq(roundHints(39000, 200000), [38999, 39001], '39.000 → [38999, 39001] (bỏ chính nó ở giữa)')

// ── Ví dụ cũ 07-17c vẫn phải hợp lý: 735 EURC kéo 1% = 7.35 → bước 0.5 ở mức đơn vị
eq(roundHints(7.35, 735), [7, 7.5, 8], '7.35 → [7, 7.5, 8]')

// ── Gợi ý phải TĂNG DẦN
const asc = roundHints(24.40, 1000)
eq(asc.every((v, i) => i === 0 || v > asc[i - 1]), true, 'gợi ý xếp tăng dần')

// ── KHÔNG BAO GIỜ vượt số dư: cái nào vượt thì rụng, kể cả rụng gần hết
eq(roundHints(24.40, 24.6), [24, 24.5], 'số dư 24.6: 25 rụng → [24, 24.5]')
let over = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).some(v => v > avail + 1e-9)) over++
  }
}
eq(over, 0, 'quét 1-100% × 5 ví: không gợi ý nào vượt số dư')

// ── Đang đứng ĐÚNG số chẵn → đừng gợi ý lại chính nó (2 số còn lại vẫn hiện)
eq(roundHints(150, 750, 2), [149, 151], 'đang đúng 150 → [149, 151] (không lặp 150)')
eq(roundHints(25, 1000), [24.5, 25.5], 'đang đúng 25 → [24.5, 25.5] (không lặp 25)')
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
