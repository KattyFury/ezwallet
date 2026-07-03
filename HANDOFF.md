# HANDOFF — EZwallet

**Cập nhật:** 2026-07-03 (viết lại toàn bộ, session 12)
**Repo:** https://github.com/KattyFury/ezwallet · **Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ `main`)
**Local:** `D:\Files\Claude_laptop\Build_on_Arc\ezwallet`

> Ví stablecoin cho người dùng phổ thông / người già. UX đơn giản, mobile-first.
> Nguyên tắc: **CHẠY TECH CHUẨN của Circle/Arc, đọc docs + verify bằng gọi API thật trước khi làm, không đoán.**

---

## 1. Stack & hạ tầng

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Ví:** Circle **User-Controlled Wallet** (MPC EOA, ký bằng PIN qua `@circle-fin/w3s-pw-web-sdk` 1.1.11).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balance/giá:** đọc on-chain bằng viem (`src/chain.js`) + giá CoinGecko (cache 60s, có fallback). **Swap:** Circle Stablecoin Kit REST. **QR:** `qrcode.react` (tạo) + `jsqr` (quét — iOS không có BarcodeDetector).
- **Secrets** (`.env.txt` + `.dev.vars` gitignored; set trên Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit).
- **ID hardcode** (không phải secret): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com` (`src/circle.js`, `Login.jsx`).
- **Dev local (Windows — KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):** Terminal 1 `node dev-server.js` (proxy, port 8787) + Terminal 2 `npm run dev` (Vite 5173, proxy `/api`→8787). ⚠️ **dev-server.js phải đồng bộ logic với functions/api/** khi sửa server.
- ⚠️ **Circle SDK KHÔNG chạy localhost** (thiếu crypto polyfill) → mọi luồng cần PIN/login chỉ test được trên deploy.
- **Tra docs Arc:** MCP `arc-docs`. Circle: developers.circle.com (đọc API reference thật, đừng tin summary).

**Token trên Arc Testnet:**
| Token | Address | Decimals | CoinGecko |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | `usd-coin` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | `euro-coin` |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | `bitcoin` |

**Arc Transaction Extensions (predeployed, giữ msg.sender qua CallFrom precompile):**
| Contract | Address | Dùng cho |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | gửi tiền kèm lời nhắn — `memo(address,bytes,bytes32,bytes)`, emit `Memo` event. ✅ verified on-chain |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batch swap approve+swap 1 tx — `aggregate3((address,bool,bytes)[])` selector `0x82ad56cb`. Gọi từ EOA, allowFailure=false, KHÔNG hỗ trợ value |

---

## 2. Mô hình tiền & hiển thị (user chốt — ĐỪNG hiểu sai lại)

- **Token LUÔN hiện TÊN THẬT** (USDC/EURC/cirBTC) trong danh sách token, lịch sử (dòng phụ), biên lai (dòng Amount).
- **"Tiền hiển thị"** = lớp độc lập quy đổi qua tỷ giá fetch (KHÔNG swap thật): tổng số dư, số quy đổi, phí. `ez_currency` ∈ {USDC, EURC}, mặc định USDC. Ký hiệu thân thiện: USDC→`$`, EURC→`€` (`displaySymbol`).
- **Màn Gửi nhập theo "USD"** (nhãn thân thiện) = gửi USDC 1:1. Chọn được token thật (USDC/EURC/cirBTC) qua chip.
- **Format tiền MỘT CHUỖI MỘT STYLE:** `fmtMoney()` (data.js) → `$2`, `€2`, `2 USDC`. **CẤM** tách "2" đậm + "USD" thường (lệch font = lỗi, user chốt 2026-07-03).
- **Quy đổi phải CÙNG NGUỒN tỷ giá 2 vế** — dùng `getDisplayRates()` (có đủ USDC/EURC/cirBTC/CNY). Trộn `token.vndRate` cache với rates fetch → 1 USDC hiện $0.95 (bug đã sửa).
- **Chừa phí mạng:** `GAS_RESERVE_USDC = 1` + `spendableOf(sym, bal)` (data.js) — khả dụng USDC luôn trừ 1 (gas Arc trả bằng USDC, khách "gửi hết" sẽ kẹt không còn phí). Áp ở SendAmount + Swap. Gas thực tế rất rẻ (<1 cent) nhưng 1 USDC là mức an toàn user chọn.
- **App khóa ENGLISH** (`i18n.js` `LANG='en'` cứng): Circle SDK chỉ có tiếng Anh → khóa toàn app cho đồng nhất. Hạ tầng VI/ZH + `detect()` còn nguyên — mở lại chỉ cần `LANG = detect()`. Chuỗi MỚI cứ hardcode English; key cũ qua `t()`.

---

## 3. Trạng thái tính năng

**✅ Chạy thật (verified on-chain / trên deploy):**
- **Email login** → tạo ví (userId = email, authMode PIN) → PIN + câu hỏi bảo mật qua SDK.
- **Gửi tiền** USDC/EURC/cirBTC — `functions/api/send.js`: transfer thường hoặc qua Memo contract khi có lời nhắn (UTF-8 tiếng Việt ok, verified tx `0xb75b...7e50`). idempotencyKey chống gửi trùng.
- **Session-restore**, balance on-chain + tỷ giá live, TxHistory (ArcScan API + memo từ Memo event), Contacts (per-account, avatar cropper), QR (tạo/quét/kho, jsQR), thông báo in-app (NotifArea, tự hết hạn 2h), biên lai (canvas → Photos qua Web Share API), Onboarding, per-account store (`store.js`).
- **Đổi PIN** (user email): `PUT /v1/w3s/user/pin` → challenge → PIN cũ + PIN mới. ✅ verify bằng gọi API thật.
- **refreshSession()** (`circle.js`): gọi TRƯỚC MỌI thao tác cần PIN — email user tạo token mới qua userId=email; Google user đổi `refreshToken` qua `POST /users/token/refresh` (body `{idempotencyKey, refreshToken, deviceId}` + header X-User-Token).

**🆕 SWAP (build lại session 11-12, CHƯA test on-chain bằng PIN thật):**
- Luồng: Kit `/v1/stablecoinKits/swap` → `instructions[]` → gộp hết vào **1 tx** `Multicall3From.aggregate3` → **1 challenge → 1 lần PIN**. (2 challenge riêng = swap simulate trước khi approve mine → revert — root cause fail cũ.)
- Encoder aggregate3 tự viết trong `functions/api/swap.js` — **verified khớp byte với viem** (3 case).
- ⚠️⚠️ **Kit API nhận `amount` = SỐ NGUYÊN BASE UNITS** ("88.57" → 400 validation; "20" bị hiểu 20/10⁶ token → dust → "No route available" 404). Server quy decimal↔base units 2 chiều (`toBase`/`fromBase`), client chỉ dùng `amountOut` decimal. Verify gọi thật: đủ route 2 chiều USDC↔EURC↔cirBTC với amount đúng.
- Swap quá nhỏ → Kit 422 `code 331001` "insufficient after fees".
- UI: from/icon/to/nút Swap/numpad (numpad đồng bộ vị trí SendAmount, container gridRow 7/10 vì NavBar chiếm 10), picker hiện đủ 3 token (chọn trùng phía kia = tự đảo), Max theo spendable, addNotif sau swap.

**❌ Google login — DISABLED (user chốt 2026-07-03, nút mờ trong Login.jsx `disabled: true`):**
- Login + tạo ví + OAuth redirect ĐÃ CHẠY (fix qua 3 session: cookies persist config qua redirect, `getDeviceId()` thật của SDK, lưu refreshToken).
- **Lý do disable:** Circle CHẶN thao tác PIN cho user SSO ở tầng platform — `PUT /user/pin` trả 403 code 3 với token SSO tươi + pinStatus ENABLED, trong khi CÙNG call đó user email ra 201 (verify bằng gọi API thật). Không sửa được từ phía app.
- Circle coi mỗi phương thức login = 1 userId riêng → ví Google ≠ ví email (docs xác nhận, không nối được).
- **Hướng fix thật khi cần:** bỏ `sdk.performLogin()`, tự lấy email qua Google Identity Services → đi luồng email sẵn có (userId=email, authMode PIN, full quyền) → 1 ví chung + đổi PIN chạy. Thay đổi kiến trúc, làm riêng 1 buổi.
- Hạ tầng giữ nguyên (cookies, deviceId, refreshToken, action `refreshSocial`); bật lại = đổi 1 flag. Security.jsx chặn sớm Đổi PIN cho phiên SSO còn sót.

---

## 4. Design System (`src/index.css` :root)

**Font:** `--font-base` IBM Plex Sans (nội dung, nút, label) · `--font-condensed` **Barlow** (số `.num`, tiền tệ, tiêu đề `.screen-title`). Nhãn nhỏ 12-14px dùng IBM Plex. ĐỪNG đổi full Barlow (đã thử, đã revert).
**Cỡ chữ (mở khóa, scale gợi ý):** `--fs-amount` 40 · `--fs-title` 24 · `--fs-body` 20 · `--fs-item` 18 · `--fs-label` 16 · `--fs-tiny` 13.
**Màu:** đen `#000` (content) · xám `--color-muted #AEAEB2` (phụ/placeholder, CHỈ trên nền trắng) · `--color-gray #E5E5EA` (CHỈ border/nền) · primary `#16A34A` (+`-soft #DCFCE7`) · info `#2563EB` (+soft, = GỬI) · error `#DC2626` (+soft) · warning `#F59E0B` (+soft).

