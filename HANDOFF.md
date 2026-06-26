# HANDOFF — EZwallet

**Cập nhật:** 2026-06-23  
**Repo:** https://github.com/KattyFury/ezwallet  
**Local:** `D:\Claude\Build_on_Arc\ezwallet`  
**Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ GitHub)

---

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Backend:** Cloudflare Workers (JS) — gọi Circle API server-side
- **Wallet:** Circle **User** Controlled Wallet (user giữ key — không phải Developer Controlled)
- **Auth:** Email OTP (SĐT disabled — "sắp ra mắt")
- **Chain:** Arc Testnet · Chain ID `5042002` · RPC `https://rpc.testnet.arc.network`
- **USDC:** `0x3600000000000000000000000000000000000000` — ERC-20 interface 6 decimals, native 18 decimals, cùng 1 balance
- **Memo contract:** `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` — Arc Transaction Memos
- **System emitter:** `0xfffffffffffffffffffffffffffffffffffffffe` — index toàn bộ USDC movements
- **Gas:** ~$0.01/tx (~250 VND) · ERC-20 transfer ~65k gas · Memo tx ~100k gas
- **Finality:** instant (pending → final, không cần confirm)
- **App Kit:** `@circle-fin/app-kit ^1.7.0` + `@circle-fin/adapter-viem-v2` + `viem` — đã cài
  - `kit.send()` cho luồng Gửi (không support Memo → dùng Memo contract thủ công)
  - `kit.swap()` cho màn Đổi tiền (cần Kit Key từ Circle Console)
  - Adapter: `@circle-fin/adapter-circle-wallets` cho User Controlled Wallet
- **Circle skill:** `use-user-controlled-wallets` (Email OTP, embedded wallet, no seed phrase)
- **Secrets:** `.env` local + Cloudflare Dashboard. KHÔNG hardcode.

---

## Design System (locked — không thay đổi)

**Font:** `Roboto Condensed` (400 / 500 / 700)

**Palette — chỉ 6 màu:**
| Variable | Hex | Vai trò |
|---|---|---|
| `--color-primary` | `#16A34A` | Button chính, active, icon |
| `--color-black` | `#000000` | Text chính |
| `--color-gray` | `#CCCCCC` | Text phụ, border, background |
| `--color-white` | `#FFFFFF` | Nền, button thứ cấp |
| `--color-error` | `#DC2626` | Lỗi |
| `--color-warning` | `#F59E0B` | Cảnh báo |

**Typography scale:**
| Variable | Size | Dùng cho |
|---|---|---|
| `--fs-amount` | 22px | Số tiền VND |
| `--fs-content` | 16px | Nội dung, button |
| `--fs-item` | 9.5px | Item list - tên |
| `--fs-label` | 10px | Label, placeholder |
| `--fs-sub` | 7px | Item list - phụ |

**Assets:**
- App icon: `app icon.png`
- Logo màn đăng nhập: `logo long.png`
- `logo short.png`, `pattern*.png`, `PFP.png` — chưa assign

---

## Layout Rules

- **Lưới 10 hàng** theo chiều cao màn hình (`height: 100dvh`)
- **Sub-screen:** hàng 1 = tiêu đề, hàng 10 = action buttons
- **4 màn chính:** không có hàng 1 tiêu đề, có nav bar hàng 10
- **Row 10 — 1 nút:** class `row10-single`, width 2/3, căn giữa
- **Row 10 — 2 nút:** class `row10-dual`, trái = phụ trắng, phải = chính xanh
- **Numpad:** cố định hàng 7–8–9, layout 4 dòng: 123 / 456 / 789 / ,0←
- **Padding an toàn:** `padding: 0 16px` trên `.screen`
- **⚠ Input text (email, địa chỉ ví, tên danh bạ...) PHẢI đặt ở hàng 1–2–3–4.** Lý do: bàn phím iPhone bật lên che ~1/2 màn hình dưới (hàng 5–10), nếu input ở giữa/dưới sẽ bị che. Các màn có input: EnterEmail, PasteAddress, Contacts (form thêm) — đặt input + nút liên quan ở vùng trên cùng.

---

## UI Rules

