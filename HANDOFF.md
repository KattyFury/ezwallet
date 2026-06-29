# HANDOFF — EZwallet

**Cập nhật:** 2026-06-29 (session 2)
**Repo:** https://github.com/KattyFury/ezwallet
**Local:** `D:\Files\Claude_laptop\Build_on_Arc\ezwallet`
**Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ GitHub `main`)

> App ví stablecoin cho người dùng phổ thông / người già. UX phải đơn giản, rõ ràng, mobile-first. Đa ngôn ngữ (VI/EN/ZH), mặc định theo trình duyệt.
> Nguyên tắc: **CHẠY TECH CHUẨN của Circle, đọc docs trước khi làm, không đoán.**

---

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Backend:** Cloudflare Functions (`functions/api/*.js`) — gọi Circle API server-side
- **Wallet:** Circle **User-Controlled Wallet** (MPC, user ký bằng PIN qua W3S Web SDK `@circle-fin/w3s-pw-web-sdk`)
- **Auth:** Email (Circle session) — Google/Facebook DISABLE (xem phần Blocked)
- **Chain:** Arc Testnet · Chain ID `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`
- **Balance/giá/phí:** đọc thẳng on-chain bằng viem (`src/chain.js`) + giá VND live CoinGecko. Helpers: `getTokenBalances`, `getVndRate(symbol)`, `getTokenInfo(addr,symbol)` (balance+rate), `estimateFeeVnd(gasUnits)`.
- **QR:** `qrcode.react` (tạo) + `jsqr` (quét camera/ảnh, chạy iOS Safari)

**Token addresses (Arc Testnet):**
| Token | Address | Decimals | Giá VND (live CoinGecko, cache 60s, fallback offline) |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | cgId `usd-coin` (fallback 25.000) |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | cgId `euro-coin` (fallback 27.000) |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | cgId `bitcoin` (fallback 2,6 tỷ) |

**Arc contracts (Transaction Extensions, từ docs.arc.io):**
| Contract | Address | Dùng |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | `memo(address target,bytes data,bytes32 memoId,bytes memoData)` — bọc calldata, giữ msg.sender qua CallFrom, emit `Memo` event |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batch nhiều call, giữ msg.sender (chưa dùng — để dành gửi nhiều người / gộp approve+swap) |

**Secrets** (`.env.txt` — gitignored; cũng phải set trên Cloudflare Dashboard):
- `API_KEY` — Circle API key
- `KIT_KEY` — Stablecoin Kit key (cho swap quote)

**Dev local (Windows — KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):**
- Terminal 1: `node dev-server.js` (proxy Circle API, port 8787)
- Terminal 2: `npm run dev` (Vite, port 5173) — Vite proxy `/api` → 8787