**Quy tắc cứng (user chốt):**
- **KHÔNG em-dash `—`** — dùng en-dash `–`; placeholder rỗng dùng `…`.
- **Thông báo/cảnh báo/hint = nền màu nhạt iOS-style, KHÔNG viền:** Nhận=xanh lá, Gửi=xanh dương, Lỗi=đỏ (icon warning), Cảnh báo=vàng (clickable có underline). Trong box nền màu: chữ FULL ĐEN, phân cấp bằng đậm/nhạt, KHÔNG đen-xám.
- **Nút lọc/toggle BẬT = nền trắng + viền xanh + chữ xanh**, không tô đặc.
- **Icon:** `<Icon name size color />` (`components/Icon.jsx`, SVG `icon/` qua `?raw` + currentColor). KHÔNG emoji. Thêm icon: bỏ SVG vào `icon/`, chuẩn hóa currentColor, import vào Icon.jsx.
- **Scrollbar:** `.scroll-thin` = ẨN HOÀN TOÀN (vẫn cuộn được; mờ dần mép gợi ý còn nội dung).
- Brand: `design/logo.svg` (Login), favicon `/icon.svg`, apple-touch-icon `/pfp.png` (PNG nền trắng — iOS không nhận SVG/transparent).

---

## 5. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding 0 15px). Sub-screen: hàng 1 tiêu đề, hàng 10 nút (`row10-single` 2/3 width, hoặc dual trái phụ/phải chính). 4 màn chính (Swap/Gửi/Nhận/Menu): NavBar hàng 10.
- **Numpad chuẩn = 2.5 hàng từ hàng 7** (7, 8, nửa 9): SendAmount/CreateQR container `gridRow 7/11` flex 2.5 (numpad) / 1.5 (nút); Swap container `7/10` flex 2.5 / 0.5 (NavBar chiếm hàng 10).
- **⚠ Input text PHẢI ở hàng 1-4 hoặc popup neo nửa trên** (`alignItems: flex-start` + paddingTop) — bàn phím iPhone che nửa dưới.
- **HomeSend 5 vùng:** h1-2 số dư (BalanceHeader) · h3-6 token list (cuộn, mờ đáy) · h7-8 NotifArea (cuộn, mờ đỉnh, auto-scroll xuống mới nhất) · h9 3 nút · h10 NavBar. Nút "Show tokens" absolute tại ranh giới 6/7 (`top:60%`).
- **Khóa cuộn trang toàn cục** (App.jsx listener `scroll` → `scrollTo(0,0)`) — chặn iOS tự cuộn khi mở bàn phím. ĐỪNG xóa.
- Flex column: `alignItems:flex-start` làm child co content-width — muốn full width để mặc định stretch.
- **TxHistory row (user chốt):** trái `[icon] Sent USDC to tên · 5 min ago` + dòng memo (đối soát); phải `-$1.00` (tiền hiển thị, đậm) + `1.00 USDC` (token thật, xám nhỏ). Icon nói lên gửi/nhận.
- **Biên lai:** số to `$2` một khối + box: Gửi đến / **Amount (token thật)** / Nội dung / Thời gian.

