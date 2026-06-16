# ezwallet – Wireframe Spec (Layout Grid 10 hàng)

> Bản đóng gói wireframe/layout rules dùng làm tham chiếu khi code UI thật. Wireframe là khung + label chức năng, KHÔNG phải thiết kế thẩm mỹ cuối cùng.

---

## 1. Thông tin sản phẩm

- **App**: ví stablecoin tối giản, ẩn hoàn toàn blockchain phía sau, UX ngang MoMo
- **Target**: bất kỳ ai ở các quốc gia Arc phủ tới
- **Stack**: Circle Developer Controlled Wallet + Arc App Kit
- **Platform**: web browser, mobile-first
- **Auth**: email OTP (số điện thoại disable, label "sắp ra mắt")

---

## 2. Nguyên tắc layout chung

- **Lưới 10 hàng** theo chiều cao màn hình
- **Hàng 1**: tiêu đề trang (sub-screen) hoặc vùng content (màn chính)
- **Hàng 10**: action buttons hoặc nav bar (4 màn chính)
- **Vùng 1–5**: content chính, căn giữa theo block — không gán cứng từng hàng
- **Vùng 6–7**: thông báo in-app (tối đa 2, mỗi cái 1 hàng, có nút X) hoặc tip/hint dashed nếu không có thông báo
- **Vùng 8–9**: 3 nút action chính (màn Home Gửi/Nhận)
- **Numpad số**: cố định hàng 7–8–9 = 111px (37px × 3), layout 4 dòng: 123 / 456 / 789 / ,0←
- **System keyboard**: pop up overlay từ dưới tự nhiên, toolbar có nút ✓ "xong" góc phải, che hàng 10 bình thường
- **Lề an toàn**: padding 0.25 đơn vị quanh màn hình

### Rule hàng 10 — sub-screen
- **1 nút**: center 2/3 width, màu xanh #185FA5
- **2 nút**: trái 1/2 phụ trắng · phải 1/2 chính xanh

### Rule hàng 10 — 4 màn chính
Nav bar 4 nút: **Đổi tiền · Gửi · Nhận · Menu** — active thì nền xanh nhạt

### Typography
| Thành phần | Size | Weight | Màu |
|---|---|---|---|
| Số tiền chính (VND) | 20–24px | 500 | text-primary |
| Label / placeholder | 10px | 400 | text-tertiary |
| Nút bấm | 9–11px | 500 | — |
| Item list - tên | 9.5px | 500 | text-primary |
| Item list - phụ | 7px | 400 | text-tertiary |

### Display rule
- **Mọi số tiền = VND**. Không hiện USDC trên UI trừ màn confirm giao dịch
- Token list: VND to đậm, số token nhỏ mờ phía dưới
- "Số dư khả dụng" = USDC = local currency (VND)
- Sub-screen list: dòng đầu quan trọng nhất chiếm 2 hàng, các dòng còn lại mỗi dòng 1 hàng

---

## 3. Danh sách màn hình

### A. Onboarding (3 màn)

**1 · Đăng nhập**
- Hàng 1–5: logo + tên "ezwallet" + tagline căn giữa block, tâm hàng 3
- Hàng 6–7: trống (breathing room)
- Hàng 8: nút "đăng nhập với email" (xanh)
- Hàng 9: nút "số điện thoại (sắp ra mắt)" (disabled mờ)
- Hàng 10: "đăng nhập = chấp nhận điều khoản sử dụng"

**2 · Tạo PIN**
- Hàng 1–5: label "tạo PIN 4 số" + mô tả + 4 dot trạng thái, căn giữa block
- Hàng 6: trống
- Hàng 7–8–9: numpad số (không có dấu phẩy), tự chuyển khi đủ 4 số
- Hàng 10: text "tự chuyển khi đủ 4 số"
- Màn lặp lại 1 lần để xác nhận PIN, label đổi thành "xác nhận PIN 4 số"

**3 · Recovery (bắt buộc)**
- Hàng 1–5: icon shield + tiêu đề + mô tả căn giữa block
- Hàng 6–7: trống
- Hàng 8: passkey (ưu tiên, selected mặc định)
- Hàng 9: số điện thoại (sắp ra mắt, disabled)
- Hàng 10: quay lại (1/2) · tiếp tục (1/2 xanh)

---

### B. Bảo mật (3 màn)

**4 · Nhập PIN** (mở app / xác nhận giao dịch)
- Hàng 1–5: icon lock + label "nhập PIN" + 4 dot, căn giữa block
- Hàng 6: trống
- Hàng 7–8–9: numpad (không dấu phẩy)
- Hàng 10: link "quên PIN?"