**ID hardcode** (`src/circle.js`, không phải secret):
- APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`
- GOOGLE_CLIENT_ID `51031114717-f9chve1ge9bbo8j3kspj82qrga40342n.apps.googleusercontent.com`

---

## Design System (2026-06-28)

> Định nghĩa ở `:root` trong `src/index.css`. FONT + MÀU khóa; **CỠ CHỮ mở khóa** (scale gợi ý, tùy chỉnh px được).

**Font — hệ 2 font:**
- **Barlow Condensed** (`--font-display`): logo, tiêu đề lớn (H1/H2, `.screen-title`/`.send-title`), số dư/số tiền/%/KPI (`.num`, numpad, `.amount-display`).
- **IBM Plex Sans** (`--font-base`, mặc định body): toàn bộ UI — menu, tab, **nút (.btn)**, form, mô tả giao dịch, thông báo, cài đặt.
- (alias `--font-condensed`/`--font-title` → Barlow). Lưu ý: nhãn rất nhỏ (12–14px) nên dùng IBM Plex (condensed khó đọc khi nhỏ).

**Cỡ chữ (scale gợi ý — đã mở khóa):**
| Token | px | Dùng cho |
|---|---|---|
| `--fs-amount` | 40 | số tiền lớn: số dư, nhập số gửi, biên lai |
| `--fs-title` | 24 | tiêu đề màn |
| `--fs-body` | 20 | nội dung chính, chữ trên nút |
| `--fs-item` | 18 | item list (tên, dòng chính) |
| `--fs-label` | 16 | label, text phụ, placeholder |
| `--fs-tiny` | 13 | badge / ghi chú rất nhỏ |

**Màu chữ — trắng/đen là chân ái:**
| Token | Hex | Dùng cho |
|---|---|---|
| `--color-black` / `--color-content` | #000000 | text chính + tiêu đề + nút + nội dung |
| `--color-muted` / `--color-faint` | #AEAEB2 | text phụ / placeholder / chevron (xám đậm) |

**Màu chức năng:** `--color-primary #16A34A` (chủ đạo, +`-soft #DCFCE7`) · `--color-error #DC2626` (đỏ xóa) · `--color-warning #F59E0B` (+`-soft #FEF3C7`) · `--color-white` · `--color-gray #E5E5EA` (xám nhạt — CHỈ border/nền/divider).
**Ngoại lệ:** màu thương hiệu token trong `src/chain.js` (USDC #2775CA, EURC #1A56DB, cirBTC #F7931A) — không phải token UI.
**Số & tiền tệ:** class `.num` (= Roboto Condensed). Tiêu đề màn: class `.screen-title` (= đen).

**Assets:**
- `icon/` — **SVG đơn sắc** (viewBox 100×100, `stroke/fill="currentColor"`, width/height 100%): add, back, check, clock, copy, down, down2 (tam giác đặc — dropdown), download, facebook, globe, google, hint, human, info, left, mail, menu, out, qr, right, scan, share, shield, trade, up. **PNG icon đã bỏ hoàn toàn.**
- `design/` — logo-long, logo-short, PFP, app-icon, pattern* (PNG, không phải icon)
- `public/tokens/` — usdc.png, eurc.png, cirbtc.png (logo token thật, CoinGecko)

**Brand assets (design/, dùng nguyên — KHÔNG ép currentColor):** `logo.svg` (logo màn Login), `icon.svg` (favicon vuông, → `public/icon.svg`), `pfp.svg` (app-icon tròn Apple/Android, → `public/pfp.svg`). index.html: favicon = `/icon.svg`, apple-touch-icon = `/pfp.svg`. ⚠️ **pfp/app-icon nên nền TRẮNG đặc, KHÔNG transparent** (iOS hiện nền đen sau transparent); apple-touch-icon lý tưởng là PNG 180×180 (SVG iOS hỗ trợ kém — cân nhắc export PNG sau). `x.svg` = dấu X (nút xóa Contacts/Kho QR).

**Onboarding ✅ (2026-06-29 session 2):** `src/screens/Onboarding.jsx` — màn chọn ngôn ngữ + tiền tệ compact (2 chip row + popup). Hiện sau lần login đầu tiên (`ez_onboarded` flag). Reload sau khi chọn để áp dụng `ez_lang` + `ez_currency`. Chip dùng icon `right2` (popup, không phải dropdown).

**Icon system:** dùng `<Icon name="..." size={} color={} />` ([src/components/Icon.jsx](src/components/Icon.jsx)) — nhúng SVG qua `?raw` + `currentColor` → recolor bằng token. Thêm icon mới: bỏ SVG vào `icon/`, chuẩn hóa `stroke/fill="black"→currentColor` + `width/height 100%→`, rồi import vào Icon.jsx. KHÔNG dùng emoji (iOS render icon Apple xấu).

---

## Layout Rules (quan trọng)

- **Lưới 10 hàng** theo chiều cao màn (`.screen` grid-template-rows: repeat(10,1fr), height 100dvh, padding 0 15px)
- **Sub-screen:** hàng 1 = tiêu đề (center, không line xám ngăn cách), hàng 10 = action buttons
- **4 màn chính:** nav bar ở hàng 10
- **Row 10:** 1 nút = `row10-single` (width 2/3); 2 nút = trái phụ trắng / phải chính xanh. (Lưu ý: `row10-dual` chiếm grid-row 9/11 — KHÔNG dùng chung màn có numpad.)
- **Numpad:** SendAmount/CreateQR: numpad đúng **2.5 hàng (7,8,nửa 9)** + nút ở ranh giới 9/10 — bằng `gridRow: '7/11'` flex `2.5` (numpad) / `1.5` (nút). KHÔNG để numpad lấn hàng 6. (Swap vẫn `row-7-9`.)
- **⚠ Input text (email, địa chỉ ví, tên, ảnh) PHẢI ở hàng 1–4 hoặc trong popup neo nửa trên.** Bàn phím iPhone che ~1/2 dưới (hàng 5–10). Popup form (vd thêm danh bạ) dùng overlay `align-items: flex-start` + paddingTop để nằm vùng trên.
- **Không dùng line xám ngăn cách** (border-bottom) ở header/list — đã bỏ toàn bộ.

---

## Trạng thái màn hình (cập nhật 2026-06-27, đợt UI lớn)

- **Số dư (BalanceHeader, dùng chung HomeSend/HomeReceive/Menu):** số căn giữa tuyệt đối (--fs-amount, Condensed), "VND" treo phải absolute + căn giữa dọc. Component `src/components/BalanceHeader.jsx`, hàng 1-2.
- **NavBar:** tab active = **vạch xanh lá** trên đỉnh (width 70%, cao 5px, bo dưới) + icon/chữ đen; tab khác xám.
- **Login:** Email (active, icon mail SVG) / Google (disabled). Facebook gỡ.
- **HomeSend:** BalanceHeader h1-2; list token h3-5 (logo thật + số token **bold** + check xanh + VND **regular** xám); hint h7-8 (label đậm – mô tả xám, en-dash); actions h9 (Danh bạ/Quét QR/Dán để gửi); nav h10.
- **SendAmount:** h1 tiêu đề / h2 "Gửi cho:" (tra **tên danh bạ** theo địa chỉ) / h3-4 số **căn giữa tuyệt đối** + **chip `[VND ›]`** (right2) đổi tiền tệ (**VND/USDC/EURC/CNY**, popup nửa trên) / h5 memo "Nội dung chuyển khoản (không bắt buộc)" / **numpad đúng 2.5 hàng (7,8,nửa 9)** + nút ở ranh giới 9/10 (gridRow 7/11, flex 2.5/1.5). Default currency đọc từ `ez_currency`. Khả dụng hiển thị theo tiền tệ đang chọn.
- **SendConfirm:** quy đổi theo `currency` (VND→USDC, CNY→USDC via rate USDC/7.25, USDC→USDC, EURC→EURC); phí gas thật; nút đỏ "Xác nhận · PIN".
- **HomeReceive:** BalanceHeader; QR h3-5; hint "QR mặc định/Chia sẻ/Custom QR/Kho QR"; actions Chia sẻ (chỉ địa chỉ) / Custom QR / **Kho QR**.
- **CreateQR:** đồng bộ SendAmount (VND/USDC/EURC/CNY, default đọc `ez_currency`). Navigate ShowQR với `from: 'CreateQR'`. **ShowQR:** từ CreateQR → nút "Lưu vào thư viện" (lưu vào `ez_saved_qrs`) + "Quay lại"; từ SavedQRList → nút "Lưu vào kho ảnh" (Photos) + "Quay lại". **KHÔNG tự auto-save** (bug cũ đã fix). **SavedQRList (Kho QR):** lưới 3 cột, bấm → ShowQR với `from: 'SavedQRList'`.
- **TxHistory:** hiện **tên danh bạ** nếu lưu; bấm dòng → **popup chi tiết** (loại/người/địa chỉ/số tiền/quy đổi/thời gian/memo nếu có/link ArcScan); nút lọc "Chỉ gửi"/"Chỉ nhận" (active xanh); "Quay lại" xanh.
- **MenuScreen:** Rút (trắng, khóa, trái) / Nạp (xanh, phải); menu items icon SVG (clock/globe/shield/info).
- **Sub-screen template ĐỒNG BỘ (Language/Security/About):** header screen-title h1; nội dung gridRow 2/9 dùng **hàng `.menu-item`** (label trái fs-body, value/chevron phải, divider rgba nhạt); nút **Quay lại = primary xanh** row10-single. Value hiển thị trong **box viền** (Language) hoặc text muted (Security/About). Chevron = **right2.svg** (▶ đặc).
- **Language:** Ngôn ngữ (Tiếng Việt / English / 中文) + Tiền tệ (USDC/EURC/CNY/VND) → popup chọn. Đổi ngôn ngữ = reload áp dụng (`setLang` lưu `ez_lang`).
- **MenuScreen:** Đăng xuất = hàng `.menu-item` icon `out` đỏ (đã chuyển từ Security ra Menu, 2026-06-29).
- **TxHistory:** NGOẠI LỆ — bottom có 3 nút (Chỉ gửi/Chỉ nhận/Quay lại) thay vì 1.
- **Contacts:** list to (avatar 52, tên 20px); popup Thêm có avatar cropper (zoom/pan tròn); nút Gửi nhỏ hơn (phụ).
- **QRScanner:** ô camera giữa h1-5 (bỏ khung 4 góc); quét bằng **jsQR** (iOS không có BarcodeDetector); h10 "Ảnh QR"/"Quay lại".

---

## Hoạt động được vs Blocked

**✅ Chạy thật:**
- Email login → tạo ví → HomeSend
- Balance đọc thật từ Arc RPC (viem), **tỷ giá VND live** (CoinGecko)
- **Send/Transfer** — `functions/api/send.js` ERC-20 `transfer(address,uint256)` → Circle contractExecution → W3S PIN. **Verified COMPLETE on-chain.** Số dư + tỷ giá + phí đều thật.
- Swap **estimate** (hiển thị tỷ giá)
- TxHistory, Contacts (avatar cropper), QRScanner (jsQR), Custom/Saved QR (địa chỉ thật), Reset PIN

- **Memo on-chain ✅ VERIFIED (2026-06-28):** tx `0xb75b...7e50` — Memo event đúng (target USDC, memo bytes = "Mua banh"). `send.js` route qua Memo contract `memo(address,bytes,bytes32,bytes)` khi có nội dung → chạy đúng qua Circle User-Controlled Wallet. Hỗ trợ tiếng Việt có dấu (UTF-8). Lịch sử giao dịch đọc lại memo qua `getTxMemo(hash)` (decode Memo event).
- **Thông báo in-app ✅** — `src/notif.js` + `components/NotifArea.jsx` (dùng chung HomeSend + HomeReceive, vùng hàng 7-8): gửi xong → "Đã gửi", nhận tiền (poll ArcScan) → "Đã nhận" (xanh), lỗi gửi → đỏ. Click thông báo → mở chi tiết giao dịch (TxHistory openHash). Hết thông báo → hiện hint.
- **Session-restore ✅** — App.jsx: có `ez_user_token`+`ez_wallet_addr` → vào thẳng HomeSend.
- **Lưu ảnh vào Kho ảnh ✅** — `saveImage.js` dùng Web Share API (iOS lưu Photos, không phải Files) cho biên lai + QR.
- **i18n (đa ngôn ngữ) ✅:** `src/i18n.js` — key = chuỗi tiếng Việt gốc, từ điển EN + ZH. `detect()` theo `navigator.language`, nhớ `ez_lang`. `t(s)` tra dict. Đổi ngôn ngữ = `setLang()` reload. Đã bọc `t()` toàn bộ màn.
- **Circle SDK UI (VI) ✅ (session 2):** `src/circle.js` — `setLocalizations(VI)` dịch toàn bộ: initPincode, confirmInitPincode, newPincode, confirmNewPincode, enterPincode, recoverPincode, securityIntros, securityQuestions, securityConfirm, securitySummary, common (showPin/hidePin/continue). `setThemeColor` → xanh lá #16A34A thay gradient tím Circle. Câu hỏi bảo mật: hiện dùng Circle default questions tiếng Anh (Vietnamese custom questions gây bug PC — xem Blocked).
- **Memo UTF-8 ✅:** `send.js` dùng `TextEncoder().encode()` — hỗ trợ tiếng Việt có dấu + chữ Trung. Verified on-chain tx `0xb75b...7e50`.
- **Sign-out giữ contacts/settings ✅ (session 2):** MenuScreen chỉ xóa session keys (`ez_user_token`, `ez_wallet_addr`, `ez_wallet_id`, `ez_encryption_key`, `ez_email`, `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`). Giữ lại: `ez_contacts`, `ez_saved_qrs`, `ez_lang`, `ez_currency`, `ez_onboarded`.
- **Notif tự hết hạn sau 2h ✅ (session 2):** `notif.js` `getNotifs()` filter `ts > Date.now() - 2h` → hint tự hiện lại.
- **PasteAddress ✅ (session 2):** Bỏ `clipboard.readText()` (gây iOS dialog Paste/Speak). Auto-focus input → user native paste. Button đổi thành "Tiếp tục" (disabled khi chưa có địa chỉ hợp lệ).
- **QR scanner 85% ✅ (session 2):** Tăng scan area từ 62% → 85%.
- **Contact popup ✅ (session 2):** Bỏ `autoFocus` (gây iOS keyboard jump). `paddingTop: 60px` thay `8dvh`.

**❌ Blocked (đã disable trong UI, chờ Circle):**
- **Swap execute:** App Kit/Swap Kit KHÔNG có adapter cho User-Controlled Wallet (chỉ có viem private-key / browser / circle-wallets dev-controlled). Manual instruction-replay fail on-chain. → Tab "Đổi tiền" trên nav bar đã disable; giữ estimate. Đã gửi bug report Circle.
- **Google/Facebook login:** iframe `pw-auth.circle.com/social/verify-token` không post back → `onLoginComplete` không fire. → disable, chờ Circle. Bật lại: đổi `disabled: true→false` trong `src/screens/Login.jsx`.

---

## Bài học / Gotchas (đừng lặp lại)

- Circle có **2 format chain ID khác nhau:** W3S API dùng `ARC-TESTNET`, Stablecoin Kit API dùng `Arc_Testnet`.
- REST `/user/transactions/contractExecution` cần **`feeLevel: 'MEDIUM'` (field phẳng)**, KHÔNG phải `fee: {type, config}` (đó là format Node SDK).
- Lấy wallet address: `GET /v1/w3s/wallets` + header `X-User-Token` (KHÔNG có `/user/wallets`).
- Swap response: `transaction.executionParams.instructions[]` (mảng approve+swap), không phải `transaction.target/callData`. Estimate: `res.estimate.quote.estimatedAmount`.
- W3S SDK `performLogin(provider)` — **1 tham số** (`'Google'`). Đừng tin WebFetch summary, đọc SDK source.
- Circle SDK popup KHÔNG chạy trên localhost (thiếu crypto polyfill) → tạo ví test trên deployed. Balance qua viem chạy được local.
- **iOS Safari KHÔNG có `BarcodeDetector`** → quét QR phải dùng lib JS (jsQR: vẽ frame video lên canvas → `jsQR(imageData.data,w,h)`).
- **Layout "3/4 trái":** container flex `flex-direction: column` mà đặt `alignItems: 'flex-start'` sẽ **co child về content-width + dồn trái**. Muốn full width → để mặc định `stretch` (đừng set flex-start). Top-align thì dùng `justify-content: flex-start`.
- **Arc gas tính bằng USDC** (18 decimals nội bộ). Phí = `eth_gasPrice × gasUnits / 1e18` USDC. Gas rất rẻ → hiển thị "< 1đ". Paymaster (gas hộ) **chưa hỗ trợ** lúc launch.
- **Tra docs Arc bằng MCP `arc-docs`** (search_arc_docs / query_docs_filesystem) — ưu tiên hơn trí nhớ.
- **⚠️⚠️ Circle W3S SDK getSDK() CHỈ ĐƯỢC gọi `setLocalizations(VI)` với object VI GỐC — KHÔNG `setCustomSecurityQuestions`, KHÔNG `setThemeColor`, KHÔNG mở rộng VI (thêm `common`, `initPincode`, đổi `headline2`).** Session 2 Sonnet+Opus thử thêm mấy cái đó để dịch/đổi màu màn câu hỏi bảo mật → làm nút "Tiếp tục" ở bước xác nhận câu trả lời KHÔNG sáng, **vỡ tạo ví cả PC LẪN mobile**. Đã restore `src/circle.js` về đúng commit `fad1ec5` (bản tạo ví chạy thành công). **Bài học: ĐỪNG đụng vào getSDK / object VI. Câu hỏi bảo mật để English, modal để tím Circle — đó là cái giá của một flow CHẠY ĐƯỢC.** Matching chạy trong iframe `pw-auth.circle.com`, không debug được từ ngoài.
- EURC trên CoinGecko = id `euro-coin`; USDC = `usd-coin`; cirBTC dùng `bitcoin`.

---

## Cần rà đồng bộ (audit UI — chưa làm)

- **Swap** vẫn giao diện cũ (đang disable): còn ký tự unicode `▾`/`⇅`, màu/cỡ chưa theo token, layout chưa giống SendAmount. Khi bật lại swap phải làm lại theo chuẩn.
- **ComingSoon** — đã fix (trước crash vì thiếu route), dùng cho "Phương thức khôi phục".
- **Bottom button không đồng nhất:** SendAmount/CreateQR dùng flex 2.5/1.5; TxHistory 3 nút; còn lại row10-single/dual. Cân nhắc 1 chuẩn.
## Đã dọn dẹp (2026-06-28)

- **Xóa code chết — hệ PIN-cục-bộ cũ** (không nằm trong luồng nào): `CreatePin`, `EnterPin`, `PinLocked`, `Recovery` screens + `components/PinDots.jsx` + `src/icons.jsx` (icon SVG cũ, đã thay bằng `Icon.jsx`). Bỏ logic `ez_pin` trong App.jsx → màn khởi động luôn là **Login**. (Note: chưa có session-restore — user quay lại vẫn phải login email; cân nhắc làm sau.)
- **Auth thật:** Login → EnterEmail (Circle email session, PIN ký qua W3S SDK). KHÔNG có app-lock PIN cục bộ.
- **`ForgotPin`** từng được navigate tới nhưng KHÔNG có file/route → đã hết (xóa cùng cụm PIN).
- Bỏ `MOCK_VND/MOCK_USDC/MOCK_ADDR` khỏi data.js.
- **App icon / favicon:** `public/pfp.png` (apple-touch-icon iOS + manifest 192/512 — iOS KHÔNG nhận SVG nên phải PNG nền trắng) · favicon `public/icon.svg` (SVG ok, nền trắng). Sửa manifest (trước trỏ `/design/...` → 404).

## Pending / TODO

**Đã xong (2026-06-29):**
- ~~i18n (đa ngôn ngữ)~~ ✅ — VI/EN/ZH, mặc định theo trình duyệt (xem phần "Chạy thật").
- ~~Đưa nút Đăng xuất ra Menu~~ ✅.

**Còn lại:**
1. **Trạng thái giao dịch thật** — poll txHash → "✓ đã lên blockchain" (Arc finality <1s).
2. **Batch (Multicall3From `0x522f...47D0`)** — gửi nhiều người / gộp approve+swap.
3. Send: mới chỉ USDC/EURC/VND/CNY theo currency — chưa chọn token tự do (cirBTC).
4. **Blocked (chờ Circle):** Google/Facebook login + Swap execute + securityConfirm PC bug (xem Blocked).

> **Session 1 (2026-06-29):** i18n VI/EN/ZH, bọc t() toàn bộ màn, Đăng xuất ra Menu, memo on-chain, tỷ giá live, jsQR iOS.
> **Session 2 (2026-06-29):** 12 mobile UX bugs (contacts, hints, QR, paste, onboarding, CNY), Circle SDK full VI localization + green theme, Onboarding screen, securityConfirm PC bug discovered (unfixable — Circle iframe).
