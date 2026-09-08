# FIGMA SCREENS SPEC – EZwallet (main)

> **VIẾT LẠI TOÀN BỘ 2026-09-08** — bản 09-07 (bên dưới từng là "đọc 1 lần duy nhất") đã STALE: lúc đó
> file Figma `iQxFGA890VhyXkEKipCC9C` chỉ có **8 frame**, Frame 8 "Send money" là một thiết kế hoàn toàn
> khác (không card, không chip, không slider), và node ID của mọi frame cũng đã đổi hết (frame bị vẽ lại,
> không chỉ sửa tại chỗ). Bản này đọc lại đủ **9 frame** hiện có.
>
> ⚠️ **PREMISE ĐẢO NGƯỢC SO VỚI BẢN CŨ:** bản 09-07 nói "guideline luôn thắng khi Figma lệch chút, mọi
> màu dưới đây đã chuẩn hoá theo guideline". Quyết định 2026-09-08 của user là **NGƯỢC LẠI**: chính bảng
> màu trong file Figma này (xám `#F1F5F9`, muted `#94A3B8`/`#667085`, đỏ `#FF383C`, xanh brand `#0B53BF`
> không đổi) **LÀ brand guideline mới** — xem [BRAND-GUIDELINE.md](BRAND-GUIDELINE.md) đã cập nhật theo.
> Không tự ý "chuẩn hoá ngược" màu Figma về giá trị cũ nữa.

## 0. Frame → Screen (map với code) — 9 frame, node ID đã đổi hết so với bản 09-07

| Frame | Node (2026-09-08) | Màn hình (code hiện tại) |
|---|---|---|
| 1 | `1:2` (nội dung tại `20:620`) | Splash (chưa build) |
| 2 | `14:225` "Sign up log in" (nội dung `20:621`) | `Login.jsx` |
| 3 | `14:248` "Sign in with email" (nội dung `20:622`) | `EnterEmail.jsx` |
| 4 | `15:274` "Home send" (nội dung `20:623`) | `HomeSend.jsx` |
| 5 | `17:16` "Home receive" (nội dung `20:624`) | `HomeReceive.jsx` |
| 6 | `18:144` "Menu" (nội dung `20:625`) | `MenuScreen.jsx` |
| 7 | `18:184` "Service hub" (nội dung `20:626`) | `ServiceHub.jsx` |
| 8 | `18:446` "Exchange" (nội dung `20:627`) | `Swap.jsx` (redesign, chưa build lại) |
| 9 | `18:580` "Send money" (nội dung `20:628`) | `SendAmount.jsx`+`SendConfirm.jsx`+`SendReceipt.jsx`? (redesign, xem §9 — kiến trúc đổi hẳn sang kiểu Swap) |

⚠️ Link Figma dạng `?node-id=X-Y` mà ai đó gửi có thể trỏ nhầm frame nếu copy từ lúc đang chọn node khác
trên canvas (đã xảy ra 09-08: link gửi trỏ vào Login thay vì Send money) — luôn xác nhận lại bằng tên
frame trong `get_metadata`, đừng tin literal vào node-id trong URL.

Quy đổi toạ độ dùng xuyên suốt file: `x_px / 390 → %` (ngang), `y_px / 844 → dvh` (dọc) — theo đúng
convention đã có trong code (`--pad`, `.screen` 10-row grid).

## 1. Grid — xác nhận lại, không đổi so với bản cũ

- 10 hàng bằng nhau: mỗi hàng cao **84.4px** (844/10) — khớp chính xác với mọi mốc lặp lại trong file
  (CTA button luôn ở hàng 9, "Exit"/NavBar luôn ở hàng 10, v.v.)
- Lề trái/phải: **~20px** mỗi bên (390 − 2×20 = 349px = bề rộng content chuẩn của card/input full-width).
- Header title luôn tại `y=27.28px`, cao `~30px`, full-width, căn giữa — **hằng số qua mọi frame có
  title dạng chữ** (Sign in with email / Service hub / Exchange / Send money) — không phải trùng hợp.