- Hiển thị **VND** — USDC ẩn hoàn toàn (chỉ hiện màn confirm giao dịch)
- **Memo** bắt buộc hỗ trợ khi chuyển khoản — dùng **Arc Transaction Memos** (attach ở call level, không encode vào `data` field, emit Memo event onchain cho indexing · docs: docs.arc.io/arc/concepts/transaction-memos)
- PIN: 4 số · khóa sau 4 lần sai (30 phút) · đổi PIN → tài khoản khả dụng sau 12h
- Nav bar 4 tab: **Đổi tiền · Gửi · Nhận · Menu**
- Thông báo in-app: vùng 6–7, tối đa 2, có nút X; nếu không có → tip dashed

---

## Cấu trúc thư mục

```
ezpay/
├── src/
│   ├── index.css          ← design tokens, grid, shared styles
│   ├── main.jsx
│   ├── App.jsx            ← router sẽ build ở đây
│   ├── screens/           ← mỗi màn 1 file
│   └── components/        ← shared: Numpad, NavBar, PinDots, Button...
├── functions/             ← Cloudflare Workers (Circle API)
├── public/
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
├── CLAUDE.md
└── ezwallet-wireframe-spec.md  ← spec đầy đủ 21+ màn
```

---

## Thứ tự build (8 phases)

- [x] **Phase 1** — Scaffold + Design system ✅
- [x] **Phase 2** — Onboarding + PIN ✅
  - Login · CreatePin (create+confirm) · Recovery · EnterPin · PinLocked
  - `src/nav.jsx` NavContext, flat state router trong App.jsx
  - `src/components/Numpad.jsx` · `src/components/PinDots.jsx`
  - PIN → localStorage `ez_pin`, khóa 30 phút sau 4 lần sai
- [x] **Phase 3** — 4 màn chính + NavBar ✅
  - `src/components/NavBar.jsx` — 4 tabs, active highlight
  - HomeSend: balance + token list (USDC/ARC/ETH) + action grid
  - HomeReceive: QR code (qrcode.react) + action grid
  - Swap: from/to token box, ↕ button, numpad với comma
  - MenuScreen: balance + Nạp/Rút + 4 menu items
  - `src/data.js` mock data · `src/icons.jsx` shared SVGs
  - **Stub chưa kết nối**: action buttons (Danh bạ/Quét QR/Dán địa chỉ), Swap OK, menu items nav
- [x] **Phase 4** — Luồng Gửi ✅
  - `src/screens/PasteAddress.jsx` — nhập/dán địa chỉ ví, validate 0x40, clipboard API
  - `src/screens/SendAmount.jsx` — numpad VND, recipient box, memo field, kiểm tra số dư
  - `src/screens/SendConfirm.jsx` — recap đầy đủ (VND + USDC mock rate), warning badge, nút đỏ "Xác nhận · PIN"
  - `src/screens/SendReceipt.jsx` — biên lai thành công, timestamp vi-VN
  - `EnterPin.jsx` — nâng cấp hỗ trợ `params.onSuccess` + `params.onSuccessParams` (không chỉ về HomeSend)
  - `HomeSend.jsx` — "Dán địa chỉ" đã wire → PasteAddress; Danh bạ/Quét QR vẫn stub
- [ ] **Phase 5** — Custom QR (Tạo → Hiển thị → QR đã lưu)
- [ ] **Phase 6** — Danh bạ + Lịch sử giao dịch
- [ ] **Phase 7** — Settings (Ngôn ngữ, Bảo mật, Nạp, Rút disabled, About)
- [ ] **Phase 8** — Edge cases + State screens + Quên PIN flow

---

## Decisions Log

