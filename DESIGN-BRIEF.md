# DESIGN BRIEF — EZwallet

> **Dành cho:** một phiên Claude tập trung vào **thiết kế UI/UX**.
> **Mục tiêu của file này:** đưa cho bạn đủ bối cảnh để đề xuất / dựng lại giao diện EZwallet cho đẹp, nhất quán, và **đúng đối tượng người dùng** — mà không cần đụng tới code blockchain.
>
> Bạn **được phép redesign**. (Trong repo có ghi chú cũ "user tự làm UI" — bỏ qua, giờ chủ dự án chủ động nhờ bạn thiết kế.)

---

## 1. Sản phẩm là gì

**EZwallet** là **ví tiền stablecoin** (USDC / EURC) chạy trên blockchain, nhưng mục tiêu là **dùng dễ y như một app ngân hàng** — không để lộ sự phức tạp của crypto.

Một câu định vị: *"Gửi và nhận tiền trên blockchain, nhưng dễ như chuyển khoản ngân hàng."*

Các việc người dùng làm trong app:
- Xem **số dư** (quy ra USD `$` hoặc EUR `€`).
- **Gửi tiền** cho người khác (qua địa chỉ, danh bạ, hoặc quét QR) — có thể kèm **lời nhắn**.
- **Nhận tiền** (hiện địa chỉ / tạo mã QR).
- **Đổi tiền** giữa các loại (swap USDC ↔ EURC…).
- Xem **lịch sử giao dịch**, quản lý **danh bạ**, **kho mã QR**.
- Nhận **biên lai** đẹp (ảnh lưu về máy) sau mỗi lần gửi.

Sản phẩm đã **chạy thật**, live tại **https://ezwallet.pages.dev**. Đây là bản làm lại giao diện, không phải làm từ số 0.

---

## 2. Người dùng — QUAN TRỌNG NHẤT

**Đối tượng: người dùng phổ thông và NGƯỜI GIÀ. Không rành công nghệ. Không biết gì về crypto.**

Hệ quả bắt buộc cho thiết kế:
- **Chữ to, nút to, vùng chạm rộng.** Ưu tiên đọc được và bấm trúng hơn là nhồi nhiều thông tin.
- **Ít lựa chọn trên mỗi màn.** Mỗi màn nên có **một hành động chính rõ ràng**.
- **Giấu từ ngữ crypto.** Tránh "wallet address", "gas", "on-chain", "token" khi có thể — nói theo ngôn ngữ đời thường ("gửi tiền", "số dư", "người nhận").
- **Tiền hiện bằng $ / €** như tiền thật, không bắt người dùng nghĩ theo đơn vị token.
- **Không làm người dùng sợ.** Trạng thái, lỗi, xác nhận phải bình tĩnh, dễ hiểu, không thuật ngữ dọa người.
- **Nhất quán tuyệt đối** — người già học theo thói quen; nút "Gửi" phải luôn ở đúng chỗ, cùng màu, cùng chữ.

Mốc thẩm mỹ chủ dự án thích: **Coinbase Wallet** — số dư to, các ô (tile) bo tròn nền xám nhạt, nhiều khoảng thở, tối giản đường viền. Cảm giác **sạch, hiện đại, đáng tin như app ngân hàng**, tông thương hiệu **xanh dương**.

---

## 3. Ràng buộc nền tảng (thiết kế phải tôn trọng)

- **Mobile-first, dọc.** Đây là web app chạy trên điện thoại (chủ yếu iPhone Safari), thêm vào màn hình chính như app. **Không cần thiết kế bản desktop.**
- **Một màn = đúng một khung hình, KHÔNG cuộn cả trang.** App khoá cuộn toàn cục. Nội dung dài (danh sách token, lịch sử) cuộn **bên trong vùng riêng của nó**, không phải cuộn cả trang.
- **Lưới 10 hàng.** Mỗi màn chia dọc thành 10 hàng bằng nhau (100dvh). Quy ước hiện tại:
  - Hàng 1: tiêu đề màn.
  - Hàng 10: nút hành động chính (màn con) **hoặc** thanh điều hướng NavBar (4 màn chính).
  - Bạn có thể đề xuất bố cục mới, nhưng nhớ ràng buộc "vừa 1 màn hình, không cuộn trang".
- **Bàn phím iPhone che nửa dưới màn.** Nên **ô nhập liệu đặt ở nửa trên** (hàng 1–4) hoặc popup neo nửa trên. Đừng đặt input sát đáy.
- **Bàn phím số tự vẽ (Numpad)** cho màn nhập số tiền — không dùng bàn phím hệ thống cho số tiền. Numpad chiếm khoảng hàng 6.5–8.5, nút [Back]/[Continue] tách riêng ở hàng 10.
- **4 màn chính** (Gửi / Nhận / Đổi / Menu) có **NavBar** dưới cùng để chuyển qua lại.

