# Migration spec: Circle User-Controlled Wallet → Privy

> Trạng thái: bước 1 (PoC) ĐÃ XONG – xem mục 1b. Chưa sửa dòng code nào của app thật.
>
> **Chỗ làm việc:** nhánh `privy` của chính repo này (quyết định 2026-08-30). Không tách project
> riêng: bản Privy là để THAY bản Circle, không phải sản phẩm thứ hai. Nhánh `main` vẫn là bản
> Circle đang chạy production tại ezwallet.cash cho tới khi bản Privy verify xong thì merge.
> PoC rời nằm ở `../ezwallet-privy-poc/` (xóa được sau khi migration xong).

---

## 0. Vì sao đổi

3 lý do đã chốt:

1. **Muốn social login.** Circle hiện tại chỉ có email + PIN, không có bất kỳ social login nào –
   xác nhận khớp với README ("Google sign-in is not supported. Email + PIN only.").
2. **Muốn non-custody có key export.** Circle User-Controlled Wallets là semi-custodial, không cho
   export private key. Privy có method `exportWallet` (EVM) cho phép user tự lấy raw private key
   ra dùng ở ví khác – escape hatch thật, không phải marketing.
3. **Muốn local-language UI.** PIN iframe của Circle chỉ render tiếng Anh, không có roadmap
   localization rõ ràng.

Không có user thật ngoài founder, không cần lo migrate ví cũ, có thể thay thẳng.

---

## 1. Đã xác nhận qua research docs Privy (không cần đợi PoC mới biết phần lý thuyết)

1. **Arc Testnet + gas token (USDC).** Privy support bất kỳ EVM-compatible chain nào qua
   `defineChain` của viem – không cần Arc có tên sẵn trong docs Privy, chỉ cần khai
   `nativeCurrency` + RPC URL + block explorer. Privy ký raw tx, không tự tính hay quan tâm gas
   token là gì – xác nhận đúng suy luận "về lý thuyết OK" ở bản đầu.
   **Gotcha cụ thể cần test trong PoC:** `nativeCurrency.decimals`. Hầu hết ví dụ Privy (ETH và
   các L1/L2 khác) để `decimals: 18`, nhưng USDC là 6 số thập phân. Khai sai decimals thì tx vẫn
   ký được, nhưng số dư gas / gas estimate hiển thị trong ví sẽ sai lệch. PoC phải check số dư
   hiển thị đúng, không chỉ "tx confirm on-chain".
2. **Key export.** Xác nhận Privy hỗ trợ export private key cho embedded wallet EVM qua
   `exportWallet` / `useExportWallet`. Khi export, key được assemble ở 1 origin khác app, Privy và
   app đều không đụng được vào key lúc đó.
   **Cần verify trong PoC:** docs Privy ghi export chỉ available cho "Tier 2/3 chains" – Arc là
   custom chain, cần chắc chắn nó rơi vào tier được hỗ trợ export, không chỉ tier hỗ trợ ký thường.
3. ~~**PIN vs MFA – đã quyết: giữ PIN, không dùng Passkey/TOTP/SMS của Privy.**~~
   **❌ ĐẢO NGƯỢC 2026-08-30 khi bắt tay code. Giả định bên dưới SAI.** Mục này viết rằng PIN sẽ mã
   hoá "secret/token cần để gọi hàm ký của Privy" — **không tồn tại secret nào như vậy.** PIN của
   Circle là thật vì nó HOÀN THÀNH chữ ký MPC; Privy giữ key trong phần cứng bảo mật của họ và gác
   việc ký bằng session của chính họ. PIN tự build chỉ có thể là (a) so chuỗi bằng `if`, ai mở
   devtools cũng qua, hoặc (b) kéo private key về máy rồi khoá sau 6 chữ số — 1 triệu khả năng, dò
   offline được. **Đã đổi sang Passkey (vân tay/Face ID)** — xem mục 1c. Phần gạch ngang dưới đây
   giữ lại để biết vì sao từng chọn sai.
   Privy không có PIN số trong hệ MFA (chỉ Passkey/TOTP/SMS), nên "giữ PIN" nghĩa là tự build:
   - `PinGate.jsx` giữ vai trò unlock app lúc mở lên (như hiện tại).
   - Thêm PIN-prompt component dùng lại được, bắt nhập lại **trước khi `SendConfirm.jsx` gọi
     Privy `sendTransaction`** – không phải chỉ 1 lần lúc mở app.
   - **Cách làm đúng, không phải if-check:** PIN derive ra 1 encryption key (Web Crypto
     SubtleCrypto, PBKDF2 là đủ), key đó mã hoá secret/token cần để gọi hàm ký của Privy, lưu local
     ở dạng đã mã hoá. Sai PIN – không giải mã được – không có cách nào gọi hàm ký. So sánh chuỗi
     PIN bằng if-check thường thì PIN chỉ còn là hình thức, ai mở devtools cũng bypass được – khác
     bản chất so với PIN của Circle hiện tại (PIN hoàn thành chữ ký MPC thật, không có PIN thì
     không ký được).