## 2. Bảng màu — ĐÃ ĐỔI 2026-09-08 (nguồn: chính file Figma này, xem BRAND-GUIDELINE.md)

| Vai trò | Mã màu | Ghi chú |
|---|---|---|
| Brand (chủ đạo) | `#0B53BF` | Không đổi so với 09-07 |
| Text chính | `#000000` | Không đổi |
| Text phụ (nhãn "Available:"/"Fee:"/"Balance:"/"Rate:") | `#667085` | MỚI — trước đây gộp chung `#757575` |
| Text phụ (nav inactive, placeholder input) | `#94A3B8` | MỚI — trước đây gộp chung `#757575` |
| Nền hộp/input/card ("box lõm xuống" VÀ card nội dung thường) | `#F1F5F9` | ĐỔI từ `#E3F1FF` (xanh nhạt, quyết định 09-07 đã bị đảo ngược 1 ngày sau) |
| Danger (lỗi/xoá/Exit/Sign out) | `#FF383C` | ĐỔI từ `#EC221F` |
| Warning | `#E8B931` | Không đổi (không xuất hiện trong 9 frame mới, giữ nguyên) |
| Tích cực | `#14AE5C` | Không đổi (không xuất hiện trong 9 frame mới, giữ nguyên) |

Không dùng gradient cho các màu trên — tất cả SOLID (không đổi so với 09-07).

**Palette nguyên tắc (user 09-08): "dùng regular-semi bold / xám - đen - trắng - xanh để làm nổi bật
thiết kế"** — tức là bảng màu UI cố tình hẹp: nền trắng + card/input xám nhạt + chữ đen/xám + điểm nhấn
brand-blue, đỏ chỉ dành riêng cho destructive (Exit/Sign out/lỗi). Không tự thêm màu mới ngoài bảng trên
khi build screen mới trừ khi Figma thật sự vẽ vậy.

## 3. Font — không đổi, xác nhận lại

- Toàn app **font hệ thống** (system font stack, `--font-base`/`--font-display`/`--font-condensed` trong
  `index.css`) — KHÔNG dùng Inter thật. Inter trong Figma chỉ là placeholder để đo tỷ lệ/wrapping gần với
  San Francisco (system font Apple).
- **Weight KHÔNG bị ép về chỉ 2 mức Regular/Semibold** — user 09-08 xác nhận: *"dùng kiến thức thiết kế
  để áp dụng font weight khác nhau vào thiết kế, không ép phải dùng mỗi regular-semibold"*. Giữ nguyên
  thang 4 mức đã có (`--fw-light` 300 cho số to, `--fw-normal` 400 cho body, `--fw-medium` 500 cho
  button/item/label, `--fw-semibold` 600 cho title/nhấn mạnh) và áp dụng theo ngữ cảnh từng chỗ, không
  copy máy móc "Semibold" cho mọi text chỉ vì Figma vẽ vậy.
- **Số tiền lớn (hero number):** khi Figma vẽ 44px cho 1 màn cụ thể (vd Send money/Exchange) → dùng
  đúng size đó NHƯNG weight vẫn là `--fw-light` (Light), không phải Regular như Figma vẽ — quy tắc "số to
  luôn Light" áp dụng xuyên suốt, không đổi theo Figma. `--fs-amount` (52px, dùng cho số dư Home/Menu)
  KHÔNG đổi — 44px chỉ là size riêng cho các màn amount-entry kiểu Swap/Send money.

## 4. Shadow — QUY TẮC MỚI 2026-09-08: chỉ phần tử CLICKABLE mới có bóng

User 09-08: *"nút có đổ bóng còn không phải nút thì không đổ bóng"*. Về độ mờ/bán kính cụ thể, user cố
tình không muốn siết 1 con số duy nhất — *"blur làm sao mà phổ biến, cho người ta biết nút ấy nổi là
được"* (không cần đúng tuyệt đối 1 giá trị, miễn rõ ràng là thứ có thể bấm).

