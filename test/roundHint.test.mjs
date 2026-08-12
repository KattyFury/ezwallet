// Test gợi ý số chẵn cho thanh trượt Swap: node test/roundHint.test.mjs
//
// ⚠️ SPEC HIỆN HÀNH = "PHƯƠNG ÁN A" (user chốt 2026-08-04), KHÔNG phải spec 07-17e nữa.
// Đơn vị làm tròn CO GIÃN theo độ lớn: u = 10^floor(log10(số)) / 2 → lấy bội gần nhất của u
// làm tâm, kèm 1 bước mỗi bên.   7,35 → 7·7,5·8   ·   24,4 → 20·25·30   ·   39.000 → 35k·40k·45k
// Lý do đổi: bản 07-17e ghim bước 0,5 nên trượt tới 39.000 lại gợi ý "39.000,5" (user bắt lỗi).
// Một công thức KHÔNG THỂ vừa cho bước 0,5 ở mức 24 vừa cho bước 5.000 ở mức 39.000 — user xem
// bảng so sánh rồi chọn giữ MỘT công thức duy nhất. Xem đầy đủ ở đầu src/roundHint.js.
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

// ── Bước làm tròn CO GIÃN theo độ lớn (lõi của phương án A 08-04)
eq(roundHints(24.40, 1000), [20, 25, 30], '24.40 → [20, 25, 30] (bước 5 ở mức chục)')
eq(roundHints(23.3, 1000), [20, 25, 30], '23.3 → [20, 25, 30] (bước 5 ở mức chục)')
eq(roundHints(39000, 200000), [35000, 40000, 45000], '39.000 → [35k, 40k, 45k] (ví dụ user 08-04)')

// ── Ví dụ cũ 07-17c vẫn phải hợp lý: 735 EURC kéo 1% = 7.35 → bước 0.5 ở mức đơn vị
eq(roundHints(7.35, 735), [7, 7.5, 8], '7.35 → [7, 7.5, 8]')

// ── Gợi ý phải TĂNG DẦN
const asc = roundHints(24.40, 1000)
eq(asc.every((v, i) => i === 0 || v > asc[i - 1]), true, 'gợi ý xếp tăng dần')

// ── KHÔNG BAO GIỜ vượt số dư: cái nào vượt thì rụng, kể cả rụng gần hết
eq(roundHints(24.40, 24.6), [20], 'số dư 24.6: 25 và 30 rụng → [20]')
let over = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).some(v => v > avail + 1e-9)) over++
  }
}
eq(over, 0, 'quét 1-100% × 5 ví: không gợi ý nào vượt số dư')

// ── Đang đứng ĐÚNG số chẵn → đừng gợi ý lại chính nó (2 số còn lại vẫn hiện)
eq(roundHints(150, 750, 2), [100, 200], 'đang đúng 150 → [100, 200] (không lặp 150)')
eq(roundHints(25, 1000), [20, 30], 'đang đúng 25 → [20, 30] (không lặp 25)')
// 24.5 KHÔNG còn là số chẵn theo phương án A (bước ở mức chục là 5) → không có gì bị loại
eq(roundHints(24.5, 1000), [20, 25, 30], '24.5 → [20, 25, 30] (24.5 không phải mốc chẵn nữa)')

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
