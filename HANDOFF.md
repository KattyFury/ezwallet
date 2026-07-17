# HANDOFF — EZwallet

**Cập nhật:** 2026-07-17 · **Repo:** https://github.com/KattyFury/ezwallet · **Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ `main`) · **Local:** `D:\Files\Claude\build_on_arc\ezwallet`

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
- **Dev local (Windows — KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):** `dev-server.js` CÓ trên GitHub (bỏ khỏi `.gitignore` 07-17b — nó không chứa secret, chỉ ĐỌC `API_KEY` từ `.env.txt`; trước đây bị ignore nên máy thứ 2 kéo repo về là thiếu file, không dev local được). Terminal 1 `node dev-server.js` (proxy 8787, import trực tiếp `functions/api/*` nên logic luôn khớp Cloudflare) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **Circle SDK KHÔNG chạy localhost** (thiếu crypto polyfill) → luồng PIN/login/swap chỉ test được trên deploy.
- **MOCK MODE — `npm run mock` (canh UI/flow local, KHÔNG cần Circle):** `src/mock.js` + cờ `VITE_MOCK=1` (`.env.mock`, Vite `--mode mock`). Bỏ qua Login/PIN → vào thẳng HomeSend với **ví ảo + số dư ảo**; chặn `/api/*` + ArcScan trả data giả (`installMockFetch`); nút Gửi/Swap **giả lập thành công** (không gọi Circle, không mất tiền). Gate ở `chain.js` (balances/rates/fee), `circle.js` (getSDK/refreshSession/executeChallenge/estimate+executeSwap). **KHÔNG vào production** (build prod không có cờ). Chỉ để dựng giao diện — luồng tiền THẬT vẫn test deploy. Số dư ảo sửa ở `MOCK_AMOUNTS` trong `src/mock.js`.

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

- **Email login → tạo ví** (userId=email, authMode PIN) + câu hỏi bảo mật. **Khoá mở ví:** lần 2+/mở lại app → `PinGate` TỰ bật thẳng PIN Circle (ký message rỗng verify, không gas; KHÔNG hiện màn PIN riêng — chỉ logo nền, hủy/lỗi mới hiện nút Unlock/Đăng xuất). Lần 1 (vừa đặt PIN) vào thẳng. Google login **ẩn khỏi UI** (hạ tầng giữ — xem mục 6). Email OTP đã dựng nhưng TẮT (`EMAIL_OTP_ENABLED=false`).
- **Gửi tiền** USDC/EURC/cirBTC (`send.js`): transfer thường, hoặc qua Memo contract khi có lời nhắn (UTF-8 tiếng Việt ok). `idempotencyKey` chống gửi trùng.
- **Swap** USDC↔EURC↔cirBTC — **BẬT** (`SWAP_ENABLED=true`), verify eth_simulateV1 đạt (USDC về ví đúng). Chi tiết mục 4.
- **Balance on-chain + tỷ giá live**, có **cache** (`chain.js` `_balCache`/`_ratesCache`) → chuyển màn hiện số cũ ngay, fetch nền cập nhật (không nhấp nháy "..."). Cache sống theo phiên.
- **TxHistory** (ArcScan API + memo từ event), **Contacts** (per-account, avatar cropper), **QR** (tạo/quét/kho, jsQR), **thông báo in-app** (NotifArea — KHÔNG hết hạn, giữ trạng thái ví mới nhất), **biên lai** (canvas → Photos qua Web Share API), **Onboarding**, per-account store (`store.js`).
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

