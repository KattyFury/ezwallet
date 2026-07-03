# HANDOFF — EZwallet

**Cập nhật:** 2026-07-01 (session 4)
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

**⚠️ QUY TẮC THIẾT KẾ (user yêu cầu — đừng vi phạm):**
- **KHÔNG BAO GIỜ dùng em-dash `—`.** Dấu ngăn cách chuẩn của app là **en-dash `–`** (vd "Danh bạ – Nơi lưu địa chỉ"). Placeholder rỗng dùng `…` (không phải `—`). Đồng bộ mọi thông báo/hint, đừng chỗ en chỗ em.
- **Thông báo & hint đồng bộ:** cùng kiểu `.tip-box` căn TRÁI (column, flex-start), nhãn đậm + mô tả xám. Warning (hết USDC) cũng dùng layout này (màu warning + phần clickable có `text-decoration: underline`).
  - **NGOẠI LỆ (2026-07-01, user chốt):** hint HomeSend ("Danh bạ/Quét QR/Dán để gửi") + HomeReceive ("QR mặc định/Chia sẻ/Tạo QR/Kho QR") đổi sang dạng liền dòng **`Nhãn: mô tả`** — KHÔNG bold nhãn, KHÔNG en-dash (chỉ dấu `:`), chữ regular đồng bộ với thông báo. Icon căn **GIỮA-TRÁI theo chiều dọc** (`alignItems: 'center'`), không phải trên-cùng (`flex-start`). Warning Faucet (hết USDC) giữ nguyên layout cũ riêng.
- **Mục danh sách trong sub-screen (Security/Language/About): MỖI MỤC 1 HÀNG GRID riêng** (`row-2`, `row-3`...). ĐỪNG nhồi hết vào 1 `.row-2-9` flex column — vì `.menu-item` có `flex:1` sẽ dàn đều kín trang (lỗi Security cũ).
- **Nút lọc/toggle khi BẬT = nền trắng + viền xanh + chữ xanh** (`borderColor/color = --color-primary`), KHÔNG tô đặc xanh. Xem `activeFilter` trong TxHistory.
- **Trong BOX CÓ NỀN MÀU: chữ FULL ĐEN, phân cấp bằng ĐẬM/NHẠT (label `--fw-semibold`, mô tả thường), KHÔNG dùng combo đen-xám.** Màu xám (`--color-muted`) chỉ cho text trên nền trắng. Áp dụng cho hint box, thông báo.
- **Hệ THÔNG BÁO (NotifArea) + cảnh báo + HINT = NỀN MÀU NHẠT (iOS-style), KHÔNG viền:** `background: *-soft`, borderRadius 12, icon đậm màu, chữ đen. Màu theo loại: **Nhận = xanh lá** (`--color-primary` + `-soft`) · **Gửi = xanh dương** (`--color-info #2563EB` + `-soft #DBEAFE`) · **Lỗi = đỏ** (`--color-error` + `-soft #FEE2E2`, icon `warning`) · **Cảnh báo/Faucet = vàng** (`--color-warning` + `-soft`, icon `warning`, phần clickable underline). Icon: nhận `down`, gửi `up`, lỗi+cảnh báo `warning`. "Gửi = xanh dương" áp dụng cả icon TxHistory.
- **Tiền tệ hiển thị theo `ez_currency`** (VND/USDC/EURC/CNY) toàn app: `getDisplayCurrency()`, `fmtDisplay()`, `displayNum()` (data.js), `getDisplayRates()` (chain.js). List token ẩn cột quy đổi khi token == tiền tệ hiển thị.

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
- **Khóa cuộn trang toàn cục (`App.jsx`, 2026-07-01):** listener `scroll` → `window.scrollTo(0,0)` mỗi khi trang bị đẩy — chặn iOS/Android tự cuộn khi bàn phím mở (input đã luôn nằm nửa trên theo rule ở trên nên không cần cuộn trang). Trước fix này, focus vào input làm cả màn/popup "nhảy lên" dù còn dư chỗ. Đừng xóa listener này nếu không có lý do thay thế.

---

## Trạng thái màn hình (cập nhật 2026-06-27, đợt UI lớn)

