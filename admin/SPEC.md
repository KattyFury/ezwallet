# ezwallet – Spec trang Admin (admin.ezwallet.cash)

Bản chốt v2, 2026-09-29. Đây là spec để đưa cho Claude Code build. Bản nháp trước còn 6 câu hỏi (Q1–Q6); bản này đã chọn sẵn theo đề xuất, ghi rõ ở mục 2.

---

## 1. Mục tiêu và phạm vi

Trang admin riêng cho chủ dự án để xem tình hình ezwallet và gửi thông báo cho người dùng.

**Làm:**
- Thống kê người dùng.
- Tra cứu 1 người dùng (chỉ xem).
- Kiểm tra sức khoẻ hệ thống.
- Gửi mail thông báo.
- Đẩy thông báo vào khu thông báo trong app.

**Không làm:** khoá tài khoản, động vào ví/tiền/PIN, gọi bất kỳ API Circle tạo hoặc sửa nào.

## 2. Các quyết định đã chốt

| Câu hỏi | Chốt |
|---|---|
| Q1. Chỗ đặt code | Thư mục `admin/` trong repo `ezwallet`, dùng chung `src/network.js` và `_mail.js` |
| Q2. Thống kê giao dịch/tổng tiền | Chưa làm ở v1. Chỉ thống kê người dùng |
| Q3. Email vào admin | Chỉ `kattyfury1403@gmail.com` |
| Q4. Gửi mail hàng loạt | v1 chỉ gửi cho 1 người. Gửi tất cả để sau khi kiểm tra giới hạn Resend |
| Q5. Thời hạn thông báo trong app | Server giữ tối đa 7 ngày. Khi app tải về thì hiện 24h như thông báo hiện có |
| Q6. Thứ tự | Admin làm trước Mainnet v1. Việc "testnet y chang mainnet" làm sau admin |

Ghi chú Q4: thông báo đẩy vào app vẫn cho gửi "tất cả", vì chỉ tốn 1 mục KV, không dính giới hạn mail.

## 3. Bối cảnh kỹ thuật

- ezwallet là ví stablecoin cho người phổ thông, đăng nhập email + mã 6 số + PIN 6 số, ví Circle User-Controlled (`userId` = email), chạy trên chuỗi Arc.
- 2 bản, 1 code: `testnet.ezwallet.cash` và `ezwallet.cash` (mainnet, chưa ra mắt). Luật: testnet phải y chang mainnet, chỉ khác mạng, App ID, địa chỉ token, faucet.
- Server gần như không lưu người dùng. KV `EZ_SYNC` chỉ có mã email tạm, phiên đăng nhập, sao lưu danh bạ/QR. Dữ liệu admin lấy từ Circle (người dùng, ví) và chuỗi Arc (số dư, giao dịch).
- Thông báo trong app hiện chỉ nằm trên máy từng người (localStorage, xoá sau 24h).

## 4. Đã kiểm chứng và chưa kiểm chứng

- ✅ `GET /v1/w3s/users` chỉ cần API key. Phân trang 50/lần. Mỗi người có email (`id`), `status`, `createDate`, `pinStatus`, số lần nhập PIN sai, `securityQuestionStatus`, `authMode`.
- ✅ `GET /v1/w3s/users/{email}` xem 1 người.
- ⚠️ `GET /v1/w3s/wallets?userId=…` và `GET /v1/w3s/transactions?userId=…` chỉ với API key: trả 200 nhưng rỗng cho người chưa có ví. Chưa xác minh với người có ví thật. **Bước 1 của build là xác minh việc này bằng tài khoản test của chủ dự án.**
- Đường dự phòng nếu Circle không trả: đọc số dư qua RPC và giao dịch qua ArcScan theo địa chỉ ví. App đang làm y như vậy để báo "nhận tiền".

## 5. Chức năng

### 5.1 Thống kê
- Tổng số người dùng.
- Người mới theo ngày và theo tuần (từ `createDate`).
- Đã đặt PIN / chưa đặt PIN (tạo xong bỏ dở).
- Đã đặt câu hỏi bảo mật.
- Không có thống kê giao dịch/tổng tiền ở v1.

### 5.2 Tra cứu 1 người dùng
- Nhập email: hiện thông tin Circle, địa chỉ ví, số dư USDC/EURC, khoảng 20 giao dịch gần nhất (link ArcScan).
- Nhập địa chỉ ví: hiện số dư và giao dịch. Chỉ hiện email nếu Circle tra ngược được, cần xác minh ở bước 1.
- Chỉ xem, không có nút nào động vào ví, tiền hay PIN.

