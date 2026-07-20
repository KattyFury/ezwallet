# HANDOFF — EZwallet

**Cập nhật:** 2026-07-18 · **Repo:** https://github.com/KattyFury/ezwallet · **Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ `main`) · **Local:** `D:\Files\Claude\build_on_arc\ezwallet`

> **Ví stablecoin cho người dùng phổ thông / người già.** UX đơn giản, mobile-first. **Đã chạm mốc user hài lòng (07-18): toàn bộ luồng — login, PIN, gửi, swap tiền thật — user tự test trên deploy, chạy mượt.**
> ĐẦU MỖI PHIÊN đọc CẢ `HANDOFF.md` (file này) + `CLAUDE.md` (cách làm việc với user).
> Nguyên tắc: **chạy tech chuẩn Circle/Arc, đọc docs + verify bằng API/eth_call thật trước khi làm, KHÔNG đoán.**
> Lịch sử chi tiết từng phiên: `git log` (mô tả commit ghi đủ) — file này chỉ giữ TRẠNG THÁI CUỐI + luật + bài học.

Tài nguyên AI: Circle [skills](https://developers.circle.com/ai/skills) · [mcp](https://developers.circle.com/ai/mcp) — Arc [skills](https://docs.arc.io/ai/skills) · [mcp](https://docs.arc.io/ai/mcp). Local đã có: Circle Skill (`circle:*`), Circle MCP (`mcp__circle__*`), Arc MCP (`mcp__arc-docs__*`).

---

## 1. Stack & hạ tầng

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Ví:** Circle **User-Controlled Wallet** (MPC EOA, ký bằng **PIN** qua `@circle-fin/w3s-pw-web-sdk`, nạp lười — xem gotcha mục 7).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balance/giá:** on-chain bằng viem (`src/chain.js`, Multicall3 1 request) + giá CoinGecko (cache 60s). **Swap:** Circle Stablecoin Kit REST (mục 4). **QR:** `qrcode.react` (tạo) + `jsqr` (quét).
- **Secrets** (`.env.txt` + `.dev.vars` gitignored, set trên Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit). **ID hardcode** (không phải secret): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com`.
- **Dev local (Windows — KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):** Terminal 1 `node dev-server.js` (proxy 8787, import trực tiếp `functions/api/*`) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **Circle SDK KHÔNG chạy localhost** → luồng PIN/login/swap chỉ test được trên deploy.
- **MOCK MODE — `npm run mock` (canh UI/flow local, KHÔNG cần Circle):** `src/mock.js` + cờ `VITE_MOCK=1`. Bỏ qua Login/PIN → vào thẳng HomeSend với ví ảo + số dư ảo (`MOCK_AMOUNTS`); chặn `/api/*` + ArcScan trả data giả; Gửi/Swap giả lập thành công. KHÔNG vào production. Verify UI = Playwright 390×844 trên mock.

**Token trên Arc Testnet:**
| Token | Address | Dec | CoinGecko |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | `usd-coin` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | `euro-coin` |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | `bitcoin` |

**Arc contracts (predeployed, precompile giữ msg.sender):**
| Contract | Address | Dùng cho |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | gửi tiền kèm lời nhắn (Memo event) |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batch approve+swap 1 tx/1 PIN (từ EOA, allowFailure=false, KHÔNG value) |
| Swap Adapter | `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b` | settlement swap của Circle (mục 4) |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | đọc gộp balance (khai trong `defineChain`) |

---

## 2. Mô hình tiền & hiển thị (user chốt — đừng hiểu sai lại)

- **Token LUÔN hiện TÊN THẬT** (USDC/EURC/cirBTC) ở danh sách token, lịch sử (dòng phụ), biên lai.
- **"Tiền hiển thị"** = lớp quy đổi qua tỷ giá fetch (KHÔNG swap thật): `ez_currency` ∈ {USDC, EURC}, mặc định USDC. Ký hiệu USDC→`$`, EURC→`€`. **Base quy đổi = USD, USDC ghim $1** (`getDisplayRates()` trả USD/1 đơn vị; `displayNum(usd,cur,rates)=usd/rate[cur]`).
- **Màn Gửi nhập theo "USD"** (nhãn thân thiện) = gửi USDC 1:1; chọn token thật qua chip.
- **Format tiền MỘT CHUỖI MỘT STYLE:** `fmtMoney()` → `$2` / `€2` / `2 USDC`. CẤM tách số đậm + ký hiệu thường.
- **Chừa phí:** `GAS_RESERVE_USDC = 1` — khả dụng USDC luôn trừ 1 (gas Arc trả bằng USDC).
- **App KHOÁ English:** `i18n.js` `LANG='en'` cứng (Circle SDK chỉ English). Màn Language hiện VI/中文 + CNY/VND nhưng disabled. Hạ tầng i18n giữ nguyên — mở lại = cho `LANG` đọc localStorage + bỏ `locked`.

---

## 3. Tính năng (trạng thái cuối — ✅ chạy thật / verify on-chain hoặc trên deploy)

- **Email login → tạo ví** (userId=email, authMode PIN) + câu hỏi bảo mật. **Khoá mở ví:** mở lại app → `PinGate` tự bật PIN Circle (ký message rỗng, không gas). Google login **ẩn khỏi UI** (hạ tầng giữ, gồm dep `cookies-next` + `refreshSocialToken`). Email OTP đã dựng nhưng TẮT (`EMAIL_OTP_ENABLED=false`).
- **Gửi tiền** USDC/EURC/cirBTC (`send.js`): transfer thường hoặc qua Memo contract khi có lời nhắn (UTF-8 ok). `idempotencyKey` chống gửi trùng.
- **Swap** USDC↔EURC↔cirBTC — BẬT, verify eth_simulateV1 đạt + **user test TIỀN THẬT trên deploy OK (07-18)**. Màn Swap = thanh trượt % (5 mốc 0/25/50/75/100, nam châm ±2%) + chip gợi ý số chẵn BỘ BA sàn·sàn+0.5·trần (`roundHint.js`, test `node test/roundHint.test.mjs` 17/17).
- **Balance on-chain + tỷ giá live** có cache (`_balCache`/`_ratesCache`) — chuyển màn hiện số cũ ngay, fetch nền cập nhật.
- **TxHistory** (ArcScan + memo event, box xám, nhóm theo ngày), **Contacts** (per-account, avatar cropper, box xám), **QR** (tạo/quét/kho), **thông báo in-app** (NotifArea), **biên lai** (canvas → Photos qua Web Share), per-account store (`store.js`).
- **Đổi PIN** (email user): `PUT /v1/w3s/user/pin` ✅. **`refreshSession()`** gọi TRƯỚC mọi thao tác PIN (userToken sống 60').
- **ĐÃ XOÁ 07-18 (dọn code chết):** màn `Onboarding` + `ComingSoon` (mất đường điều hướng tới từ lâu — cần lại thì lấy từ git history), ~30 class CSS mồ côi (modal-*, pin-dot*, text-*, token-item…), key `ez_onboarded`. 3 icon để dành user chốt GIỮ: `back.svg`, `facebook.svg`, `swap.svg`.

---

## 4. Swap — cách hoạt động (⚠️ đụng tiền thật, đọc kỹ)

**Luồng (`functions/api/_swapCore.js` — lõi dùng chung swap.js + dev-server):**
1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → trả **1 INTENT CÓ CHỮ KÝ**. ⚠️ `amount` = **SỐ NGUYÊN BASE UNITS** (decimal → 400; quá nhỏ → 422 `331001` "No route").
2. Nộp intent cho **Swap Adapter**: `execute(executionParams, tokenInputs, signature)` + `approve(tokenIn→adapter)` trước, batch `[approve, execute]` qua **Multicall3From = 1 PIN**. ABI copy nguyên từ source SDK; encode bằng **viem** (tuple lồng dynamic bytes — hand-roll dễ sai offset → mất tiền).
3. Adapter kéo token vào, chạy route (provider bên thứ ba — thực đo `lifi`), **GOM output ghi có cho ví** (settlement).

**⚠️ ĐỪNG LẶP sai lầm cũ:** KHÔNG bóc `instructions[]` chạy tay — bỏ qua settlement → output **KẸT Ở ADAPTER, MẤT TIỀN** (tx vẫn status=1). Mọi thay đổi swap PHẢI verify `node verify-swap.mjs <ví> EURC USDC 2` (eth_simulateV1, không tốn tiền) — chỉ ship khi số dư tokenOut TĂNG đúng.

---

## 5. Design System (`src/index.css` :root) — TRẠNG THÁI CUỐI

**Font: CHỈ 1 FONT = BARLOW** toàn app (4 biến `--font-*` đều trỏ Barlow, giữ tên cũ để khỏi sửa JSX). Load weights `300;400;500;600`.
**Đậm nhạt:** `--fw-light 300` = SỐ HERO to (số dư, số tiền — user chốt 07-17f GIỮ Light, đừng bold) · `400` body · `500` nút/item/label/giá trị-quan-trọng · `600` tiêu đề + active. **KHÔNG 700** (`--fw-bold` khoá = 600).
**Cỡ chữ + TÊN USER GỌI:** amount 52 · huge 38 ("siêu to", số màn Swap) · title 30 ("to") · num 24 · md-lg 21 ("vừa-to" = BUTTON + slogan + chữ nhập) · body 19 ("vừa" = nội dung + NAVBAR) · item 17 ("vừa-nhỏ") · label 15 ("nhỏ") · tiny 13 ("mini"). User gọi tên nào tra bảng này.
**Icon:** thang `--is-*` ghép 1-1 với `--fs-*` — icon đứng cạnh chữ nào dùng size cỡ đó. Icon ĐỨNG MỘT MÌNH mới dùng số cứng (SendReceipt check 76, avatar Contacts, nút xoá QR, nút đảo Swap, numpad erase). Icon mới BẮT BUỘC `width/height="100%"` + `stroke="currentColor"`.

**Gradient (user chốt 07-17d, dọc nhạt trên → đậm dưới, cả 2 đầu màu đặc — 0%/100% là VỊ TRÍ neo, đừng nói "trên 0%" gây hiểu nhầm):**
- Brand: `#0088FF → #0B53BF` (nền `.btn-primary` + `.action-card.primary`)
- Xanh lá `#34C759 → #16A34A` (`.btn-success`) · Đỏ `#FF4D51 → #DC2626` (`.btn-error`) · Vàng `#FFCC00 → #F59E0B` (token giữ, class btn-warning đã bỏ vì chưa dùng — thêm lại thì CHỮ ĐEN)

**Màu semantic:**
| Ý nghĩa | Token | Hex |
|---|---|---|
| Thương hiệu (CTA, nav active, icon hành động/dẫn đầu, GỬI) | `--color-brand`/`--color-info` | `#0B53BF` (+soft `#E2EAF7`) |
| Nhận/PNL/success | `--color-primary` | `#16A34A` (+soft `#DCFCE7`) |
| Mất tiền/lỗi | `--color-error` | `#DC2626` (+soft `#FEE2E2`) |
| Warning/hint | `--color-warning` | `#F59E0B` (+soft `#FEF3C7`) |
| Chữ phụ (XÁM ĐẬM, 6.0:1 đạt AA) | `--color-muted` | `#636366` |
| Viền/divider (KHÔNG làm nền mảng, KHÔNG làm màu chữ) | `--color-gray` | `#E5E5EA` |
| **NỀN BOX/CARD** | `--color-surface` | `#F2F2F7` |

**LUẬT BOX (linh hồn thiết kế — chuẩn lấy từ màn Swap):**
- **Tách khối bằng NỀN surface + border:none + bo 20 (card lớn) / 8-12 (chip, ô nhập)** — KHÔNG viền xám trên nền trắng.
- **Phần tử BẤM ĐƯỢC nằm TRONG box xám → TRẮNG + VIỀN XÁM 1.5px** (chip token Swap, nút Hold, chip Language, avatar placeholder Contacts...). Chữ trong nút đó vẫn theo vai trò (Hold = muted).
- Box xám đang phủ: 2 card + Rate/Fee màn Swap · vùng token HomeSend (hàng 3→5.5, `height calc(100%+5dvh)`) · list Contacts/TxHistory (row 2-8) · Language (2-3) · Security (2-4) · About (2-8) · mọi ô nhập (`.address-input`, `.memo-row`; lỗi = inset shadow đỏ).
- Thông báo/hint = **nền màu nhạt KHÔNG viền, chữ ĐEN**, icon CENTER-TRÁI cả khối (khối 3 dòng icon ngang dòng 2). Hint dùng icon `hint.svg` màu warning; format chữ `Label: desc`.
- Toggle/lọc BẬT = nền trắng + viền brand + chữ brand. Nút chính 2/3 bề ngang, phụ 1/2.
- KHÔNG em-dash (dùng `–`), KHÔNG emoji. Scrollbar: `.scroll-thin`/`.scroll-hidden`.

**Brand assets:** `design/logo.svg` (Login + biên lai, viewBox 1160×380) · `design/logo-icon.svg` (để dành) · favicon `/fav_icon.png` · app icon `/icon.png` 512×512.

> 🎨 **Design: user tự làm UI, icon user tự vẽ (viewBox 100, stroke 10).** Đừng tự redesign; chờ user đưa hướng rồi port. Mốc thẩm mỹ: Coinbase Wallet — số to nhạt, tile nền nhạt, nhiều khoảng thở.

---

## 6. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding `0 20px`, `position:relative`). Sub-screen: hàng 1 tiêu đề, nút ở `.row10-single`/`.row10-dual` (absolute top 85dvh, tự ép `grid-row:auto`). 4 màn chính: NavBar hàng 10 full-bleed, chữ+icon `--fs/is-body 19`.
- **⚠️ `.screen` PHẢI có `grid-template-columns: minmax(0,1fr)`** — bỏ là 1 chuỗi `nowrap` dài phình cột, lệch cả màn. **Flex item chứa chữ nowrap PHẢI `minWidth:0`.**
- **Numpad = hàng 6.5–8.5** (`gridRow 6/9`, spacer 0.5 + Numpad 2.5), nút Back/Continue riêng ở `.row10-dual` (SendAmount, CreateQR). **Riêng Swap (07-20):** numpad KHÔNG nằm trong lưới — bấm SỐ TIỀN card "You pay" → bottom-sheet `.sheet-overlay/.sheet` trượt từ dưới lên (như PIN), gõ live cập nhật số + pct + estimate, "Done"/nền tối đóng; slider + chip gợi ý giữ nguyên.
- **TxHistory LUÔN hiển thị ĐẦY ĐỦ lịch sử** (user chốt 07-20, sửa hiểu nhầm 07-19: từng cắt còn 24h + hint cách dùng → SAI). Chỉ THÔNG BÁO (NotifArea) mới là thứ "trong ngày"; lịch sử là sổ đối soát, không cắt, KHÔNG hint trong đó.
- **Chevron `right2` (hàng đi tiếp) = `--color-brand`** (07-20, trước là `--color-faint` nhìn như disabled); `--color-faint` chỉ còn cho placeholder/icon ẩn. Ô nhập text chuẩn = cao 52 + `--fs-md-lg` (email/memo/paste address đã đồng bộ).
- **Input text ở hàng 1-4 hoặc popup neo nửa trên** (`.popup-card` tâm 30dvh) — bàn phím iPhone che nửa dưới. Không autoFocus trong popup. **Khoá cuộn trang** (`App.jsx` listener) — ĐỪNG xoá.
- **Vị trí 55dvh = "dòng phụ giữa màn"** dùng chung: nút Hold-to-show (Gửi) và dòng địa chỉ+copy (Nhận) neo absolute top 55% → qua lại tab không nhảy. QR màn Nhận = `min(30dvh, 78vw)` chiếm hàng 3-6.
- **HomeSend:** h1-2 số dư · h3-5.5 box token · h7-8 NotifArea · h9 3 action-card · h10 NavBar. **QRScanner:** cụm ô quét + 2 dòng chú thích căn tâm hàng 1-6.
- **TxHistory row:** trái `[icon] Sent/Received` + giờ + [Add to Contacts] + Note; phải `±$` (đỏ/xanh lá) + token thật xám. **KHÔNG kẻ line xám ngăn cách** trong list/box (trừ NavBar + hàng Rate/Fee).
- **`<button>/<input>` phải kế thừa font** — đã có rule global `font-family: inherit`, đừng xoá.

---

## 7. Gotchas Circle/Arc (xương máu — giữ vĩnh viễn)

**Circle W3S:**
- **Màn PIN = iframe `pw-auth.circle.com` (cross-origin):** không sửa được UI, English thuần, **KHÔNG auto-mở bàn phím số được** (browser cấm focus xuyên origin, iOS bắt chạm trực tiếp — user hỏi rồi, ĐỪNG đào lại).
- **`getSDK()` là ASYNC (nạp lười 740KB SDK+polyfill)** — mọi chỗ gọi PHẢI `await getSDK()`. Quên await → PIN chết câm. Check: `grep -rn "getSDK()" src/ | grep -v await` phải RỖNG.
- **userToken sống 60'** → `refreshSession()` trước MỌI thao tác PIN.
- **Sai PIN KHÔNG đóng iframe** — `executeChallenge` BỎ QUA `RETRYABLE_CODES` (155112/155703/155704/155115/155705), chỉ settle khi success/lỗi terminal. `155701` = user tự huỷ → im lặng.
- 3 endpoint PIN: `POST /user/pin` đặt · `PUT` đổi · `POST /user/pin/restore` quên. User SSO/OTP không có PIN → 403.
- `contractExecution`: field phẳng `feeLevel:'MEDIUM'`, nhận `abiFunctionSignature`+`abiParameters` hoặc `callData`. Lỗi Circle: trả nguyên văn `message (HTTP status, code)`; dò `e?.message || e?.error?.message`.
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.

**Arc / Stablecoin Kit:**
- **RPC công cộng RATE LIMIT chặt (HTTP 429):** đọc nhiều thứ PHẢI gộp Multicall3 (`publicClient.multicall()` tự dùng); retry giãn ≥600ms; retry dày = tự đâm vào 429 vĩnh viễn (bài học 07-17b). **Đọc hỏng → hiện `…`, KHÔNG vẽ 0.**
- Gas trả bằng USDC (nội bộ 18 decimals), rất rẻ — hiện `< $0.01` thay vì `$0.00`.
- Kit `amount` = base units (mục 4).

**PWA (thêm vào màn hình chính iOS):**
- **Dải xám trên cùng ở status bar = nền `body`.** iOS standalone PWA thiếu `viewport-fit=cover` (index.html) nên nội dung bó trong safe-area; vùng status bar (ngoài viewport) bị iOS lấp bằng **màu nền `body`**. Trước để `--color-gray` → lộ dải xám. Fix 07-19: `body background = --color-white` (index.css) → hoà trắng với `.screen`. **ĐỪNG đổi body bg về xám lại.** Muốn full-bleed kiểu native thì thêm `viewport-fit=cover` + `env(safe-area-inset-*)` padding cho `.screen` (đụng lưới 10 hàng — user đã chọn KHÔNG làm, giữ nền trắng).
- iOS cache meta/manifest lúc "Add to Home Screen" → đổi manifest/meta không ăn cho tới khi **xoá app + Add lại** (đổi CSS như trên thì ăn ngay lần mở kế).

**Khác:**
- iOS Safari: không BarcodeDetector → jsQR; Web Share API lưu Photos; không dùng `clipboard.readText()` (dialog phiền).
- Màn không có NotifArea → lỗi hiện qua `ErrorToast` (truyền `sendError` qua navigate).
- Sign-out chỉ xoá session keys, GIỮ `ez_contacts/ez_saved_qrs/ez_lang/ez_currency`.

---

## 8. localStorage keys

**Session:** `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (email login), `ez_refresh_token`/`ez_google_email`/`ez_google_deviceId`/`ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`, `ez_notified_hashes`, `ez_faucet_pending`. `sessionStorage.ez_pin_ok` = cờ mở khoá phiên.
**Bền:** `ez_contacts`, `ez_saved_qrs`, `ez_lang`, `ez_currency`.

---

## 9. Việc tiếp theo

> ✅ **07-18 user XÁC NHẬN TRÊN DEPLOY: mọi thứ chạy mượt — PIN (sau đổi `getSDK` async) + swap tiền thật OK.** Không còn việc chặn.

1. **Icon warning `!` nhìn nhỏ hơn icon khác cùng ô** — nguyên nhân: dấu `!` chỉ chiếm ~45/100 viewBox trong vòng tròn. CHỜ USER CHỌN: (a) phóng riêng, (b) user vẽ lại. Icon là bộ user vẽ — hỏi trước.
2. **Icon QR Library mới** — user sẽ tự vẽ (đã gợi ý: 2 thẻ xếp chồng + góc QR, viewBox 100 stroke 10). Vẽ xong thay trong `HomeReceive`.
3. **Trạng thái giao dịch thật** — poll txHash sau gửi → "đã lên blockchain" (swap đã có 2 trạng thái submitted/successful).
4. **Google login làm lại** qua Google Identity Services → đi luồng email (đổi kiến trúc, làm riêng buổi).
5. Batch gửi nhiều người (Multicall3From, encoder sẵn).
6. **Tối ưu bundle:** chunk SDK ~1MB phần lớn là crypto-browserify (polyfill `crypto` trong `vite.config.js`) — thử bỏ `'crypto'` xem SDK còn chạy không, NHƯNG chỉ test được trên deploy → làm riêng phiên, đừng gộp việc khác.

---

## 10. Bài học chính (đúc kết — chi tiết trong git log)

- **Swap phải qua `adapter.execute` với intent có chữ ký** — bóc instructions chạy tay = MẤT TIỀN (đã dính).
- **Retry dày với RPC rate-limit = tự giết mình** — gộp Multicall + backoff dài; số chưa chắc thì hiện `…` đừng vẽ 0.
- **Circle iframe giữ modal khi user nhập sai** — reject sớm promise = user nhập đúng lại nhưng kết quả rơi vào hư không.
- **Grid không khai cột / flex thiếu minWidth:0** = 1 chuỗi dài phá layout cả màn.
- **"Cải tiến" không verify từng bước** (retry, catch-về-0) từng gây regression nặng hơn lỗi gốc — mọi thay đổi UI verify Playwright mock, mọi thay đổi swap verify eth_simulateV1.
