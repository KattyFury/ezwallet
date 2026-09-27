# ezwallet — Kế hoạch gộp repo + Mainnet v1 (Chỉ Gửi/Nhận)

*Soạn 2026-09-27, đã chốt với Claude Chat cùng ngày. Chưa có dòng code nào được viết cho kế hoạch này.*

---

## 1. Bối cảnh (đã chốt)

- **ezwallet**: ví stablecoin cho người phổ thông / người lớn tuổi. Đăng nhập bằng email + mã 6 số gửi qua email + PIN 6 số (ví Circle User-Controlled). Không có seed phrase, phí gas trả bằng USDC, chạy trên chuỗi Arc.
- **Arc Mainnet đã chạy.** Đã thử bằng **key LIVE thật của Circle**: tạo ví PIN trên chuỗi `ARC` (mainnet) thành công. Đây là rào chặn lớn nhất (B1), giờ đã gỡ.
- **Testnet** (testnet.ezwallet.cash) đang có người dùng thử và đã có đủ các bản sửa an toàn tiền:
  - C1: mã email trước khi vào ví. **Mới lên hôm nay**, chủ dự án đã thử trên điện thoại.
  - C2: cấu hình mạng tách riêng + tự kiểm tra lúc khởi động.
  - H1/H6: số tiền chính xác tuyệt đối, kiểm tra checksum địa chỉ.
  - C3/C4: không gửi trùng 2 lần; chỉ hiện biên lai khi chuỗi đã xác nhận `COMPLETE`.
- **Quyết định của chủ dự án:**
  1. **Mainnet v1 = CHỈ Gửi/Nhận.** Swap tắt trên mainnet, để sang v1.1. "Build từ từ, chậm mà chắc."
  2. **Gộp về 1 repo** (`KattyFury/ezwallet`), deploy ra 2 nơi: testnet.ezwallet.cash và ezwallet.cash. Repo `ezwallet-testnet` **bị xoá hẳn** (trên GitHub và thư mục trong máy), sau khi đã chuyển xong code sang repo `ezwallet`. Không viết lại code vào thư mục mới.
  3. **Không thu phí gửi.** ezwallet là dự án phi lợi nhuận, mainnet v1 không có doanh thu.

## 2. Các giai đoạn

### Giai đoạn 1 — Gộp repo (testnet vẫn chạy y như cũ)
1. Đưa phần code mới của testnet (mã email C1) sang repo `ezwallet`.
2. Mọi thứ khác nhau giữa 2 mạng gom vào `src/network.js` thành "công tắc" theo mạng:
   - **App ID** của Circle: testnet `518fec6a-…`, mainnet `5ffb6dbb-…`. Hiện đang ghi cứng ở 3 file.
   - **Swap**: testnet BẬT, mainnet TẮT.
   - **cirBTC**: testnet có, mainnet không.
   - **Faucet** (nhận tiền thử): testnet có, mainnet không.
   - Mã chuỗi Circle: testnet `ARC-TESTNET`, mainnet `ARC`.
3. Tạo project Cloudflare Pages mới cho testnet, lấy code từ repo `ezwallet` với cấu hình testnet. Chuyển tên miền testnet.ezwallet.cash sang project này.
4. **Kiểm tra:** người dùng thử đăng nhập vẫn thấy đúng ví, số dư, lịch sử cũ. Ví gắn với tài khoản Circle, không gắn với repo, nên không mất.
5. **Chỉ khi bước 4 đã OK:** xoá repo `ezwallet-testnet` trên GitHub và xoá thư mục của nó trong máy. Xoá là mất vĩnh viễn, nên kiểm tra lại lần cuối là code C1 đã nằm trong repo `ezwallet`.

**Xong khi:** testnet.ezwallet.cash chạy từ repo `ezwallet`, không ai phát hiện có gì thay đổi, và chỉ còn 1 repo.