---

## 4. Hệ thiết kế hiện tại (giữ tinh thần, bạn được tinh chỉnh)

Chủ dự án đã có một hệ khá chỉn chu. Bạn có thể nâng cấp thẩm mỹ nhưng **giữ logic ngữ nghĩa màu** (người dùng học theo nó).

### Màu — theo NGỮ NGHĨA, không tùy hứng
| Ý nghĩa | Hex | Nền nhạt đi kèm |
|---|---|---|
| **Thương hiệu** (logo, nút CTA chính, active) **+ GỬI tiền** | `#0B53BF` (xanh dương) | `#E2EAF7` |
| **NHẬN tiền / thành công / tích cực** | `#16A34A` (xanh lá) | `#DCFCE7` |
| **Lỗi / mất tiền / xóa** | `#DC2626` (đỏ) | `#FEE2E2` |
| **Cảnh báo** | `#F59E0B` (vàng) | `#FEF3C7` |
| Chữ chính | `#000000` (đen) | — |
| Chữ phụ | `#AEAEB2` (xám) | — |
| Viền / nền / divider (KHÔNG dùng làm màu chữ) | `#E5E5EA` | — |
| Nền thẻ / card | `#FFFFFF` (trắng) | — |

Quy tắc vàng: **thương hiệu & hành động gửi → xanh dương; nhận & thành công → xanh lá.** Đừng lẫn hai màu này.

### Chữ (2 font)
- **Barlow** = giọng **thương hiệu**: logo, tiêu đề màn, con số tiền, ký hiệu tiền tệ, chữ trên nút. (Đậm tối đa **600 / semibold** — Barlow 700 bị xấu, đừng dùng.)
- **IBM Plex Sans** = **nội dung cho người đọc**: menu, mô tả, hint, thông báo, ô nhập, lời nhắn.

Cỡ chữ hiện dùng (px): số tiền lớn **52** · tiêu đề màn **30** · số trong list **24** · nội dung/nút **19** · item list **17** · label/phụ **15** · ghi chú nhỏ **13**. (Vì đối tượng người già, **đừng nhỏ hơn** các mốc này; có thể cân nhắc to hơn.)

### Hình khối & thành phần
- **Tile / card bo tròn, nền xám/trắng nhạt, tối giản viền** (kiểu Coinbase). Ưu tiên nền phẳng nhạt hơn là kẻ viền.
- **Thông báo / hint = khối nền màu nhạt, KHÔNG viền** (iOS-style): nhận = nền xanh lá nhạt, gửi = nền xanh dương nhạt, lỗi = đỏ nhạt, cảnh báo = vàng nhạt. Chữ trong khối để **đen full**, phân cấp bằng đậm/nhạt chứ không đổi sang màu xám.
- **Nút chính** rộng ~2/3 bề ngang; **nút phụ** ~1/2. Nút toggle/lọc khi BẬT = nền trắng + viền xanh dương + chữ xanh dương (không tô đặc).
- **Icon**: bộ icon tự vẽ, nét mảnh nhất quán (viewBox 100, stroke-width ~10, dùng `currentColor` để đổi màu theo ngữ cảnh). Nếu bạn đề xuất icon mới, giữ đúng phong cách line-icon mảnh này.
- **Scrollbar ẩn** (vẫn cuộn được, mờ mép để gợi ý còn nội dung).

### Logo
- `design/logo.svg`: chữ **"EZ"** (xanh dương) + **"wallet"** (đen). Dùng ở màn Đăng nhập và trên biên lai.

---

## 5. Các màn hình cần thiết kế

Nhóm theo luồng. (Tên file React trong `src/screens/` để bạn đối chiếu, không bắt buộc dùng.)

**Vào app / tài khoản**
- **Onboarding** — giới thiệu ngắn khi mở lần đầu.
- **Login / EnterEmail** — đăng nhập bằng email, đặt mã PIN.
- **PinGate** — nhập PIN để mở khoá app các lần sau.
- **Security** — câu hỏi bảo mật, đổi PIN.

**4 màn chính (có NavBar)**
- **HomeSend** (màn gửi / trang chủ) — **số dư to trên cùng**, danh sách token, khu thông báo, các nút hành động, NavBar. Đây là màn quan trọng nhất.
- **HomeReceive** (nhận) — hiện địa chỉ / QR để người khác gửi vào.
- **Swap** (đổi tiền) — chọn token vào/ra, nhập số, xem tỷ giá ước tính.
- **MenuScreen** (menu) — cửa vào các mục phụ (danh bạ, lịch sử, cài đặt, ngôn ngữ…).