**Font (2026-07-15: CHỈ 1 FONT = BARLOW toàn app, đã bỏ IBM Plex Sans + Barlow Condensed):** mọi biến `--font-base`/`--font-display`/`--font-title`/`--font-condensed` đều = **Barlow** (giữ 4 tên cũ để khỏi sửa JSX). `index.html` load Barlow `300;400;500;600`.
**Đậm–nhạt (bắt mắt = tương phản weight):** `--fw-light 300` = SỐ HERO to (số dư `BalanceHeader`, số tiền `.amount-display`) → thanh thoát, CHỈ dùng chữ to. `--fw-normal 400` body · `--fw-medium 500` nút/item/label · `--fw-semibold 600` tiêu đề màn/popup + nhấn mạnh + active. **KHÔNG 700** (Barlow 700 xấu, khoá max 600).
**Cỡ chữ + TÊN GỌI (user chốt 2026-07-15, đặt nốt 3 tên cuối 07-17):** amount 52 · **"size siêu to"=huge 38** (số chính màn Swap — bậc thêm 07-17c) · **"size to"=title 30** (tiêu đề trang) · num 24 · **"font vừa-to"=md-lg 21** (BUTTON + slogan + chữ khi nhập text) · **"font vừa"=body 19** (nội dung, nhỏ hơn vừa-to) · **"font vừa-nhỏ"=item 17** · **"font nhỏ"=label 15** · **"font mini"=tiny 13**. → User gọi tên nào thì tra bảng này, đừng hỏi lại.
**Gradient thương hiệu (user chốt 2026-07-15, muốn "stunning" không flat):** `--grad-brand` = `linear-gradient(180deg,#0088FF 0%,#0B53BF 100%)` (dọc, sáng trên→đậm dưới). Áp cho NỀN `.btn-primary` + `.action-card.primary`. `--color-brand` (#0B53BF đặc) vẫn dùng cho CHỮ/VIỀN brand (nav active, filter, option) — gradient không set được cho text/border.

**Màu — hệ NGỮ NGHĨA (user chốt):**
| Ý nghĩa | Token | Hex |
|---|---|---|
| **Thương hiệu** (logo, nút CTA, action-card, accent selected, NavBar active, nút swap 50/100%) + **GỬI tiền** | `--color-brand` / `--color-info` | `#0B53BF` (+ info-soft `#E2EAF7`) |
| **Nhận tiền / PNL / verify / success** | `--color-primary` | `#16A34A` (+soft `#DCFCE7`) |
| **Mất tiền / lỗi / bug** | `--color-error` | `#DC2626` (+soft `#FEE2E2`) |
| **Warning** | `--color-warning` | `#F59E0B` (+soft `#FEF3C7`) |
| Chữ chính | `--color-black` | `#000` |
| **Chữ phụ = XÁM ĐẬM** (user chốt 07-16) | `--color-muted` | `#636366` |
| Border / nền / divider (KHÔNG làm màu chữ) | `--color-gray` | `#E5E5EA` |
| **NỀN TILE/CARD** (mảng nền lớn, thay cho viền) | `--color-surface` | `#F2F2F7` |

> Quy tắc: yếu tố **thương hiệu → brand blue**; yếu tố **tích cực/nhận/success → xanh lá**. Đừng lẫn. `--color-brand` là 1 nguồn duy nhất cho nút — đổi màu brand chỉ sửa 1 dòng.
>
> **TÁCH KHỐI BẰNG NỀN, KHÔNG BẰNG VIỀN (user chốt 07-17c: "giao diện chưa nhấn nhá").** Card/tile → `background: var(--color-surface)` + `border: none` + bo góc 20. Viền xám trên nền trắng làm mọi khối **bằng vai phải lứa, nhìn bẹt**, không có nhân vật chính. Phần tử con nằm TRONG card thì để **nền trắng** → tự nổi lên (vd chip token màn Swap). **ĐỪNG dùng `--color-gray` (#E5E5EA) làm nền mảng lớn** — nó là cỡ dành cho nét viền 1px, trải rộng ra thì nặng và bẩn. Mẫu đang áp: `Swap.jsx` const `CARD`.
>
> **07-17d — chuẩn trên ĐÃ ÁP TOÀN APP (user chốt "lấy Swap làm chuẩn"):** `.action-card` (Home Send/Receive) · `.confirm-box` (SendConfirm/Receipt) · `.memo-row` + `.address-input` (mọi ô nhập text — user chốt Ô NHẬP cũng nền surface không viền; lỗi = `box-shadow inset` đỏ thay viền) · chip USD/EUR (SendAmount/CreateQR) · chip Language/Onboarding · tile SavedQRList. **Bo góc: card lớn 20, chip/ô nhỏ giữ 8–12** (user chốt — bo 20 trên phần tử thấp thành viên thuốc). Chip/toggle BẬT vẫn viền brand (luật riêng, giữ). `warning-badge` về đúng luật nền vàng nhạt + chữ đen (trước lạc luật viền vàng + chữ vàng). Dead CSS `.tip-box` `.swap-box` `.recipient-box` `.option-row`/`.option-radio` ĐÃ XOÁ (user duyệt 07-17d); `.recipient-avatar` cũng không ai dùng nhưng user chưa kêu — để nguyên.
>
> **07-17f — LUẬT BỔ SUNG (user chốt): phần tử BẤM ĐƯỢC nằm TRONG box xám → TRẮNG + VIỀN XÁM 1.5px** ("khi có 1 button nằm trong vùng box xám button đó thành trắng viền xám" — giống chip token màn Swap). Box xám giờ phủ: vùng token HomeSend, list Contacts/TxHistory, nội dung Language/Security/About (xem mục 10 · 07-17f).
>
> **Chữ phụ = `--color-muted` #636366 (XÁM ĐẬM), KHÔNG hardcode màu xám rời rạc.** Lý do chốt số này: ưu tiên số 1 của app là TO–RÕ cho người già → `#AEAEB2` cũ chỉ đạt tương phản **2.3:1** trên nền trắng = **trượt WCAG AA** (cần 4.5:1), người già đọc không ra; nhưng `#48484A` (màu slogan Login hardcode cũ) lại **9.1:1 = gần như đen**, mất phân cấp chính/phụ. `#636366` = **6.0:1**: đạt AA thoải mái mà mắt vẫn đọc ra là xám.

**Cỡ ICON — TOÀN BỘ phải match cỡ chữ đi kèm (user chốt 2026-07-16: "icon phải tương đồng với chữ, chữ to icon nhỏ là sai" · "Icon toàn bộ phải match font size"):** thang `--is-*` trong `:root` ghép 1-1 với `--fs-*` (`--is-title 30 / --is-num 24 / --is-md-lg 21 / --is-body 19 / --is-item 17 / --is-label 15`). Icon đứng cạnh chữ nào thì `size="var(--is-<cỡ chữ đó>)"`. **ĐỪNG đặt `size={14}`/`{18}` rời rạc** — tăng cỡ chữ là icon lệch ngay (đúng bug 07-16: chữ lên 19–24 mà icon còn 12–15). Áp cả cho icon-trên-nhãn trong `.action-card` (→ `--is-item`) và badge tròn TxHistory. **Chỉ icon ĐỨNG MỘT MÌNH** (không có chữ nào bên cạnh để match) mới giữ số cứng: SendReceipt check 76, ComingSoon shield 48, avatar Contacts, nút xoá QR, nút đảo chiều Swap, numpad erase.

**Quy tắc cứng:**
- **`.screen` PHẢI có `grid-template-columns: minmax(0,1fr)` — ĐỪNG BAO GIỜ BỎ.** Không khai cột → cột ngầm = `auto` = giãn theo NỘI DUNG RỘNG NHẤT; chỉ 1 thông báo/địa chỉ dài (`nowrap`) là cột phình quá bề ngang màn → **MỌI hàng** (số dư, list token, nút, NavBar) bị kéo rộng theo → nội dung lệch phải + `overflow:hidden` cắt cụt mép phải. Đây là bug "màn hình không hiển thị hết / số tiền không hiện" 07-16.
- **Flex item chứa chữ `nowrap` PHẢI có `minWidth: 0`** — mặc định `min-width:auto` = không co dưới bề rộng chữ → `nowrap` ĐẨY RỘNG cả hàng thay vì cắt "…" (nguồn cơn làm phình cột grid ở trên).
- **KHÔNG dựa vào `<button>`/`<input>` kế thừa font** — trình duyệt ép font hệ thống (Arial). Đã có rule global `button, input, textarea, select { font-family: inherit }` ở `index.css`; đừng xoá (bug 07-16: địa chỉ ví màn Receive ra Arial giữa app Barlow).
- KHÔNG em-dash `—` (dùng en-dash `–`); placeholder rỗng dùng `…`. KHÔNG emoji.
- Thông báo/hint = **nền màu nhạt iOS-style, KHÔNG viền**: Nhận=xanh lá, Gửi=brand blue, Lỗi=đỏ, Cảnh báo=vàng. Trong box nền màu: chữ FULL ĐEN, phân cấp bằng đậm/nhạt.
- Nút lọc/toggle BẬT = nền trắng + viền brand + chữ brand (không tô đặc).
- Nút chính = 2/3 bề ngang; nút phụ = 1/2.
- **Icon:** `<Icon name size color />` (`components/Icon.jsx`, SVG trong `icon/` qua `?raw` + `currentColor`). Icon mới BẮT BUỘC chuẩn hoá `width/height="100%"` + `stroke="currentColor"` (export thường ra `100px`+`black` → tràn ô 22px + không đổi màu được).
- **Scrollbar:** `.scroll-thin` = ẩn hoàn toàn (vẫn cuộn được, mờ mép gợi ý); `.scroll-hidden` cho NotifArea.

**Brand assets:**
- `design/logo.svg` — icon ví có chữ "EZ" (brand blue) + chữ "Wallet" (đen), viewBox `1160×380`, dùng ở **Login** + **biên lai** (import trực tiếp). Canvas biên lai dùng tỉ lệ viewBox `1160×380`. `design/logo-icon.svg` = chỉ icon ví (viewBox `500×396`), để dành chưa dùng.
- Favicon `/fav_icon.png` (icon ví EZ, nền trắng), app icon Apple + manifest `/icon.png` (512×512, icon ví EZ brand blue, nền trắng — iOS không nhận SVG/transparent).

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
- **Màn PIN = iframe `pw-auth.circle.com` (cross-origin) → KHÔNG auto-mở bàn phím số được.** User muốn (07-17d) nhưng đã đọc source SDK xác nhận: browser cấm focus vào input trong iframe khác origin, iOS còn bắt user chạm trực tiếp mới mở keyboard, SDK không có option nào. Nằm hoàn toàn phía Circle — ĐỪNG tốn công đào lại.
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.
- **userToken sống 60 phút** → `refreshSession()` TRƯỚC mọi thao tác PIN, không thì SDK từ chối trước cả khi hiện màn PIN ("userToken had expired").
- **Sai PIN KHÔNG đóng iframe** — SDK bắn `onError` nhưng modal cho nhập lại. `executeChallenge` BỎ QUA `RETRYABLE_CODES` (155112/155703/155704/155115/155705), chỉ settle khi success/lỗi terminal (reject sớm = user nhập đúng lại nhưng promise đã chết → "văng ra"). `155701` = user tự huỷ.
- **3 endpoint PIN:** `POST /user/pin` đặt lần đầu · `PUT /user/pin` đổi · `POST /user/pin/restore` quên. **User SSO/OTP không có PIN** → 403 (duyệt bằng Confirmation UI, không PIN).
- `contractExecution`: field phẳng `feeLevel:'MEDIUM'`, nhận `abiFunctionSignature`+`abiParameters` hoặc `callData` thô. Circle hosted iframe không sửa được (cross-origin, English thuần, bước securityConfirm bắt gõ `I agree`).
- Lỗi Circle: luôn trả nguyên văn `message (HTTP status, code)` lên UI. SDK error không phải Error chuẩn — dò `e?.message || e?.error?.message`.

**Arc / Stablecoin Kit:**
- **RPC công cộng `rpc.testnet.arc.network` RATE LIMIT rất chặt → HTTP 429.** Bắn 3 `balanceOf` song song là dính ngay (đo 07-17: hỏng 5/5). Mọi lệnh đọc nhiều thứ cùng lúc PHẢI gộp **Multicall3** (`0xcA11bde05977b3631167028862bE2a173976CA11`, đã khai trong `defineChain` ở `chain.js` → `publicClient.multicall()` tự dùng). Retry phải giãn ≥600ms — backoff ngắn (250ms) chỉ đổ thêm dầu vào lửa. Docs Arc không ghi con số giới hạn cụ thể; trang "running a node" chỉ nói node riêng = "No rate limits".
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

> 🔴 **VIỆC 1 LÀ CHẶN — làm TRƯỚC mọi thứ khác trong phiên sau.**

1. 🔴 **TEST PIN TRÊN DEPLOY — GẤP, chưa ai xác nhận.** Phiên 07-17 đổi `getSDK()` **sync → async** (nạp lười SDK, mục 10) và thêm `await` ở 6 chỗ gọi (EnterEmail ×3, PinGate, Security, SendConfirm, Swap). **Circle SDK không chạy localhost → KHÔNG test được ở máy, đã đẩy lên deploy mà chưa ai thử.** Việc phải làm: đăng nhập → mở khoá PIN → gửi 1 lần số nhỏ. **Màn PIN không hiện = nghi thiếu `await getSDK()` ở đâu đó** → `grep -rn "getSDK()" src/ | grep -v "await getSDK()"` phải ra RỖNG. Hỏng nặng thì revert commit `78ac6da`.
2. **User test swap thật** 1 lần số nhỏ trên deploy (ký PIN) — mô phỏng đã đạt nhưng chưa test PIN thật đầu-cuối. (Gộp luôn với việc 1.)
   - Tiện thể xác nhận fix **07-17b** (mục 10): màn Gửi + Swap phải hiện **số dư THẬT**, không còn "khả dụng 0.00"; RPC nghẽn thì hiện `…` rồi tự về số đúng.
3. **Icon `!` (warning) — CHỜ USER CHỌN HƯỚNG, đừng tự sửa.** User báo icon `!` trông nhỏ hơn hẳn icon Send/Receive dù CÙNG ô 17px (`--is-item`). Đã đo ra nguyên nhân: mũi tên up/down vẽ nét đậm cao **80/100** viewBox, còn `warning.svg` thì **vòng tròn chiếm 80/100 nhưng dấu `!` bên trong chỉ ~45** → cùng ô mà mực ít hơn nửa. Không phải lỗi cỡ, mà do icon này có VÒNG BAO còn icon kia thì không. 2 hướng: (a) phóng riêng icon warning to hơn thang `--is-*`, (b) sửa `warning.svg` cho dấu `!` chiếm nhiều viewBox hơn / bỏ vòng tròn. **Icon là bộ user tự vẽ → phải hỏi, xem cảnh báo 🎨 cuối mục 5.**
4. **Trạng thái giao dịch thật** — poll txHash sau gửi/swap → "đã lên blockchain" (Arc finality <1s).
5. **Google login làm lại** qua Google Identity Services → đi luồng email (userId=email, full quyền PIN) khi user yêu cầu — thay đổi kiến trúc, làm riêng 1 buổi.
6. Batch gửi nhiều người (Multicall3From, encoder sẵn).
7. Tối giản tiếp UI cho người già (ẩn yếu tố crypto thừa) — user chỉ từng chỗ khi vào việc.
8. **Còn tối ưu được nữa nếu cần** (chưa làm, không cấp bách): chunk SDK+firebase vẫn ~1002KB, phần lớn là **crypto-browserify** do `nodePolyfills({ include: [...'crypto'] })` ở `vite.config.js` — thử bỏ `'crypto'` xem SDK còn chạy không, nhưng **chỉ test được trên deploy** nên rủi ro, đừng làm chung phiên với việc khác. *(3 dep thừa app-kit/swap-kit/adapter-viem-v2 đã gỡ 07-17b.)*
9. **3 icon chưa dùng: `back.svg`, `facebook.svg`, `swap.svg`** — user chốt 07-17b GIỮ LẠI (icon user tự vẽ, để dành). Đừng rà lại rồi đòi xoá nữa.

---

## 10. Thay đổi gần đây (rút gọn)

- **07-17f (đợt "box xám hoá" toàn app + chi tiết theo danh sách 12 mục user giao):**
  - **LUẬT MỚI user chốt: phần tử BẤM ĐƯỢC nằm TRONG box xám → TRẮNG + VIỀN XÁM** (như chip token Swap). Đã áp: nút "Hold to show tokens", chip English/USD (Language), avatar placeholder Contacts, chip "Add to Contacts" (TxHistory — thêm nền trắng).
  - **Slider Swap 5 mốc 0/25/50/75/100** (trước 6 mốc bước 20) — `PctSlider.jsx` MARKERS.
  - **Box xám mới:** vùng token HomeSend (hàng 3→5.5, `height calc(100%+5dvh)` thò nửa hàng 6 để ôm nút Hold; mask mờ đáy để ở DIV TRONG kẻo nền xám lem) · list Contacts (row 2-8; padding box tự cân lề — fix "lệch trái") · list TxHistory (row 2-8) · Language hàng 2-3 · Security hàng 2-4 · About hàng 2-8.
  - **Hint đổi format `X: desc`** (NotifArea, trước `X =`). Text mới user chốt — Gửi: Contacts: Saved addresses · Scan QR: Scan QR to send · Paste: Paste address to send. Nhận: Share: Share your address · Create QR: Custom receive amount (user viết "Custom the receive amount" — sửa ngữ pháp, ĐÃ BÁO) · QR Library: Store your most used QRs ("moss"=typo "most").
  - **QRScanner:** cụm (ô quét + chú thích) căn tâm hàng 1-6 (trước 1-5, chú thích absolute); thêm dòng 2 fs-body muted: "Real-life QR codes are not supported yet – crypto wallet QRs only"; dòng chính lên fs-md-lg.
  - **Receive:** QR phóng `min(30dvh, 78vw)` chiếm hàng 3-6 (trước 200px hàng 3-5 — quét xa không ăn); dòng địa chỉ+copy neo absolute top 55% = TRÙNG toạ độ nút Hold màn Gửi.
  - **Add contact:** vòng PFP đổi `--color-gray`→`--color-surface` (user bắt 2 xám khác màu), icon `+` trắng→muted.
  - **Security/About:** VALUE 15→17 (`--fs-item`, user chê nhỏ); Security trạng thái đổi PIN LỖI = ĐỎ (regex `^(Error|Lỗi|Not available)` — trước lỗi cũng xanh lá); icon copy Security→brand.
  - Verify: build ✓ test 17/17 ✓ Playwright mock 390px 10 màn `pageerrors: none`.

- **07-17e (NavBar thoáng + hint "nhiệt tình" + phân cấp đậm nhạt kiểu Swap lan ra app):**
  - **NavBar hạ 1 bậc: chữ + icon `--fs/is-body` 19** (trước md-lg 21 — user chê "hơi thô"). Nút bấm vẫn 21.
  - **Hint slider Swap SPEC MỚI (user chốt): BỘ BA sàn · sàn+0.5 · trần** — 24.40 → [24, 24.5, 25]; 23.3 → [23, 23.5, 24]. `roundHint.js` VIẾT LẠI (bỏ MANTISSAS/REL_CAP/ngưỡng "gần" — chính ngưỡng đó làm 24.40 thiếu 24.5, user chê "hơi thiếu"); số <1 (cirBTC) co đơn vị theo 10^k → 0.008327 ra [0.008, 0.0085, 0.009]. Vẫn: không vượt số dư, không lặp số đang đứng, pct<100 mới hiện. Test viết lại 17/17 (`node test/roundHint.test.mjs`). 3 chip EURC vừa 390px không tràn (đo Playwright).
  - **Đậm nhạt Swap (user: "quan trọng nhớ bold"):** label You pay/receive + GIÁ TRỊ Rate/Fee → `--fw-medium` (label Rate/Fee giữ thường). 
  - **Ngôn ngữ Swap lan ra màn khác (user: "áp dụng tài tình, hài hòa"):** icon hành động/dẫn đầu = BRAND BLUE — copy ở Receive (copied vẫn hoá xanh lá success), icon mục Menu (Sign out giữ đỏ ngữ nghĩa). Nút "Hold to show tokens" (HomeSend) đổi nền `--color-gray` → `--color-surface` (user báo "lạc quẻ"; màu cũ vốn bị luật mục 5 cấm làm nền mảng).
  - Verify: build pass · test 17/17 · Playwright mock 390px (HomeSend/Menu/Receive/Swap kéo 58%) `pageerrors: none`.

- **07-17d (đồng bộ chuẩn Swap toàn app + icon thông báo center-trái):**
  - **Gradient trạng thái MỚI (user chốt, thay bộ "đẩy tối" 07-16):** xanh lá `#34C759→#16A34A` · đỏ `#FF4D51→#DC2626` · vàng `#FFCC00→#F59E0B` (dọc, nhạt trên → đậm dưới, đáy = màu ngữ nghĩa). ⚠️ User dặn cách nói: 0%/100% trong CSS là VỊ TRÍ neo, cả 2 đầu đều màu đặc — đừng diễn đạt "trên 0%" như thể màu nhạt. Tương phản đo được ghi ở comment `:root`.
  - **Icon thông báo/hint = CENTER-TRÁI cả khối** (user chốt: khối 3 dòng thì icon ngang dòng 2, không dính dòng 1): HintBlock (`NotifArea.jsx`) thêm icon `hint.svg` màu warning; hint faucet (`HomeSend.jsx`) icon warning chuyển từ hàng 1 xuống giữa khối, bỏ hack `paddingLeft:26`. Cấu trúc: flex row `alignItems:center`, icon là item riêng `flexShrink:0`, chữ gói cột riêng `minWidth:0`.
  - **Chuẩn Swap (nền surface, không viền) áp toàn app** — chi tiết danh sách ở mục 5 (blockquote 07-17d).
  - Verify: build pass ×2 · Playwright mock 390px chụp HomeSend / PasteAddress / SendAmount / SendConfirm / Language / Receive / CreateQR / QRLibrary — layout đúng, `pageerrors: none`.
  - PIN auto-mở bàn phím: KHÔNG làm được (gotcha mới đầu mục 7).

- **07-17c (ĐẬP ĐI XÂY LẠI màn Swap — BỎ BÀN PHÍM SỐ, chuyển sang THANH TRƯỢT %):** user đưa design + spec, đây là port nguyên hướng đó.
  - **Vì sao:** đối tượng EZwallet = người mới + người già → không bắt gõ từng chữ số. Giờ chỉ kéo "bao nhiêu % tài sản". **ĐỪNG nhét Numpad lại vào màn Swap** (SendAmount/CreateQR vẫn giữ numpad — chỉ Swap bỏ).
  - **Bản đồ hàng (user giao):** 1 tiêu đề · **2-6** You pay ⇅ You receive + khối Rate/Fee · **7** hint số chẵn · **8** thanh trượt · **9** nút Swap · 10 NavBar.
  - **Thanh trượt** (`components/PctSlider.jsx`): 6 mốc 0/20/40/60/80/100, kéo tự do 1%, **hút nam châm ±2%** quanh mốc, bấm thẳng vào track là nhảy tới. **CHỈ nhãn %** — user chốt BỎ nhãn tiền ($0/$15/$29) dưới mốc vì thừa. Dùng pointer events + setPointerCapture, KHÔNG `<input type=range>` (không tuỳ biến được mốc/bong bóng, iOS bắt trúng thumb mới kéo).
  - **Hàng 7 = gợi ý số chẵn** (`src/roundHint.js` + `test/roundHint.test.mjs`): kéo theo % ra số lẻ ($732 → 1% = $7.32) → khi gần một số chẵn thì hiện "Release to use $7", **thả tay là chốt đúng số đó**. Ngưỡng = **min(1 bước trượt, 25% số đang kéo)** — cần CẢ HAI: thiếu vế 1 thì gợi ý kéo user đi xa hơn 1 nấc; thiếu vế 2 thì $7.32 nhảy lên $10 (+36%, giật mình). Chỉ hiện **khi đang kéo** và **pct < 100** (100% = "đổi hết", gợi ý số nhỏ hơn là sai ý). Đổi 2 hằng số → chạy lại `node test/roundHint.test.mjs`.
  - **Bẫy đã dính khi làm, đừng lặp:** (1) thả tay vào hint mà dùng `floorTo` → hứa "$50.00" ra **$49.99** → phải làm tròn GẦN NHẤT rồi mới kẹp trần `floorTo(available)`; (2) `Fee` gas Arc <1 cent → `.toFixed(2)` ra "$0.00" nhìn như hỏng → hiện **`< $0.01`**.
  - **Màu:** giữ **brand blue** của app (mockup user gửi màu tím — đó là ảnh minh hoạ, không phải đổi thương hiệu).
  - **Cỡ chữ ĐÚNG THANG** (user chốt: "rất đẹp nhưng mình vẫn thích sự đồng bộ"): số chính 2 card = **`--fs-title` (size to 30)** + Light 300. Đo 390×844: `--fs-amount` 52 → khối hàng 2-6 cần **426px / có 417px = TRÀN**, nên 30 là cỡ LỚN NHẤT trong thang còn vừa. Bản cũ dùng số cứng 46/32, bản đầu 07-17c dùng 38 — **đều ngoài thang, đừng lặp**. Số cứng còn lại ở màn này chỉ là kích thước CHẠM/hình tròn (thumb 26, vùng chạm 44, thụt lề slider 22, logo token 28), không phải cỡ chữ.
  - Verify: build pass · Playwright mock 390px kéo 54% → hint $50.00 → thả ra đúng 46.30 EURC = $50.00, không tràn ngang, không lỗi JS. `test/roundHint.test.mjs` 15/15.
  - ⚠️ CHƯA test PIN thật (Circle SDK không chạy localhost) — vẫn là việc 1 mục 9.

- **07-17b (SỬA REGRESSION do chính phiên 07-17 gây ra — ví 1000 USDC báo "khả dụng 0.00", gửi + swap đều chết):**
  - **Nguyên nhân gốc: RPC Arc trả HTTP 429 (rate limit), và phiên 07-17 TỰ ĐÂM VÀO NÓ.** Phiên trước thêm `readBalance` retry 3 lần/token → mỗi lần đọc số dư bắn tới **9 request** (3 token × 3 lần) thay vì 3 → 429 → `Promise.all` all-or-nothing → 1 token hỏng giết cả 3 → hàm ném lỗi → HomeSend tự thử lại mỗi 3s → **vòng lặp chết, 429 vĩnh viễn**. "Retry cho chắc ăn" chính là thủ phạm.
  - **Chỗ vỡ ra mặt user:** phiên 07-17 đổi `getTokenBalances` sang NÉM LỖI nhưng **quên dọn đúng 2 màn tiêu tiền** — `SendAmount.jsx` `.catch(() => setAvailableAmt(0))` và `Swap.jsx` `.catch(() => {})` (+ `spendableOf(sym, undefined)` = 0) → cả 2 vẽ **0** = đúng cái nguyên tắc "không vẽ số chưa chắc" mà phiên đó vừa đặt ra. Ví 1000 USDC → "Insufficient balance (available: 0.00 USD)", nút chết.
  - **Fix:** (1) `readAllBalances` gộp **Multicall3 = 1 request** cho cả 3 token (số dư còn nhất quán cùng 1 block), retry 2 lần backoff **600/1200ms** (mức 250/500ms cũ quá ngắn cho rate limit); (2) SendAmount đọc hỏng → giữ `null` = `…` + tự thử lại 3s, KHÔNG về 0; (3) Swap đọc hỏng → không ghi `balances`, `Available: …`, khoá nút 50%/100% (bấm 100% khi số dư giả 0 sẽ điền "0").
  - **Verify RPC thật:** song song **0/5** → Multicall3 **8/8** (2 vòng dính 429 lẻ tẻ, retry cứu được). `npm run build` pass.
  - ⚠️ Vẫn CHƯA test luồng PIN thật trên deploy (Circle SDK không chạy localhost) — việc 1 mục 9 còn nguyên.

- **07-17 (số dư không còn bịa · app nhẹ gấp 3.4 lần · nhãn Faucet):**
  - **BỊA SỐ DƯ (bug nặng nhất):** `getTokenBalances` bọc mỗi `balanceOf` trong try/catch rồi trả `{amount:0}` khi lỗi → RPC Arc hỏng lẻ tẻ từng token → hiện 0 y như số dư THẬT bằng 0 → fetch sau ăn thì nhảy về đúng ("0 0 22 → 240 0 0"), và số bịa còn được GHI VÀO CACHE lan sang mọi màn. Thêm 2 chỗ hardcode `loading={false}` + `totalUsd=0` (MenuScreen/HomeReceive) → "chuyển màn về 0 0 0". **Nguyên tắc mới: KHÔNG BAO GIỜ vẽ số chưa chắc — chỉ 0 THẬT mới được hiện "$0.00"**, chưa biết → `…`. `readBalance` thử lại 3 lần rồi NÉM LỖI; chỉ ghi cache khi cả 3 token đọc thật thành công; HomeSend hỏng thì giữ `…` + tự thử lại mỗi 3s. Verify Playwright giả lập RPC: hỏng hoàn toàn → `…` ✓ · hồi phục → tự về $240 ✓ · **chập chờn 50%/call reload 6 lần → không lần nào ra số sai ✓**.
  - **LOAD LÂU → NẠP LƯỜI:** đo được **5.661ms** mới thấy chữ trên 4G (tải 1.689KB trước). Thủ phạm: App.jsx import TĨNH cả 22 màn → 1 bundle 1.704KB; trong đó Circle SDK **bản thân chỉ 31KB nhưng kéo theo firebase 262KB + crypto-browserify 480KB ≈ 740KB** (≈60% bundle) chỉ để ký PIN, mà lại chặn lần vẽ đầu. Fix: `lazy()` 22 màn + `import()` động cho W3SSdk (`getSDK()` **thành ASYNC** — mọi chỗ gọi phải `await`). → **1.676ms, tải trước 195KB** = nhanh 3.4×, nhẹ 8.7×. Chunk: entry 145KB · SDK+firebase 1002KB (chỉ tải khi ký PIN) · viem 264KB · jsQR 130KB (chỉ màn quét).
  - **NHÃN FAUCET:** faucet Circle phát 1 lượt CẢ BA token nhưng code cũ chặn `symbol === 'USDC'` + xoá cờ `ez_faucet_pending` ngay sau token đầu → EURC/cirBTC rớt thành "Received … from 0xd4c0…daae". Giờ nhận biết bằng **danh sách địa chỉ faucet tra từ ArcScan** (`chain.js` `isFaucetAddress`) + cờ pending làm lưới vớt cho faucet mới. TxHistory hiện "Received from **Faucet**", bỏ nút Add-to-Contacts cho faucet.
  - ⚠️ **CHƯA TEST ĐƯỢC luồng PIN thật** (Circle SDK không chạy localhost) — `await getSDK()` phải test trên deploy.

- **07-16b (xám cho chữ phụ · icon match font toàn bộ · fix màn Sign in with Email):**
  - **Chữ phụ → `--color-muted` = `#636366` (xám đậm)**, thay `#AEAEB2` (2.3:1, trượt AA — người già đọc không ra). Slogan Login bỏ hardcode `#48484A` (9.1:1, gần như đen) → dùng token. Lý do & số đo ở mục 5.
  - **Icon match font TOÀN BỘ** (user chốt): áp `--is-*` cho cả action-card (22→`--is-item`), menu leading/out (24→`--is-md-lg`), Login mail (22→`--is-md-lg`), badge TxHistory. Chỉ icon đứng một mình còn số cứng.
  - **EnterEmail:** chip domain `@gmail/@yahoo/@icloud` ở cỡ chữ 21 không đủ 1 hàng 350px → **tràn khỏi mép phải màn** → thêm `flexWrap:'wrap'` (giờ 2 hàng). **BỎ icon bóng đèn** ở gợi ý email quen thuộc (user: "nhìn xấu, mỗi email là được") → gợi ý chỉ còn email, dài thì cắt "…" trong khung (`maxWidth:100%` + ellipsis). Xoá import `Icon` mồ côi.
  - **Màn Login: user duyệt, KHÔNG đụng nữa.** Số đo (390×844): logo **đúng 50% bề ngang MÀN** (user chốt 07-17), tâm 20.5%dvh · slogan 21px w400, tâm 30.3%dvh · nút 280×51 = 71.8% ngang, **tâm đúng 90%dvh = vị trí 9**. Khoảng 33%→87%dvh bỏ trống (hơn nửa màn) — user chấp nhận.
  - **Đặt kích cỡ theo % CỦA MÀN:** thêm token `--screen-max: 430px` (`.screen` = `min(100vw, var(--screen-max))`, `max-width` giờ đọc token thay vì số ma). Muốn `<x>%` bề ngang màn → `min(<x>vw, calc(var(--screen-max) * <x/100>))`. Logo Login = `min(50vw, calc(var(--screen-max) / 2))`. **ĐỪNG dùng `width:'50%'`** — đó là % của khung cha đang thụt lề 20px mỗi bên (ra 44.9% màn), và tỉ lệ khung/màn ĐỔI theo máy nên không có % cố định nào của khung = 50% màn. Verify: 360/390/430/1280px đều ra đúng 50.00%.
- **07-16 (RÀ LẠI TOÀN BỘ THIẾT KẾ sau khi tăng cỡ chữ — sửa 3 bug GỐC):** User báo "lỗi nặng, số tiền không hiện, màn hình không hiển thị hết, thông báo cái chữ to cái chữ nhỏ". Rà bằng **Playwright + mock mode** (chụp mọi màn ở 360/390/430px + dump hình học DOM, không đoán bằng mắt) → hoá ra phần lớn quy về **3 lỗi gốc, sửa 3 chỗ là hết cả loạt**:
  1. **`.screen` thiếu `grid-template-columns`** → cột ngầm `auto` phình theo thông báo dài nhất (đo: cột **425px** trong khung **390px**) → kéo lệch MỌI hàng, cắt cụt mép phải (số dư, `$0.0(`, nút Paste, chữ Menu). Fix: `grid-template-columns: minmax(0,1fr)` + `minWidth:0` cho flex item chữ `nowrap`. Sau fix `.screen` scrollWidth 465→390 = khít khung, 430px sạch hoàn toàn.
  2. **`<button>`/`<input>` không kế thừa font** → ra **Arial** giữa app Barlow (user tự phát hiện ở địa chỉ ví màn Receive; `Swap.jsx` từng phải vá tay `fontFamily:'inherit'` = đúng bệnh này). Fix: rule global `button, input, textarea, select { font-family: inherit }`.
  3. **Icon không theo cỡ chữ** → chữ đã lên 19–24 mà icon còn 12–15 ("chữ to icon nhỏ"). Fix: thêm thang **`--is-*` ghép cặp `--fs-*`** (mục 5) + thay hết `size={số}` rời rạc bằng token (chevron menu 15→21, check token 20→24, navbar 20→21, copy/dropdown/warning…).
  - **NotifArea về MỘT cỡ chữ** `NOTIF_FS = --fs-item (17)` cho cả hint + cảnh báo + thông báo thật (trước: hint/cảnh báo 15 vs thông báo 19 → "cái to cái nhỏ"). **Chọn 17 chứ không 19** (user chốt): 19 thì câu dài bị cắt "…" ĐÚNG CHỖ SỐ TIỀN ("Faucet successful · received 2…"); 17 giữ nguyên câu chữ mà số tiền vẫn đọc được. Icon vùng này → `--is-item`.
  - **Rút gọn chữ hint** HomeSend/HomeReceive (câu cũ "save people's wallet addresses" đo được 397px trong ô 350px → vốn ĐÃ bị cắt sẵn, chỉ là bug cột phình che mất).
  - Verify: `npm run build` pass, mock KHÔNG lọt bundle prod (grep ví mock = 0).
- **07-15 (rebrand logo gradient · 1 font Barlow · tăng size chữ · fix số dư · PIN gọn · mock mode):** Gộp nhiều lần sửa trong ngày, trạng thái CUỐI:
  - **Logo** bản GRADIENT (icon ví "EZ"): `design/logo.svg` viewBox `1160×380` (Login+biên lai, canvas dùng tỉ lệ này), `logo-icon.svg` (chỉ icon), `fav_icon.png`, `icon.png` 512. Logo Login/PinGate width **56%**.
  - **Font:** toàn app **1 font Barlow** (bỏ IBM Plex + Barlow Condensed). Cỡ đặt tên: size to (title 30) / **vừa-to (21)** / vừa (19); số hero (BalanceHeader, `.amount-display`) → Light 300; tiêu đề → semibold 600. Áp vừa-to: navbar, menu+Sign out, Login slogan, EnterEmail (icon hint 20), Send (Gửi cho/recipient/note/nút USD), địa chỉ Receive, confirm+receipt (chính vừa-to, phụ vừa).
  - **Gradient** `--grad-brand` dọc `#0088FF→#0B53BF`: nền `.btn-primary` + `.action-card.primary` (thay flat); `--color-brand` #0B53BF đặc vẫn cho chữ/viền.
  - **Fix số dư:** bỏ `filter(amount>0)` ở `getTokenBalances` → HomeSend luôn hiện đủ 3 token kể cả số dư 0 (RPC verify cả 3 contract + balanceOf OK).
  - **PIN:** `PinGate` bỏ màn "Enter your PIN" riêng → vào tự bật thẳng PIN Circle. **Thông báo:** KHÔNG hết hạn (bỏ cutoff 2h ở `getNotifs`).
  - **Mock mode** `npm run mock`: ví/số dư ảo, chặn `/api/*`+ArcScan, Gửi/Swap giả lập — canh UI local không cần Circle. `src/mock.js`+`.env.mock`, gate cờ `VITE_MOCK`, KHÔNG lọt production.
  - Back QR Library căn giữa (`.row10-single`).
- **07-12 (fix gửi mobile + trạng thái swap):** **Bug PWA mobile không sáng nút gửi/swap:** `SendAmount` + `Swap` đọc thẳng `localStorage.ez_wallet_addr` (HomeSend thì dùng `ensureWalletAddress()` có khôi phục) → trên PWA lưu màn hình chính key có thể vắng → `availableAmt=0`/balances rỗng → `overBalance` luôn true → nút chết. **Fix:** cả 2 màn dùng `ensureWalletAddress()`; `canContinue`/`canSwap` chỉ chặn khi ĐÃ BIẾT số dư (chưa tải xong thì không khoá nút). **Swap thêm trạng thái nút:** "Swap submitted" (PIN ký xong, lệnh đã lên Arc) → poll số dư token nhận tăng → "Swap successful" (nút xanh lá + dấu check, tự ẩn sau 3.5s).
- **07-11 (rebrand):** Đổi màu thương hiệu xanh lá → **brand blue `#0B53BF`** (thêm token `--color-brand`, `--color-info`=brand); hệ màu ngữ nghĩa xanh lá=nhận/success, brand=gửi/thương hiệu. **Bỏ Barlow Condensed** (còn Barlow + IBM Plex). **Logo/icon mới** (EZ brand blue): logo.svg, fav_icon.png, icon.png 512. Fix icon check biên lai (check xanh lá to, bỏ circle trắng), amount gửi/receipt → brand, avatar contact chưa có ảnh = xám + dấu "+", nút Add-to-Contacts + filter history → brand. **Dọn file thừa:** xoá asset mồ côi (icon.svg/pfp cũ), bỏ `.wrangler` khỏi git + gitignore.
- **07-06 (S24):** Language/Currency khoá English (option VI/ZH + CNY/VND disabled). Faucet → thông báo "Faucet successful". → dừng build, sản phẩm ổn định.
- **07-04/05:** **Swap sửa đúng** (adapter.execute, verify eth_simulateV1 đạt → bật). Khoá mở ví bằng chính PIN Circle (PinGate). Google login đính chính (social = Confirmation UI, không PIN) → giữ Email+PIN, ẩn Google. Base quy đổi USD, USDC ghim $1.
- **Trước đó:** i18n, memo on-chain, jsQR, per-account store, cache balance chống nhấp nháy, layout 10 hàng + numpad tách nút, biên lai canvas, TxHistory/Contacts/QR UX.

## Quyết định quan trọng (đừng lặp lại hướng đã bỏ)

- **Swap = `adapter.execute` với intent có chữ ký**, KHÔNG bóc instructions chạy tay (mất tiền — mục 4). Kit amount = base units, không decimal. Dùng viem encode (không hand-roll tuple lồng bytes).
- **Mở ví = chính PIN Circle**, không tạo passcode riêng (đã thử app passcode + KV, bỏ vì rối). Email OTP đã thử → tắt (OTP mất PIN).
- **Google/SSO không gắn được PIN** (platform-level) → mỗi phương thức login = 1 userId/ví riêng. Giữ Email+PIN mặc định.
- **Tiền hiển thị base USD**, USDC=$1 (bỏ vòng VND — double-conversion làm "$5"→"$4.99").
- **RPC công cộng Arc CÓ RATE LIMIT (429) → đọc số dư PHẢI gộp Multicall3, 1 request** (07-17b). Đo thật: 3 `balanceOf` song song = hỏng **5/5**; tuần tự nghỉ 350ms vẫn 5/5 hỏng; nghỉ 700ms/token mới qua (>2s = quá chậm); **Multicall3 = 8/8 thành công, 1 request**. Multicall3 chuẩn ở `0xcA11bde05977b3631167028862bE2a173976CA11` (docs Arc → Contract addresses), khai trong `defineChain` → viem tự dùng. **ĐỪNG quay lại đọc từng token + retry mỗi token** — đó chính là cách tự đâm vào rate limit (chi tiết ở mục 10, mốc 07-17b).
- **KHÔNG BAO GIỜ vẽ con số tiền mà mình chưa chắc** (07-17, bug nặng nhất từ trước tới nay): đọc hỏng → **giữ số cũ / hiện `…`**, TUYỆT ĐỐI không trả 0 rồi hiện `$0.00`. Chỉ 0 THẬT (đọc thành công, số dư đúng bằng 0) mới được hiện `$0.00`. Áp cho mọi chỗ: `getTokenBalances` ném lỗi thay vì nuốt, cache chỉ ghi khi đủ cả 3 token, `BalanceHeader` chặn `null`/`NaN`, màn nào cũng phải truyền `loading` THẬT (đừng hardcode `false`).
- **W3SSdk PHẢI nạp lười** (07-17): đừng đổi lại thành `import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'` ở đầu `circle.js`/`Login.jsx` — nó kéo theo ~740KB firebase+crypto vào lần vẽ đầu (nhanh 3.4× nhờ bỏ cái này). `getSDK()` là **async**, mọi chỗ gọi phải `await`.
- **Nhận diện Faucet = theo ĐỊA CHỈ** (`chain.js` `isFaucetAddress`, tra từ ArcScan bằng hành vi "gửi nhiều ví + chưa bao giờ nhận về"), KHÔNG dựa mỗi cờ thời gian + KHÔNG chặn theo symbol (faucet phát cả 3 token 1 lượt).
- **Rà thiết kế = ĐO, không nhìn bằng mắt** (07-16): chạy `npm run mock` + Playwright chụp mọi màn ở **360/390/430px** và dump hình học DOM (so `scrollWidth` vs `clientWidth`, tìm phần tử rộng hơn `.screen`). Cách này lôi ra cột grid phình 425/390 mà mắt chỉ thấy "bị cắt kỳ kỳ" — và bác bỏ 1 nghi ngờ sai (tưởng bar xanh NavBar bị lệch, đo ra nằm đúng chỗ). Script mẫu: chụp + kiểm `OVERFLOW-X`/`CLIPPED-TEXT` tự động.
- **Docs tham chiếu:** Circle developers.circle.com · Arc docs.arc.io (MCP arc-docs). Đọc docs thật + verify bằng API/eth_call, KHÔNG đoán.