---

## 1b. KẾT QUẢ PoC THẬT (2026-08-30) – đã chạy, không phải suy luận

PoC ở `../ezwallet-privy-poc/` (thư mục riêng, xoá được sau khi xong). App ID Privy:
`cmtenk9en00250blabovll48e`. Ví test tạo ra: `0x0eE44Ec95898682658Bb3847a854b25D165610D7`.

**✅ Arc Testnet chạy được với Privy.** Khai `defineChain` (chainId 5042002) vào
`defaultChain` + `supportedChains` của `PrivyProvider`, thêm `embeddedWallets.createOnLogin:
'all-users'` → login email xong Privy tự tạo embedded wallet trên Arc. Không cần Arc có tên sẵn
trong docs Privy, đúng như dự đoán ở mục 1.1.

**✅ `exportWallet` HOẠT ĐỘNG trên Arc.** Lo ngại "export chỉ có ở Tier 2/3 chains, Arc là custom
chain" ở mục 1.2 là thừa – bấm ra modal lấy được private key thật. Lý do #2 của việc đổi sang Privy
(non-custody có key export) được xác nhận, không phải marketing.

**⚠️ SỬA LẠI mục 1.1 – `nativeCurrency.decimals` phải là 18, KHÔNG phải 6.** Bản spec trước ghi
"USDC là 6 số thập phân nên phải khai decimals=6" là SAI. Arc tính gas theo kiểu wei 18 chữ số
(chuẩn EVM cho native currency), tách biệt hoàn toàn với contract ERC20 USDC (`0x3600...`) vốn có
decimals=6 cho việc chuyển token. `src/chain.js` hiện tại đã khai đúng 18 từ đầu → **không đụng vào
file đó nữa**. Khai thành 6 mới là làm hỏng phần hiển thị phí gas.

**⚠️ `useExportWallet` KHÔNG tồn tại** trong `@privy-io/react-auth` 2.25.0 (bản cài thực tế). Đọc
`node_modules/@privy-io/react-auth/dist/dts/index.d.ts:2023` → `exportWallet` là một field của
`usePrivy()`, không phải hook riêng. Docs Privy nhắc tên `useExportWallet` nhưng SDK không có →
**đọc .d.ts trong node_modules trước, đừng tin tên hook trong docs.**

**⚠️ Privy cần polyfill `Buffer`** trong trình duyệt, y hệt Circle SDK trước đây – không có thì
`sendTransaction` chết với `Buffer is not defined`. `vite.config.js` của dự án thật ĐÃ có sẵn
`nodePolyfills({ globals: { Buffer: true, ... } })` → **không cần sửa gì**, chỉ cần biết là đừng gỡ
plugin đó khi dọn dẹp Circle ở bước 6.

