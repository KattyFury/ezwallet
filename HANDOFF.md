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
- **DROP SHADOW nút bấm được (user chốt 07-22d — bản cuối):** bóng **THẲNG ĐỨNG** (offset-x 0, đổ dọc) `box-shadow: 0 4px 6px rgba(0,0,0,ALPHA)` — **VỪA, KHÔNG TỎA** (blur nhỏ 6px), bóng ĐEN (đừng tô theo màu nút). **ALPHA khác nhau để NHÌN NGANG BẰNG (user chốt 07-22g): nút GRADIENT `.35`, nút TRẮNG/chip `.25`** — nền tối của nút gradient "nuốt" bóng đen nên phải đậm hơn mới trông bằng nút trắng. Áp: `.btn-primary/.btn-success/.btn-error/.btn-secondary` + `.action-card` + `.action-card.primary` (class), VÀ **mọi nút/chip pill inline bấm được** (user chốt 07-22f "mọi button có bóng cho bà già hiểu"): chip token Swap `TokenRow`, "Hold to show tokens" (HomeSend), nút copy địa chỉ (HomeReceive), chip English/USD (Language). ĐỪNG tô màu nút, đừng tăng blur. **Nút pill trắng "Hold to show tokens" + copy địa chỉ: chữ ĐEN (07-22f, trước muted).**
- **Mũi tên dropdown `down2` = `--color-brand`** (user chốt 07-22c, trước là muted): chip token màn Swap (`TokenRow`) + chip tiền tệ màn Send (`SendAmount`) + chip English/USD màn Language (07-22f).

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
- Box xám đang phủ: 2 card màn Swap (Fee/Rate từ 07-20 là dòng chữ trần, KHÔNG box) · vùng token HomeSend (hàng 3→5.5, `height calc(100%+5dvh)`) · list Contacts/TxHistory (row 2-8) · Language (2-3) · Security (2-4) · About (2-8) · mọi ô nhập (`.address-input`, `.memo-row`; lỗi = inset shadow đỏ).
- **THÔNG BÁO thật** (nhận/gửi/lỗi) = **nền màu nhạt KHÔNG viền, chữ ĐEN** (received lá, sent xanh, error đỏ). **HINT = KHÁC HẲN (user chốt 07-22d — CHUẨN HINT TOÀN APP):** nền **TRẮNG + VIỀN XANH brand 1.5px + chữ/icon XANH brand** (đồng bộ chip gợi ý số tiền màn Swap). Áp cho MỌI hint: khối hint `HintBlock` (NotifArea Home), chip gợi ý email + chip domain EnterEmail, chip số chẵn + hint "Slide to adjust…" màn Swap. **KHÔNG nền vàng, KHÔNG icon bóng đèn** (user chốt 07-22e: bỏ `hint.svg` cho giống mọi hint — chỉ viền + chữ). Format khối hint Home: mỗi dòng `Label: desc`, label medium BẤM ĐƯỢC (đi tới nút cùng tên hàng 9), câu dài xuống dòng. **CỠ CHỮ HINT = `--fs-item` 17 CỐ ĐỊNH toàn app (user chốt 07-22e: chip sign-in trước 21px đã hạ về 17 cho bằng hint Home/Swap) — đừng để hint nào to hơn. BO GÓC: chip hint = PILL `borderRadius 999` (Swap/EnterEmail); khối hint nhiều dòng Home = `12` (user chốt 07-22g: chip sign-in trước bo 10 nhìn vuông, đã sửa pill).**
- **TÍN HIỆU "BẤM ĐƯỢC" = NỀN TRẮNG + VIỀN XÁM 1.5px** (user chốt 07-21 — nền `--color-surface` xám đọc như "lõm vào / không bấm được"). Đã áp: `.action-card` phụ (Contacts/Paste/QR Storage/Share; card `.primary` Scan QR/Create QR vẫn gradient, `border:none`) · ô SỐ TIỀN card "You pay" màn Swap (card "You receive" để trần — output không phải input) · gợi ý email + chip domain màn EnterEmail. Ô nhập text (`.address-input`) vẫn nền surface — đó là input thật, có caret/placeholder nên không lẫn.
- Toggle/lọc BẬT = nền trắng + viền brand + chữ brand. Nút chính 2/3 bề ngang, phụ 1/2.
- KHÔNG em-dash (dùng `–`), KHÔNG emoji. Scrollbar: `.scroll-thin`/`.scroll-hidden`.