- **Số dư (BalanceHeader, dùng chung HomeSend/HomeReceive/Menu):** số căn giữa tuyệt đối (--fs-amount, Condensed), "VND" treo phải absolute + căn giữa dọc. Component `src/components/BalanceHeader.jsx`, hàng 1-2.
- **NavBar:** tab active = **vạch xanh lá** trên đỉnh (width 70%, cao 5px, bo dưới) + icon/chữ đen; tab khác xám.
- **Login:** Email (active, icon mail SVG) / Google (disabled). Facebook gỡ.
- **HomeSend:** BalanceHeader h1-2; list token h3-5 (logo thật + số token **bold** + check xanh + VND **regular** xám); hint h7-8 dạng liền dòng `Nhãn: mô tả` (regular, không bold/en-dash — 2026-07-01), icon căn giữa dọc; actions h9 (Danh bạ/Quét QR/Dán để gửi); nav h10.
- **SendAmount:** h1 tiêu đề / h2 "Gửi cho:" (tra **tên danh bạ** theo địa chỉ) / h3-4 số **căn giữa tuyệt đối** + **chip `[VND ›]`** (right2) đổi tiền tệ (**VND/USDC/EURC/CNY**, popup nửa trên) / **h6: `AmountSuggest`** — nếu VND và số đang gõ ≤3 chữ số, hiện 3 nút gợi ý x1.000/x10.000/x100.000 (2026-07-01) / h5 memo "Nội dung chuyển khoản (không bắt buộc)" / **numpad đúng 2.5 hàng (7,8,nửa 9)** + nút ở ranh giới 9/10 (gridRow 7/11, flex 2.5/1.5). Default currency đọc từ `ez_currency`. Khả dụng hiển thị theo tiền tệ đang chọn. Gửi thất bại → `ErrorToast` (banner đỏ nổi, tự ẩn 5s) hiện lý do thật (màn này không có `NotifArea`).
- **SendConfirm:** quy đổi theo `currency` (VND→USDC, CNY→USDC via rate USDC/7.25, USDC→USDC, EURC→EURC); phí gas thật; nút đỏ "Xác nhận · PIN". **Flow lỗi (2026-07-01, user chốt):** đúng PIN → thành công; sai PIN/hủy/lỗi bất kỳ → THOÁT hẳn về SendAmount kèm `sendError` (KHÔNG cho sửa tại chỗ với challenge cũ — đó là nguyên nhân bug cũ "sai PIN nhưng vẫn gửi được"). Mỗi lần mở lại tạo challenge + idempotencyKey MỚI.
- **CreateQR:** cũng có `AmountSuggest` (đồng bộ SendAmount, 2026-07-01).
- **HomeReceive:** BalanceHeader; QR h3-5 + câu điều hướng to "Cho người khác quét để nhận tiền" (2026-07-01 — **đã bỏ** địa chỉ ví + nút copy dưới QR, vì đã có nút Chia sẻ riêng); hint dạng liền dòng `Nhãn: mô tả` ("QR mặc định/Chia sẻ/Tạo QR/Kho QR"); actions Chia sẻ / Tạo QR / **Kho QR**.
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
- **Circle SDK UI = ENGLISH THUẦN ✅ (2026-07-01 CHỐT LẠI):** `getSDK()` KHÔNG `setLocalizations` (Circle default English). Đã THỬ Việt hóa 1 phần rồi REVERT vì ra "nửa nạc nửa mỡ": headline Việt được nhưng "Show PIN"/"Recovery Method"/câu hỏi/CHỮ LỖI runtime vẫn Anh + lỗi nối chữ "Tạo mã PINPIN". Circle chỉ localize được vài label, phần lớn hardcode trong iframe cross-origin → English nhất quán tốt hơn Việt nửa vời. **Chấp nhận English cho tới khi Circle hỗ trợ localization đầy đủ (hoặc đổi tech).** ĐỪNG setLocalizations lại nếu chưa xác nhận Circle localize được HẾT (gồm chữ lỗi runtime).
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
- **⚠️⚠️ NGUYÊN NHÂN THẬT "nút Tiếp tục không sáng" ở màn securityConfirm = bước đó bắt gõ "I agree" (đồng ý điều khoản), KHÔNG phải nhập lại câu trả lời.** Localization VI của Sonnet ghi `securityConfirm.inputPlaceholder/inputHeadline = "Nhập lại câu trả lời"` → user gõ câu trả lời vào ô đáng lẽ phải gõ `I agree` → nút không bao giờ sáng. Chuỗi `I agree` là Circle HARDCODE (không localize được). **Hiện `getSDK()` để Circle SDK DEFAULT THUẦN (English, KHÔNG setLocalizations/setCustomSecurityQuestions/setThemeColor) — màn Circle tiếng Anh nhưng CHẠY ĐÚNG, user thấy rõ phải gõ "I agree".** Nếu muốn re-localize VI sau: PHẢI sửa `securityConfirm` thành hướng dẫn gõ đúng "I agree" (vd inputPlaceholder = 'Gõ: I agree'), và test kỹ. ĐỪNG ghi "nhập lại câu trả lời".
- EURC trên CoinGecko = id `euro-coin`; USDC = `usd-coin`; cirBTC dùng `bitcoin`.
- **⚠️⚠️ ROOT CAUSE bug PIN "sai rồi nhập đúng vẫn văng ra" (2026-07-01, đọc source SDK):** iframe Circle khi nhập SAI PIN bắn `onError(155112)` NHƯNG **KHÔNG đóng modal** (`messageHandler` case `onError` không remove iframe) — vẫn cho nhập lại. `executeChallenge` cũ reject ngay → điều hướng đi → user nhập ĐÚNG lại, iframe (vẫn nổi) bắn `onComplete` success nhưng promise đã reject → **mất kết quả → văng ra**. FIX: `RETRYABLE_CODES` (155112/155703/155704/155115/155705) → BỎ QUA, không settle promise; chỉ settle khi SUCCESS hoặc lỗi TERMINAL. Sai PIN nhập lại đúng = giao dịch chạy tiếp bình thường. **ĐỪNG reject promise ở các mã retryable này.**
- **⚠️ GIỚI HẠN Circle hosted iframe (KHÔNG sửa được từ phía mình — cross-origin, SDK đã là bản mới nhất 1.1.11):** (1) chữ lỗi trong ô PIN "The PIN you entered is incorrect. You have N attempt(s) left" là ENGLISH, Circle render trong iframe, **KHÔNG có field localization** → không Việt hóa được. (2) 6 chấm PIN **không tự xóa** sau khi nhập sai (user phải tự xóa) — hành vi nội bộ iframe, không điều khiển được. (3) bước securityConfirm bắt gõ "I agree" **KHÔNG auto-điền hộ được** (iframe cross-origin) — chỉ Việt hóa được HƯỚNG DẪN. → Nếu user bức xúc: giải thích đây là UI bảo mật Circle host (PIN không bao giờ chạm code mình); phương án duy nhất là gửi feedback cho Circle. `setLocalizations` chỉ đổi được label màn (headline/subhead/forgotPin/title...), KHÔNG đổi được chữ lỗi runtime.
- **⚠️⚠️ Circle `userToken` chỉ sống ~1 tiếng** (2026-07-01) — nếu đọc thẳng từ `localStorage` lúc ký PIN mà phiên mở app lâu hơn, W3S SDK từ chối **NGAY TRƯỚC KHI hiện màn PIN** với lỗi `userToken had expired` → cảm giác "bấm gửi tiền không hiện PIN, tự nhiên bị đá ra ngoài" (dễ tưởng nhầm là bug flow PIN). Fix: `refreshSession()` (`src/circle.js`) tạo token mới qua `ez_email` đã lưu **ngay trước MỌI thao tác cần PIN** (gửi tiền, đổi PIN) — Circle cho tạo token mới bất cứ lúc nào chỉ cần userId (=email), không cần mật khẩu. Áp dụng ở `SendConfirm` + `Security` (đổi PIN); **Swap chưa áp dụng** (execute đang Blocked, không chạy được nên không cần).
- **Màn không có `NotifArea` (SendAmount, CreateQR...) không tự hiện được lỗi từ `addNotif()`** — lỗi bị "nuốt" vào localStorage, người dùng chỉ thấy bị đá về mà không rõ vì sao (bug thật đã gặp 2026-07-01). Dùng `components/ErrorToast.jsx` (banner đỏ nổi, tự ẩn 5s hoặc bấm X) truyền qua `navigate(screen, { ...params, sendError: msg })` cho các màn dạng này — KHÔNG chỉ gọi `addNotif()` rồi coi như xong.
- **Lỗi từ W3S SDK không phải lúc nào cũng là `Error` chuẩn** (có thể là `{code, message}` hoặc string) — khi bắt lỗi để hiển thị, dò nhiều dạng: `e?.message || e?.error?.message || (typeof e === 'string' ? e : null) || ...`, đừng chỉ tin `e.message` rồi rớt về thông báo chung chung mù mờ.
- **NotifArea:** thông báo type `error` KHÔNG bấm mở được Lịch sử giao dịch nữa (2026-07-01) — chỉ `received`/`sent` mới có giao dịch thật để xem, trước đó bấm vào lỗi lại điều hướng nhầm sang TxHistory.

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

