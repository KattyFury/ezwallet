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

**Vấn đề chưa giải quyết:**
- `GET /user/wallets` với `X-User-Token` trả về `{"code":-1,"message":"Resource not found"}` → `ez_wallet_addr` không được lưu → balance hiện 0₫
- Circle SDK (W3S popup) không chạy được trên localhost do crypto polyfill thiếu. Chỉ chạy được trên deployed domain
- Cần vào Circle Console → Wallets → USER CONTROLLED → Users → tìm email → copy wallet address → set thủ công vào code hoặc debug tại sao API fail
- KIT_KEY chưa được add vào Cloudflare Pages env vars → Swap chưa hoạt động

**Dev local:**
- Terminal 1: `node dev-server.js` (port 8787)
- Terminal 2: `npm run dev` (port 5173)
- Test Circle flow đầy đủ: phải dùng `ezwallet.pages.dev`

**Tiếp theo:**
1. Debug `GET /user/wallets` — xem Console log `[getWalletAddress]` trên deployed sau login
2. Add KIT_KEY vào Cloudflare Dashboard env vars
3. Tìm cirBTC contract address
4. UI polish theo spec v0.1

---

## Failed Approaches

- 2026-06-22: Thử set `VITE_CIRCLE_APP_ID` qua Wrangler secret → không inject vào bundle (Vite cần build-time env) → hardcode App ID trực tiếp (App ID không phải secret)
- 2026-06-25: Thử `wrangler pages dev` trên Windows → lỗi "write EOF" (bug wrangler Windows) → dùng `dev-server.js` (Node HTTP) + Vite proxy thay thế
- 2026-06-25: Thử gọi Circle REST API `/user/wallets` để lấy wallet address → trả về `Resource not found` — nguyên nhân chưa rõ (userToken hết hạn? wallet chưa initialized trên Arc Testnet?)
- 2026-06-25: Circle SDK (W3S popup) không chạy trên localhost → crypto polyfill thiếu dù đã thêm `vite-plugin-node-polyfills`