**✅ GỬI USDC THẬT TRÊN ARC – ĐÃ CHẠY, ĐÃ KIỂM TRA ON-CHAIN.** Gửi 0.01 USDC từ
`0x0eE44Ec9...10D7` → `0x68A1d0cC...5d86`. Kiểm chứng bằng RPC (không tin log của app):
`getTransactionCount` = 1 (đúng 1 tx đã lên chain), số dư ví gửi 20 → 19.988972 (0.01 gửi đi +
~0.001 gas). Privy ký + broadcast được trên Arc dù Arc lấy USDC làm gas – đúng như dự đoán mục 1.1.

**⚠️ `sendTransaction` trả về `{ hash }`, KHÔNG phải `{ transactionHash }`** (xác nhận ở
`node_modules/@privy-io/react-auth/dist/dts/index.d.ts:3694`). Đọc sai tên field thì tx vẫn chạy
đúng nhưng app không có hash để hiện link ArcScan – lỗi âm thầm, không ném exception.

**📌 Arc: native balance và USDC ERC20 là CÙNG MỘT SỐ TIỀN.** Đo thực tế cùng lúc:
native = `19.988972302` (18 decimals), ERC20 `0x3600...` = `19.988972` (6 decimals). Contract
`0x3600...` chính là native balance nhìn ở góc 6 số lẻ. → **Đừng cộng 2 số này lại** ở màn hình số
dư (sẽ thành gấp đôi tiền), và đừng hiện "phí gas" như một loại tiền khác với USDC người dùng đang
giữ.

---

## 1c. QUYẾT ĐỊNH BẢO MẬT CUỐI CÙNG (2026-08-30) – Passkey thay PIN

**Chọn: Passkey (vân tay / Face ID).** Ba hướng đã cân nhắc:

| Hướng | Bảo mật | Vì sao loại / chọn |
|---|---|---|
| **Passkey** ✅ | Thật. Key không rời phần cứng Privy, sai thì server Privy chặn | **CHỌN.** Với người già còn dễ hơn PIN: không phải nhớ gì, chạm 1 cái |
| PIN mã hoá key ở máy | Thật nhưng yếu | Key mã hoá nằm trong trình duyệt; PIN 6 số = 1 triệu khả năng, dò offline. API `getWalletPrivateKey` còn `@experimental` |
| PIN chỉ là cổng UI | Không có | Mở devtools là qua. Gọi nó là "PIN" tức là hứa nhiều hơn thứ nó cho |

**Hệ quả đã làm:**
- `PinGate.jsx` **XOÁ**. Cổng chuyển từ *mở app* sang *ký giao dịch* — xem số dư của chính mình
  chưa bao giờ cần khoá.
- Security: bỏ "Change PIN", thêm **"Fingerprint or Face ID"** + **"Export private key"**.
- **Mời bật ngay lúc đăng ký** (bước `protect` trong `EnterEmail.jsx`) — nếu chỉ để trong menu thì
  hầu như không ai bật, tức mặc định của một cái ví có tiền thật là "ai cầm máy cũng gửi được".
  Nhưng là **lời mời, không phải bức tường**: máy không có cảm biến, máy mượn, hoặc chỉ muốn xem
  trước — đều không phải lý do để khoá người ta khỏi tiền của chính họ ngay cửa.
- Chữ trên màn hình: **"Fingerprint or Face ID"**, tuyệt đối không dùng "passkey"/"MFA"/"2FA" —
  từ mà người đọc không hiểu là từ bị bỏ qua.
- Privy đòi passkey qua **listener trong `App.jsx`** (vì app tắt UI của Privy). **Gỡ listener đó
  thì ký sẽ treo, hoặc tệ hơn là cổng bảo mật im lặng biến mất.**

---

## 2. Kiến trúc hiện tại (Circle) – không đổi so với bản gốc

- **Auth:** `src/circle.js` quản `userToken` (sống 60') + `encryptionKey` + `refreshToken` (Google,
  sống 14 ngày) qua `localStorage`. Backend proxy `functions/api/session.js` gọi
  `api.circle.com/v1/w3s/users/*` (key server-side).