**🔜 LÀM TIẾP TỐI 2026-06-30 (user yêu cầu — ƯU TIÊN, bắt đầu từ đây):**
- **TỐI GIẢN GIAO DIỆN cho người dùng phổ thông / người già:** bỏ bớt "yếu tố ví" kỹ thuật/crypto khỏi các màn CHÍNH. Cụ thể: đừng phơi địa chỉ `0x1234...5678` dài dòng ở HomeReceive/Security/màn chính. Người phổ thông không cần thấy nó. GIỮ địa chỉ ở chỗ THỰC SỰ cần (QR nhận tiền, copy khi chia sẻ, danh bạ) nhưng ẩn/thu nhỏ ở nơi khác. User sẽ chỉ rõ từng chỗ khi vào việc. (Chưa bắt đầu code.)

**🔜 SẼ BUILD (user yêu cầu note lại — chưa làm):**
- ~~**GOOGLE SIGN-IN**~~ ✅ **ĐÃ LÀM (Session 6)** — dùng `cookies-next@4`, lưu `appId/google.clientId/deviceToken/deviceEncryptionKey` vào cookies, SDK 1 instance restore lúc mount. **CHƯA test redirect thật trên deploy** (localhost không chạy popup Circle). Known gap: user Google chưa lưu `ez_email` → `refreshSession()` không refresh được userToken (sau ~1h PIN có thể lỗi) — cần lưu định danh Google hoặc re-auth khi hết hạn.
- **SWAP execute** (đang disable, LÀM TIẾP): user chốt **KHÔNG dùng App Kit** — đã gọi thẳng Stablecoin Kit REST (`quote`+`swap`→instructions→`contractExecution`) ở `functions/api/swap.js`. Nghi vấn fail on-chain: tạo cả approve+swap challenge CÙNG LÚC → swap simulate trước khi approve mine → revert. Hướng sửa: approve → **chờ confirm on-chain** → mới tạo swap. Giao diện Swap cũng cần làm lại theo token design (còn `▾`/`⇅` cũ).

**Còn lại:**
1. **Trạng thái giao dịch thật** — poll txHash → "✓ đã lên blockchain" (Arc finality <1s).
2. **Batch (Multicall3From `0x522f...47D0`)** — gửi nhiều người / gộp approve+swap.
3. Send: hiển thị chỉ USDC/EURC (mặc định USDC) — chưa chọn token tự do (cirBTC). VND/CNY tạm gỡ tới khi Circle hỗ trợ đa tiền tệ.
4. **Google login:** đã build (Session 6) — chờ **test redirect thật trên deploy**. Facebook: chưa. **Swap execute:** đang làm lại (xem "SẼ BUILD").