---

## 6. Gotchas Circle/Arc (XƯƠNG MÁU — đọc trước khi đụng)

**Circle W3S:**
- 2 format chain ID: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.
- `contractExecution`: field phẳng `feeLevel:'MEDIUM'`; nhận `abiFunctionSignature`+`abiParameters` HOẶC `callData` thô. Lấy ví: `GET /wallets` + X-User-Token.
- **userToken sống 60 phút** → `refreshSession()` trước MỌI thao tác PIN, nếu không SDK từ chối trước khi hiện màn PIN ("userToken had expired" → cảm giác bị đá ra vô cớ).
- **3 endpoint PIN:** `POST /user/pin` đặt lần đầu · `PUT /user/pin` ĐỔI (challenge bắt nhập PIN cũ) · `POST /user/pin/restore` QUÊN PIN (qua câu hỏi bảo mật). User SSO bị 403 cả update lẫn restore (platform-level).
- **Sai PIN KHÔNG đóng iframe** — SDK bắn `onError` nhưng modal vẫn cho nhập lại. `executeChallenge` (circle.js) BỎ QUA `RETRYABLE_CODES` (155112/155703/155704/155115/155705), CHỈ settle khi success hoặc lỗi terminal. Reject sớm = user nhập đúng lại nhưng promise đã chết → "văng ra" (bug cũ). 155701 = user tự hủy → im lặng.
- Lỗi SDK không phải lúc nào cũng là Error chuẩn — dò `e?.message || e?.error?.message || string`.
- Circle hosted iframe KHÔNG can thiệp được (cross-origin): chữ lỗi English, PIN dots không tự xóa, bước securityConfirm bắt gõ đúng `I agree` (hardcode). `setLocalizations` chỉ đổi được vài label → ĐÃ CHỐT để default English thuần.
- Lỗi từ Circle: LUÔN trả nguyên văn `message (HTTP status, code)` lên UI — "Forbidden" trần trụi từng đốt 3 session debug.
- SDK social login: config lưu COOKIES (sessionStorage chết qua OAuth redirect → lỗi 155140); deviceId PHẢI từ `sdk.getDeviceId()` (tự bịa → "device ID not found"); `SocialLoginResult` có `refreshToken` + `oAuthInfo.socialUserInfo.email` — ĐỪNG vứt.