**4b · Nhập sai 4 lần → khóa**
- Hàng 1–5: icon cảnh báo + "nhập sai 4 lần" + countdown 29:47
- Hàng 6: trống
- Hàng 7–8–9: numpad mờ (opacity 0.2)
- Hàng 10: link "quên PIN?"

**5 · Đổi PIN thành công**
- Hàng 1–5: icon check xanh + "PIN mới đã đặt" + badge "có hiệu lực sau 12 giờ" + badge "đã gửi email cảnh báo"
- Hàng 6–9: trống
- Hàng 10: nút "về màn hình chính" center 2/3

---

### C. Home — 4 màn chính

**6 · Home Gửi** (màn mặc định khi mở app)
- Hàng 1–2:
  - 2/3 trên: "Số dư khả dụng" + số VND to
  - 1/3 dưới: "Số dư thực tế" nhỏ mờ hơn
- Hàng 3–5: token list (USDC → ARC → ETH), mỗi token 1 hàng: icon + tên + VND to + số token mờ nhỏ
- Hàng 6–7: thông báo in-app (tối đa 2, có nút X) hoặc tip dashed
- Hàng 8–9: Danh bạ | Quét QR (to, chính) | Dán địa chỉ
- Hàng 10: nav bar — Đổi tiền · **Gửi** · Nhận · Menu

**7 · Home Nhận**
- Hàng 1–2: "Số dư" + số VND to (giống Home Gửi)
- Hàng 3–5: QR to căn giữa + label "địa chỉ ví của bạn"
- Hàng 6–7: thông báo hoặc tip
- Hàng 8–9: Chia sẻ địa chỉ | Custom QR (to, chính) | QR đã lưu
- Hàng 10: nav bar — Đổi tiền · Gửi · **Nhận** · Menu

**· Đổi tiền** (màn chính, có nav bar)
- Hàng 1–2: token nguồn (ARC) — chọn token + nhập số tiền bằng numpad
- Hàng 3: nút ↕ đổi chiều
- Hàng 4–5: token đích ("Số dư khả dụng") — chỉ tap để chọn token, không nhập số
- Hàng 6: nút OK center 2/3 xanh
- Hàng 7–8–9: numpad (có dấu phẩy)
- Hàng 10: nav bar — **Đổi tiền** · Gửi · Nhận · Menu

**· Menu** (màn chính, có nav bar)
- Hàng 1–2:
  - 1/4: label "Số dư khả dụng"
  - 2/4: số VND to
  - 1/4: nút Nạp · Rút (Rút disabled)
- Hàng 3–9: list menu
  - Lịch sử giao dịch
  - Ngôn ngữ & tiền tệ
  - Bảo mật
  - About
- Hàng 10: nav bar — Đổi tiền · Gửi · Nhận · **Menu**

---

### D. Luồng Gửi (3 màn)

**8 · Nhập số tiền**
- Hàng 1: tiêu đề (sub-screen)
- Hàng 2–5: box người nhận (avatar + tên/địa chỉ) + số tiền VND to
- Hàng 6: trống
- Hàng 7–8–9: numpad (có dấu phẩy)
- Hàng 10: quay lại (1/2) · tiếp tục (1/2 xanh)

**9 · Xác nhận**
- Hàng 1: tiêu đề
- Hàng 2–5: recap đầy đủ + cảnh báo "không thể hoàn tác" màu vàng
- Hàng 6–9: trống
- Hàng 10: sửa (1/2) · xác nhận · PIN (1/2 đỏ)

**10 · Biên lai**
- Hàng 1: tiêu đề
- Hàng 2–5: icon check xanh + "đã gửi thành công" + số tiền + người nhận + thời gian
- Hàng 6–9: trống
- Hàng 10: lưu biên lai (1/2) · xong (1/2 xanh)

---

### E. Danh bạ (2 màn)

**11 · Thêm danh bạ**
- Hàng 1: "Thêm danh bạ"
- Hàng 2–9: avatar "+" căn giữa + box ref giao dịch + field tên (system keyboard pop up khi tap, toolbar có nút ✓)
- Hàng 10: quay lại (1/2) · lưu (1/2 xanh) — bị keyboard che khi nhập

**11b · Danh sách danh bạ**
- Hàng 1: "Danh bạ"
- Hàng 2–9: list scroll, mỗi item: avatar màu + tên + địa chỉ rút gọn + chevron
- Hàng 10: quay lại center 2/3

---

### F. Custom QR (3 màn)