> **Session 1 (2026-06-29):** i18n VI/EN/ZH, bọc t() toàn bộ màn, Đăng xuất ra Menu, memo on-chain, tỷ giá live, jsQR iOS.
> **Session 2 (2026-06-29):** 12 mobile UX bugs (contacts, hints, QR, paste, onboarding, CNY), Circle SDK full VI localization + green theme, Onboarding screen, securityConfirm PC bug discovered (unfixable — Circle iframe).
> **Session 3 (2026-06-30):** RÚT RA: Circle securityConfirm bắt gõ "I agree" (không phải nhập lại câu trả lời) → đã trả `getSDK()` về Circle DEFAULT THUẦN (English, KHÔNG localize/theme/customSecurityQuestions — đừng đụng nữa). Per-account contacts/QR (`src/store.js`, theo địa chỉ ví). Double-send guard (idempotencyKey cố định + notif dedup theo hash). **Tiền tệ hiển thị theo `ez_currency` toàn app** (BalanceHeader/token list/SendConfirm; helper `getDisplayCurrency/fmtDisplay/displayNum` data.js + `getDisplayRates` chain.js). **ensureWalletAddress()** self-heal địa chỉ ví (fix ví/QR không hiện khi tạo email mới; App.jsx session chỉ cần userToken). Hệ thông báo + hint + cảnh báo = NỀN MÀU NHẠT (Nhận=xanh lá, Gửi=xanh dương `--color-info`, Lỗi=đỏ, Cảnh báo=vàng; icon warning cho lỗi+cảnh báo). Bỏ sạch em-dash (dùng en-dash `–`). Security mỗi mục 1 hàng grid. TxHistory nút lọc Gửi/Nhận viền xanh. Contacts copy icon. **TẤT CẢ đã push, build pass.**
> **Session 4 (2026-07-01):** 8 bug report từ user, tất cả đã sửa + push (build pass mỗi lần):
> 1. **Khóa cuộn trang** (`App.jsx`) — chặn iOS/Android tự cuộn khi focus input → hết hiện tượng "màn/popup nhảy lên".
> 2. **Flow PIN sai chốt lại:** sai/hủy/lỗi → thoát hẳn về SendAmount làm lại từ đầu (challenge + idempotencyKey mới), KHÔNG cho sửa tại chỗ.
> 3-5. Hint HomeReceive đổi sang liền dòng `Nhãn: mô tả` (regular, không bold/en-dash); bỏ địa chỉ ví + nút copy dưới QR, thay bằng slogan to "Cho người khác quét để nhận tiền"; icon hint căn giữa dọc thay vì trên-cùng. Sau đó đồng bộ luôn HomeSend cho khớp (user nhắc "sao sửa bên Nhận không sửa bên Gửi").
> 6. **NotifArea:** lỗi không còn bấm mở nhầm sang TxHistory (chỉ received/sent mới có gì để xem). "Gửi thất bại:" giờ dịch đúng theo `ez_lang` (trước hardcode tiếng Việt).
> 7. **Bug PIN thật sự (đào sâu 3 vòng):** (a) `send.js` từng trả lỗi mù mờ "no challengeId" → giờ log full response + trả message thật của Circle; (b) SendAmount không có `NotifArea` nên lỗi bị nuốt mất → thêm `components/ErrorToast.jsx` (banner đỏ nổi); (c) **root cause thật:** Circle `userToken` hết hạn sau ~1h, SDK từ chối trước khi hiện PIN → `refreshSession()` mới trong `circle.js`, gọi trước mọi thao tác cần PIN (SendConfirm + Security đổi PIN).
> 8. **`components/AmountSuggest.jsx`** (mới): nhập VND ≤3 chữ số → gợi ý x1.000/x10.000/x100.000 ngay dưới ô nhập (SendAmount + CreateQR).
> Còn tồn: bug PIN userToken **chưa được user xác nhận đã hết hẳn** sau fix `refreshSession()` — cần test lại thực tế trên deploy mới nhất.
> **Session 5 (2026-07-03):** **KHÓA English + tiền tệ USDC/EURC.** Lý do: Circle Wallet hiện chỉ hỗ trợ tiếng Anh → dùng English cho mọi user (hết cảnh "chỗ Việt chỗ Anh"), mở lại đa ngôn ngữ/tiền tệ khi Circle hoàn thiện.
> - `i18n.js`: `LANG = 'en'` cứng — bỏ auto-detect trình duyệt + bỏ qua `ez_lang` cũ. Hạ tầng VN/ZH + `detect()` GIỮ NGUYÊN (mở lại chỉ cần `LANG = detect()`). Root cause "lẫn ngôn ngữ" = **8 chuỗi help text (Home Send/Receive) thiếu key trong từ điển EN** → `t()` fallback về tiếng Việt gốc; đã thêm đủ 8 bản dịch. Audit bằng script (scratchpad) xác nhận 0 key EN còn thiếu.
> - `data.js` `getDisplayCurrency()`: mặc định **USDC**, chỉ nhận USDC/EURC, **tự quy giá trị cũ VND/CNY → USDC** (`SUPPORTED_CURRENCIES`). Các picker gỡ VND/CNY: `Onboarding` (English-only, chỉ USDC/EURC), `Language`/Cài đặt (bỏ ô ngôn ngữ, đổi tên menu "Ngôn ngữ & tiền tệ"→"Tiền tệ"/Currency), `CreateQR`, `SendAmount` (đều dùng `getDisplayCurrency()` thay `|| 'VND'`).
> - Fix 3 chỗ render trực tiếp không qua `t()`: `ComingSoon` (tiêu đề `{t(label)}`), `EnterEmail` (fallback lỗi), `Swap` (nút "coming soon" + status — Swap vẫn disabled).
> - Verify: `vite build` pass; test runtime (import i18n/data với stub localStorage `vi`/`VND` + navigator `vi-VN`) → getLang='en', getDisplayCurrency='USDC', 8 key help trả English → **7/7 pass**. Chưa verify trực quan trên browser (login Circle không chạy localhost). Đã push `main` (`8ea36ef`).
> **Session 6 (2026-07-03):** (a) **Home UI fixes** (`3f809a0`): token list — số quy đổi từ dòng dưới → treo bên PHẢI cùng dòng (`marginLeft:auto`); "Including" 15→17px; hint HomeSend/HomeReceive bỏ icon `hint.svg`, rút gọn dạng "Hint:" + "Key = value" (English hardcode, gỡ 7 key i18n dài). (b) **GOOGLE SIGN-IN bật lại** (`9602395`): fix lỗi `155140` theo Circle Web quickstart 3.6 — `cookies-next@4` persist SDK config qua OAuth redirect (sessionStorage cũ bị mất khi reload). 1 `W3SSdk` qua `useRef`, restore config từ cookies lúc mount + `onLoginComplete` tự hoàn tất; `handleGoogleLogin` = setCookie → `updateConfigs` → `performLogin('Google')`. Constructor an toàn khi cookies rỗng (`execSocialLoginStatusCheck` no-op) → không đụng login Email. **CHƯA test redirect thật trên deploy.** Next: Swap execute (approve→confirm→swap).