- **Có bóng:** mọi nút/chip/pill thật sự bấm được — CTA đầy chiều rộng, cặp nút Back/Continue,
  Deposit/Withdraw, chip chọn token, action-row Paste/Scan QR/Contacts, tab NavBar đang active.
- **Không bóng:** phần tử chỉ mang tính trang trí/hiển thị, không bấm được — ví dụ nút tròn icon giữa 2
  card trên Send money/Exchange (xem §9), viền card thường.
- 2 mức blur quan sát được trong file (dùng làm gợi ý mặc định, không bắt buộc tuyệt đối):
  `0 0 15px rgba(0,0,0,.5)` cho chip/pill/nút nhỏ · `0 0 20px rgba(0,0,0,.32)` cho CTA full-width.
- Đây là thay đổi so với rule cũ (07-22d: bóng đổ thẳng xuống `0 4px 6px`, không lan toả) — rule mới
  dùng bóng lan toả đều quanh (glow), không có offset x/y.
- ⚠️ **Chưa áp dụng vào code hiện tại** (các class `.btn-primary`/`.btn-error`/v.v. trong `index.css`
  vẫn đang dùng rule cũ `0 4px 6px`) — đây là việc cần làm khi build lại từng màn, không phải đổi hàng
  loạt ngay bây giờ.

## 5. NavBar — kiểu mới, cơ chế chính xác (ĐÃ LÀM RÕ 09-08, sửa lại cách hiểu ở bản trước)

Bản 09-07 mô tả sai là "tab active = 1 ô trắng nổi lên trên nền xám". **Cách Figma thật sự dựng (user
09-08 xác nhận trực tiếp):**

- Có 1 khối nền TRẮNG phủ **toàn bộ hàng 1 tới 9** (background chính của cả màn hình) — không có bóng.
- Tab ĐANG ACTIVE ở hàng 10 là MỘT Ô TRẮNG NẰM SÁT LIỀN, KHÔNG CÓ KHE HỞ với khối trắng ở trên → về mặt
  hình ảnh, nó là PHẦN NỐI DÀI của nền trắng xuống tới hàng 10, không phải 1 card rời rạc.
- 3 tab còn lại (inactive) là ô nền **xám `#F1F5F9`** (không phải `#E3E3E3` như bản cũ ghi).
- **Vì vậy bóng đổ (glow) chỉ hiện rõ ở 2 CẠNH BÊN của ô active** (giáp ranh với ô xám bên cạnh) — cạnh
  TRÊN của ô active giáp với vùng trắng phía trên nên bóng vô hình ở đó (trắng trên trắng).
- **Ý nghĩa khi code:** đừng dựng tab active như 1 card rời có bóng đủ 4 cạnh rồi đặt nổi lên trên 1 thanh
  nav toàn xám — phải đảm bảo nền trắng của phần nội dung phía trên KHÔNG có khoảng hở/viền với ô active
  bên dưới, để bóng chỉ "ăn" sang 2 bên đúng như thiết kế. Đây là thay đổi lớn so với NavBar hiện tại
  (kiểu gạch chân dưới icon active) — **đã xác nhận build lại theo kiểu này** khi tới lượt sửa
  `NavBar.jsx`, chưa làm ngay bây giờ.
- Label/icon active = đen; inactive = `--color-muted` mới (`#94A3B8`).
- 4 tab, mỗi tab rộng bằng nhau `97.5px`, hàng 10 cao `~84.5px`.

## 6. Cards ("hộp xám")

- Lề 2 bên `~20px`, bo góc `10px`, nền `#F1F5F9` (§2).
- 1 card = 1 khối logic: 1 dòng nhãn + 1 dòng giá trị/chọn lựa + 1 dòng meta phụ (Available/Balance/Fee/Rate).

## 7. Chip chọn token (pill)

- Bo tròn hết cỡ (border-radius = height/2), nền trắng, có bóng (§4 — đây LÀ phần tử clickable).
- Icon vuông nhỏ token (~27px, hiện là placeholder đen trong Figma — chưa có icon thật) + symbol
  `17px Semibold` đen + caret nhỏ chỉ xuống.
