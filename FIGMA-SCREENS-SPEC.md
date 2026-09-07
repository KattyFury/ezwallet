# FIGMA SCREENS SPEC – EZwallet (main)

> Đọc 1 LẦN DUY NHẤT ngày 2026-09-07 từ file Figma `iQxFGA890VhyXkEKipCC9C` ("Untitled"), page "Page 1",
> 8 frame (Frame 1 → Frame 8), mỗi frame 390×844. **Từ giờ làm việc dựa vào file này, không mở lại Figma.**
> Tuân thủ [BRAND-GUIDELINE.md](BRAND-GUIDELINE.md) TRƯỚC TIÊN — mọi màu/font ghi dưới đây đã được
> CHUẨN HOÁ về đúng guideline (quyết định của bạn: guideline luôn thắng khi Figma lệch chút). Chỗ nào
> đã sửa khác với số đo gốc trong file Figma đều có chú thích "(Figma vẽ: …, đã đổi theo guideline)".

## 0. Frame → Screen (map với code)

| Frame | Node | Màn hình (code hiện tại) |
|---|---|---|
| Frame 1 | `1:2` | Splash (chưa build) |
| Frame 2 | `5:741` | `Login.jsx` |
| Frame 3 | `5:946` | `EnterEmail.jsx` |
| Frame 4 | `5:1189` | `HomeSend.jsx` |
| Frame 5 | `5:1486` | `HomeReceive.jsx` |
| Frame 6 | `5:1761` | `ServiceHub.jsx` |
| Frame 7 | `5:2916` | `MenuScreen.jsx` |
| Frame 8 | `5:3172` | `SendAmount.jsx` |

Quy đổi toạ độ dùng xuyên suốt file: `x_px / 390 → %` (ngang), `y_px / 844 → dvh` (dọc) — theo đúng
convention đã có trong code (`--pad`, `.screen` 10-row grid).

## 1. Grid xác nhận lại từ Figma

- 10 hàng bằng nhau: mỗi hàng cao **84.4px** (844/10), KHÔNG có gutter dọc baked-in (khác bản nháp cũ
  trên nhánh `privy` — bản đó có gutter 20px/10px, bản NÀY (main) không). Khoảng cách 20px chỉ áp dụng
  **giữa 2 yếu tố khác nhau đặt sát nhau**, không phải khoảng cách hàng cố định.
- Lề trái/phải: **20.53px** mỗi bên (390 − 2×20.53 = 348.94 = bề rộng content chuẩn dùng lặp lại ở mọi
  card/input full-width).
- 12 cột thấy trong file chỉ là LƯỚI THAM CHIẾU của designer (viền xanh lá `#0dff00` 0.25px) — không
  phải nội dung thật, bỏ qua khi code.

## 2. Frame 1 – Splash (chưa build màn này)

- Nền trắng. Logo full (`design/logo.svg`) căn giữa ngang, `top=181.52` (`21.51dvh`), width `205.26px`
  (`52.6%`), height `58.96px`.
- Tagline "A crypto wallet simple enough for my mom to use" ngay dưới logo, `top=270.68` (`32.07dvh`),
  Inter Semibold 20px, màu **#757575** (Figma vẽ `#e3e3e3` — guideline không có tông xám nào cho TEXT
  ngoài `#757575`, `#e3e3e3` chỉ dành cho box/input → chuẩn hoá theo guideline).

## 3. Frame 2 – Login

- Y hệt Splash (logo + tagline, cùng màu **#757575** theo guideline — Figma vẽ 2 màn này 2 sắc xám
  khác nhau, `#e3e3e3` ở Splash và `#b3b3b3` ở Login, chuẩn hoá về chung 1 tông `#757575`) + thêm 1 nút:
- **"Sign in with email"**: pill xanh brand `#0b53bf`, bo góc `38px`, shadow `0 0 15px rgba(0,0,0,.5)`,
  `top=689.5` (`81.7dvh` → nằm giữa hàng 9), `height=56px`, width `266.84px` (căn giữa ngang).

## 4. Frame 3 – Sign in with Email

- Title "Sign in with Email" 25px bold đen, căn giữa, `top=27.28` (hàng 1).
- Input box **#e3e3e3**, bo góc 10, `top=189.9` (`22.5dvh`, đầu hàng 3), `height=42.2px`, full width
  content (`20.53→369.47`).
