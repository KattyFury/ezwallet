# EZwallet Brand Guideline

## Color
Brand: #0B53BF (solid)
Success: #14AE5C
Danger: #FF383C
Warning: #E8B931
Text primary: #000000
Text secondary (meta label): #667085
Text muted (placeholder/nav inactive): #94A3B8
Surface / input / card: #E1E7ED
Background: #FFFFFF

## Typography
Font: system stack

Text scale - user decision 2026-09-10, REPLACES the H1/H2/Body/Caption rows below entirely (kept only as
history in HANDOFF.md, not read from here anymore):
Header 1: 28px - screen titles (matches the live Figma measurement exactly)
Header 2: 22px - inline emphasis: a name, an amount inside a row (matches the live Figma measurement exactly)
Nội dung 1: 19px - card labels, buttons, chips (a deliberate round-number consolidation - the raw Figma
  reading across these elements is 18px; 19 was chosen for a cleaner, evenly-stepped scale)
Nội dung 2: 17px - meta "Label:" values, secondary captions (same consolidation - raw reading is 16px)
Chú thích: 15px - the smallest tier; also absorbs what used to be separate 13px notes/badges

Weight: mostly Semibold (600) for the tiers above; body/reading content stays Regular (400). Not locked to
exactly 2 weights - use judgement per element, same as before.
Hero number (balance, amount-entry, receipt amount): weight Light, size measured per screen - a SEPARATE
system from the 5-tier text scale above, not folded into it.

## Spacing / Grid
Scale: 4, 8, 12, 16, 24, 32, 48, 64
Lề màn hình (`.screen` padding, KHÔNG dùng cho card - xem lưới ngang bên dưới): 20px
Grid unit: 8px
Max width: 430px

**Lưới dọc - 10 hàng, gutter 16px giữa mỗi hàng.** Chiều cao THẬT của 1 hàng là 70px, không phải chia
đều 844/10=84.4px (844 − 9×16 = 700, ÷10 = 70 - thiếu gutter này là nguyên nhân gốc khiến cả app lệch
~14px suốt nhiều tháng, sửa 2026-09-10). Hàng N: `top = (N−1) × 86`, `bottom = top + 70`.

| Hàng | y (of 844) | Dùng cho |
|---|---|---|
| 1 | 0–70 | tiêu đề màn / số dư |
| 2–5 | 86–414 | card token/QR (2 hàng: 86-242, hoặc đầy đủ 4 hàng) |
| 6–8 | 430–672 | khay xám (thông báo / numpad) |
| 9 | 688–758 | hàng nút hành động dưới cùng |
| 10 | 774–844 | NavBar |

**Lưới ngang - 12 cột, gutter 8px trên toàn bề rộng 390px.** Cột rộng `(390 − 11×8) / 12 = 25.167px`.
- Card/box tiêu chuẩn (340px): cột 2–11 CỘNG gutter ngoài = inset **6.41%** (25px) mỗi bên MÀN HÌNH.
  Đây là lề của MỌI card/nút hàng dưới - không phải lề `.screen` 20px, đừng lấy nhầm.
- Nội dung trắng bên trong (324px, ví dụ card Home): cột 2–11 = inset 8.33% (33px).
- Chữ/nội dung bên trong 1 card xám: cách mép card **8px** (không phải 18px như từng đo nhầm 1 lần).
- Đường kẻ chia dòng bên trong card: 0.5px, màu `#94A3B8`, cách mép card 8px (bằng đúng inset nội dung).

## Radius
Input / Button: 8px
Card: 16px (KHÔNG phải 20 - lỗi lặp lại nhiều lần trên các card cũ, luôn 16)
Popup: 16px

## Frame templates (khổ card chuẩn - dùng lại, đừng vẽ khổ mới)
- Card 1 hàng (label + giá trị/chip): 340×70, radius 16.
- Card 2 hàng (ví dụ "You send"/"You receive"): 340×156, radius 16, đặt ở đúng 2 hàng lưới liên tiếp.
- Card danh sách ĐẦY (Contacts/Transaction history/About/QR storage...): 340×586, span hàng 2–8, radius
  16. Nếu số dòng nội dung ÍT hơn số hàng khả dụng (VD Security/Currency chỉ 2-3 dòng), các dòng đứng
  ĐÚNG toạ độ hàng của chúng dồn lên đầu - KHÔNG dùng `justify-content: space-evenly` giãn đều ra hết
  chiều cao card, phần dư để trống.
- Mỗi phần tử trong 1 card nên đặt bằng TOẠ ĐỘ TUYỆT ĐỐI riêng (đo % hoặc dvh cho từng dòng), không
  canh bằng flexbox `space-between`/`flex-end` áng chừng - flexbox nhìn có vẻ đúng nhưng lệch thật
  10-20px so với Figma khi đo pixel-diff.

## Hàng nút hành động dưới cùng (row 9)
- Vị trí CHUẨN: `position:absolute; left/right:6.41%; top:81.52dvh; height:8.29dvh` (đúng hàng 9 của
  lưới, tâm 723px = 85.66dvh) - KHÔNG dùng CSS `grid-row` (kể cả `grid-row:10` lẫn span 2 hàng như
  `9/11`, cả hai đều rơi sai vị trí thật).
- Khoảng cách giữa các nút: LUÔN 8px, không phụ thuộc số lượng nút.
- Bề rộng nút theo số lượng (nền trong 340px, trừ gutter 8px giữa các nút):
  - 1 nút: full 340px (100% container)
  - 2 nút: 166px/nút → `(340 − 8) / 2`
  - 3 nút: 108px/nút → `(340 − 8×2) / 3`

## Numpad
- Phím: cố định cao 48px, cách nhau 8px - KHÔNG co giãn theo tỉ lệ flex (`flex: N` của phần còn trống).
- Từ mép trên khay xám tới hàng phím đầu tiên: 27px.
- Từ hàng phím cuối tới hàng nút Back/Continue (row 9): 27px.

## Icon
Icon đứng cạnh chữ LUÔN cùng size với chữ đó (`--is-*` khớp đúng px với `--fs-*` đi kèm) - đừng viết
size rời `14`/`18`/`20`, cỡ chữ đổi thì icon lệch theo ngay.

## Component
Popup width: 5/6 bề rộng MÀN HÌNH (390px, không phải viewport trình duyệt trên desktop - dùng
`min(vw, --screen-max)` để chốt đúng khổ điện thoại kể cả khi mở trên màn desktop rộng). = 325px ở khổ
390. Đây là chuẩn CHUNG cho mọi popup, không riêng gì LuckyPot.
Button height: 48 / 40 / 32 — bội số của 8.

## Shadow
Chỉ phần tử bấm được có bóng. Glow đều quanh tâm, không lệch hướng - `0 0 8px rgba(0,0,0,.48)` là
chuẩn chung; chip/nút tròn nhỏ (token chip, nút kết nối giữa 2 card) đo ra `0 0 8px rgba(0,0,0,.5)`.