### Giai đoạn 2 — Làm Mainnet v1 (chỉ Gửi/Nhận)
| # | Việc | Vì sao |
|---|---|---|
| 1 | Swap tắt trên mainnet: ô "Exchange" trong Service Hub **giữ nguyên vị trí**, làm mờ, ghi "Coming soon" (không ghi ngày), không bấm được. Server `/api/swap` trả lỗi nếu bị gọi | Tránh rủi ro mất tiền khi swap (C5/H2); giữ bố cục nút đã ưng, v1.1 chỉ cần bật lại |
| 2 | **QR an toàn (H3):** QR điền sẵn số tiền phải hiện rõ "Số tiền do mã QR này yêu cầu". QR đòi **trên $100** phải xác nhận thêm một bước | QR độc có thể lừa gửi số lớn |
| 3 | **Mail thông báo bảo mật (3 loại):** tạo tài khoản thành công; đổi PIN; đặt lại PIN khi quên (bằng câu hỏi bảo mật của Circle). Server biết thời điểm đặt lại PIN vì yêu cầu đi qua server ezwallet trước khi mở iframe Circle | Chủ ví biết ngay khi có ai động vào tài khoản. **Không khoá giao dịch** sau khi đặt lại PIN |
| 4 | **Hiện phí gas bằng USDC trước khi xác nhận** (thay vì con số ước đoán cố định) | Spec đã chốt; người dùng biết chính xác sẽ tốn bao nhiêu |
| 5 | Server kiểm tra địa chỉ nhận trong `send.js` | Chặn địa chỉ sai bị biến thành địa chỉ khác |
| 6 | **Chặn email dùng-một-lần (temp-mail)** trên mainnet | Ví gắn với email; email chết thì người dùng không lấy lại được ví |
| 7 | Siết bảo mật web: CORS chỉ cho tên miền của app; không trả nguyên văn lỗi Circle; CSP chặt; bỏ script đếm lượt truy cập của Cloudflare | Khuyến nghị "hardening" trong audit |
| 8 | Ghi nhãn "TESTNET – không phải tiền thật" rõ ràng trên màn Nhận/Chia sẻ của bản testnet (H4) | Tránh người thử đem địa chỉ testnet đi nhận tiền thật |
| 9 | README "Hạn chế" (ngắn gọn): chưa xuất được private key; chưa có audit độc lập; không phải ngân hàng; chỉ gửi/nhận trong mạng Arc | Spec yêu cầu nói thẳng |

### Giai đoạn 3 — Ra mắt
1. Tạo project Pages cho mainnet: đặt `NETWORK=mainnet`, key LIVE của Circle, một khoá ký mã email **riêng** cho mainnet, Resend.
2. `/api/health` trên mainnet phải báo OK (đúng chainId, contract USDC/EURC có code thật). Nếu luồng gửi dùng contract Memo thì kiểm tra cả Memo; địa chỉ mainnet lấy từ docs Arc, không copy từ testnet.
3. **Thử bằng tiền thật rất nhỏ (≤ $1)** từ một ví riêng, từng luồng một: tạo ví (có mail) → nhận → gửi → mất mạng giữa chừng → đổi PIN (có mail) → quên PIN, đặt lại bằng câu hỏi bảo mật (có mail).
4. Chuyển ezwallet.cash từ "chuyển hướng sang testnet" sang app mainnet.

## 3. Đã chốt với chủ dự án

1. **Doanh thu:** không thu phí gửi, v1 không có doanh thu.
2. **Ô Swap trên mainnet:** giữ chỗ, làm mờ, ghi "Coming soon".
3. **Ngưỡng QR:** trên $100 thì xác nhận thêm.
4. **Khoá sau đặt lại PIN:** không có.
5. **Tên miền:** mainnet `ezwallet.cash`, testnet `testnet.ezwallet.cash`.
6. **Gói Circle production:** chủ dự án tự kiểm tra trang Billing của Circle Console.
7. **Temp-mail:** chặn trên mainnet.
8. **Mail:** v1 có mail tạo tài khoản, đổi PIN, đặt lại PIN. Mail báo nhận/gửi tiền để sau.

## 4. Không làm trong v1 (để sau)
Swap (C5/H2, cần một RPC trả phí có `eth_simulateV1`, và adapter Circle chưa hỗ trợ `ARC`) · cirBTC · CCTP/Gateway (chuyển tiền qua chuỗi khác) · Onramp Kit (nạp tiền bằng thẻ, đã có trong Circle Console) · mail báo nhận/gửi tiền.