**Brand assets:** `design/logo.svg` (Login + biên lai, viewBox 1160×380) · `design/logo-icon.svg` (để dành) · favicon `/fav_icon.png` · app icon `/icon.png` 512×512.

> 🎨 **Design: user tự làm UI, icon user tự vẽ (viewBox 100, stroke 10).** Đừng tự redesign; chờ user đưa hướng rồi port. Mốc thẩm mỹ: Coinbase Wallet — số to nhạt, tile nền nhạt, nhiều khoảng thở.

---

## 6. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding `0 20px`, `position:relative`). Sub-screen: hàng 1 tiêu đề, nút ở `.row10-single`/`.row10-dual` (absolute top 85dvh, tự ép `grid-row:auto`). 4 màn chính: NavBar hàng 10 full-bleed, chữ+icon `--fs/is-body 19`. **Tab CHƯA CHỌN = `--color-muted-2` #8E8E93 (xám TRUNG BÌNH, user chốt 07-22d — #636366 xám đậm nhìn dull); tab ĐANG CHỌN = đen + gạch brand trên đầu.**
- **⚠️ `.screen` PHẢI có `grid-template-columns: minmax(0,1fr)`** — bỏ là 1 chuỗi `nowrap` dài phình cột, lệch cả màn. **Flex item chứa chữ nowrap PHẢI `minWidth:0`.**
- **Numpad TOÀN APP = kiểu "XÁM VỪA" (user chốt 07-22g: `--color-surface-2` #D1D1D6, KHÔNG dùng surface #F2F2F7 nhạt nữa — cho phím trắng nổi):** panel/sheet nền `--color-surface-2` full-bleed từ NỬA HÀNG 6 → đáy màn, bo góc trên 20, PHÍM TRẮNG tile bo 12 khe 8px — class chung `.numpad-gray` (index.css). SendAmount + CreateQR: `gridRow 6/11, margin 5dvh -20px 0, padding 24px 20px 0`, Numpad flex 5.5 + vùng nút/đệm flex 3.5, nút `.row10-dual` nổi trên nền xám. Swap: sheet overlay cùng geometry (xem mục Swap), flex 5.5/0.5/2/1. **Đệm xám trên 24px + phím THẤP (numpad 5.5 phần, KHÔNG phải 6)** — user chốt 07-20c: phím to quá thì giảm chiều cao phím, nút Back/Done LUÔN neo biên hàng 9-10, đừng xê dịch.
- **Caret ô nhập số = dấu `_` ĐEN nhấp nháy** (class `.caret` màu `--color-content`, user chốt 07-22c: caret xám lạc màu với text đen; ăn cả Swap/SendAmount/CreateQR). Khi TRỐNG = CHỈ caret, không vẽ số 0 mờ (user chốt 07-20b tại Swap): KHÔNG vẽ số 0 mờ đứng cạnh caret ("0 là 0, _ là _"). **Màn Swap — QUY HOẠCH VÙNG (user chốt 07-20e, BẢN CUỐI):** khu hàng 2→9 là 1 flex column `justify-content: space-between` (paddingBottom 2dvh) chia **3 KHỐI**, 2 khe giữa TỰ ĐỘNG BẰNG NHAU (user: "cụm You pay/receive cách cụm hint+slider = cụm đó cách nút Swap", không chỗ nào trống lệch): (1) You pay + ⇅ + You receive + Fee/Rate; (2) chip gợi ý + PctSlider — **hàng chip PHẢI `height: 40` CỐ ĐỊNH** (bug 07-21: `hints.map` rỗng → hàng cao 0 → space-between kéo cả cụm trượt xuống mỗi lần hint hiện/tắt; chừa sẵn chỗ thì slider đứng yên, chip chỉ mờ/hiện). **07-23 (đảo 07-22e): BỎ hint pill "Slide to adjust…" — khi CHƯA chọn số hàng này để TRỐNG (vẫn giữ height 40), hướng dẫn chuyển vào NÚT SWAP: nút hiện "Slide or tap here to enter" (chữ fs-item 17 — 21 mặc định bị cắt ellipsis, verify Playwright scrollW≤clientW) + bấm = mở numpad (openPad); có số → nút về "Swap" như cũ, chip gợi ý số chẵn hiện lại.** Verify bằng cách đo `getBoundingClientRect().top` của track + nút Swap ở pct=0 và pct=50, phải TRÙNG; (3) **nút Swap = PILL `.btn` mặc định** (bo 50, cao 6dvh — user chốt 07-21, ĐẢO bản 07-20e "vuông 8dvh" vì không match nút các màn khác) **ĐỒNG TÂM với action-card Scan QR/Create QR**: khối bọc copy y hệt hình học `.action-grid` = `height 8dvh` + `marginBottom 2dvh`, nằm cuối flex space-between vùng `2/10` → band 80→88dvh, nút canh giữa ⇒ **tâm 84dvh** khớp action-card. ⚠️ ĐỪNG thêm `paddingBottom` cho vùng cha (marginBottom của khối đã lo 2dvh) và đừng đổi lại height/radius. Verify: đo `centerY` của Scan QR (Send), Create QR (Receive), Swap — phải BẰNG NHAU (đo được 783px cả 3). Nút vẫn là NƠI DUY NHẤT hiện trạng thái Preparing/Enter PIN/Submitted/lỗi. You pay/receive card = flex column **height `calc(20dvh - 5px)` + justify-content CENTER + gap 10** (user chốt 07-22f: mỗi card 20dvh-5px, cộng khe ⇅ 10px = đúng 40dvh → 2 card FIT KHÍT hàng 2-5, Rate/Fee về đúng nửa trên hàng 6; đo Playwright 390×844: You pay 10→29.4dvh, You receive 30.6→50dvh, Rate/Fee 51.2→53.6dvh — ĐỪNG để lố 40dvh kẻo đẩy Rate/Fee lệch). Center+gap để kéo nhãn GẦN chip token. **Hàng balance: You pay = "Available: <số> <token>" (balLabel="Available"), You receive = "Balance: <số> <token>" (balLabel="Balance") — 07-22g user yêu cầu GIỮ Available bên You pay (đừng bỏ). Chip token [SYM] có drop shadow đen như mọi nút.** Nút ⇅ margin **-17/-17** trên nút 44px → net 10px flow = KHE 10px giữa 2 card (user chốt 07-22b: chạm sát xấu; You receive dời xuống 31.2→51.2dvh, Rate/Fee 52.4→54.7dvh vẫn nửa trên hàng 6). Nút bắc cầu qua khe; **nút ⇅ (user chốt 07-22h — BỎ vòng trắng cũ): border:none, nền `--color-info-soft` xanh nhạt, icon `--color-brand` xanh đậm, drop shadow đen .25 (tín hiệu bấm được)** — nút vẫn 44px, khe 10px không đổi. **Fee/Rate**: 1 dòng fs-item 17, `Rate:` căn TRÁI · `Fee:` căn PHẢI, nhãn xám + SỐ LIỆU ĐEN. Card nội dung: nhãn · [chip token ▼ trái | SỐ TO phải, KHÔNG lặp tên token] · [Available trái | ~$ phải]; **nhãn You pay/receive `--fs-body` 19, hàng phụ Available + ~$ `--fs-item` 17** (07-21: 2 cái bằng nhau làm MẤT phân cấp nặng–nhẹ), chip logo 32 + chữ 19, số base 52 co giãn. **Numpad Swap:** bấm SỐ TIỀN You pay → sheet trượt từ dưới lên chiếm **nửa hàng 6 → hàng 10** (55→100dvh): NỀN XÁM surface + PHÍM TRẮNG tile bo 12 khe 8px (nổi button), KHÔNG khoảng trắng thừa trên đầu, overlay TRONG SUỐT (user chốt: numpad bật mà màn chính mờ đi là SAI); trong sheet Numpad 30dvh + nút Back/Done pill 44% ở 85-95dvh (khớp .row10-dual) + đệm 5dvh. Gõ live cập nhật số + pct + estimate; Back = hủy số vừa gõ, Done/bấm ra ngoài = giữ; slider + chip gợi ý giữ nguyên.
- **TxHistory LUÔN hiển thị ĐẦY ĐỦ lịch sử** (user chốt 07-20, sửa hiểu nhầm 07-19: từng cắt còn 24h + hint cách dùng → SAI). Chỉ THÔNG BÁO (NotifArea) mới là thứ "trong ngày"; lịch sử là sổ đối soát, không cắt, KHÔNG hint trong đó.
- **TxHistory: swap = 2 DÒNG riêng, KHÔNG gộp** (user chốt 07-20d, đảo quyết định gộp 07-19 — gộp "Swapped X → Y" làm MẤT 2 số -X / +Y ở cánh phải). Mỗi leg là 1 TxRow: leg ra "-$X / X EURC" (đỏ), leg vào "+$Y / Y USDC" (xanh). **Tiêu đề cả 2 dòng = "Swapped <outAmt> <outSym> to <inSym>"** (vd "Swapped 20.00 USDC to EURC" — user chốt 07-20d "Swapped" trơ thiếu info) + **phụ đề "Swap completed · At <giờ>"**. Cần `swapPairs` (map hash→{outAmt,outSym,inSym}, dò từ `txs` để tab Gửi/Nhận vẫn đủ hướng) truyền `swapInfo` vào TxRow. Đã xoá `SwapRow` + `buildDisplayList`. Font TxRow GIẢM cho fit màn: icon 40→34, tiền phải fs-num 24→fs-md-lg 21, token/giờ/note fs-tiny 13, padding dọc 11, gap 10.
- **GỘP là gộp 2 THÔNG BÁO swap (NotifArea), KHÔNG phải lịch sử** (user nhắc 07-20d): 1 thông báo `Swapped X EURC to ~Y USDC (complete)` (thất bại → `(failed)`), phát từ `Swap.jsx handleSwap`; `NotifArea.pollIncoming` đã TẮT branch `outHashes` (không thêm "Swap complete·received" riêng nữa).
- **Slider % (PctSlider):** nam châm hút mốc theo HÀNH VI (user chốt 07-20d) — CLICK/TAP `SNAP_TAP = ±9%` (dễ trúng mốc), ĐANG KÉO `SNAP_DRAG = ±2%` (không lấn ý người kéo). `pctFromEvent(e, snapZone)`: down()→SNAP_TAP, move()→SNAP_DRAG. Verified Playwright: click@47%→50, drag→47% giữ nguyên. Mốc dot 14px, nhãn % fs-item 17 + BẤM ĐƯỢC (chạm nhãn nhảy tới mốc). Marker 0/25/50/75/100.
- **ShowQR (xem/ tạo QR nhận tiền):** QR TO = `min(30dvh,78vw)` (bằng QR màn Nhận), cao 3 hàng (2-4); hàng 5→8 số tiền TO `fs-amount` light + phụ đề `fs-md-lg`; nút Share/Back ở `.row10-dual` (9-10). Tiêu đề ĐỘNG theo cờ `fromStorage` (07-20d, KHÔNG dựa vào có/không tên): mở QR ĐÃ LƯU từ kho → `QR Storage: <tên>` (không đặt tên → `QR Storage: Item`); tạo QR mới (màn Nhận/custom) → `Create receive QR`. SavedQRList onClick PHẢI truyền `name: q.name` + `fromStorage: true`. **Add-to-library (SavedQRList popup):** ô Amount label kèm ký hiệu tiền tệ mặc định — `Amount (${displaySymbol(getDisplayCurrency())})` (USDC→$, EURC→€).
- **HINT (NotifArea) = `Label: mô tả`, label BOLD (medium), KHÔNG gạch chân, BẤM ĐƯỢC** (user chốt 07-21 bản cuối — từng thử gạch chân rồi bỏ, giữ lại bold): mỗi dòng `{label, desc, onClick}`, bấm vào label đi ĐÚNG nơi nút cùng tên ở hàng 9 dẫn tới; câu dài ĐƯỢC XUỐNG DÒNG (bỏ nowrap/ellipsis — chỉ thông báo THẬT mới giữ 1 dòng cắt "…"). **Nhãn hint PHẢI TRÙNG nhãn nút hàng 9.**
  **Text chốt (đừng tự sửa):** Send — `Paste: Paste a wallet address` → PasteAddress · `Scan QR: Scan a QR code to send` → QRScanner · `Contacts: Save people you send to often` → Contacts (thứ tự hint = thứ tự nút hàng 9 trái→phải, user chốt 07-23: Contacts dùng nhiều → nằm PHẢI). Receive — `QR Storage: Save your favorite QR codes` → SavedQRList · `Create QR: Create a QR to receive money` → CreateQR · `Share: Share your wallet address` → handleShare.
  ⚠️ Khi có thông báo thật, hint bị đẩy lên + mờ mép trên (đúng thiết kế ưu tiên: hint thấp nhất). Box token màn Send VẪN scroll khi nhiều token (đừng bỏ overflow).
- **SendAmount — NOTE MẶC ĐỊNH** (user chốt 07-20e): cụm Send-to/số tiền/note gom 1 flex column `gridRow 2/6` **gap 4dvh** (07-22c: 2dvh quá sát/ngộp → giãn ra cho thoáng, vẫn là 1 cụm căn giữa). Ô note có **icon `option` bên PHẢI** (nút 52×52 nền surface) → popup "Set your default note" (input "Type here", Back/Save), lưu `localStorage ez_default_note`. memo khởi tạo = note mặc định → hiện như VALUE thật (không phải placeholder mờ); **click vào ô note lần đầu (onFocus) mà đang là note default → XOÁ để gõ mới** (`noteTouched` chặn xoá lại). Mọi lần gửi memo tự mang note mặc định.
- **BalanceHeader số dư TO** (user chốt 07-20e, lấp chỗ trống): `amountFontSize(str, 76, 7, 40)` — base 76px (trước fs-amount 52), tự co theo độ dài (7 ký tự vừa khít, dài hơn co xuống, sàn 40), `whiteSpace nowrap` + padding 12 để số lớn vẫn vừa bề ngang. Dùng chung HomeSend/HomeReceive/MenuScreen.
- **ShowQR title = `QR: <tên>`** (user chốt 07-20e, bỏ chữ "Storage" cho gọn — tên dài đỡ thiếu chỗ); QR không tên → `QR: Item`; tạo mới → `Create receive QR`.
- **SavedQRList xóa QR = POPUP CONFIRM** (user chốt 07-20e, chống bấm nhầm): bấm × → popup `Delete QR: <tên>` (không tên → số tiền) + [Quay lại][Confirm đỏ], KHÔNG xóa ngay. Chuẩn popup tâm vùng hàng 1-6.
- **Chevron `right2` (hàng đi tiếp) = `--color-brand`** (07-20, trước là `--color-faint` nhìn như disabled); `--color-faint` chỉ còn cho placeholder/icon ẩn. Ô nhập text chuẩn = cao 52 + `--fs-md-lg` (email/memo/paste address đã đồng bộ).
- **Input text ở hàng 1-4 hoặc popup neo nửa trên** (`.popup-card` tâm 30dvh) — bàn phím iPhone che nửa dưới. Không autoFocus trong popup. **Khoá cuộn trang** (`App.jsx` listener) — ĐỪNG xoá.
- **Vị trí 55dvh = "dòng phụ giữa màn"** dùng chung: nút Hold-to-show (Gửi) và dòng địa chỉ+copy (Nhận) neo absolute top 55% → qua lại tab không nhảy. QR màn Nhận = `min(30dvh, 78vw)` chiếm hàng 3-6.
- **HomeSend:** h1-2 số dư · h3-5.5 box token · h7-8 NotifArea · h9 3 action-card (trái→phải **Paste · Scan QR · Contacts**, user chốt 07-23) · h10 NavBar. **QRScanner:** cụm ô quét + 2 dòng chú thích căn tâm hàng 1-6.
- **SendReceipt (07-23):** confirm-box + canvas biên lai có dòng **Address = ĐỊA CHỈ VÍ FULL** (đối soát on-chain; màn hình fs-tiny break-all, canvas font 18 để vừa 1 dòng). Canvas H = 650 (memo 710) — đáy dòng cuối + **50px khoảng thở + logo + 22 lề** (trước logo dính sát divider dòng cuối — đừng để lại).
- **TxHistory row:** trái `[icon] Sent/Received` + giờ + [Add to Contacts] + Note; phải `±$` (đỏ/xanh lá) + token thật xám. **KHÔNG kẻ line xám ngăn cách** trong list/box (trừ NavBar + hàng Rate/Fee).
- **`<button>/<input>` phải kế thừa font** — đã có rule global `font-family: inherit`, đừng xoá.

---

## 7. Gotchas Circle/Arc (xương máu — giữ vĩnh viễn)

**Circle W3S:**
- **Màn PIN = iframe `pw-auth.circle.com` (cross-origin):** không sửa được UI, English thuần, **KHÔNG auto-mở bàn phím số được** (browser cấm focus xuyên origin, iOS bắt chạm trực tiếp — user hỏi rồi, ĐỪNG đào lại). **Cũng KHÔNG đóng iframe sớm hơn được sau khi nhập xong PIN** (user hỏi 07-20): SDK đã tự gỡ iframe NGAY tại message `onComplete` (đọc source `messageHandler`); phần "đứng lại" 1-3s sau khi gõ số = spinner Circle xử lý challenge bên trong iframe. Tự gỡ iframe khi challenge chưa settle = mất kết quả ký (root cause bug PIN cũ) — ĐỪNG làm.
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
- **Dải xám trên cùng ở status bar = nền `body`.** iOS standalone PWA thiếu `viewport-fit=cover` (index.html) nên nội dung bó trong safe-area; vùng status bar (ngoài viewport) bị iOS lấp bằng **màu nền `body`**. Trước để `--color-gray` → lộ dải xám. Fix 07-19: `body background = --color-white` (index.css) → hoà trắng với `.screen`. **ĐỪNG đổi body bg mặc định về xám lại.** ⚠️ Cập nhật 07-22: nền NGOÀI khung app trên desktop/tablet = XANH DƯƠNG PASTEL NHẠT NHÒA qua `@media (min-width: 481px) { body { background: #D6EAFB } }` (user chốt 07-22c — từ #0B53BF→#0088FF→#D6EAFB, càng lúc càng nhạt cho đỡ chói; đảo bản xám 07-21) — an toàn vì điện thoại luôn ≤430px nên không chạm ngưỡng; `.screen` có nền trắng riêng nên khung app không bị xám lây. Muốn full-bleed kiểu native thì thêm `viewport-fit=cover` + `env(safe-area-inset-*)` padding cho `.screen` (đụng lưới 10 hàng — user đã chọn KHÔNG làm, giữ nền trắng).
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
   - **ĐÃ LÀM 07-22g (user "app chưa mượt"):** `App.jsx` PREFETCH lúc `requestIdleCallback` — nạp nền các màn hay dùng (HomeSend/Receive/Swap/Menu/SendAmount/Contacts/TxHistory) + Circle SDK 1MB (bỏ qua khi MOCK) → đổi tab không chớp trắng, bước PIN không khựng vì tải nguội. KHÔNG đổi logic (chỉ warm cache; import() động vẫn chạy khi điều hướng thật). Đo bundle thật: `index`(SDK) 1026KB/gz281 · `chain`(viem) 270KB/gz83 · `QRScanner`(jsqr) 134KB — 2 cái sau lazy đúng. Chưa verify độ mượt trên deploy (mock không nạp SDK) — cần đo trên máy thật.

---

## 10. Bài học chính (đúc kết — chi tiết trong git log)

- **Swap phải qua `adapter.execute` với intent có chữ ký** — bóc instructions chạy tay = MẤT TIỀN (đã dính).
- **Retry dày với RPC rate-limit = tự giết mình** — gộp Multicall + backoff dài; số chưa chắc thì hiện `…` đừng vẽ 0.
- **Circle iframe giữ modal khi user nhập sai** — reject sớm promise = user nhập đúng lại nhưng kết quả rơi vào hư không.
- **Grid không khai cột / flex thiếu minWidth:0** = 1 chuỗi dài phá layout cả màn.
- **"Cải tiến" không verify từng bước** (retry, catch-về-0) từng gây regression nặng hơn lỗi gốc — mọi thay đổi UI verify Playwright mock, mọi thay đổi swap verify eth_simulateV1.