**12 · Tạo Custom QR**
- Hàng 1: "Custom QR"
- Hàng 2–5: "số tiền muốn nhận" + số VND to
- Hàng 6: trống
- Hàng 7–8–9: numpad (có dấu phẩy)
- Hàng 10: hủy (1/2) · tạo QR (1/2 xanh)

**13 · Hiển thị Custom QR**
- Hàng 1: "Custom QR"
- Hàng 2–5: QR to + số tiền VND + label
- Hàng 6–9: trống
- Hàng 10: đóng (1/2) · lưu QR này (1/2 xanh)

**14 · QR đã lưu**
- Hàng 1: "QR đã lưu"
- Hàng 2–9: grid 2 cột, mỗi ô: mini QR + tên + số tiền + nút xóa; ô cuối là "+" tạo mới
- Hàng 10: quay lại center 2/3

---

### G. Menu & Settings (5 màn)

**15 · Ngôn ngữ & tiền tệ**
- Hàng 1: tiêu đề
- Hàng 2–3: Ngôn ngữ (Tiếng Việt / English) — dòng đầu 2 hàng
- Hàng 4–7: Tiền tệ (VND / USD / EUR...) — mỗi dòng 1 hàng
- Hàng 10: quay lại (1/2) · lưu (1/2 xanh)

**16 · Nạp** (testnet)
- Hàng 1: "Nạp tiền"
- Hàng 2–9: icon + mô tả + địa chỉ ví, căn giữa
- Hàng 10: "mở Faucet" center 2/3

**17 · Rút** (disabled)
- Hàng 1: "Rút tiền"
- Hàng 2–9: toàn bộ mờ (opacity 0.4) + icon khóa + badge "chờ pháp lý & hạ tầng"
- Hàng 10: nút disabled "Tạm chưa hỗ trợ"

**18 · Bảo mật**
- Hàng 1: "Bảo mật"
- Hàng 2–3: Địa chỉ ví (2 hàng) — icon + địa chỉ rút gọn + nút copy + share
- Hàng 4: Email account
- Hàng 5: Đổi PIN → chevron
- Hàng 6: Passkey status (icon check xanh nếu đã thiết lập)
- Hàng 10: quay lại center 2/3

**19 · About**
- Hàng 1: "About"
- Hàng 2–3: logo + "ezwallet" + version + chain (2 hàng)
- Hàng 4: GitHub → link
- Hàng 5: Hướng dẫn sử dụng → link
- Hàng 6: Điều khoản → link
- Hàng 7: Chính sách bảo mật → link
- Hàng 10: quay lại center 2/3

---

### H. Lịch sử giao dịch (2 màn)

**20 · Lịch sử giao dịch**
- Hàng 1: "Lịch sử giao dịch"
- Hàng 2–9: list scroll, group theo ngày; mỗi item: avatar màu + tên/địa chỉ rút gọn + thời gian + số tiền +/-; chưa lưu danh bạ thì hiện "+ lưu danh bạ"
- Hàng 10: quay lại center 2/3

**21 · Chi tiết giao dịch**
- Hàng 1: "Chi tiết giao dịch"
- Hàng 2–9: icon +/- + số tiền VND to + thời gian + gửi đến + địa chỉ + trạng thái + mã tx (copy)
- Hàng 10: lưu biên lai (1/2) · quay lại (1/2 xanh)

---

## 4. Quy tắc chung (tổng hợp)

- Mọi số tiền = **VND**. USDC ẩn hoàn toàn, chỉ hiện ở màn confirm giao dịch
- Token list: VND to đậm, số token nhỏ mờ
- Avatar danh bạ: user tự thêm ảnh (dấu +), không tự generate
- Địa chỉ ví: ẩn khỏi luồng chính, chỉ hiện trong Bảo mật
- PIN delay sau khi đổi: **12 giờ** (không phải 24h)
- Nhập sai PIN 4 lần: khóa 30 phút
- Thông báo: in-app banner vùng 6–7, tối đa 2, có nút X; nếu không có thì hiện tip dashed
- Nút tay phải: action quan trọng luôn bên phải
- Sub-screen: hàng 1 = tiêu đề, hàng 10 = action
- 4 màn chính (Gửi · Nhận · Đổi tiền · Menu): không có hàng 1 tiêu đề, có nav bar hàng 10
- Recovery: passkey ưu tiên, SĐT "sắp ra mắt"
- Testnet: Nạp = faucet, Rút = disabled

---

## 5. Màn hình bổ sung (sau review)

### Flow Quên PIN (3 bước)