**Stablecoin Kit:**
- ⚠️⚠️ `amount` = **SỐ NGUYÊN BASE UNITS** (cả quote lẫn swap). Decimal → 400; số nhỏ bị hiểu là dust → quote sai / 404 "No route available".
- Swap response: `transaction.executionParams.instructions[]` (mỗi cái `{target, data, value}`), KHÔNG phải `transaction.target/callData`. `estimatedAmount` (base units) ở top-level response.
- Swap nhỏ → 422 `331001` "insufficient after fees".

**Arc:**
- Gas trả bằng USDC (nội bộ 18 decimals): phí = `eth_gasPrice × gasUnits / 1e18` USDC, rất rẻ. Paymaster chưa có.
- Multicall3From: gọi từ EOA, KHÔNG value, allowFailure=false để revert cả batch.

**Khác:**
- iOS Safari không có BarcodeDetector → jsQR canvas. Web Share API để lưu Photos. Bỏ `clipboard.readText()` (iOS dialog phiền) — auto-focus input cho user tự paste. Không `autoFocus` trong popup (keyboard jump).
- CoinGecko: EURC=`euro-coin`, USDC=`usd-coin`, cirBTC=`bitcoin`.
- Màn không có NotifArea → lỗi phải hiện qua `ErrorToast` (truyền `sendError` qua navigate), addNotif một mình bị "nuốt".
- Sign-out chỉ xóa session keys, GIỮ `ez_contacts/ez_saved_qrs/ez_lang/ez_currency/ez_onboarded`.