### 5.3 Sức khoẻ hệ thống
- `/api/health` của từng bản (đúng chuỗi, contract có thật).
- Circle API có trả lời không.
- RPC Arc có đang ra block không.
- Resend: tên miền `ezwallet.cash` còn xác minh không.
- Nhật ký lỗi: để sau, vì server hiện không lưu lỗi ở chỗ đọc được.

### 5.4 Gửi mail thông báo
- Gửi qua Resend, từ `no-reply@ezwallet.cash`.
- v1: gửi cho 1 người (nhập email).
- Bắt buộc có màn xem trước và bấm xác nhận lần 2 trước khi gửi.
- Gửi tất cả người dùng: chưa làm ở v1.

### 5.5 Đẩy thông báo vào app
- Xây mới hộp thư trên server: KV `inbox:<ví>` cho từng người, cộng 1 mục `inbox:all` cho thông báo gửi tất cả. Mỗi thông báo tự hết hạn sau 7 ngày.
- App mở lên thì hỏi server có thông báo mới không, rồi hiện vào `NotifArea` có sẵn (hiện 24h như cũ).
- Cần đánh dấu "đã nhận" để không hiện lại cùng một thông báo.
- Thông báo từ admin có giao diện riêng (biểu tượng "ezwallet") để phân biệt với "nhận tiền".
- Gửi cho 1 người hoặc tất cả, cùng màn xem trước và xác nhận lần 2 như mail.
- ⚠️ Đây là thay đổi trong app người dùng, không chỉ trang admin. Theo luật: lên testnet trước, code giống hệt ở 2 bản, thử trên điện thoại rồi mới mainnet.

## 6. Bảo mật (quan trọng nhất)

1. Cloudflare Access đứng trước toàn bộ `admin.ezwallet.cash`, cả trang lẫn API. Chỉ email trong danh sách được vào, đăng nhập bằng mã gửi qua mail.
2. Kiểm tra 2 lớp: API admin tự kiểm tra lại "vé" `Cf-Access-Jwt-Assertion` của Cloudflare Access, không chỉ tin cửa ngoài. Cấu hình Access sai thì API vẫn từ chối.
3. Admin chỉ đọc từ Circle. Code admin cấm gọi mọi API Circle tạo/sửa (tạo người dùng, cấp token, giao dịch). Lý do: key Circle cấp được token cho bất kỳ email nào, nên nếu admin bị lộ mà có đường gọi hàm đó thì kẻ gian giả làm người dùng được.
4. Trang admin không tải script bên ngoài, CSP chặt, `noindex`.
5. Mỗi lần gửi mail hoặc thông báo được ghi vào KV: ai gửi, lúc nào, gửi cho ai, nội dung.

## 7. Cách dựng

- Thư mục `admin/` trong repo `ezwallet`.
- 1 project Cloudflare Pages riêng `ezwallet-admin`, tên miền `admin.ezwallet.cash`.
- Project cần: key Circle của cả 2 mạng, key Resend, quyền đọc/ghi KV của cả 2 bản. KV của mainnet chưa tồn tại, tạo lúc làm Giai đoạn 3 mainnet.
- Nút chuyển mạng testnet/mainnet trên giao diện. Làm và thử trên testnet trước.

## 8. Việc chủ dự án phải tự làm

- Bật Cloudflare Zero Trust (gói Free, tối đa 50 người). Có thể phải thêm thẻ thanh toán dù miễn phí.
- Cho phép Claude Code thử đọc ví và giao dịch của tài khoản test của chính bạn, để xác minh mục 4.

## 9. Các bước build

1. Xác minh mục 4 bằng tài khoản test của chủ dự án.
2. Dựng khung `admin/`, Pages project, Cloudflare Access, kiểm tra vé 2 lớp. Thử: người ngoài phải bị chặn.
3. Sức khoẻ hệ thống, rồi Thống kê, rồi Tra cứu (chỉ đọc, testnet trước).
4. Gửi mail cho 1 người, có xác nhận lần 2.
5. Hộp thư thông báo trong app, lên testnet, chủ dự án thử trên điện thoại.
6. Bật cho mainnet khi mainnet ra mắt.

### 5.6 Danh sách người dùng (bổ sung 2026-09-29, chủ dự án yêu cầu)
- Tab Users: mọi email của mạng đang chọn, mới nhất trước: ngày tạo, PIN đã đặt chưa, số lần sai PIN, câu hỏi bảo mật, trạng thái. Có ô lọc theo email; bấm email → mở Tra cứu người đó. Chỉ xem.