> **Session 6b (2026-07-03) — HIỂN THỊ USD/EUR + FONT BARLOW (chốt với user, ĐANG DỞ vì hết token):**
> **MÔ HÌNH TIỀN (user chốt, ĐỪNG hiểu sai lại):** Token LUÔN hiện TÊN THẬT (USDC/EURC/cirBTC). "Tiền hiển thị" là lớp ĐỘC LẬP quy stablecoin → tiền địa phương qua **tỷ giá fetch** (KHÔNG swap thật), dùng cho: TỔNG số dư + số QUY ĐỔI mỗi token + PHÍ. Mặc định = **USD** (EUR tùy chọn; sau này VND/CNY theo ngôn ngữ). Home "Including" ví dụ: `98.59 USDC | 98.59 USD`, `20.00 EURC | 22.91 USD`, `0.0001 cirBTC | 6.16 USD`; tổng `127.66 USD`. Quy đổi hiện cho MỌI token kể cả USDC.
> - `data.js` helper `displaySymbol()` (USDC→USD, EURC→EUR) CHỈ áp cho display currency (`cur`/`displayCur`), KHÔNG cho token symbol. Display currency nội bộ vẫn code `USDC`/`EURC` (rates keyed vậy), hiện ra USD/EUR qua displaySymbol. Áp: BalanceHeader tổng, HomeSend quy đổi phải, TxHistory quy đổi (đổi VND→USD, thêm state rates), SendConfirm phí, Language/Onboarding picker.
> - **FONT (user chốt):** số = Barlow Condensed (`.num`); CHỮ = **Barlow regular**. `--font-base` IBM Plex Sans → 'Barlow' (index.html load Barlow). Ký hiệu tiền tệ tách span `--font-base` (helper `Cur`). index.html lang vi→en.
> - Commits `2d011af`→`e0be224` (giữa chừng mình lỡ đổi TOKEN thành USD/EUR ở `2d011af`, user sửa, revert đúng ở `e0be224`). Build pass. **CHƯA verify trực quan** font/layout — dev server localhost:5173 + 8787 đang chạy.
> **🔜 LÀM TIẾP (đây là điểm dừng):**
> 1. User xác nhận Home hiển thị đúng (token thật + USD conversion) + font Barlow ổn.
> 2. Màn GỬI: đang nhập theo token thật (vd "5.00 USDC"). HỎI user có muốn nhập/hiện theo USD không (chưa làm, tránh đoán sai).
> 3. **SWAP execute** (ưu tiên): KHÔNG dùng App Kit. Nghi fail on-chain do tạo approve+swap challenge CÙNG LÚC → sửa: approve → chờ confirm on-chain → mới swap (`functions/api/swap.js`).
> 4. **Google login**: test redirect thật trên DEPLOY (localhost không chạy). Gap: user Google chưa lưu `ez_email` → `refreshSession()` không refresh được userToken.
> **Session 7 (2026-07-03) — LAYOUT 5 VÙNG cố định HomeSend + font system fix + gửi USD/USDC/EURC/cirBTC:**
> **Bố cục HomeSend (user quy định chính xác, ĐỪNG đổi lại):** hàng 1-2 = số dư (BalanceHeader); hàng 3-6 = danh sách token (`.row-3-6`, cuộn được `.scroll-thin`, mờ dần ~1/3 hàng `calc(100dvh/30)` ở ĐÁY khi gần nút); hàng 7-8 = thông báo (`.row-7-8` → NotifArea, cuộn được, mờ ~1/3 hàng ở ĐỈNH, tự cuộn xuống thông báo mới nhất mỗi khi `notifs` đổi); hàng 9 = 3 nút hành động; hàng 10 = NavBar. Nút **"Show tokens" KHÔNG chiếm hàng riêng** — nổi `position:absolute` đúng ranh giới hàng 6/7 (`top:60%` của `.screen`, `.screen` đã thêm `position:relative`), `zIndex:10` đè lên cả 2 vùng cuộn bên dưới.
> - **Fade**: ban đầu mình để 28px cố định + `overflow:hidden` (cắt cứng, không cuộn được) — SAI theo 2 lần góp ý: (1) cách nút quá xa, (2) phải CUỘN ĐƯỢC khi đầy chứ không được mất nội dung vĩnh viễn. Sửa: `overflowY:auto` (không phải hidden) + mask-image `calc(100dvh/30)` (~1/3 chiều cao 1 hàng, đúng theo yêu cầu "mờ 1/3 hàng thôi") + class `.scroll-thin` (scrollbar mảnh 4px màu `--color-gray`, `scrollbar-width:thin` cho Firefox) để không có thanh cuộn mặc định xấu chen vào.
> - **FONT (sửa tiếp, đã đúng theo Session 6b nhưng cần nhớ)**: `--font-base`=IBM Plex Sans (nội dung), `--font-condensed`=Barlow thường KHÔNG condensed (số/tiền tệ/tiêu đề/button) — xem chi tiết đầy đủ ở note Session 6b bên dưới, ĐỪNG lặp lại lỗi đổi full Barlow.
> - **SendAmount**: chip tiền tệ (USD/USDC/EURC/cirBTC) đổi từ "bám sát bên phải SỐ" (`position:absolute;left:100%` trong span số) sang **neo BÌA PHẢI cố định** (`position:absolute;right:0` trên div cha `width:100%`) — số vẫn luôn căn giữa màn hình, chip không còn nhảy theo độ dài số khi gõ.
> - **Bug "thông báo gửi không hiện"**: user báo nhưng đã pivot sang việc khác trước khi mình điều tra sâu. Đã kiểm code path `SendReceipt.jsx` → `addNotif(...,'sent')` chạy đúng lúc mount (useEffect), `NotifArea` đọc `getNotifs()` mới khi mount lại (App.jsx swap component = remount thật). KHÔNG tìm thấy bug rõ ràng qua đọc code — nghi ngờ có thể do fade/clip cứng (28px + overflow:hidden) trước khi sửa session này khiến thông báo bị che dù data có thật; giờ đã chuyển sang cuộn được nên tối thiểu luôn truy cập được. **CHƯA XÁC NHẬN hết bug — cần user test lại và báo cụ thể (thông báo có trong TxHistory không, có xuất hiện sau khi cuộn lên không).**
> Build pass. **CHƯA verify trực quan trên browser/thiết bị thật** (không có quyền truy cập trình duyệt trong môi trường này) — toàn bộ layout/fade/scroll mới cần user tự kiểm tra trên app thật.
> **🔜 LÀM TIẾP:**
> 1. User xác nhận layout 5 vùng + fade/scroll mới đúng ý (đặc biệt: khoảng cách mờ, scrollbar có "khéo" không).
> 2. Theo dõi bug "thông báo không hiện" — nếu vẫn còn sau bản này, cần thêm log/debug cụ thể hơn (khó chẩn đoán không có browser).
> 3. **SWAP execute** (vẫn ưu tiên, chưa động tới): approve → chờ confirm on-chain → mới swap (`functions/api/swap.js`).
> 4. **Google login**: vẫn chưa test redirect thật trên deploy.
> 5. CreateQR.jsx: vẫn CHƯA có USD/cirBTC (user chỉ yêu cầu cho màn Gửi), chip tiền tệ CreateQR vẫn kiểu cũ (bám số) — có thể user sẽ yêu cầu đồng bộ sau.
> **Session 8 (2026-07-03) — Google login: fix deviceId + phát hiện quan trọng về userId:**
> **Fix 1: Lỗi "Provided device ID is not found in the system"** (commit fix Login.jsx). Root cause: code cũ tự tạo deviceId bằng `crypto.randomUUID()` — Circle không hề biết tới ID tự bịa này. Đúng chuẩn (xác nhận lại từ docs Circle Web quickstart 3.4): deviceId PHẢI lấy qua `sdk.getDeviceId()` (SDK tự fingerprint qua iframe riêng của Circle). Đã sửa: thêm `ensureDeviceId(sdk)` gọi `getDeviceId()` 1 lần, cache vào `localStorage.ez_google_deviceId` (định danh THIẾT BỊ, ổn định lâu dài — khác `deviceToken` dùng 1 lần). Prefetch sẵn lúc mount màn Login (không phải lúc restore sau redirect) để bấm nút không delay. **CHƯA test được trên máy** (Circle SDK không chạy localhost) — cần user test trên deploy `ezwallet.pages.dev` (tự động deploy mỗi lần push `main`, không cần thao tác thủ công).
> **Phát hiện quan trọng (user báo, đã tra docs xác nhận — KHÔNG PHẢI BUG):** đăng nhập Email và đăng nhập Google tạo ra **2 ví HOÀN TOÀN KHÁC NHAU** cho cùng 1 người, dù cùng địa chỉ email thật. Nguyên nhân: Circle coi mỗi phương thức đăng nhập là 1 danh tính (`userId`) riêng biệt trong hệ thống của họ — Email login app tự quản lý `userId` = chuỗi email (`functions/api/session.js` gọi `/users` với `userId: email`); Google login thì Circle **tự tạo `userId` ngầm bên trong lúc `performLogin`**, hoàn toàn không cho app can thiệp/chọn. Xác nhận từ docs Circle (trang Authentication Types): *"Each social account links to one unique user ID. Signing up with multiple providers... creates separate user IDs."* — **KHÔNG có cơ chế chính thức để nối 2 danh tính này lại.**
> - User đã chọn hướng xử lý: **chấp nhận thiết kế này** (không tự xây cơ chế nối tài khoản phức tạp, không tắt Google login) — chỉ **cảnh báo rõ trong UI** để người dùng không bất ngờ. Đã thêm dòng chú thích nhỏ dưới 2 nút ở `Login.jsx`: "Note: signing in with Google creates a separate wallet from email sign-in."
> - Nếu SAU NÀY muốn thật sự nối được 2 phương thức về 1 ví: cách duy nhất là KHÔNG dùng `sdk.performLogin()` (native social flow của Circle, opaque) — thay vào đó tự lấy email từ Google OAuth (Google Identity Services riêng, không qua Circle), rồi đưa email đó vào flow email-login sẵn có (`userId = email`). Đây là thay đổi kiến trúc lớn, chưa làm, cần thiết kế kỹ nếu được yêu cầu.
> **Session 9 (2026-07-03) — Đổi PIN vẫn lỗi Forbidden sau 3 vòng sửa, CHƯA GIẢI QUYẾT XONG. User note lại để chuyển sang Opus.**
> **Bối cảnh:** user test nút "Đổi PIN" (Security.jsx, `handleResetPin`) trên ví tạo bằng Google login, báo lỗi qua 4 lần, mỗi lần sửa 1 lớp:
> 1. `"no challengeId"` (mù mờ) → sửa lộ lỗi thật ở `functions/api/wallet.js` action `resetPin` (commit `2363231`) — thêm `data?.message || data?.error?.message || Circle error {code}` thay vì chuỗi cứng.
> 2. `"Forbidden"` (lỗi thật lộ ra) → tra API reference Circle 2 lần độc lập, xác nhận `create-user-pin-challenge` là **POST**, code cũ gọi **PUT** → sửa PUT→POST (commit `906e53d`).
> 3. `"The user had already been initialized"` (lỗi thật MỚI, sau khi method đúng) → tra ra Circle có **2 endpoint PIN riêng biệt**: `POST /user/pin` (tạo PIN LẦN ĐẦU, từ chối nếu user đã có ví) vs `POST /user/pin/restore` (khôi phục/đổi PIN cho user đã có, qua câu hỏi bảo mật) → sửa sang `/user/pin/restore` (commit `6e72eeb`).
> 4. **`"Forbidden"` LẶP LẠI** — user test lại, y hệt lỗi ở bước 2, nhưng lần này **trên VÍ MỚI HOÀN TOÀN** (`0xa58807d0...9b0b84`, khác hẳn ví debug cũ `0x0a740fc6...`) → **loại bỏ giả thuyết "ví cũ bị hỏng do test dở dang"** — đây là bug hệ thống thật, tái lập được, không phải trạng thái rác của 1 ví cụ thể.
> **CHƯA rõ nguyên nhân của lần Forbidden thứ 4 này.** Giả thuyết mạnh nhất CHƯA kiểm chứng: `refreshSession()` (`src/circle.js` dòng ~94) — `const email = localStorage.getItem('ez_email'); if (!email) return fallback` — user Google KHÔNG BAO GIỜ có `ez_email` (chỉ `EnterEmail.jsx` mới set biến này) → `refreshSession()` LUÔN LUÔN trả về token CŨ (không thật sự refresh) cho mọi user Google, kể cả khi gọi "Đổi PIN". Nếu Circle yêu cầu token đủ mới/đủ quyền cho riêng endpoint PIN, đây có thể là nguyên nhân — **CHƯA XÁC NHẬN, cần điều tra tiếp.**
> **Đầu mối để điều tra tiếp:** `circle.js` hàm `resetPinChallenge` đã có `console.error('[resetPinChallenge]', data.error, data.detail)` (thêm ở commit `2363231`) — mở DevTools Console lúc bấm "Đổi PIN" sẽ thấy **object `detail` đầy đủ** Circle trả về (có thể có `code` số cụ thể) — **CHƯA có ai đọc log này**, chỉ mới đọc dòng chữ "Forbidden" hiện trên UI. Đây là việc ĐẦU TIÊN cần làm ở phiên sau: lấy nguyên văn `detail` object từ console.
> **File liên quan:** `functions/api/wallet.js` (endpoint proxy, action `resetPin`), `src/circle.js` (`resetPinChallenge`, `refreshSession`), `src/screens/Security.jsx` (`handleResetPin`, nơi gọi).
> **Việc khác đã xong trong session này (không liên quan PIN):**
> - HomeReceive.jsx: bỏ slogan "Cho người khác quét..." thay bằng địa chỉ ví rút gọn + nút copy riêng (icon check/copy).
> - NotifArea.jsx: sửa bug warning (hết USDC) đè mất Hint — đưa vào chung 1 stack đúng thứ tự ưu tiên; sửa bug scroll bị "kẹt giữa" khi warning xuất hiện sau (async) — dependency effect đổi từ object thô sang `!!warning` + `hints.length` (nguyên thủy, ổn định) để không kéo tụt scroll mỗi lần cha re-render không liên quan.
> - Scrollbar: đổi phong cách theo lựa chọn user ("tối giản, gần như ẩn") — 3px, `--color-faint` lúc nghỉ, `--color-muted` lúc hover.
> - Xác nhận: "Login email" hiện `…` cho user Google là ĐÚNG THIẾT KẾ hiện tại (không phải bug) — Google login không có bước lấy email từ Google trả về app, chỉ có `userToken`/`encryptionKey`. Muốn hiện email thật cần tích hợp thêm Google Identity Services để lấy profile — CHƯA làm, việc riêng nếu được yêu cầu.
> **User bực (nguyên văn: "tài khoản nào cũng thế thôi, bạn dỏm")** — đã yêu cầu dừng đoán/sửa thêm, note lại toàn bộ để chuyển model sang Opus xử lý tiếp.
> **Session 10 (2026-07-03, Opus) — Đổi PIN "Forbidden": TÁI HIỆN BẰNG GỌI CIRCLE API THẬT (hết đoán):**
> - **Google login ĐÃ CHẠY trên deploy** (user vào được app, có ví SSO). UX redirect chậm vài giây = bản chất OAuth, chưa tối ưu.
> - **Bằng chứng thật (script node gọi Circle bằng API key local, 2026-07-03):** `GET /users` cho thấy user Google có `authMode: "SSO"` (userId = UUID Circle tự sinh), user email `authMode: "PIN"`. Với user email: mint token qua `/users/token` OK, **`PUT /user/pin` → 201 challengeId, `POST /user/pin/restore` → 201** — endpoint/key/method đều đúng. Với user SSO: **`/users/token` bị từ chối "API parameter invalid"** → token SSO CHỈ có từ `performLogin` hoặc `POST /users/token/refresh` (refreshToken).
> - **3 endpoint PIN (verify bằng gọi thật + API reference):** `POST /user/pin` = đặt lần đầu · `PUT /user/pin` = ĐỔI PIN (challenge bắt nhập PIN CŨ → tự xác thực) · `POST /user/pin/restore` = QUÊN PIN qua câu hỏi bảo mật. **Session 9 sửa PUT→POST là đọc nhầm docs** (create ≠ update) — PUT mới đúng cho "Đổi PIN".
> - **Fix đã push:** (1) `920dc9e` — Login.jsx LƯU `refreshToken` + `oAuthInfo.socialUserInfo.email` (trước đây VỨT sạch — SocialLoginResult có sẵn); `ez_google_email` (hiển thị, KHÔNG ghi vào `ez_email`); `refreshSession()` nhánh Google = `POST /v1/w3s/users/token/refresh` (body `{idempotencyKey, refreshToken, deviceId}`, header X-User-Token; qua action `refreshSocial` trong session.js; rotate refreshToken sau mỗi lần). Fix gốc userToken 60' cho user Google (gửi tiền + PIN). (2) `080cf7d` — resetPin quay lại `PUT /user/pin`; `circleReq` trả kèm HTTP status; lỗi hiện NGUYÊN VĂN `message (HTTP xxx, code yyy)`. (3) scrollbar `.scroll-thin` ẨN HẲN (user chê); map lỗi Google login 155140 → giải thích redirect URI (`c1def90`).
> - **Giả thuyết chưa kiểm chứng được từ máy (không có token SSO sống):** restore = bypass PIN nên Circle chặn cho SSO (403), còn PUT (đổi PIN, cần PIN cũ) sẽ được phép. Tổ hợp **PUT + token SSO tươi** chưa từng được thử trước fix này.
> - **KẾT QUẢ TEST (user):** PUT /user/pin + token SSO tươi → **VẪN 403 "Forbidden (HTTP 403, code 3)"**. Kết hợp dữ kiện: cả 2 user SSO đều `pinStatus: ENABLED` (PIN CÓ TỒN TẠI — đặt lúc onboarding ví đầu; login lại không có bước PIN vì ví đã có → user tưởng "không tạo PIN") + cùng call đó cho user email ra 201 → **KẾT LUẬN CHẮC: Circle chặn PIN ops (update/restore) cho user authMode SSO ở tầng platform, không sửa được từ phía app.** Hết đường qua API key.
> - **QUYẾT ĐỊNH (user, 2026-07-03): DISABLE Google login** (`f0a9d12`) — nút Google `disabled: true` trong Login.jsx (hạ tầng cookies/deviceId/refreshToken GIỮ NGUYÊN, bật lại chỉ cần đổi flag); note dưới nút → "Google sign-in is temporarily unavailable"; Security.jsx chặn sớm Đổi PIN cho phiên SSO còn sót ("Not available for Google accounts").
> - **Hướng fix thật sau này (khi được yêu cầu):** bỏ `performLogin` của Circle, tự lấy email qua Google Identity Services → đưa vào luồng email sẵn có (`userId = email`, authMode PIN — full quyền). Được cả: 1 ví chung email/Google + đổi PIN chạy. Đây là thay đổi kiến trúc đã note ở session 8.