---

## 7. localStorage keys

Session: `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (CHỈ email login — điều khiển nhánh refreshSession), `ez_refresh_token` + `ez_google_email` + `ez_google_deviceId` + `ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`.
Bền: `ez_contacts`, `ez_saved_qrs`, `ez_lang`, `ez_currency`, `ez_onboarded`.

---

## 8. Việc tiếp theo

1. **TEST SWAP trên deploy** (user, cần PIN): EURC→USDC vài đơn vị → 1 lần PIN → check số dư + thông báo + ArcScan. Nếu revert: đọc tx trên ArcScan xem subcall nào fail.
2. Test biên lai `$2` + Amount row + TxHistory layout mới + memo trong list.
3. **Trạng thái giao dịch thật** — poll txHash sau gửi/swap → "đã lên blockchain" (Arc finality <1s).
4. **Google login làm lại** qua Google Identity Services → luồng email (khi user yêu cầu — xem mục 3).
5. Batch gửi nhiều người (Multicall3From — encoder sẵn rồi).
6. Tối giản tiếp UI cho người già (ẩn yếu tố crypto thừa) — user chỉ từng chỗ khi vào việc.

## Lịch sử session (tóm tắt)

- **S1-2 (06-29):** i18n VI/EN/ZH, memo on-chain, tỷ giá live, jsQR, 12 mobile UX bugs, Onboarding.
- **S3 (06-30):** securityConfirm "I agree" (Circle hardcode) → SDK default English; per-account store; double-send guard; tiền tệ hiển thị.
- **S4 (07-01):** khóa cuộn trang; flow PIN sai → thoát về SendAmount; ErrorToast; root cause PIN = userToken 60' → refreshSession; AmountSuggest.
- **S5 (07-03):** khóa English + USDC/EURC.
- **S6-7 (07-03):** USD/EUR display + font Barlow cho số; layout 5 vùng HomeSend; Google login build (cookies + getDeviceId).
- **S8-10 (07-03):** Google login chạy; phát hiện SSO ≠ email (2 ví); Đổi PIN 403 cho SSO → verify bằng gọi API thật (email OK, SSO bị chặn platform) → **disable Google login**; scrollbar ẩn.
- **S11 (07-03):** Swap build lại: Multicall3From batch 1 tx 1 PIN, encoder verified vs viem, chừa 1 USDC phí, UI theo design system.
- **S12 (07-03):** Kit amount = base units (root cause "No route"/400); biên lai `$2` + Amount token thật; TxHistory layout mới + cùng nguồn tỷ giá + memo trong list; Swap layout chuẩn numpad + picker 3 token + notif; dọn code chết (mock TOKENS/SWAP_PAIRS/fmtDisplay, wireframe spec, 3 icon); viết lại HANDOFF.