- Luôn đi kèm 1 dòng "Available:"/"Balance:" ngay dưới/bên cạnh: nhãn `--color-muted-2` (`#667085`) +
  giá trị đậm brand-blue.

## 8. Button

- **CTA chính full-width** (Slide-or-tap / Deposit / Continue): nền brand-blue solid, chữ trắng
  `19px Semibold`, bo tròn hết cỡ, có bóng.
- **Nút phụ đi cặp** (Back / Withdraw): nền trắng, chữ đen, cùng kích thước/hình dạng với nút chính đi
  cùng, cùng kiểu bóng.
- **3 nút hành động 1 hàng** (Paste/Scan QR/Contacts...): pill trắng (hoặc xanh cho nút giữa nhấn mạnh),
  `15-17px Semibold`, có bóng.
- **"Exit" dạng chữ, không có khung nút**: `21px Semibold`, đỏ `#FF383C`, căn giữa — dùng ở màn không có
  NavBar (Swap/Exchange/Send money). **KHÔNG có bóng** (đây là text link, không phải nút — theo §4 rule
  "không clickable-looking-như-nút thì không bóng"... nhưng lưu ý nó VẪN clickable, chỉ là không mang
  hình dạng nút nên không cần bóng để báo hiệu — giữ nguyên như thiết kế cũ, không đổi).

## 9. Frame 9 – Send money (ĐÃ VẼ LẠI HOÀN TOÀN so với bản 09-07, xem SEND_MONEY_FIGMA_SPEC.md để biết đầy đủ)

Kiến trúc mới copy nguyên UX của màn Swap (`src/screens/Swap.jsx`): % slider của số dư + chip gợi ý số
tròn + numpad bottom-sheet khi cần gõ tay chính xác — **KHÔNG còn** là numpad cố định luôn hiện như
`SendAmount.jsx` hiện tại. Layout tóm tắt (chi tiết đầy đủ + toàn bộ quyết định/câu hỏi đã chốt nằm ở
[SEND_MONEY_FIGMA_SPEC.md](SEND_MONEY_FIGMA_SPEC.md), không lặp lại ở đây để tránh 2 nguồn lệch nhau):

- Hàng 1: title "Send money".
- Hàng 2-3: card "You send" (chip token + số tiền lớn 44px Light + "Available: X TOKEN").
- Giữa hàng 3-4: nút tròn icon (KHÔNG bóng, không clickable) — cùng component với nút tròn reverse của
  Swap, đổi icon: Swap dùng icon swap/reverse, Send money dùng icon "gửi" (mũi tên đi ra / paper-plane).
- Hàng 4-5: card "To: <tên>" + "Fee: $0.01" — **đã xác nhận: dòng Fee này chỉ là placeholder copy từ
  Exchange, BỎ đi khi build** (gửi tiền hiện tại không hiện phí riêng).
- Hàng 5-6: ô "Message (optional)" + nút icon nhỏ bên cạnh.
- Nửa hàng 6 → hết hàng 8: **tái sử dụng nguyên `PctSlider` + round-number hints từ `Swap.jsx`**, không
  vẽ lại từ đầu.
- Hàng 9: nút CTA "Slide or tap here to **enter**" (giữ nguyên chữ đang có trong `Swap.jsx`, không đổi
  thành "input" dù Figma vẽ vậy).
- Hàng 10: "Exit" — **sau khi bấm CTA vẫn đi qua `SendConfirm.jsx`/`SendReceipt.jsx` như flow hiện tại**
  (không gộp gửi trực tiếp như Swap).

## 10. Frame 8 – Exchange (redesign của Swap.jsx, cấu trúc giống hệt Send money)

Gần như sinh đôi với Send money (§9): card "You pay"/"You receive" thay vì "You send"/"To:", có dòng
Rate + Fee thật (phí swap 0.1%, không phải placeholder), nút tròn giữa 2 card LÀ nút reverse thật (có
tương tác) — theo §4 thì nút này CẦN bóng vì nó clickable trên màn Exchange (khác với bản sao chép sang
Send money, ở đó cùng icon-slot nhưng đổi thành trang trí thuần và mất bóng — xem §9). Slider/hint chips
ở đúng vị trí `PctSlider` hiện tại của `Swap.jsx`, không cần vẽ lại.