**Luồng gửi tiền**
- **PasteAddress / Contacts / QRScanner** — chọn người nhận (dán địa chỉ / chọn danh bạ / quét QR).
- **SendAmount** — nhập số tiền bằng Numpad, có gợi ý nhanh, có thể thêm lời nhắn.
- **SendConfirm** — màn xác nhận trước khi gửi.
- **SendReceipt** — biên lai đẹp sau khi gửi xong (lưu được thành ảnh).

**QR & danh bạ**
- **CreateQR / ShowQR / SavedQRList** — tạo mã QR nhận tiền, kho QR đã lưu đặt tên.
- **Contacts** — danh bạ người nhận, có avatar (cắt ảnh).

**Khác**
- **TxHistory** — lịch sử giao dịch (gửi = đỏ, nhận = xanh lá; mỗi dòng: người + thời gian + số tiền).
- **Language** — chọn ngôn ngữ / đơn vị tiền (xem ràng buộc mục 7).
- **About / ComingSoon** — trang giới thiệu / tính năng sắp có.

---

## 6. Nội dung tiền hiển thị thế nào (đừng thiết kế sai)

- Số dư & số tiền hiển thị quy ra **một đơn vị người dùng chọn: `$` (USD) hoặc `€` (EUR)** — như tiền thật. Stablecoin ghim 1:1 ($1 = 1 USDC).
- Tên token thật (USDC / EURC / cirBTC) vẫn xuất hiện ở **dòng phụ** (nhỏ, xám) trong danh sách token / lịch sử / biên lai — để minh bạch, nhưng **không phải thông tin chính**.
- Định dạng tiền một kiểu nhất quán: `$2`, `€2`, hoặc `2 USDC` — **không** trộn số đậm + ký hiệu mảnh (lệch font, xấu).

---

## 7. Luật cứng (đừng vi phạm)

- **KHÔNG emoji** trong giao diện.
- **KHÔNG dấu em-dash `—`** trong chữ hiển thị (dùng en-dash `–` nếu cần). Placeholder rỗng dùng `…`.
- **Chữ trong app đang khoá TIẾNG ANH.** Mọi copy UI viết bằng English (vd "Send money", "Receive", "Swap", "Balance"). Màn Language có hiện lựa chọn tiếng Việt/Trung + CNY/VND nhưng đang **khoá mờ** (chỉ English + USD/EUR chọn được) — cứ thiết kế nút bị disable cho đúng trạng thái đó.
- **Giữ logic màu ngữ nghĩa** ở mục 4 (gửi = xanh dương, nhận = xanh lá, lỗi = đỏ).
- **Tối giản yếu tố crypto thừa** — nếu thấy chỗ nào lộ kỹ thuật không cần thiết cho người già, đề xuất ẩn / diễn đạt lại.

---

## 8. Mình mong nhận được gì từ bạn (gợi ý — chủ dự án sẽ chốt)

Bạn có thể đề xuất một trong các dạng sau (hỏi lại chủ dự án nếu chưa rõ họ muốn mức nào):
1. **Mockup HTML tương tác** một hoặc nhiều màn (dạng artifact xem trên điện thoại) để chốt hướng thẩm mỹ trước.
2. **Đề xuất tinh chỉnh hệ thiết kế** (màu/chữ/khoảng cách/thành phần) kèm lý do, đặc biệt hướng "sạch như Coinbase, dễ cho người già".
3. **Redesign từng màn** theo thứ tự ưu tiên: **HomeSend → SendAmount → SendReceipt → Swap** (4 màn người dùng gặp nhiều nhất).

Ưu tiên hàng đầu khi cân nhắc mọi quyết định: **người già không rành công nghệ vẫn tự gửi được tiền mà không hoảng.** Đẹp phục vụ mục tiêu đó, không phải ngược lại.

---

## 9. Tài nguyên trong repo (để đối chiếu, không bắt buộc đọc hết)

- `HANDOFF.md` — trạng thái kỹ thuật đầy đủ (nặng về blockchain; đọc nếu cần hiểu ràng buộc sâu).
- `src/index.css` — hệ token màu/font/size hiện tại (giá trị chính xác, kể cả bo góc).
- `src/screens/*` , `src/components/*` — các màn & thành phần đang chạy.
- `design/logo.svg` — logo.
- Live để trải nghiệm thật: **https://ezwallet.pages.dev**