- **Wallet:** Circle User-Controlled Wallet (MPC EOA 2-share: 1 share Circle giữ, 1 share user giữ
  qua PIN). Ký = mở challenge (`functions/api/wallet.js`, `send.js` → `contractExecution` trả
  `challengeId`) rồi `@circle-fin/w3s-pw-web-sdk` mở iframe nhập PIN để hoàn tất ký (client-side,
  lazy-loaded ~740KB).
- **Send:** `functions/api/send.js` encode ERC20 `transfer` (hoặc qua Memo contract nếu có note) →
  Circle `contractExecution` → PIN challenge ký → broadcast (Circle lo phần này).
- **Swap:** `functions/api/_swapCore.js` gọi Circle Stablecoin Kit (`/v1/stablecoinKits/swap`) →
  routing/quote CHỈ Circle có, KHÔNG liên quan MPC wallet. Kit trả 1 signed intent, server batch
  thành `[approve, adapter.execute]` qua Multicall3, PIN ký như send bình thường.
  → Swap không cần đổi nhà cung cấp routing, chỉ đổi phần ký (PIN Circle → PIN tự build + Privy).
- **Sync (contacts/QR backup):** `functions/api/sync.js` – auth bằng chữ ký ví (EIP-191,
  `recoverMessageAddress` từ viem), không phụ thuộc `userToken`, đã provider-agnostic sẵn. Gần như
  không cần đổi, trừ nơi lấy chữ ký (PinGate.jsx).
- **PIN gate:** `src/screens/PinGate.jsx` – vào app = mở iframe PIN Circle, ký 1 message rỗng để
  "mở khóa" + lấy chữ ký cho sync cùng lúc (gộp 1 lần PIN).

---

## 3. Danh sách file chạm tới Circle (20 file, có ghi chú mở rộng scope)

```
src/circle.js                  ← toàn bộ, thay bằng src/privy.js
src/App.jsx                    ← khởi tạo, PrivyProvider bọc app
src/chain.js                   ← config Arc như custom EVM chain, verify decimals=6 (mục 1.1)
src/data.js                    ← có thể chỉ đọc field ví, ít đổi
src/mock.js                    ← mock data, đổi field tên nếu cần
src/sync.js                    ← client-side, giữ logic, đổi nguồn lấy chữ ký
src/screens/Login.jsx           ← thay hoàn toàn – dùng Privy headless hooks
                                   (useLoginWithEmail/useLoginWithOAuth...), KHÔNG dùng modal mặc
                                   định, để giữ nguyên Barlow/gradient/design system hiện có
src/screens/EnterEmail.jsx      ← GIỮ, bọc quanh headless hooks thay vì Circle SDK – không đổi
                                   sang modal mặc định của Privy (đã quyết, mục 5)
src/screens/PinGate.jsx         ← thay bằng PIN tự build (mã hoá/giải mã theo mục 1.3), KHÔNG
                                   dùng Passkey/TOTP/SMS của Privy
src/screens/Security.jsx        ← đổi phần "đổi PIN" sang quản PIN tự build (không phải Privy MFA)
src/screens/SendConfirm.jsx     ← thêm bước prompt PIN tự build TRƯỚC KHI gọi Privy sendTransaction
                                   (không phải chỉ đổi 1 dòng gọi API)
src/screens/SendReceipt.jsx     ← có thể chỉ đọc kết quả, ít đổi
src/screens/HomeSend.jsx        ← đọc địa chỉ ví, đổi nguồn
src/screens/HomeReceive.jsx     ← đọc địa chỉ ví, đổi nguồn
src/screens/SendAmount.jsx      ← kiểm tra tham chiếu, có thể ít đổi
src/screens/Swap.jsx            ← đổi phần ký (PIN Circle → PIN tự build + Privy), giữ Stablecoin Kit
src/screens/Contacts.jsx        ← kiểm tra tham chiếu
src/screens/MenuScreen.jsx      ← kiểm tra tham chiếu
src/screens/About.jsx           ← + RA TOÀN APP: đổi mọi chỗ ghi "địa chỉ ví"/"wallet address"
                                   trong UI copy thành "số tài khoản". Giữ nguyên cách gọi network
                                   ("mạng Arc Testnet"), không dùng ẩn dụ ngân hàng cho network khác
                                   nhau (tránh đụng hard constraint "never called a bank")
src/components/NotifArea.jsx    ← kiểm tra tham chiếu lỗi Circle-specific

functions/api/session.js       ← xóa (Privy quản session phía client)
functions/api/wallet.js        ← xóa hoặc rút gọn
functions/api/send.js          ← XÓA. Client ký+gửi thẳng qua Privy, không cần proxy giữ key nữa.
                                   Bù phần mất (double-send) ở client: disable nút Send ngay sau
                                   khi bấm, chỉ bật lại khi tx trả kết quả. Đủ dùng ở giai đoạn
                                   testnet/founder-only, cân nhắc thêm lớp server nếu sau này có
                                   nhiều user thật.
functions/api/swap.js          ← giữ (vẫn gọi Stablecoin Kit), bỏ phần liên quan userToken
functions/api/_swapCore.js     ← giữ gần như nguyên
functions/api/sync.js          ← gần như giữ nguyên
functions/api/bug.js           ← kiểm tra có gửi kèm userToken/Circle info trong report không
```