## 11. Frame 7 – Service Hub

- Title "Service hub" 25px Semibold đen, hàng 1.
- **CHỈ 2 card** (đã xác nhận 09-08: **bỏ hẳn PigSave**, không tạm ẩn nữa — code hiện tại có 3 tile
  (Swap/Piggy Bank/LuckyPot ở `ServiceHub.jsx`), Piggy Bank cần xoá khỏi `SERVICES` array khi build lại
  màn này, không chỉ set `screen: null`):
  - Card 1 (`top=94.4`, cao `148.8px`): icon vuông ~62px (placeholder đen, chưa có icon thật) +
    **"Exchange"** `21px Semibold` + mô tả `15px Semibold` màu `#757575` "Swap between USDC, EURC & cirBTC".
  - Card 2 (`top=263.2`): **"LuckyPot"** cùng kiểu + mô tả "Your idle money can become lottery tickets – for free".
- Card nền trắng + bóng (đây LÀ phần tử tương tác — cả card là 1 nút bấm mở service).
- NavBar hàng 10: active = Services.

## 12. Frame 6 – Menu

- Số dư — **CHỐT 2026-09-08: luôn size `50px`, weight Light, căn giữa theo chiều ngang, chiếm đúng hàng
  1 + NỬA hàng 2** (không phải trọn 2 hàng như `BalanceHeader.jsx` hiện code — class `.row-1-2` đang là
  `grid-row: 1/3` = 2 hàng đầy, cần thu lại còn 1.5 hàng khi build lại). **Auto-shrink khi số dài** (nhiều
  số thập phân/số lớn) để KHÔNG BAO GIỜ tràn quá **3/4 chiều ngang màn hình** — tái sử dụng cơ chế
  `useFitFontSize` đã có sẵn (`src/useFitFontSize.js`, đo width thật bằng canvas), chỉ cần đổi `max` từ
  `76` (giá trị đang code) xuống `50`, và đảm bảo container đo width bị giới hạn đúng 75vw/75% thay vì
  100% bề ngang hiện tại. Áp dụng cho MỌI nơi hiện số dư kiểu này (Home send, Home receive, Menu) —
  không phải riêng Menu. (Figma đo ra 44px cho size hiển thị mẫu "$10,000.00", nhưng đó là kết quả SAU
  khi auto-shrink từ max 50, không phải giá trị max thật — không nhầm 44 là size cố định.)
- 2 nút pill cạnh nhau `top≈142.6 h≈48.7`: **Withdraw** (trắng, trái) / **Deposit** (brand-blue, phải).
- Danh sách hàng đơn, mỗi hàng `19px Semibold` đen + mũi tên phải: Transaction history · Security ·
  Language & Currency · About · **Sign out** (đỏ `#FF383C`, §2).
- NavBar hàng 10: active = Menu.

## 13. Frame 4 – Home send

- Số dư — cùng rule đã chốt ở §12 (max `50px` Light, auto-shrink theo `useFitFontSize`, hàng 1 + nửa
  hàng 2, không tràn quá 3/4 bề ngang).
- Card xám `#F1F5F9` bo góc 10 bọc quanh danh sách token (USDC/EURC/cirBTC), mỗi dòng: tên trái
  `23px Regular` đen, số dư phải `23px Regular` brand-blue, icon vuông ~26px bên trái tên (placeholder
  đen, chưa có icon thật), có đường kẻ mảnh phân cách giữa các dòng.
- Pill trắng "Hold to show your tokens" — có bóng (clickable, giữ để hiện/ẩn số dư).
- Khung viền brand-blue bo góc 10, nền trắng: dòng 1 đậm màu đỏ "Current Available Network: Arc
  Testnet", 3 dòng dưới brand-blue giải thích Paste/Scan QR/Contacts.
