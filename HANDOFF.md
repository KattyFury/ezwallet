# HANDOFF — EZwallet

**Cập nhật:** 2026-06-27
**Repo:** https://github.com/KattyFury/ezwallet
**Local:** `D:\Files\Claude_laptop\Build_on_Arc\ezwallet`
**Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ GitHub `main`)

> App ví stablecoin cho người dùng phổ thông / người già. UX phải đơn giản, rõ ràng, mobile-first. Chỉ hiển thị VND.
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

## Design System — 🔒 KHÓA (2026-06-27)

> Toàn app CHỈ dùng token dưới đây. KHÔNG hardcode px size / mã màu mới.
> Định nghĩa ở `:root` trong `src/index.css`.

**Font:** 100% **Roboto Condensed** (400 / 500 / 700). Không dùng font khác.

**Cỡ chữ (6 bậc duy nhất):**
| Token | px | Dùng cho |
|---|---|---|
| `--fs-amount` | 40 | số tiền lớn: số dư, nhập số gửi, biên lai |
| `--fs-title` | 24 | tiêu đề màn |
| `--fs-body` | 20 | nội dung chính, chữ trên nút |
| `--fs-item` | 18 | item list (tên, dòng chính) |
| `--fs-label` | 16 | label, text phụ, placeholder |
| `--fs-tiny` | 13 | badge / ghi chú rất nhỏ |

**Màu chữ (4 tầng phân cấp):**
| Token | Hex | Dùng cho |
|---|---|---|
| `--color-black` | #000000 | tiêu đề màn + chữ trên nút |
| `--color-content` | #333333 | nội dung chính |
| `--color-muted` | #808080 | nội dung phụ |
| `--color-faint` | #B3B3B3 | super phụ / placeholder |