- 2026-06-16: Đập qrpay, build ezpay mới từ đầu — reason: đổi wallet từ Privy → Circle Developer Controlled Wallet, auth flow và tx signing khác hoàn toàn, không đáng port code cũ
- 2026-06-16: Monorepo (`frontend + functions/` trong cùng repo) — reason: Cloudflare Pages tự nhận `functions/` làm Workers, deploy 1 lần xong cả hai
- 2026-06-16: Font Roboto Condensed, 6 màu locked (#16A34A / #000 / #CCCCCC / #FFF / #DC2626 / #F59E0B) — không thêm màu nào khác
- 2026-06-16: Xanh dương #185FA5 trong spec cũ → bỏ, thay bằng #16A34A cho tất cả button chính
- 2026-06-17: qrcode.react thêm vào dependencies cho QR display trong HomeReceive
- 2026-06-17: Tất cả wallet data Phase 2–3 dùng mock (MOCK_VND, MOCK_ADDR trong src/data.js) — chưa kết nối Circle API
- 2026-06-19: Thêm `--color-muted: #999999` — dùng cho mọi text phụ; `--color-gray: #CCCCCC` giữ nguyên chỉ cho border/background
- 2026-06-19: Button: font 13px / weight 500 / height 7.5dvh (scale theo màn hình, không cứng pixel)
- 2026-06-19: Login — bỏ nút SĐT, email button row 9 width 75%, slogan "Cách đơn giản nhất để dùng stablecoin", terms modal 75% width
- 2026-06-19: Phase 4 Luồng Gửi hoàn thành — PasteAddress → SendAmount → SendConfirm → EnterPin → SendReceipt
- 2026-06-21: Đổi wallet model → Circle User Controlled Wallet (trước ghi sai là Developer Controlled)
- 2026-06-21: Memo strategy → Arc Transaction Memos thay vì encode vào data field thô
- 2026-06-21: Đọc full 83 files Arc docs — cập nhật tech stack đầy đổ, fee display, decimal handling, indexing strategy
- 2026-06-22: Đổi tên project ezpay → EZwallet (GitHub + package.json + folder)
- 2026-06-22: Deploy lên Cloudflare Pages (ezwallet.pages.dev) — auto-deploy từ GitHub main
- 2026-06-22: Tích hợp Circle User Controlled Wallet — `functions/api/session.js`, `functions/api/wallet.js`, `src/circle.js`, màn `EnterEmail.jsx`
- 2026-06-22: Login → EnterEmail → Circle SDK (email OTP + PIN + security questions) → HomeSend
- 2026-06-22: App Kit installed: `@circle-fin/app-kit`, `@circle-fin/adapter-viem-v2`, `viem`, `@circle-fin/w3s-pw-web-sdk`
- 2026-06-22: Add `vite-plugin-node-polyfills` — Circle SDK dùng Node built-ins (util, stream)
- 2026-06-22: PWA manifest — Add to Home Screen trên mobile
- 2026-06-23: Font scale mới: min 15px (label), max 45px (amount) — thay hệ thống cũ 7–22px quá nhỏ cho mobile

---

## Trạng thái hiện tại (2026-06-25)

**Live:** https://ezwallet.pages.dev  
**Auth flow:** Login → EnterEmail (domain suggestions @gmail/@yahoo/@outlook) → Circle SDK → HomeSend

**Screens đã build theo spec v0.1:**
- EnterEmail: input row 5, domain suggestions, buttons row 9
- HomeSend: balance rows 1-2, token list rows 3-6, tip rows 7-8, actions row 9
- HomeReceive: balance rows 1-2, QR rows 3-6, tip rows 7-8, 2 nút row 9, copy address
- MenuScreen: balance rows 1-2, Nạp/Rút row 3, menu items rows 4-7, logout button
- PasteAddress: title row 1, input row 5, clipboard row 6, buttons row 9
- Swap: Market/Limit tabs, 2 card Từ/Đến, quick select 50%/75%/Max, numpad, OK button
- CreateQR, ShowQR, SavedQRList: Custom QR flow

**Tech đã setup:**
- `src/chain.js`: viem public client cho Arc Testnet (RPC: https://rpc.testnet.arc.network), `getTokenBalances()` đọc ERC-20 balance thẳng từ chain
- USDC: `0x3600000000000000000000000000000000000000` (6 decimals)
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6 decimals)
- cirBTC: chưa tìm được địa chỉ contract — cần lấy từ Arc faucet/explorer
- Kit Key (Swap): đã lưu trong `.env.txt` và `.dev.vars` — cần add vào Cloudflare Dashboard env vars trước khi dùng
- `dev-server.js`: local proxy cho Circle API (port 8787), chạy song song với Vite (port 5173)

**Env vars (đổi 2026-06-25):** `.env.txt` + `.dev.vars` giờ dùng tên `API_KEY` (trước `CIRCLE_API_KEY`) + `KIT_KEY`. Functions đọc `ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY` (tương thích cả 2). **PRODUCTION: phải vào Cloudflare Dashboard → ezwallet → Settings → Environment Variables cập nhật `API_KEY` = key mới + thêm `KIT_KEY`, nếu không deploy vẫn dùng key cũ.**

**Cloudflare env vars (cập nhật 2026-06-25):** user ĐÃ cập nhật `API_KEY` (key mới) + `KIT_KEY` trên Cloudflare Dashboard. Đã push empty commit (35b09de) để trigger redeploy với env mới.

**ĐANG CHỜ VERIFY (việc đầu tiên khi quay lại):**
→ Vào `ezwallet.pages.dev` (sau khi deploy 35b09de xong) → Menu → Đăng xuất → login lại bằng email đã có ví → F12 Console xem `[getWalletAddress]`:
  - Nếu trả address thật → balance hiện đúng từ Arc RPC → TECH CORE XONG ✅
  - Nếu vẫn null → ví của user có thể nằm trên blockchain identifier khác `ARC-TESTNET`, hoặc ví chưa được tạo thật. Check Circle Console → Wallets → Users → email → xem blockchain + address thật, đối chiếu `pickArcWallet()` trong functions/api/wallet.js

**Vấn đề chưa giải quyết:**
- Circle SDK (W3S popup) không chạy trên localhost (crypto polyfill thiếu) → tạo ví MỚI phải test trên ezwallet.pages.dev. Balance đọc qua viem thì chạy được cả localhost.
- cirBTC contract address chưa tìm được (USDC + EURC đã có trong src/chain.js)
- Swap chưa test thật — cần verify kit.swap() với KIT_KEY sau khi wallet address chạy

**Dev local:**
- Terminal 1: `node dev-server.js` (port 8787) — log key: "loaded"
- Terminal 2: `npm run dev` (port 5173)
- `.env.txt` dùng tên `API_KEY` + `KIT_KEY` (KHÔNG phải CIRCLE_API_KEY nữa)

**Đã build thêm (2026-06-25):**
- cirBTC contract: `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` (8 decimals) — tìm qua Circle API `/wallets/{id}/balances`
- Giá token: USDC/EURC hardcode (stablecoin), cirBTC fetch từ CoinGecko free API (no key), cache 60s
- fmtVND: đổi từ `₫` sang `VND`
- HomeSend: USDC ≤ 1 → cảnh báo "hết gas", gợi ý swap
- Swap screen: estimate (App Kit + dummy private key adapter), token picker modal, quick select 25/50/75/Max dùng balance thật
- Contacts screen: danh bạ local (localStorage `ez_contacts`), thêm/xóa/gửi thẳng
- QRScanner: camera auto-scan mỗi 300ms, parse `0x...` và `ezwallet:0x...?amount=...`
- HomeReceive: QR 200px, 3 nút (Chia sẻ/Custom QR/QR đã lưu), Web Share API + clipboard fallback
- Swap execute: App Kit capture adapter → Circle `/user/transactions/contractExecution` → W3S SDK challenge

**Cập nhật lớn (2026-06-25 session 2):**
- **Swap**: gọi thẳng Circle Stablecoin Kit API (`/v1/stablecoinKits/quote` + `/v1/stablecoinKits/swap`), chain ID `Arc_Testnet` (quan trọng — không phải `ARC-TESTNET`). KIT_KEY server-side trong Cloudflare env var.
- **Send thật**: `functions/api/send.js` → ERC-20 `transfer(address,uint256)` → Circle contractExecution challenge → W3S SDK PIN
- **Google Social Login**: Circle W3S SDK `performLogin('google')`, Client ID: `51031114717-f9chve1ge9bbo8j3kspj82qrga40342n.apps.googleusercontent.com`
- **Asset structure**: `icon/` (left/right/up/down/trade/email/google 100×100 line icons), `design/` (logo/PFP/app-icon)
- **Icon usage**: Numpad backspace → left.png, NavBar Swap/Gửi/Nhận → trade/up/down, Login → email/google
- **UI**: TxHistory (ArcScan API), Language/Security/About/ComingSoon screens, Contacts, QRScanner
- **Email suggestions**: lưu history localStorage `ez_email_history` (tối đa 5), hiện khi vào màn login
- **Buttons**: `row10-single`/`row10-dual` span rows 9-10, centered. Height 6dvh.
- **Swap estimate bug root cause found**: chain ID sai. Fix deployed nhưng cần test.

**Google Social Login — root cause phân tích (2026-06-25):**
- Circle W3S SDK `performLogin('Google')` → gọi `performGoogleLogin()` → LUÔN redirect (không có callback-processing mode riêng)
- OAuth flow: app → Google → redirect về `ezwallet.pages.dev/#access_token=...`
- Sau redirect, tạo SDK mới với loginConfigs → SDK tự scan URL hash → gọi `onLoginComplete`
- NHƯNG: khi ta gọi thêm `performLogin('Google')` trong restore → tạo redirect MỚI → loop
- Khi không gọi performLogin → callback không fire (cần debug thêm)
- Lỗi `155140 Invalid social login provider`: có 2 nơi trong SDK throw:
  1. `else` branch: provider không match → ta đang pass đúng `'Google'` → không phải đây
  2. `performGoogleLogin`: `loginConfigs.google` chưa được set → CÓ THỂ đây là vấn đề
- SDK lưu `state`+`nonce` vào sessionStorage trước redirect. Khi restore, cần SDK đọc lại để validate callback
- **Next debug**: log `this.configs.loginConfigs` trong SDK instance để verify loginConfigs đang được set đúng

**Google login setup (Circle Console + Google Cloud):**
- Google Cloud: Web Application Client ID = `51031114717-f9chve1ge9bbo8j3kspj82qrga40342n.apps.googleusercontent.com`
- Authorized redirect URIs: `https://ezwallet.pages.dev`  
- Circle Console: Social Logins → Google → Client ID (Web) = same Web App ID
- Code: `GOOGLE_CLIENT_ID` = same ID (trong `src/circle.js`)

**Circle W3S SDK docs đã đọc:**
- Auth methods: Email OTP, Social Login (Google/Apple/Facebook), PIN (6-digit)
- Session token: 14 ngày, refresh qua `POST /users/token/refresh`
- Transfer: dùng `tokenId` (Circle internal) + `destinationAddress` + `amounts`
- Signature: `signMessage()`, `signTypedData()`, `signTransaction()`
- Reset PIN: `updateUserPin()` → challengeId → W3S SDK
- Recover account: security questions → `restoreUserPin()` → challengeId
- Remove user: không có API, chỉ stop issuing tokens + xóa local record

**Google Social Login — KẾT LUẬN (2026-06-25 session 3, Opus):**
- 2 bug client-side đã fix: (1) button gọi `performLogin('Google')` — 1 tham số provider (trước truyền nhầm deviceToken làm provider → 155140), (2) bỏ debug log lỗi `freshToken` undefined
- Flow giờ chạy được: click → redirect Google OK → Google trả `access_token`+`id_token` về hash OK → SDK mở iframe `pw-auth.circle.com/social/verify-token`
- **KẸT Ở ĐÂY**: iframe verify-token load nhưng KHÔNG post kết quả về SDK → `onLoginComplete` không fire / hoặc trả 155140. Đây là backend Circle / iframe communication — không debug được qua console.
- **QUYẾT ĐỊNH**: Disable cả Google + Facebook (nút mờ opacity 0.4, không clickable, không text "sắp ra mắt"). Email login chạy ngon = đủ MVP. Đã gửi bug report cho Circle team, chờ phản hồi.
- Khi Circle phản hồi: enable lại bằng cách đổi `disabled: true` → `false` trong array buttons ở `src/screens/Login.jsx`

**Bug report đã gửi Circle (tóm tắt):** Google social login hang ở verify-token. Works: social/token, performLogin redirect, Google trả token. Fails: iframe `pw-auth.circle.com/social/verify-token` không post back. Câu hỏi: deviceToken cần refresh không (~30s redirect)? Config gì thêm cho iframe post về Cloudflare Pages origin? Google login có support User-Controlled Wallet trên Arc Testnet không? Khi nào backend trả 155140 ở bước verify?

**Pending:**
- Google + Facebook login: ĐANG DISABLE, chờ Circle team
- Swap execute chưa test trên deployed (estimate đã fix chain ID `Arc_Testnet`)
- Send: chỉ USDC, chưa chọn token khác
- Reset PIN, Recover account chưa build
- Manifest icon `design/app-icon.png` báo "invalid image" (cosmetic) — cần check lại file

**Cập nhật (2026-06-25 session 4 — UI + swap estimate):**
- **Swap estimate FIX**: response structure đúng là `res.estimate.quote.estimatedAmount` (không phải `estimatedOutput`). Fee = `quote.route.steps[0].estimate.gasCostUSD`. Đã parse đúng → 20 USDC → 15 EURC hiển thị OK. **Execute vẫn chưa test trên deployed.**
- **Asset/icon mở rộng**: tất cả trong `icon/`: back, down, up, left, right, trade, menu, email, google, facebook, hint (bóng đèn), copy, qr, danhba, share, download
- **Icon usage hiện tại**:
  - NavBar: trade/up/down/menu — opacity 0.4 (xám) khi inactive, 1 (đen) khi active
  - HomeSend actions: danhba.png (Danh bạ), qr.png (Quét QR), IconPaste (Dán địa chỉ) — action-grid height 6dvh
  - HomeReceive: share.png (Chia sẻ), IconScan (Custom QR), download.png (QR đã lưu), copy.png (copy địa chỉ)
  - Numpad backspace: left.png
  - Login: email.png, google.png, facebook.png
  - tip-box: hint.png; menu chevron: right.png; back button: back.png
- **Login layout**: 3 nút (Email clickable, Google + Facebook DISABLED opacity 0.4), inner-block 210px cố định → icon thẳng cột + text cùng vị trí. Nút cuối center vạch 9/10, gap 2dvh, stack bottom-up.
- **EnterEmail**: input KHÓA vị trí (absolute center row-5), suggestions + domains hiện absolute bên dưới không đẩy input. Email history icon = hint.png.

**Trạng thái CORE (2026-06-25 session 5):**
- ✅ Email login → tạo ví → HomeSend (chạy tốt)
- ✅ Balance đọc thật từ Arc RPC qua viem (USDC/EURC/cirBTC)
- ✅ Swap estimate (auto khi gõ, hiện số quy đổi)
- ✅ Swap execute — ĐÃ FIX + verify local OK (trả 2 challengeIds: approve + swap)
- ✅ Send — cùng fix fee, sẽ chạy
- ✅ TxHistory từ ArcScan, Language/Security/About/Contacts/QRScanner
- ❌ Google + Facebook login — DISABLED, chờ Circle team (verify-token iframe hang)

**SWAP EXECUTE — KẾT LUẬN CUỐI (2026-06-25 session 6, Opus):**
- **App Kit / Swap Kit KHÔNG có adapter cho User-Controlled Wallet.** Các adapter: viem (private key/browser wallet), ethers, solana, circle-wallets (developer-controlled, cần entitySecret). Ví của dự án là User-Controlled MPC (ký PIN) → không khớp adapter nào.
- Verify on-chain: swap execute qua manual instructions[] = FAILED (ESTIMATION_ERROR + INSUFFICIENT_TOKEN). Estimate qua quote API thì OK.
- Estimate prices trên testnet bị méo (20 EURC → 1012 USDC) vì pool mất cân bằng — docs Circle cảnh báo "Arc Testnet swap liquidity unstable".
- **QUYẾT ĐỊNH**: disable nút Swap execute ("Swap (sắp ra mắt)"), giữ estimate hiển thị tỷ giá. Send/Transfer đã chạy thật (COMPLETE on-chain) = đủ MVP.
- **CÂU HỎI CHO CIRCLE**: User-Controlled Wallet (ký PIN qua W3S SDK) swap đúng cách như thế nào? App Kit Swap Kit không có adapter user-controlled — có phải swap chỉ support developer-controlled, hay có flow riêng (vd: tạo contractExecution với signed executor bundle) cho user-controlled?
- Nếu Circle xác nhận chỉ dev-controlled mới swap được → cân nhắc: giữ user-controlled + bỏ swap, HOẶC đổi sang dev-controlled (mất non-custodial).

**SWAP EXECUTE — phân tích cũ (session 5) — ROOT CAUSE fee format:**
- Circle Stablecoin Kit `/v1/stablecoinKits/swap` trả về `transaction.executionParams.instructions[]` (mảng 2 bước: approve + swap), KHÔNG phải `transaction.target/callData`
- Mỗi instruction có `{ target, data, ... }` → tạo 1 contractExecution challenge riêng → execute tuần tự qua W3S SDK (user ký PIN 2 lần)
- **LỖI 500 GỐC**: dùng sai format fee. REST API `/user/transactions/contractExecution` cần `feeLevel: 'MEDIUM'` (FLAT field), KHÔNG phải `fee: { type: 'level', config: { feeLevel: 'MEDIUM' } }` (đó là format của Node SDK). Circle reject: "gasPrice/gasLimit may not be empty when FeeLevel not set".
- Đã sửa cả swap.js, send.js, dev-server.js. Verify local: `{"challengeIds":[...2 ids...]}` OK.
- Frontend Swap.jsx: loop execute từng challengeId, status "Xác nhận bước 1/2...", "2/2..."

**Tiếp theo:**
1. Test Swap execute trên DEPLOYED (đã verify OK local → ký PIN 2 lần approve+swap, xem có lên on-chain không)
2. Test Send trên deployed (cùng fix fee — PasteAddress → SendAmount → SendConfirm → W3S PIN)
3. Fix manifest icon `design/app-icon.png` (invalid image — check lại file PNG)
4. Build Reset PIN + Account Recovery (`updateUserPin()` / `restoreUserPin()` → challengeId → W3S SDK)
5. Khi Circle phản hồi bug → enable lại Google/Facebook (đổi `disabled: true → false` trong Login.jsx)
- Swap screen đã bỏ Market/Limit tabs ở row 1 (chỉ còn Market mặc định)

---

## Failed Approaches

- 2026-06-22: Thử set `VITE_CIRCLE_APP_ID` qua Wrangler secret → không inject vào bundle (Vite cần build-time env) → hardcode App ID trực tiếp (App ID không phải secret)
- 2026-06-25: Thử `wrangler pages dev` trên Windows → lỗi "write EOF" (bug wrangler Windows) → dùng `dev-server.js` (Node HTTP) + Vite proxy thay thế
- 2026-06-25: Thử gọi Circle REST API `/user/wallets` để lấy wallet address → trả về `Resource not found`. **ĐÃ GIẢI QUYẾT 2026-06-25 (Opus):** endpoint `/user/wallets` KHÔNG tồn tại trong Circle W3S API. Đúng phải là `GET /v1/w3s/wallets` với header `X-User-Token`. Test end-to-end: session OK → getAddress trả `{address: null}` sạch cho user mới (không còn lỗi). User có ví sẽ trả address thật.
- 2026-06-25: Circle SDK (W3S popup) không chạy trên localhost → crypto polyfill thiếu dù đã thêm `vite-plugin-node-polyfills`
- 2026-06-25: Swap qua App Kit SDK trên Cloudflare Workers → không chạy (Node runtime). Thử `nodejs_compat` flag → vẫn lỗi. → Gọi thẳng Circle Stablecoin Kit API (`/v1/stablecoinKits/quote` + `/swap`) từ Worker, App Kit chỉ là wrapper của API này nên kết quả y hệt.
- 2026-06-25: Swap dùng chain ID `ARC-TESTNET` cho Stablecoin Kit API → "Invalid input tokenInChain". Đúng phải là `Arc_Testnet` (W3S API dùng `ARC-TESTNET`, Stablecoin Kit API dùng `Arc_Testnet` — 2 format khác nhau!).
- 2026-06-25: Google `performLogin(deviceToken, deviceEncryptionKey)` theo WebFetch summary → sai, gây 155140. SDK source thật: `performLogin(provider)` 1 tham số. **Bài học: đọc SDK source/docs gốc, không tin WebFetch summary.**
- 2026-06-25: Google login verify-token iframe không post back → disable tạm, chờ Circle team.