- Khối thông báo mẫu (viền brand-blue, không phải nền xám như bản cũ ghi) chứa text brand-blue "Swapped
  20 EURC to ~26.49 USDC (complete)".
- Hàng 9: 3 nút — **Paste** (trắng, trái) / **Scan QR** (brand-blue, giữa, nhô cao hơn 2 nút kia,
  bo góc 20) / **Contacts** (trắng, phải) — cả 3 có bóng.
- NavBar hàng 10: Services · Send(active) · Receive · Menu — cơ chế theo §5.

## 14. Frame 5 – Home receive

- Bố cục giống Home send phần đầu/cuối (số dư, hint block, NavBar — active = Receive).
- Giữa màn: khối QR (placeholder vuông đen ~316px, căn giữa).
- Pill trắng thay "Hold to show your tokens" bằng nội dung tương ứng Receive.
- Hàng 9: **QR Storage** (trắng, trái) / **Custom QR** (brand-blue, giữa, nhô cao) / **Share** (trắng, phải).
- **CHỐT 2026-09-08:** đúng là designer copy nhầm nội dung hint block từ Home send (user tự xác nhận).
  Khi build lại: **giữ nguyên nội dung hint đang có trong `HomeReceive.jsx` hiện tại** (không viết nội
  dung mới) — chỉ đổi CÁCH HIỂN THỊ (card/màu/kiểu chữ) cho khớp style Figma mới, không cần soạn lại chữ.

## 15. Frame 2/3 – Splash, Sign up log in (Login), Sign in with email

⚠️ **Splash + Login CHƯA đọc lại `get_design_context` chi tiết trong lượt 09-08 này** (chỉ xác nhận qua
metadata rằng cấu trúc — logo + tagline, + nút "Sign in with email" ở Login — không đổi so với 09-07).
Trước khi build 2 màn này, đọc lại design context 1 lần để xác nhận màu/size chính xác thay vì tin vào
mô tả cũ.

**Sign in with email** (đã đọc lại đầy đủ 09-08):
- Title "Sign in with email" `25px Semibold` đen, hàng 1.
- Input box nền `#F1F5F9` (không phải `#E3E3E3` như bản cũ), bo góc 10.
- Gợi ý autocomplete: text đen (giá trị gõ dở) + khung viền brand-blue bo góc 10 chứa email đầy đủ màu
  brand-blue — đây là autocomplete domain gmail.com, không phải lỗi hiển thị 2 lần.
- Hàng 9: **"Back"** (trắng, chữ đen, có bóng) / **"Continue"** (brand-blue, chữ trắng, có bóng) — 2 nút
  cạnh nhau cùng kích thước.
- Placeholder "example@gmail.com" màu `--color-muted` mới (`#94A3B8`).

## 16. Trạng thái các việc từng treo — cả 3 đã chốt 2026-09-08

1. ✅ **Cỡ số dư Home/Menu** — chốt `50px` Light, auto-shrink, hàng 1 + nửa hàng 2, không tràn quá 3/4
   bề ngang. Chi tiết ở §12/§13. Chưa sửa `BalanceHeader.jsx`/`index.css` — làm khi build lại màn tương ứng.
2. ✅ **Home receive — nội dung hint block** — xác nhận đúng là copy nhầm, giữ nguyên nội dung cũ, chỉ
   đổi cách hiển thị. Chi tiết ở §14.
3. ✅ **NavBar kiểu mới (§5)** — user chủ động làm khác NavBar cũ "cho nhìn nó khác biệt" (lý do thẩm mỹ,
   không phải nhầm lẫn) — build lại theo đúng Figma khi tới lượt `NavBar.jsx`, không cần hỏi lại.
4. **Shadow rule mới (§4)** — hướng đã xác nhận, nhưng CHƯA áp dụng vào `index.css`/JSX hiện tại — làm
   dần khi build lại từng màn, không đổi hàng loạt ngay.

Không còn việc nào treo cần hỏi thêm trước khi bắt đầu build màn bất kỳ trong 9 màn — chỉ còn là thứ tự
ưu tiên build cái nào trước.