**Màu chức năng:** `--color-primary #16A34A` (+`-soft #DCFCE7`) · `--color-error #DC2626` · `--color-warning #F59E0B` (+`-soft #FEF3C7`) · `--color-white` · `--color-gray #CCCCCC` (CHỈ border/nền, không làm màu chữ).
**Ngoại lệ:** màu thương hiệu token trong `src/chain.js` (USDC #2775CA, EURC #1A56DB, cirBTC #F7931A) — không phải token UI.
**Số & tiền tệ:** class `.num` (= Roboto Condensed). Tiêu đề màn: class `.screen-title` (= đen).

**Assets:**
- `icon/` — **SVG đơn sắc** (viewBox 100×100, `stroke/fill="currentColor"`, width/height 100%): add, back, check, clock, copy, down, down2 (tam giác đặc — dropdown), download, facebook, globe, google, hint, human, info, left, mail, menu, out, qr, right, scan, share, shield, trade, up. **PNG icon đã bỏ hoàn toàn.**
- `design/` — logo-long, logo-short, PFP, app-icon, pattern* (PNG, không phải icon)
- `public/tokens/` — usdc.png, eurc.png, cirbtc.png (logo token thật, CoinGecko)

**Brand assets (design/, dùng nguyên — KHÔNG ép currentColor):** `logo.svg` (logo màn Login), `icon.svg` (favicon vuông, → `public/icon.svg`), `pfp.svg` (app-icon tròn Apple/Android, → `public/pfp.svg`). index.html: favicon = `/icon.svg`, apple-touch-icon = `/pfp.svg`. ⚠️ **pfp/app-icon nên nền TRẮNG đặc, KHÔNG transparent** (iOS hiện nền đen sau transparent); apple-touch-icon lý tưởng là PNG 180×180 (SVG iOS hỗ trợ kém — cân nhắc export PNG sau). `x.svg` = dấu X (nút xóa Contacts/Kho QR).

**Onboarding sau tạo ví (CHƯA làm, đã chốt LÀM):** màn chọn ngôn ngữ/tiền tệ mặc định + hướng dẫn sử dụng ngắn cho người già — thêm vào flow sau EnterEmail tạo ví lần đầu.

**Icon system:** dùng `<Icon name="..." size={} color={} />` ([src/components/Icon.jsx](src/components/Icon.jsx)) — nhúng SVG qua `?raw` + `currentColor` → recolor bằng token. Thêm icon mới: bỏ SVG vào `icon/`, chuẩn hóa `stroke/fill="black"→currentColor` + `width/height 100%→`, rồi import vào Icon.jsx. KHÔNG dùng emoji (iOS render icon Apple xấu).

---

## Layout Rules (quan trọng)

- **Lưới 10 hàng** theo chiều cao màn (`.screen` grid-template-rows: repeat(10,1fr), height 100dvh, padding 0 15px)
- **Sub-screen:** hàng 1 = tiêu đề (center, không line xám ngăn cách), hàng 10 = action buttons
- **4 màn chính:** nav bar ở hàng 10
- **Row 10:** 1 nút = `row10-single` (width 2/3); 2 nút = trái phụ trắng / phải chính xanh. (Lưu ý: `row10-dual` chiếm grid-row 9/11 — KHÔNG dùng chung màn có numpad.)
- **Numpad:** PIN/Swap dùng `row-7-9`. SendAmount/CreateQR: numpad đúng **2.5 hàng (7,8,nửa 9)** + nút ở ranh giới 9/10 — bằng `gridRow: '7/11'` flex `2.5` (numpad) / `1.5` (nút). KHÔNG để numpad lấn hàng 6.
- **⚠ Input text (email, địa chỉ ví, tên, ảnh) PHẢI ở hàng 1–4 hoặc trong popup neo nửa trên.** Bàn phím iPhone che ~1/2 dưới (hàng 5–10). Popup form (vd thêm danh bạ) dùng overlay `align-items: flex-start` + paddingTop để nằm vùng trên.
- **Không dùng line xám ngăn cách** (border-bottom) ở header/list — đã bỏ toàn bộ.

---

## Trạng thái màn hình (cập nhật 2026-06-27, đợt UI lớn)

- **Số dư (BalanceHeader, dùng chung HomeSend/HomeReceive/Menu):** số căn giữa tuyệt đối (--fs-amount, Condensed), "VND" treo phải absolute + căn giữa dọc. Component `src/components/BalanceHeader.jsx`, hàng 1-2.
- **NavBar:** tab active = **vạch xanh lá** trên đỉnh (width 70%, cao 5px, bo dưới) + icon/chữ đen; tab khác xám.
- **Login:** Email (active, icon mail SVG) / Google (disabled). Facebook gỡ.
- **HomeSend:** BalanceHeader h1-2; list token h3-5 (logo thật + số token **bold** + check xanh + VND **regular** xám); hint h7-8 (label đậm – mô tả xám, en-dash); actions h9 (Danh bạ/Quét QR/Dán để gửi); nav h10.
- **SendAmount:** h1 tiêu đề / h2 "Gửi cho:" (tra **tên danh bạ** theo địa chỉ) / h3-4 số **căn giữa tuyệt đối** + **chip `[VND ▼]`** (down2) đổi tiền tệ (VND/USDC/EURC, popup nửa trên) / h5 memo "Nội dung chuyển khoản (không bắt buộc)" / **numpad đúng 2.5 hàng (7,8,nửa 9)** + nút ở ranh giới 9/10 (gridRow 7/11, flex 2.5/1.5). Khả dụng hiển thị theo tiền tệ đang chọn.
- **SendConfirm:** quy đổi theo `currency` (VND→USDC, USDC→USDC, EURC→EURC token); phí gas thật; nút đỏ "Xác nhận · PIN".
- **HomeReceive:** BalanceHeader; QR h3-5; hint "QR mặc định/Chia sẻ/Custom QR/Kho QR"; actions Chia sẻ (chỉ địa chỉ) / Custom QR / **Kho QR**.
- **CreateQR:** **đồng bộ SendAmount** (số to + VND + numpad 2.5 + nút). **ShowQR:** QR giữa + tự lưu vào Kho QR + 2 nút h9-10 [Lưu vào kho ảnh] (tải PNG) / [Quay lại]. **SavedQRList (Kho QR):** lưới 3 cột (tối đa 9 ô h2-7, scroll), bấm → ShowQR.
- **TxHistory:** hiện **tên danh bạ** nếu lưu; bấm dòng → **popup chi tiết** (loại/người/địa chỉ/số tiền/quy đổi/thời gian/memo nếu có/link ArcScan); nút lọc "Chỉ gửi"/"Chỉ nhận" (active xanh); "Quay lại" xanh.
- **MenuScreen:** Rút (trắng, khóa, trái) / Nạp (xanh, phải); menu items icon SVG (clock/globe/shield/info).
- **Sub-screen template ĐỒNG BỘ (Language/Security/About):** header screen-title h1; nội dung gridRow 2/9 dùng **hàng `.menu-item`** (label trái fs-body, value/chevron phải, divider rgba nhạt); nút **Quay lại = primary xanh** row10-single. Value hiển thị trong **box viền** (Language) hoặc text muted (Security/About). Chevron = **right2.svg** (▶ đặc). Đăng xuất = icon `out` đỏ.
- **Language:** Ngôn ngữ (Việt/Anh/TBN/Trung/Nhật) + Tiền tệ (VND/USDC/EURC/CNY/JPY, ưu tiên stablecoin) → popup chọn.
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

**⚠️ Đã build, CHƯA verify on-chain:**
- **Memo on-chain (Arc Transaction Memos):** khi user nhập nội dung → `send.js` route qua Memo contract `memo(address,bytes,bytes32,bytes)` thay vì transfer thẳng (transferData encode thủ công, memoId random bytes32, memoData = UTF-8→hex). Cần test deployed: nếu Circle reject `bytes`/`bytes32` trong abiParameters thì chỉnh. Đường transfer-không-memo vẫn là đường đã verify.

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
- EURC trên CoinGecko = id `euro-coin`; USDC = `usd-coin`; cirBTC dùng `bitcoin`.

---

## Cần rà đồng bộ (audit UI — chưa làm)

- **Swap** vẫn giao diện cũ (đang disable): còn ký tự unicode `▾`/`⇅`, màu/cỡ chưa theo token, layout chưa giống SendAmount. Khi bật lại swap phải làm lại theo chuẩn.
- **EnterPin / CreatePin / PinLocked / ForgotPin / Recovery / ComingSoon** — chưa rà đợt này, có thể lệch token/màu/nút.
- **Bottom button không đồng nhất:** SendAmount/CreateQR dùng flex 2.5/1.5; TxHistory 3 nút; còn lại row10-single/dual. Cân nhắc 1 chuẩn.
- Các màn còn ký tự `›`/`×` text (Contacts xóa ×, ...) — cân nhắc thay icon.

## Pending / TODO

1. **Test memo on-chain trên deployed** — verify Memo contract chạy với User-Controlled Wallet (xem phần "đã build chưa verify").
2. **#4 Trạng thái giao dịch thật** — sau khi ký PIN, poll txHash → "✓ đã lên blockchain" (Arc finality <1s). Hiện receipt báo success ngay sau challenge.
3. **#5 Batch (Multicall3From `0x522f...47D0`)** — gửi nhiều người 1 lần, hoặc gộp approve+swap 1 lần ký PIN.
4. Send: mới chỉ USDC — chưa chọn token khác.
5. Fix manifest icon `design/app-icon.png` ("invalid image", cosmetic).
6. Account Recovery (Reset PIN đã có).
7. Khi Circle phản hồi → bật lại Google/Facebook + Swap execute.

> Đã xong session này: memo integration, tỷ giá VND live, số dư+phí thật ở SendAmount/SendConfirm, jsQR (iOS), fix MOCK_ADDR ở Custom/Saved QR, fix layout 3/4-trái, đồng bộ cụm số dư 3 màn, avatar cropper danh bạ, share chỉ địa chỉ.