- Gợi ý email đang gõ: dòng chữ đen "kattyfury1403" (giá trị mẫu) + khung viền brand-blue bo góc 10 bên
  dưới chứa "kattyfury1403@gmail.com" màu brand-blue 14px — đây là **autocomplete domain gmail.com**,
  không phải lỗi hiển thị 2 lần.
- Hàng 9: 2 nút pill cạnh nhau, cách nhau đúng theo luật 10px ngang — **"Back"** (trắng, chữ đen, nửa
  trái) / **"Continue"** (xanh brand, chữ trắng, nửa phải), cùng `top=689.5 h=56`.

## 5. Frame 4 – Home / Send (màn chính)

- Số dư **"$10,000.00"** 52px Inter Regular, đen, căn giữa, `top=34.4` (hàng 1, tràn nhẹ sang hàng 2).
- **Card xám** `#e3e3e3` bo góc 10, `x=20.53 y=126.58 w=348.944 h=307.438` (hàng 2-5) bọc quanh toàn bộ
  danh sách token bên trong.
- Danh sách token (USDC/EURC/cirBTC) NẰM BÊN TRONG card xám trên, mỗi dòng: tên trái 25px đen, số dư
  phải 25px đen căn phải, có đường kẻ phân cách mảnh giữa các dòng. 3 dòng tại `y=144.8 / 194.8 / 244.8`.
- Pill trắng "Hold to show your tokens" `top=406.29 h=42.18`, bo góc 80 (viên thuốc tròn hẳn).
- **Hint block** (khung viền brand-blue bo góc 10, nền trắng, `top=476.37 h=121.147`):
  dòng 1 in đậm màu **danger** "Current Available Network: Arc Testnet", 3 dòng dưới màu brand-blue
  giải thích Paste/Scan QR/Contacts.
- Khối thông báo mẫu bên dưới (nền `#e3e3e3`, `top=463.47`, nhưng đè chồng — xem ghi chú §8.3) chứa ví
  dụ text brand-blue "Swapped 20 EURC to ~26.49 USDC (complete)".
- **Hàng hành động** (hàng 9, `top=675.2-759.6`): 3 nút — **Paste** (trắng, trái) / **Scan QR** (xanh
  brand, giữa, NHÔ CAO hơn 2 nút kia: `h=70.3` so với `h=56`, bo góc 20) / **Contacts** (trắng, phải).
  Icon dưới mỗi nhãn hiện là khối đen placeholder (chưa có icon thật trong file Figma).
- **NavBar** (hàng 10, `top=759.33-844`): thứ tự trái→phải **Services · Send(active) · Receive · Menu**
  — khớp đúng thứ tự code hiện tại. Kiểu mới: **mỗi tab là 1 ô nền riêng rộng bằng nhau (97.5px)** —
  tab đang active = nền TRẮNG nổi lên (`shadow 0 0 15px rgba(0,0,0,.5)`), 3 tab còn lại = nền phẳng
  **#e3e3e3**. Label/icon active = đen, inactive = **#757575** (Figma vẽ `#b3b3b3`, chuẩn hoá về tông xám phụ duy
  nhất theo guideline). **Đây là thiết kế khác hẳn NavBar hiện
  tại của app (kiểu gạch chân dưới tab active) — xem quyết định cần bạn chốt ở §8.2.**

## 6. Frame 5 – Home / Receive

- Bố cục giống hệt Send phần đầu + cuối (số dư, hint block, NavBar — active = Receive).
- Giữa màn: QR code (khối đen placeholder vuông `269.8×269.8`, `top=126.6`, căn giữa).
- Pill trắng "Click to copy your address" `top=406.41 h=42.18` (thay cho "Hold to show your tokens").
- Hàng hành động: **QR Storage** (trắng, trái) / **Custom QR** (xanh brand, giữa, nhô cao) / **Share**
  (trắng, phải) — khác 3 nút của Send.