Không phát sinh file/endpoint mới nào ngoài danh sách trên – username và account-number-registry
đã được cân nhắc và loại bỏ (mục 5), không cần D1 hay backend registry mới cho việc này.

---

## 4. Thứ tự triển khai đề xuất

1. **PoC cô lập** – app Privy trống, login 1 phương thức, tạo embedded wallet, config Arc Testnet
   như custom EVM chain (decimals=6), gửi thử 1 tx USDC thật → confirm on-chain + số dư hiển thị
   đúng. Test luôn `exportWallet` có hoạt động trên Arc không (mục 1.2). Xác nhận mục 1.
2. **Auth + wallet address** (`circle.js` → `privy.js`, `App.jsx`, `Login.jsx` qua headless hooks,
   giữ `EnterEmail.jsx` bọc UI riêng) – sau bước này app login được, hiện đúng "số tài khoản",
   CHƯA gửi/swap được.
3. **Send flow** (`SendConfirm.jsx` + PIN-prompt tự build, gọi Privy `sendTransaction` thẳng từ
   client, xóa `functions/api/send.js`) – verify gửi USDC thật trên Arc Testnet qua UI app, bao
   gồm cả bước nhập lại PIN và nút Send tự disable trong lúc chờ kết quả.
4. **Swap flow** (`Swap.jsx`, giữ `_swapCore.js`/`swap.js`, đổi phần ký) – verify 1 swap thật.
5. **Sync + PinGate/Security** (đổi nguồn chữ ký, PIN tự build) – verify contacts backup vẫn hoạt
   động.
6. **Dọn dẹp:** bỏ `@circle-fin/w3s-pw-web-sdk` khỏi `package.json`, xóa
   `functions/api/session.js`+`wallet.js` nếu không còn dùng, cập nhật `HANDOFF.md` + `README.md`
   + `package.json` description (đang ghi "Circle").

---

## 5. Đã quyết / còn mở

**Đã quyết:**
- MFA: giữ PIN tự build (mã hoá/giải mã theo mục 1.3), không dùng Passkey/TOTP/SMS của Privy.
- `EnterEmail.jsx`: giữ, bọc Privy headless hooks – không đổi sang modal mặc định.
- Username / account-number đăng ký riêng: **không làm.** Chỉ đổi chữ "địa chỉ ví" → "số tài
  khoản" trong UI text hiện có, không cần backend/registry mới, không cần D1.
- Ngôn ngữ network: giữ nguyên "mạng Arc Testnet", không dùng ẩn dụ ngân hàng.
- `functions/api/send.js`: xóa hẳn. Client ký+gửi thẳng qua Privy; double-send chặn bằng disable
  nút Send phía client, không cần lớp proxy nữa ở giai đoạn testnet/founder-only.
- Circle hiện tại: chỉ email + PIN, không có social login nào.

**Còn mở:** không còn – sẵn sàng bắt đầu PoC (bước 1, mục 4).