**Quên PIN · Bước 1 — Gửi OTP**
- Hàng 1: "Quên PIN"
- Hàng 2–9: icon mail + "Xác nhận email" + email user + badge "Tài khoản khả dụng sau 12 giờ", căn giữa
- Hàng 10: nút "gửi OTP" center 2/3

**Quên PIN · Bước 2 — Nhập OTP**
- Hàng 1: "Nhập OTP"
- Hàng 2–5: label + 6 ô OTP + link "gửi lại OTP", căn giữa
- Hàng 6: trống
- Hàng 7–8–9: numpad (không dấu phẩy)
- Hàng 10: nút "xác nhận" center 2/3

**Quên PIN · Bước 3 — Tạo PIN mới**
- Hàng 1: "Tạo PIN mới"
- Hàng 2–5: label + 4 dot + badge "Tài khoản khả dụng sau 12 giờ", căn giữa
- Hàng 6: trống
- Hàng 7–8–9: numpad (không dấu phẩy), tự chuyển khi đủ 4 số
- Hàng 10: text "tự chuyển khi đủ 4 số"

---

### Màn trạng thái (State screens)

**Loading — Đang xử lý giao dịch**
- Hàng 1: "Đang gửi"
- Hàng 2–9: spinner + "Đang xử lý..." + mô tả + "vui lòng không đóng app", căn giữa
- Hàng 10: nút disabled "vui lòng chờ" (opacity 0.4)

**Gửi thất bại**
- Hàng 1: "Thất bại"
- Hàng 2–9: icon đỏ + "Gửi không thành công" + badge lỗi + "số dư không bị trừ", căn giữa
- Hàng 10: về trang chủ (1/2) · thử lại (1/2 xanh)

**Đổi tiền thành công**
- Hàng 1: "Đổi tiền"
- Hàng 2–9: icon check xanh + "Đổi tiền thành công" + receipt box (đã bán / đã nhận / phí), căn giữa
- Hàng 10: nút "xong" center 2/3

**Rule:** Màn chỉ có 1 nút xong → content căn giữa toàn bộ vùng 1–9, không dính cứng lên hàng 1–5.

---

### Danh bạ mở rộng

**Thêm danh bạ thủ công**
- Hàng 1: "Thêm danh bạ"
- Hàng 2–9: avatar "+" căn giữa + field địa chỉ ví (nhập hoặc dán) + field tên danh bạ
- Hàng 10: quay lại (1/2) · lưu (1/2 xanh) — bị keyboard che khi nhập

**Tap danh bạ → gửi tiền**
- Tap vào item trong danh sách danh bạ → vào thẳng màn Nhập số tiền (màn 8) với người nhận đã điền sẵn

---

### Edge cases

**QR không hợp lệ**
- Hàng 1: "Quét QR"
- Hàng 2–9: icon đỏ + "QR không hợp lệ" + badge "không phải địa chỉ ví Arc" + mô tả, căn giữa
- Hàng 10: dán địa chỉ (1/2) · quét lại (1/2 xanh)

**Địa chỉ không hợp lệ (dán tay)**
- Hàng 1: "Dán địa chỉ"
- Hàng 2–9: field đỏ border + label lỗi + badge + tip "địa chỉ Arc bắt đầu bằng 0x"
- Hàng 10: quay lại (1/2) · tiếp tục disabled (1/2 mờ)

**Ví trống lần đầu (Home Gửi)**
- Hàng 1–2: số dư "0 VND"
- Hàng 3–5: icon ví trống + "Ví chưa có tiền" + mô tả cách nạp
- Hàng 6–7: tip dashed "nhờ bạn bè quét QR để nhận tiền đầu tiên"
- Hàng 8–9: nút chính là "nhận tiền" (không phải "quét QR" vì chưa có tiền để gửi)
- Hàng 10: nav bar bình thường, active Nhận

---

## 6. Rule bổ sung (sau review)

- **Tài khoản bị khóa 12h** sau khi đổi PIN (không phải PIN hiệu lực sau 12h) — label đúng: "Tài khoản khả dụng sau 12 giờ"
- **Ví trống**: nút chính hàng 8–9 đổi thành "nhận tiền", không phải "quét QR"
- **Địa chỉ không hợp lệ**: nút tiếp tục disabled, field border đỏ, tip giải thích
- **QR fail**: 2 lựa chọn thoát — quét lại hoặc dán địa chỉ
- **Tap danh bạ**: đi thẳng vào màn nhập số tiền, không qua bước trung gian
- **Thêm danh bạ thủ công**: có thể nhập địa chỉ tay, không chỉ từ Activity