- ⚠️ Hint block + khối thông báo mẫu VẪN giữ nguyên nội dung của Send ("Paste a wallet address to
  send"...) — gần như chắc chắn do designer copy nguyên Frame 4 sang rồi chưa sửa nội dung, KHÔNG phải
  chủ đích. Khi build, hint block của Receive nên viết nội dung phù hợp (giải thích QR Storage/Custom
  QR/Share), không copy nguyên văn Send.

## 7. Frame 6 – Service Hub

- Title "Service hub" 25px bold đen, hàng 1.
- **CHỈ 2 card** (không phải 3 như code hiện tại đang có `pig`/PigSave!): mỗi card full-width, nền
  trắng, bo góc 10, shadow, cao `148.8px`:
  - Card 1 (`top=94.4`): icon 62.26px (placeholder đen) + **"Exchange"** 20px bold + mô tả 14px màu
    **#757575** "Swap USDC to EURC or cirBTC with LI.FI".
  - Card 2 (`top=263.2`): **"LuckyPot"** 20px bold + mô tả 14px `#757575` "Your idle USDC can bring
    you $$$$".
- ⚠️ **PigSave KHÔNG có trong bản thiết kế mới này** — khớp với hướng đã bàn: LuckyPot ưu tiên trước,
  PigSave để sau (hoặc bị bỏ hẳn, cần hỏi lại khi tới lúc build màn này).
- NavBar: active = Services.

## 8. Frame 7 – Menu

- Số dư "$10,000.00" 52px, hàng 1 (giống Home).
- 2 nút pill cạnh nhau `top=142.96 h=48.66`: **Withdraw** (trắng, trái) / **Deposit** (xanh brand,
  phải).
- Danh sách hàng đơn (mỗi hàng: label 20px bold đen trái + chevron phải):
  Transaction history · Security · Language & Currency · About · **Sign out** (màu **danger `#EC221F`**
  theo guideline — Figma vẽ `#ff383c`, đã chuẩn hoá).
- NavBar: active = Menu.

## 9. Frame 8 – Send money (nhập số tiền)

- Title "Send money" 25px, hàng 1.
- Dòng người nhận: "to: **Ho Huu Kha**" (tên mẫu), `top=107`.
- Số tiền lớn "$34,56" 35px căn giữa `top=188` + toggle đơn vị "USD ⌄" (pill trắng, góc phải số tiền).
- "max: $1,234.56" 20px `#757575` ngay dưới.
- Ô input **#e3e3e3** bo góc 10 `top=358.7 h=42.2` gần đáy màn (hàng 5), có 1 nút phụ nhỏ cạnh phải
  (khả năng là nút xoá/backspace).
- **KHÔNG có bàn phím số nào được vẽ** — khớp đúng quy tắc đã có "mọi bàn phím là bàn phím hệ thống",
  nửa dưới màn để trống có chủ đích.
- ⚠️ Một vài text ở màn này dùng font **SF Pro** trong Figma (không phải Inter) — khác quy ước
  BRAND-GUIDELINE §2 ("vẽ Figma bằng Inter"). Không ảnh hưởng lúc build (vẫn ép về system font), chỉ là
  điểm chưa nhất quán trong chính file Figma, không cần sửa gấp.

## 10. Việc cần bạn CHỐT trước khi build (không tự quyết thay)

Mọi lệch màu/font giữa Figma và guideline đã tự chuẩn hoá theo guideline (liệt kê ở các mục trên, mỗi
chỗ đều ghi rõ "Figma vẽ: …"). Còn lại là các quyết định NỘI DUNG/BỐ CỤC guideline không nói tới, cần
bạn chốt:

### 8.2 NavBar đổi kiểu hoàn toàn
Code hiện tại: tab active = gạch chân xanh phía trên icon, nền tất cả tab đều trắng.
Figma mới: tab active = cả Ô nền trắng nổi khối riêng, 3 tab kia = nền xám phẳng `#e3e3e3`.
→ Đây là thay đổi lớn, đụng `NavBar.jsx` + CSS liên quan tới mọi màn có NavBar. Xác nhận có build lại
theo kiểu mới không trước khi động tay.

### 8.3 PigSave bị bỏ khỏi Service Hub
Bản Figma mới chỉ có 2 card (Exchange, LuckyPot), không còn PigSave. Xác nhận: bỏ hẳn PigSave, hay
tạm thời chưa vẽ thêm thôi (vẫn giữ trong code, `screen: null` như cũ)?

### 8.4 Hint block của Receive dùng sai nội dung (copy từ Send)
Xem §6 — khi build `HomeReceive.jsx` cần viết lại nội dung hint cho đúng ngữ cảnh Receive, không copy
nguyên văn 3 dòng Paste/Scan QR/Contacts từ Send.
