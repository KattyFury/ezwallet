# Send money — build spec (decisions log)

Quy tắc chung (màu/font/shadow/grid/NavBar) đã gộp vào [FIGMA-SCREENS-SPEC.md](FIGMA-SCREENS-SPEC.md) —
file này CHỈ còn phần riêng của màn Send money + log các quyết định đã chốt 2026-09-08, để không lặp/lệch
với file kia.

Nguồn: Figma `iQxFGA890VhyXkEKipCC9C`, frame "Send money" node `18:580` (nội dung `20:628`).

## Thay đổi kiến trúc so với hiện tại

`src/screens/SendAmount.jsx` hôm nay = numpad cố định luôn hiện, gõ số tay. Thiết kế mới **bỏ hẳn cách
đó**, copy nguyên UX của `src/screens/Swap.jsx`: % slider của số dư + chip gợi ý số tròn (`roundHints`) +
numpad chỉ hiện dạng bottom-sheet khi cần gõ chính xác (`openPad`). Đây là thay đổi kiến trúc, không phải
chỉnh giao diện — Send money giờ là "anh em" của `Swap.jsx`, không phải bản nâng cấp của `SendAmount.jsx`.

## Layout theo hàng (grid 10 hàng — xem FIGMA-SCREENS-SPEC.md §1)

| Hàng | Nội dung |
|---|---|
| 1 | Title "Send money" |
| 2-3 | Card "You send": nhãn · chip token (icon+symbol+caret) · số tiền lớn `44px` **Light** (không phải Regular như Figma vẽ — xem FIGMA-SCREENS-SPEC.md §3) · dòng "Available: 20.00 EURC" |
| giữa 3-4 | Nút tròn icon "gửi" (mũi tên ra/paper-plane) — **KHÔNG bóng, không clickable** (cùng component slot với nút reverse của Swap/Exchange, đổi icon theo màn — xem FIGMA-SCREENS-SPEC.md §4/§9/§10) |
| 4-5 | Card "To: <tên>" — **KHÔNG có dòng Fee** (dòng "Fee: $0.01" trong Figma là placeholder copy từ Exchange, đã xác nhận bỏ) |
| 5-6 | Ô "Message (optional)" + nút icon nhỏ bên cạnh |
| nửa hàng 6 → hết 8 | **Tái sử dụng nguyên `PctSlider` + round-number hints từ `Swap.jsx`** — không vẽ slider mới. User xác nhận trực tiếp đây là ảnh dán tạm của đúng cái slider đang có, không phải thiết kế mới. |
| 9 | Nút CTA — giữ nguyên chữ hiện có trong code: **"Slide or tap here to enter"** (không đổi thành "input" dù Figma vẽ vậy) |
| 10 | "Exit" — chữ đỏ, không khung, không NavBar ở màn này (giống Swap/Exchange) |

## Quyết định đã chốt 2026-09-08

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Nút tròn giữa 2 card có chức năng gì? | Không phải leftover — cùng component reverse-icon của Swap, đổi icon thành "gửi" trên Send money. **Không clickable trên Send money → không bóng.** |
| 2 | Copy nút CTA "input" hay "enter"? | Giữ **"enter"** (đúng code hiện tại), không đổi theo Figma. |
| 3 | Sau khi bấm CTA thì sao? | Vẫn qua `SendConfirm.jsx`/`SendReceipt.jsx` như flow hiện tại — KHÔNG gộp gửi trực tiếp như Swap. |
| 4 | Dòng "Fee: $0.01" là gì? | Placeholder copy từ Exchange — **bỏ khỏi Send money**, gửi tiền không hiện phí riêng như hiện tại. |
| 5 | Nền card xám hay xanh nhạt? | Xám `#F1F5F9` — xanh nhạt bị bỏ hẳn, xem BRAND-GUIDELINE.md. |
| 6 | Chính sách màu lệch token (muted/đỏ)? | Màu Figma = brand guideline mới, áp dụng nguyên — xem BRAND-GUIDELINE.md/FIGMA-SCREENS-SPEC.md §2. |
| 7 | Chính sách bóng đổ? | Bóng chỉ cho phần tử clickable, kiểu glow không offset — xem FIGMA-SCREENS-SPEC.md §4. |
| 8 | Cỡ/weight số tiền lớn? | `44px`, weight **Light** (không phải Regular như Figma). |
| 9 | Weight chữ nói chung có ép về Regular/Semibold không? | Không — vẫn dùng đủ thang 4 mức theo kiến thức thiết kế từng chỗ. |

Không còn câu hỏi mở nào riêng cho Send money — sẵn sàng build khi cần.
