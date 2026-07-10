# HANDOFF — EZwallet

**Cập nhật:** 2026-07-11 · **Repo:** https://github.com/KattyFury/ezwallet · **Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ `main`) · **Local:** `D:\Files\Claude\build_on_arc\ezwallet`

> **Ví stablecoin cho người dùng phổ thông / người già.** UX đơn giản, mobile-first.
> ĐẦU MỖI PHIÊN đọc CẢ `HANDOFF.md` (file này) + `CLAUDE.md` (cách làm việc với user).
> Nguyên tắc: **chạy tech chuẩn Circle/Arc, đọc docs + verify bằng API/eth_call thật trước khi làm, KHÔNG đoán.**

Tài nguyên AI (nạp trước khi build): Circle [skills](https://developers.circle.com/ai/skills) · [mcp](https://developers.circle.com/ai/mcp) · [llms.txt](https://developers.circle.com/llms.txt) — Arc [skills](https://docs.arc.io/ai/skills) · [mcp](https://docs.arc.io/ai/mcp) · [llms.txt](https://docs.arc.io/llms.txt). Local đã có: Circle Skill (`circle:*`), Circle MCP (`mcp__circle__*`), Arc MCP (`mcp__arc-docs__*`).

---

## 1. Stack & hạ tầng

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Ví:** Circle **User-Controlled Wallet** (MPC EOA, ký bằng **PIN** qua `@circle-fin/w3s-pw-web-sdk`).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balance/giá:** đọc on-chain bằng viem (`src/chain.js`) + giá CoinGecko (cache 60s, có fallback). **Swap:** Circle Stablecoin Kit REST (mục 4). **QR:** `qrcode.react` (tạo) + `jsqr` (quét — iOS không có BarcodeDetector).
- **Secrets** (`.env.txt` + `.dev.vars` gitignored, set trên Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit).
- **ID hardcode** (không phải secret): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com`.
- **Dev local (Windows — KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):** Terminal 1 `node dev-server.js` (proxy 8787, import trực tiếp `functions/api/*` nên logic luôn khớp Cloudflare) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **Circle SDK KHÔNG chạy localhost** (thiếu crypto polyfill) → luồng PIN/login/swap chỉ test được trên deploy.

**Token trên Arc Testnet:**
| Token | Address | Dec | CoinGecko |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | `usd-coin` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | `euro-coin` |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | `bitcoin` |

**Arc contracts (predeployed, precompile giữ msg.sender):**
| Contract | Address | Dùng cho |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | gửi tiền kèm lời nhắn, emit `Memo` event ✅ |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batch approve+swap 1 tx/1 PIN. Gọi từ EOA, allowFailure=false, KHÔNG value |
| Swap Adapter | `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b` | settlement swap của Circle (mục 4) |

---

## 2. Mô hình tiền & hiển thị (user chốt — đừng hiểu sai lại)

- **Token LUÔN hiện TÊN THẬT** (USDC/EURC/cirBTC) ở danh sách token, lịch sử (dòng phụ), biên lai (dòng Amount).
- **"Tiền hiển thị"** = lớp quy đổi độc lập qua tỷ giá fetch (KHÔNG swap thật): tổng số dư, số quy đổi, phí. `ez_currency` ∈ {USDC, EURC}, mặc định USDC. Ký hiệu: USDC→`$`, EURC→`€`.
- **Base quy đổi = USD, USDC ghim đúng $1** (`chain.js`, bỏ vòng VND cũ). `getDisplayRates()` trả USD/1 đơn vị `{USDC:1, EURC:~1.08, cirBTC:~giá BTC}`; `displayNum(usd,cur,rates)=usd/rate[cur]` → stablecoin đúng 1:1.
- **Màn Gửi nhập theo "USD"** (nhãn thân thiện) = gửi USDC 1:1; chọn token thật qua chip.
- **Format tiền MỘT CHUỖI MỘT STYLE:** `fmtMoney()` → `$2` / `€2` / `2 USDC`. CẤM tách số đậm + ký hiệu thường (lệch font).
- **Chừa phí:** `GAS_RESERVE_USDC = 1` — khả dụng USDC luôn trừ 1 (gas Arc trả bằng USDC, "gửi hết" sẽ kẹt). Gas thực <1 cent, nhưng 1 USDC là mức an toàn.
- **App KHOÁ English:** `i18n.js` `LANG='en'` cứng. Màn Language/Currency có hiện option VI/中文 + CNY/VND nhưng **disabled** (chỉ English + USD/EUR chọn được) — lý do: Circle SDK chỉ English + nhiều chuỗi mới hardcode English. Hạ tầng i18n VI/ZH còn nguyên, mở lại = cho `LANG` đọc localStorage + bỏ `locked`.

---

## 3. Trạng thái tính năng (✅ chạy thật / verify on-chain hoặc trên deploy)

- **Email login → tạo ví** (userId=email, authMode PIN) + câu hỏi bảo mật. **Khoá mở ví:** lần 2+/mở lại app phải qua `PinGate` (ký message rỗng verify PIN, không gas). Lần 1 (vừa đặt PIN) vào thẳng. Google login **ẩn khỏi UI** (hạ tầng giữ — xem mục 6). Email OTP đã dựng nhưng TẮT (`EMAIL_OTP_ENABLED=false`).
- **Gửi tiền** USDC/EURC/cirBTC (`send.js`): transfer thường, hoặc qua Memo contract khi có lời nhắn (UTF-8 tiếng Việt ok). `idempotencyKey` chống gửi trùng.
- **Swap** USDC↔EURC↔cirBTC — **BẬT** (`SWAP_ENABLED=true`), verify eth_simulateV1 đạt (USDC về ví đúng). Chi tiết mục 4.
- **Balance on-chain + tỷ giá live**, có **cache** (`chain.js` `_balCache`/`_ratesCache`) → chuyển màn hiện số cũ ngay, fetch nền cập nhật (không nhấp nháy "..."). Cache sống theo phiên.
- **TxHistory** (ArcScan API + memo từ event), **Contacts** (per-account, avatar cropper), **QR** (tạo/quét/kho, jsQR), **thông báo in-app** (NotifArea tự hết hạn 2h), **biên lai** (canvas → Photos qua Web Share API), **Onboarding**, per-account store (`store.js`).
- **Đổi PIN** (email user): `PUT /v1/w3s/user/pin` → challenge PIN cũ + mới ✅.
- **`refreshSession()`** (`circle.js`): gọi TRƯỚC mọi thao tác cần PIN (userToken sống 60'). Email user: token mới qua userId=email. Google user: đổi refreshToken qua `POST /users/token/refresh`.

---

## 4. Swap — cách hoạt động & thanh khoản

**Tech:** Circle **Stablecoin Kit / App Kit Swap** (`@circle-fin/adapter-viem-v2`), same-chain trên Arc Testnet, slippage 300bps (3%).

**Luồng (`functions/api/_swapCore.js` — lõi dùng chung swap.js + dev-server):**
1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → trả **1 INTENT CÓ CHỮ KÝ** `{ transaction.executionParams, transaction.signature, route, estimatedAmount }`. ⚠️ `amount` gửi Kit = **SỐ NGUYÊN BASE UNITS** (decimal → 400; số nhỏ → "No route"). `toBase`/`fromBase` quy 2 chiều.
2. Nộp intent cho **Swap Adapter** (`0xBBD70b01…`): `execute(executionParams, tokenInputs, signature)`. Ví PIN → chiến lược `approve`: `tokenInputs=[{permitType:0, token:tokenIn, amount, permitCalldata:'0x'}]` + `approve(tokenIn→adapter, amount)` trước. Batch `[approve, execute]` qua **Multicall3From = 1 PIN**. ABI `execute` copy nguyên từ source SDK; encode bằng **viem** (tuple lồng dynamic bytes — hand-roll dễ sai offset → mất tiền).
3. Adapter kéo token vào, chạy instructions, **GOM output, ghi có cho beneficiary=ví** (settlement).

**Thanh khoản ở đâu:** Kit KHÔNG tự có pool. Nó **route qua một "swap service provider" bên thứ ba** (Circle docs: *third-party liquidity service that executes the swap*, phí provider 2bp/mọi swap). Trong response testnet thực tế `route.provider = "lifi"` (tool `"fly"`) → tức đi qua **LiFi**, một DEX aggregator, kéo thanh khoản từ các pool/DEX bên dưới trên Arc. Circle chỉ đóng gói + settlement, không phải market maker.

**⚠️ ĐỪNG LẶP sai lầm cũ:** KHÔNG bóc `instructions[]` chạy tay (dù trực tiếp hay qua Multicall3From) — bỏ qua bước settlement của adapter → USDC output **kẹt ở adapter, MẤT TIỀN** (tx vẫn status=1). PHẢI đi qua `adapter.execute` với intent có chữ ký. Verify mọi thay đổi swap bằng `node verify-swap.mjs <ví> EURC USDC 2` (eth_simulateV1, không tốn tiền/PIN — chỉ ship khi số dư tokenOut của ví TĂNG đúng).

---

## 5. Design System (`src/index.css` :root)

**Font (chỉ 2, đã bỏ Barlow Condensed):** `--font-base` **IBM Plex Sans** = nội dung cho người đọc (menu, mô tả, hint, thông báo, input). `--font-display`/`--font-title`/`--font-condensed` = **Barlow** = thương hiệu (logo, tiêu đề màn, số `.num`, ký hiệu tiền tệ, button). *(Biến `--font-condensed` là tên cũ, giá trị đã là Barlow thường.)*
**Cỡ chữ (mở khoá):** amount 52 · title 30 · num 24 · body 19 · item 17 · label 15 · tiny 13.

**Màu — hệ NGỮ NGHĨA (user chốt):**
| Ý nghĩa | Token | Hex |
|---|---|---|
| **Thương hiệu** (logo, nút CTA, action-card, accent selected, NavBar active, nút swap 50/100%) + **GỬI tiền** | `--color-brand` / `--color-info` | `#0B53BF` (+ info-soft `#E2EAF7`) |
| **Nhận tiền / PNL / verify / success** | `--color-primary` | `#16A34A` (+soft `#DCFCE7`) |
| **Mất tiền / lỗi / bug** | `--color-error` | `#DC2626` (+soft `#FEE2E2`) |
| **Warning** | `--color-warning` | `#F59E0B` (+soft `#FEF3C7`) |
| Chữ chính / phụ | `--color-black` / `--color-muted` | `#000` / `#AEAEB2` |
| Border / nền / divider (KHÔNG làm màu chữ) | `--color-gray` | `#E5E5EA` |

> Quy tắc: yếu tố **thương hiệu → brand blue**; yếu tố **tích cực/nhận/success → xanh lá**. Đừng lẫn. `--color-brand` là 1 nguồn duy nhất cho nút — đổi màu brand chỉ sửa 1 dòng.

**Quy tắc cứng:**
- KHÔNG em-dash `—` (dùng en-dash `–`); placeholder rỗng dùng `…`. KHÔNG emoji.
- Thông báo/hint = **nền màu nhạt iOS-style, KHÔNG viền**: Nhận=xanh lá, Gửi=brand blue, Lỗi=đỏ, Cảnh báo=vàng. Trong box nền màu: chữ FULL ĐEN, phân cấp bằng đậm/nhạt.
- Nút lọc/toggle BẬT = nền trắng + viền brand + chữ brand (không tô đặc).
- Nút chính = 2/3 bề ngang; nút phụ = 1/2.
- **Icon:** `<Icon name size color />` (`components/Icon.jsx`, SVG trong `icon/` qua `?raw` + `currentColor`). Icon mới BẮT BUỘC chuẩn hoá `width/height="100%"` + `stroke="currentColor"` (export thường ra `100px`+`black` → tràn ô 22px + không đổi màu được).
- **Scrollbar:** `.scroll-thin` = ẩn hoàn toàn (vẫn cuộn được, mờ mép gợi ý); `.scroll-hidden` cho NotifArea.

**Brand assets:**
- `design/logo.svg` — logo chữ "EZ" (brand blue) + "wallet" (đen), dùng ở **Login** + **biên lai** (import trực tiếp). Canvas biên lai dùng tỉ lệ viewBox `342×85`.
- Favicon `/fav_icon.png` (EZ sát viền), app icon Apple + manifest `/icon.png` (512×512, EZ brand blue, nền trắng — iOS không nhận SVG/transparent).

> 🎨 **Design: user tự làm UI.** Đừng tự ý redesign; chờ user đưa design rồi port vào React. Icon = bộ tự vẽ của user (viewBox 100, stroke-width 10). Mốc thẩm mỹ user thích: Coinbase Wallet (số dư to, tile bo tròn nền nhạt, nhiều khoảng thở, tối giản viền) — brand xanh dương.

---

## 6. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding `0 20px`). Sub-screen: hàng 1 tiêu đề, hàng 10 nút (`.row10-single` 2/3 width, hoặc `.row10-dual` trái-phụ/phải-chính, `position:absolute` top 85dvh = tâm nút vị trí 9). 4 màn chính (Swap/Gửi/Nhận/Menu): NavBar hàng 10, full-bleed `margin 0 -20px`.
  - ⚠️ Nút absolute mà còn giữ `grid-row` (từ class `.row-10`) sẽ lấy Ô LƯỚI làm gốc → top:85dvh văng khỏi màn → PHẢI ép `grid-row:auto`.
- **Numpad = hàng 6.5–8.5:** container `gridRow 6/9` (spacer flex 0.5 + Numpad flex 2.5), nút [Back][Continue] để RIÊNG ở `.row10-dual`. ĐỪNG gộp numpad+nút vào 1 khối. Áp: SendAmount, CreateQR, Swap.
- **Input text PHẢI ở hàng 1–4 hoặc popup neo nửa trên** (`.popup-card` tâm 30dvh) — bàn phím iPhone che nửa dưới. Không `autoFocus` trong popup.
- **Khoá cuộn trang toàn cục** (`App.jsx` listener `scroll`→`scrollTo(0,0)`) — chặn iOS tự cuộn khi mở bàn phím. ĐỪNG xoá.
- **HomeSend 5 vùng:** h1-2 số dư (BalanceHeader) · h3-5 token list (cuộn, mờ đáy) · h7-8 NotifArea (cuộn, mờ đỉnh) · h9 3 nút · h10 NavBar. Scrollbar nằm trong dải lề 20px phải (`.scroll-thin` gutter stable → content không co khi bật scroll).
- **TxHistory row:** trái `[icon] Sent/Received tên` + `At <giờ>` + [Add to Contacts] + Note; phải `-$1.00`/`+$1.00` (tiền hiển thị, gửi=đỏ/nhận=xanh lá) + `1.00 USDC` (token thật, xám). Icon gửi=up(brand)/nhận=down(xanh lá).

---

## 7. Gotchas Circle/Arc (xương máu)

**Circle W3S:**
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.
- **userToken sống 60 phút** → `refreshSession()` TRƯỚC mọi thao tác PIN, không thì SDK từ chối trước cả khi hiện màn PIN ("userToken had expired").
- **Sai PIN KHÔNG đóng iframe** — SDK bắn `onError` nhưng modal cho nhập lại. `executeChallenge` BỎ QUA `RETRYABLE_CODES` (155112/155703/155704/155115/155705), chỉ settle khi success/lỗi terminal (reject sớm = user nhập đúng lại nhưng promise đã chết → "văng ra"). `155701` = user tự huỷ.
- **3 endpoint PIN:** `POST /user/pin` đặt lần đầu · `PUT /user/pin` đổi · `POST /user/pin/restore` quên. **User SSO/OTP không có PIN** → 403 (duyệt bằng Confirmation UI, không PIN).
- `contractExecution`: field phẳng `feeLevel:'MEDIUM'`, nhận `abiFunctionSignature`+`abiParameters` hoặc `callData` thô. Circle hosted iframe không sửa được (cross-origin, English thuần, bước securityConfirm bắt gõ `I agree`).
- Lỗi Circle: luôn trả nguyên văn `message (HTTP status, code)` lên UI. SDK error không phải Error chuẩn — dò `e?.message || e?.error?.message`.

**Arc / Stablecoin Kit:**
- Gas trả bằng USDC (nội bộ 18 decimals): phí = `eth_gasPrice × gasUnits / 1e18`, rất rẻ. Chưa có paymaster.
- Kit `amount` = **base units** (mục 4). Swap quá nhỏ → 422 `331001`.

**Khác:**
- iOS Safari: không BarcodeDetector → jsQR canvas; Web Share API để lưu Photos; bỏ `clipboard.readText()` (dialog phiền) → auto-focus input cho user tự paste.
- CoinGecko: USDC=`usd-coin`, EURC=`euro-coin`, cirBTC=`bitcoin`.
- Màn không có NotifArea → lỗi hiện qua `ErrorToast` (truyền `sendError` qua navigate), `addNotif` một mình bị nuốt.
- Sign-out chỉ xoá session keys, GIỮ `ez_contacts/ez_saved_qrs/ez_lang/ez_currency/ez_onboarded`.

---

## 8. localStorage keys

**Session:** `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (chỉ email login), `ez_refresh_token`/`ez_google_email`/`ez_google_deviceId`/`ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`. `sessionStorage.ez_pin_ok` = cờ mở khoá phiên.
**Bền:** `ez_contacts`, `ez_saved_qrs`, `ez_lang`, `ez_currency`, `ez_onboarded`.

---

## 9. Việc tiếp theo

1. **User test swap thật** 1 lần số nhỏ trên deploy (ký PIN) — mô phỏng đã đạt nhưng chưa test PIN thật đầu-cuối.
2. **Trạng thái giao dịch thật** — poll txHash sau gửi/swap → "đã lên blockchain" (Arc finality <1s).
3. **Google login làm lại** qua Google Identity Services → đi luồng email (userId=email, full quyền PIN) khi user yêu cầu — thay đổi kiến trúc, làm riêng 1 buổi.
4. Batch gửi nhiều người (Multicall3From, encoder sẵn).
5. Tối giản tiếp UI cho người già (ẩn yếu tố crypto thừa) — user chỉ từng chỗ khi vào việc.

---

## 10. Thay đổi gần đây (rút gọn)

- **07-11 (rebrand):** Đổi màu thương hiệu xanh lá → **brand blue `#0B53BF`** (thêm token `--color-brand`, `--color-info`=brand); hệ màu ngữ nghĩa xanh lá=nhận/success, brand=gửi/thương hiệu. **Bỏ Barlow Condensed** (còn Barlow + IBM Plex). **Logo/icon mới** (EZ brand blue): logo.svg, fav_icon.png, icon.png 512. Fix icon check biên lai (check xanh lá to, bỏ circle trắng), amount gửi/receipt → brand, avatar contact chưa có ảnh = xám + dấu "+", nút Add-to-Contacts + filter history → brand. **Dọn file thừa:** xoá asset mồ côi (icon.svg/pfp cũ), bỏ `.wrangler` khỏi git + gitignore.
- **07-06 (S24):** Language/Currency khoá English (option VI/ZH + CNY/VND disabled). Faucet → thông báo "Faucet successful". → dừng build, sản phẩm ổn định.
- **07-04/05:** **Swap sửa đúng** (adapter.execute, verify eth_simulateV1 đạt → bật). Khoá mở ví bằng chính PIN Circle (PinGate). Google login đính chính (social = Confirmation UI, không PIN) → giữ Email+PIN, ẩn Google. Base quy đổi USD, USDC ghim $1.
- **Trước đó:** i18n, memo on-chain, jsQR, per-account store, cache balance chống nhấp nháy, layout 10 hàng + numpad tách nút, biên lai canvas, TxHistory/Contacts/QR UX.

## Quyết định quan trọng (đừng lặp lại hướng đã bỏ)

- **Swap = `adapter.execute` với intent có chữ ký**, KHÔNG bóc instructions chạy tay (mất tiền — mục 4). Kit amount = base units, không decimal. Dùng viem encode (không hand-roll tuple lồng bytes).
- **Mở ví = chính PIN Circle**, không tạo passcode riêng (đã thử app passcode + KV, bỏ vì rối). Email OTP đã thử → tắt (OTP mất PIN).
- **Google/SSO không gắn được PIN** (platform-level) → mỗi phương thức login = 1 userId/ví riêng. Giữ Email+PIN mặc định.
- **Tiền hiển thị base USD**, USDC=$1 (bỏ vòng VND — double-conversion làm "$5"→"$4.99").
- **Docs tham chiếu:** Circle developers.circle.com · Arc docs.arc.io (MCP arc-docs). Đọc docs thật + verify bằng API/eth_call, KHÔNG đoán.
