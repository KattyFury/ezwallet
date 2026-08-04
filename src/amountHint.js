// GỢI Ý SỐ TIỀN khi GÕ TAY ở màn Gửi tiền (user chốt 2026-08-04).
//
// Vấn đề: tiền Việt toàn số lớn — gửi năm trăm nghìn là phải bấm "500000", sáu lần chạm, rất dễ
// thừa/thiếu một số 0. Người lớn tuổi gõ xong cũng không chắc mình vừa gõ 50.000 hay 500.000.
// Giải: gõ vài số đầu rồi BẤM CHỌN mức mong muốn — "50" → [5.000] [50.000] [500.000].
//
// ⚠️ KHÁC HẲN roundHint.js (thanh trượt màn Swap): bên kia làm tròn số LẺ do kéo trượt ra
// (7.35 → 7 / 7.5 / 8). Bên này NHÂN THÊM SỐ 0 cho số user vừa gõ. Đừng gộp 2 cái làm một.
//
// CHỈ dùng cho tiền tệ số lớn không có số lẻ (VND). USD/EUR gõ "50" là đúng 50 đô rồi, gợi ý
// nhân 100 lần thành 5.000 đô là vô duyên và NGUY HIỂM (bấm nhầm = gửi gấp trăm lần).

// Bậc nhân: gõ "50" → 5.000 · 50.000 · 500.000 (đúng ví dụ user đưa).
const MULTIPLIERS = [100, 1000, 10000]

// digits: chuỗi user đang gõ (chỉ chữ số, vd '50'). avail: số dư khả dụng CÙNG ĐƠN VỊ tiền tệ.
// Trả mảng số (tăng dần, tối đa 3) để vẽ chip bấm được. Không có gì đáng gợi ý → [].
export function amountHints(digits, avail) {
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return []

  // Đã gõ số đủ lớn (≥ 6 chữ số = từ 100.000 trở lên) thì thôi, user biết mình đang làm gì rồi —
  // gợi ý thêm chỉ tổ che mất bàn phím.
  if (digits.replace(/^0+/, '').length >= 6) return []

  return MULTIPLIERS
    .map(m => n * m)
    .filter(v =>
      v > 0 &&
      // KHÔNG BAO GIỜ gợi ý số vượt quá số dư — bấm vào là dính lỗi "số dư không đủ" ngay.
      // avail chưa biết (null/undefined, số dư đang tải) → cứ hiện, màn tự chặn ở nút Tiếp tục.
      (avail == null || v <= avail) &&
      v !== n            // trùng đúng số đang gõ thì gợi ý làm gì
    )
}

// Số → chuỗi kiểu Việt Nam: 500000 → "500.000" (dấu CHẤM ngăn nghìn).
export function fmtAmountHint(v) {
  return v.toLocaleString('vi-VN')
}
