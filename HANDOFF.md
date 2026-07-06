# HANDOFF — EZwallet

**Cập nhật:** 2026-07-06 (session 22 — chạy local dựng lại dev-server.js; lề 20px + NavBar full-bleed; scrollbar trong gutter (scrollbar-gutter stable); nút Back/Continue absolute vị trí 9 + grid-row auto; nút Swap vị trí 5 + gộp mọi trạng thái/lỗi vào nút; floor max BTC; auto co chữ số dài; popup chuẩn tâm 30dvh; QRScanner căn giữa; TxHistory cấu trúc row mới; Language/Security/About mỗi mục 1 hàng; BỎ TOÀN BỘ line xám trừ NavBar)
**Repo:** https://github.com/KattyFury/ezwallet · **Live:** https://ezwallet.pages.dev (Cloudflare Pages, auto-deploy từ `main`)
**Local:** `D:\Files\Claude\build_on_arc\ezwallet` (đổi tên 2026-07-06 do user; trước là `Claude_laptop\Build_on_Arc`)

> ⚠️ **ĐẦU MỖI PHIÊN: đọc CẢ HAI — `HANDOFF.md` NÀY + `CLAUDE.md`** (CLAUDE.md = cách làm việc với user: trả lời tiếng Việt, chạy tech chuẩn/đọc docs/không đoán, commit+push, báo cáo trung thực...). Đọc thiếu 1 trong 2 là làm sai gu.

> Ví stablecoin cho người dùng phổ thông / người già. UX đơn giản, mobile-first.
> Nguyên tắc: **CHẠY TECH CHUẨN của Circle/Arc, đọc docs + verify bằng gọi API thật trước khi làm, không đoán.**

---

## 0. ⭐ COMBO ĐỂ BUILD ON ARC (quan trọng nhất — nạp bộ này TRƯỚC MỖI SESSION)

> Bộ 3 tài nguyên chính chủ cho AI, mỗi bên (Circle + Arc): **Skills** (agent skill), **MCP** (server tra cứu live), **llms.txt** (bản đồ docs full-text cho LLM). Đọc/nạp đủ 6 link này = có tech chuẩn, đỡ đoán.

**Circle:**
- Skills: https://developers.circle.com/ai/skills
- MCP: https://developers.circle.com/ai/mcp
- llms.txt: https://developers.circle.com/llms.txt

**Arc:**
- Skills: https://docs.arc.io/ai/skills
- MCP: https://docs.arc.io/ai/mcp
- llms.txt: https://docs.arc.io/llms.txt

> Trạng thái local hiện tại: Circle Skill (`circle:*`) ✅ · Circle MCP (`mcp__circle__*`) ✅ · Arc MCP (`mcp__arc-docs__*`) ✅ — đã kiểm 2026-07-04, đủ 3/3.

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
- **Quy đổi BASE = USD (S16, 2026-07-04), KHÔNG còn đi vòng VND.** `chain.js`: giá lấy CoinGecko `vs_currencies=usd`, **USDC ghim = $1 chính xác** (đừng để noise ~0.9998 làm "$5"→"$4.99"); EURC/cirBTC giá USD live (fallback usdRate 1.08 / 65000). Field giá trị token = `usd` (KHÔNG `Math.round` — cần cent). `getDisplayRates()` trả **USD mỗi 1 đơn vị** `{USDC:1, EURC:~1.08, cirBTC:~BTC}`; `displayNum(usd, cur, rates) = usd/rate[cur]` → cur=USDC ra $, cur=EURC ra €, **stablecoin ĐÚNG 1:1**. Đổi tên `getVndRate→getUsdRate`, `estimateFeeVnd→estimateFeeUsd`, prop `totalVND→totalUsd`. (Legacy VND của QR/receipt/AmountSuggest giữ nguyên — tách biệt, đã default USD.) Verify: build OK + test math ($5.00/€5.00 chuẩn).
- **Chừa phí mạng:** `GAS_RESERVE_USDC = 1` + `spendableOf(sym, bal)` (data.js) — khả dụng USDC luôn trừ 1 (gas Arc trả bằng USDC, khách "gửi hết" sẽ kẹt không còn phí). Áp ở SendAmount + Swap. Gas thực tế rất rẻ (<1 cent) nhưng 1 USDC là mức an toàn user chọn.
- **App khóa ENGLISH** (`i18n.js` `LANG='en'` cứng): Circle SDK chỉ có tiếng Anh → khóa toàn app cho đồng nhất. Hạ tầng VI/ZH + `detect()` còn nguyên — mở lại chỉ cần `LANG = detect()`. Chuỗi MỚI cứ hardcode English; key cũ qua `t()`.

---

## 3. Trạng thái tính năng

**✅ Chạy thật (verified on-chain / trên deploy):**
- **Email login** → tạo ví (userId = email, authMode PIN) → PIN + câu hỏi bảo mật qua SDK. **KHOÁ MỞ VÍ (S19):** lần 2+/mở lại app phải qua `PinGate` (nhập PIN, ký message rỗng verify). Lần 1 (vừa đặt PIN) vào thẳng. Màn Login chỉ còn nút Email (Google ẩn). Email OTP đã dựng nhưng TẮT (`EMAIL_OTP_ENABLED=false`) — xem S19.
- **Gửi tiền** USDC/EURC/cirBTC — `functions/api/send.js`: transfer thường hoặc qua Memo contract khi có lời nhắn (UTF-8 tiếng Việt ok, verified tx `0xb75b...7e50`). idempotencyKey chống gửi trùng.
- **Session-restore**, balance on-chain + tỷ giá live, TxHistory (ArcScan API + memo từ Memo event), Contacts (per-account, avatar cropper), QR (tạo/quét/kho, jsQR), thông báo in-app (NotifArea, tự hết hạn 2h), biên lai (canvas → Photos qua Web Share API), Onboarding, per-account store (`store.js`).
- **Đổi PIN** (user email): `PUT /v1/w3s/user/pin` → challenge → PIN cũ + PIN mới. ✅ verify bằng gọi API thật.
- **Số dư KHÔNG nhấp nháy khi chuyển màn** (S17): `chain.js` cache số dư (`_balCache` theo địa chỉ) + tỷ giá (`_ratesCache`) ở tầng module; `cachedBalances()`/`cachedRates()` (đồng bộ). HomeSend/HomeReceive/MenuScreen/BalanceHeader seed state từ cache → hiện số cũ NGAY, fetch nền cập nhật (như app ngân hàng). Cache sống theo phiên (mất khi reload).
- **refreshSession()** (`circle.js`): gọi TRƯỚC MỌI thao tác cần PIN — email user tạo token mới qua userId=email; Google user đổi `refreshToken` qua `POST /users/token/refresh` (body `{idempotencyKey, refreshToken, deviceId}` + header X-User-Token).

**✅ SWAP — ĐÃ SỬA ĐÚNG + VERIFY + BẬT (S15, 2026-07-04). `SWAP_ENABLED=true`.**

> **VERIFY ĐÃ ĐẠT (verify-swap.mjs, eth_simulateV1, ví `0x29eb…d03d`):** 2 EURC→USDC → số dư USDC
> ví TĂNG **+3.12254**, KHỚP CHÍNH XÁC Kit estimate, swap không revert, gas ~538k. Tiền THỰC SỰ
> về ví (cách cũ bóc-instructions không bao giờ đạt). Đã bật `SWAP_ENABLED=true` trong Swap.jsx.
> Nên user test 1 lần swap số nhỏ trên deploy (ký PIN thật) để xác nhận luồng UI đầu-cuối.
>
> **S15 đã làm (đúng cách adapter, KHÔNG còn bóc instructions):** viết lại `execute` gọi
> `ADAPTER.execute(executionParams, tokenInputs, signature)` — lấy `executionParams`+`signature`
> nguyên từ response `/swap`; `tokenInputs=[{permitType:0(NONE), token:tokenIn, amount, permitCalldata:'0x'}]`
> (chiến lược 'approve'); batch `[approve(tokenIn→adapter, amount), adapter.execute(...)]` qua
> Multicall3From = 1 PIN. ABI `execute` copy nguyên từ source `@circle-fin/adapter-viem-v2`
> (`adapterContractAbi`, hàm `execute(ExecutionParams,TokenInput[],bytes)`). Encode bằng **viem**
> (tuple lồng dynamic bytes — hand-roll dễ sai offset). **Round-trip encode→decode đã test khớp byte.**
> Lõi encode/verify tách ra `functions/api/_swapCore.js` (dùng chung swap.js + dev-server.js, hết footgun sync tay).
>
> **⚠️ CÒN 1 BƯỚC BẮT BUỘC trước khi bật:** chạy verify (không tốn tiền, không PIN):
> `cd ezwallet && node verify-swap.mjs <địa_chỉ_ví> EURC USDC 2` — gọi `/swap` thật + `eth_simulateV1`
> đọc số dư USDC ví TRƯỚC/SAU. **Chỉ đổi `SWAP_ENABLED=true` (Swap.jsx) khi thấy USDC ví TĂNG.**
> Nếu delta=0 (Multicall3From/CallFrom không giữ msg.sender cho adapter.execute) → fallback tách
> approve/execute thành 2 PIN tuần tự (không qua Multicall3From). Cũng có action `simulate` trong
> swap.js/dev-server để verify từ app/deploy.
>
> ── Dưới đây là root-cause & bằng chứng gốc (S14), giữ lại để hiểu vì sao làm vậy ──

**❌🔴 (LỊCH SỬ S14) SWAP bóc instructions = SAI, LÀM MẤT TIỀN.**

> ⚠️⚠️⚠️ **ROOT CAUSE THẬT (tìm ra 2026-07-04 sau khi mổ on-chain + đọc source SDK — KHÔNG đoán):**
> Response `/v1/stablecoinKits/swap` KHÔNG phải để bóc `instructions[]` chạy tay. Nó là 1 **intent có CHỮ KÝ** (`transaction.signature`) phải nộp cho **1 ADAPTER CONTRACT của Circle**. Adapter mới là thứ chạy instructions, GOM output, rồi **ghi có cho `beneficiary` (ví)**. Bóc instructions chạy tay (dù trực tiếp hay qua Multicall3From) = **bỏ qua bước settlement** → token vào bị tiêu, USDC output KẸT Ở ADAPTER, KHÔNG BAO GIỜ VỀ VÍ.
>
> **Bằng chứng cứng:**
> - Trace log tx swap thật (status=1): `USDC 85.09 [router] → 0xBBD70b01...` — output bay tới **`0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b`**.
> - Địa chỉ đó = `ADAPTER_CONTRACT_EVM_TESTNET` trong source `@circle-fin/provider-stablecoin-service-swap/index.mjs` dòng ~595. Đó là adapter settlement, KHÔNG phải ví user.
> - `eth_simulateV1` bundle [approve+instructions] gọi TRỰC TIẾP từ ví: EURC 5→2 (bị tiêu 3) nhưng **USDC ĐỨNG YÊN** → kể cả gọi trực tiếp, bóc-instructions vẫn không giao USDC.
>
> **Cấu trúc response đúng (dump thật):** top-level `{tokenIn/OutAddress, tokenIn/OutChain, fromAddress, toAddress, amount, stopLimit, estimatedAmount, fees, route(provider:"lifi",tool:"fly"), transaction}`. `transaction = { signature, gasLimit, executionParams: { execId, deadline, metadata, tokens:[{token, beneficiary:ví}], instructions:[{target,data,value,tokenIn,amountToApprove,tokenOut,minTokenOut}] } }`. **`transaction.to` và `transaction.data` = undefined** → mình PHẢI tự dựng lệnh gọi ADAPTER với `(executionParams, signature)`.
>
> **CÁCH ĐÚNG cần làm (session sau):**
> 1. Gọi **ADAPTER `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b`** (Arc Testnet) bằng hàm nhận `(executionParams, signature)` — 1 tx / 1 PIN qua `contractExecution` (contractAddress=adapter, callData=encode hàm execute). Có thể vẫn cần `approve(tokenIn → adapter, amount)` trước → gộp approve+execute vào Multicall3From CÓ THỂ vẫn hỏng recipient (đã thấy), nên **kiểm bằng eth_simulateV1 rằng USDC VỀ VÍ trước khi ship**.
> 2. **CHƯA CÓ ABI/tên hàm của adapter.** Lấy từ: **(a) Circle codegen MCP** `https://api.circle.com/v1/codegen/mcp` (đã `claude mcp add` scope user vào `C:\Users\Dell\.claude.json`, cần RESTART để nạp) — hỏi nó cách execute stablecoin-kit swap cho on-chain; **(b) hoặc đọc source** `@circle-fin/app-kit` + `@circle-fin/adapter-viem-v2` + `@circle-fin/provider-stablecoin-service-swap` (đã `npm install --no-save`, nằm trong node_modules NHƯNG chưa lưu package.json — `npm ci` sẽ mất, cài lại để đọc) — tìm chỗ nó build tx tới ADAPTER_CONTRACT (functionName + abi encode executionParams+signature).
> 3. **BẮT BUỘC: sau khi build, verify bằng `eth_simulateV1`** (bundle approve+execute từ ví, đọc `balanceOf(USDC, ví)` trước/sau) — chỉ ship khi USDC ví TĂNG đúng. Đừng tin "tx status=1" (tx cũ status=1 mà vẫn mất tiền).
>
> **CÁC HƯỚNG ĐÃ THỬ & THẤT BẠI (đừng lặp):**
> - Bóc `instructions[]` gộp `Multicall3From.aggregate3` (S11-13) → tx status=1 nhưng USDC về ADAPTER (msg.sender = proxy CallFrom), MẤT TIỀN.
> - Thêm `approve` trước mỗi instruction (S13) → sửa được revert "exceeds allowance" nhưng VẪN mất tiền (vì gốc là thiếu adapter settlement, không phải thiếu approve).
> - Gọi instructions trực tiếp từ ví (sim S14) → EURC bị tiêu, USDC không về. Bóc-instructions về bản chất SAI.
>
> **Đã verify ĐÚNG (giữ lại):** Kit `amount` = **SỐ NGUYÊN BASE UNITS** (decimal "88.57" → 400; số nhỏ → "No route" 404). Server `toBase`/`fromBase` 2 chiều — GIỮ. Swap quá nhỏ → 422 `331001`. Route đủ 2 chiều USDC↔EURC↔cirBTC.
> **UI Swap đã đẹp (giữ):** FROM h2-3, arrow h4, TO h5, nút Swap h6, numpad chuẩn h7-9; chip 50%/100%; `~` thay `≈`; picker 3 token. **CHỈ phần EXECUTE ở `functions/api/swap.js` (action 'execute') + `dev-server.js` là SAI** — cần thay bằng gọi adapter.
> **Đã DISABLE:** `SWAP_ENABLED=false` trong `Swap.jsx` (nút Swap mờ + báo "Swap tạm khóa"), tránh mất thêm tiền testnet tới khi execute đúng.

**❌ Google login — ĐÃ BỎ KHỎI UI (S19, user chốt). Hạ tầng giữ nguyên, bật lại = thêm nút.**
- Login + tạo ví + OAuth redirect ĐÃ CHẠY (fix qua 3 session: cookies persist config qua redirect, `getDeviceId()` thật của SDK, lưu refreshToken). `handleGoogleLogin`/onLoginComplete/cookies vẫn còn trong Login.jsx (chỉ ẩn nút).
- **🔑 ĐÍNH CHÍNH + XÁC NHẬN BẰNG TEST THẬT (S16 hiểu, S19 test OTP kiểm chứng):** social login + email OTP **duyệt giao dịch bằng CONFIRMATION UI (bấm đồng ý), KHÔNG có PIN**; *"Confirmation UIs are NOT available for the PIN authentication method"* (docs). S19 bật Email OTP test thật → đúng: sau OTP, gửi tiền ra màn **"Contract Interaction / Confirm"** (không PIN). → 403 `PUT /user/pin` cho SSO là vì **user SSO/OTP KHÔNG CÓ PIN** (gọi sai loại API). **Circle chưa cho social/OTP + PIN cùng lúc** (câu hỏi đã soạn để hỏi forum/team — trong lịch sử chat S18).
- **HỆ QUẢ:** Google login KHUI ĐƯỢC đầy đủ (gửi/swap duyệt qua confirmation UI, `contractExecution` nằm trong danh sách áp dụng), lại HỢP người già hơn (không PIN để nhớ, quên thì login Google lại). NHƯNG **không gắn được PIN lên user Google** → mất lớp "chống người nhà lấy máy chuyển tiền" mà PIN cho. User quyết giữ Email+PIN mặc định (an toàn), đi hỏi dev về Google.
- (cũ) `PUT /user/pin` trả 403 code 3 với token SSO, email ra 201 — verify bằng gọi API thật (S8-10).
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

**🎨 Design status (S17): TẠM DỪNG — USER TỰ LÀM UI.** Đã thử redesign Home nhiều lần qua Artifact prototype, user thấy xấu → dừng. **Đừng tự ý redesign nữa; chờ user đưa design rồi mới port vào React.**
- **Icon = bộ tự vẽ của user** (`icon/*.svg`, viewBox 100, stroke-width 10, line đậm). LUÔN dùng icon thật, KHÔNG bịa SVG khác (phá đồng bộ). Verify badge = `check.svg` (tích TRONG vòng tròn), không phải dấu V trần.
- **⚠️ CHUẨN HÓA icon mới BẮT BUỘC:** khi user vẽ/export icon (thường ra `width="100" height="100"` + `stroke="black"`), PHẢI đổi thành **`width="100%" height="100%"` + `stroke="currentColor"`** (giữ nguyên path). Không thì Icon.jsx render SVG ra 100px trong ô ~22px → tràn, xô lệch layout + không đổi màu được (bug S17: human/copy vỡ). `swap.svg`/`pencil.svg` đã chuẩn hóa nhưng CHƯA import vào `Icon.jsx` (thêm import khi cần dùng: swap cho nav, pencil cho edit).
- **Hệ kích thước nút (user chốt):** nút CHÍNH = **2/3** bề ngang (đăng nhập, xác nhận…); nút PHỤ = **1/2** (Hold to show tokens, Send trong Contacts…). (CSS `.row10-single` đang 66.67% ✓; `.row10-dual` đang 44% — user muốn 1/2, sửa khi đụng tới.)
- **Mốc thẩm mỹ user thích:** Coinbase Wallet (chữ đậm sắc, số dư khổng lồ, tile bo tròn nền nhạt, nhiều khoảng thở, tối giản viền). Brand GIỮ xanh lá (Coinbase xanh dương).
- **Số dư:** 1 màu, to, giữa; PHẢI auto co nhỏ khi đơn vị dài (vd VND `₫3.380.000`) để không tràn ngang.
- Prototype Artifact dùng font giả (Arial) nhìn rẻ → nếu cần mockup, nhúng font Barlow/IBM Plex thật (script `getfonts.mjs` trong scratchpad tải được từ Google Fonts).

---

## 5. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding 0 15px). Sub-screen: hàng 1 tiêu đề, hàng 10 nút (`row10-single` 2/3 width, hoặc dual trái phụ/phải chính). 4 màn chính (Swap/Gửi/Nhận/Menu): NavBar hàng 10.
- **Numpad chuẩn = hàng 6.5-8.5** (S20, user chốt), TÁCH khỏi nút: container `gridRow 6/9` với `<div flex 0.5 />` (spacer trên) + `<Numpad flex 2.5 />` → numpad đúng 55-80%. Nút [Back][Continue] để RIÊNG ở `.row10-dual` (hàng 9-10). **ĐỪNG gộp numpad+nút vào 1 khối rồi kéo lên** (nút bị lệch — lỗi cũ). Áp: SendAmount, CreateQR, Swap. (Swap: nút Swap ở `gridRow 5/6`, NavBar hàng 10.)
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

1. **✅ SWAP đã bật** — code đúng (S15, `ADAPTER.execute`), verify eth_simulateV1 ĐẠT (USDC về ví +3.12254), `SWAP_ENABLED=true`. Còn lại: **user test 1 swap số nhỏ trên deploy** (ký PIN thật) xác nhận luồng UI đầu-cuối; nếu lỗi PIN thật khác mô phỏng → dán lỗi để mình sửa.
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
- **S20 (07-05):** Batch UX (6 việc): **(1) Numpad TÁCH khỏi nút** — numpad `gridRow 6/9` (spacer 0.5 + numpad 2.5 = đúng 6.5-8.5), nút [Back][Continue] về `.row10-dual` (SendAmount/CreateQR); Swap cũng 6.5-8.5 (xem 2). **(2) Redesign Swap:** cụm FROM↔TO **liền lạc** (nút đổi chiều `margin -16px 0` + viền trắng đè ranh giới 2 card), nút Swap ở `gridRow 5/6`, numpad `6/9`. **(3) Biên lai:** vẽ **logo EZwallet thật** (`import ...design/logo.svg` → drawImage, saveReceipt thành async) thay chữ "EZ Wallet" sai brand. **(4) TxHistory:** dòng 2 gộp `At <giờ> – Note: <memo>` XUỐNG NHIỀU DÒNG (bỏ ellipsis), icon+tiền top-align, địa chỉ nhỏ 1 cỡ + nút **[+ Add]** (→ `navigate('Contacts',{addAddress})`). **(5) Contacts:** X→`option.svg` mở form SỬA chung với Add (state `form={id?,name,addr,pfp}`), dòng đỏ "Delete contact" (không nút) + popup confirm z-110; nhận `addAddress` prefill. **(6) QR Library:** `+` → **popup** "Add to library" (Name optional + Amount required + Cancel/Save), Save = thêm vào kho (KHÔNG show QR). **(7) Receive Share** = share PNG QR kèm text (iOS "Save Image"). Icon mới wire: `pencil, swap, option` (nhớ chuẩn hoá 100%+currentColor). *(CreateQR `fromLibrary` giờ dead — QR Library dùng popup; CreateQR chỉ còn cho Create-QR-để-scan từ Receive.)*
- **S22 (07-06):** Chạy LOCAL + batch UX lớn. **Dev-server:** `dev-server.js` (gitignored, mất trong sự cố Syncthing) dựng lại — **import trực tiếp `functions/api/*.js`** (không copy) nên logic local↔Cloudflare luôn khớp; chạy 2 terminal `node dev-server.js` (8787) + Vite (5173). **Hệ toạ độ user chốt:** màn 0→10, vị trí N = N×10dvh (5=giữa, 9=gần đáy). **Lề 20px** (từ 15): `.screen padding 0 20px`, `.full-bleed`/`.px`/nút đều 20; **NavBar full-bleed** `margin 0 -20px` (sát mép, "trừ NAV BAR"). **Scrollbar trong gutter:** `.scroll-thin` = `margin-right -20 + padding-right 12 + scrollbar-gutter:stable` → scrollbar nằm ở dải lề 20px phải, content GIỮ NGUYÊN chiều ngang khi bật scroll (không co). NotifArea dùng `.scroll-hidden` (ẩn, tránh đè box màu). **Nút Back/Continue:** `.row10-single/dual` = `position:absolute + grid-row:auto + top 85dvh` (tâm 90dvh = vị trí 9). ⚠️ ROOT CAUSE Contacts mất nút: phần tử absolute mà còn `grid-row` (từ class `.row-10`) thì lấy Ô LƯỚI làm gốc toạ độ → top:85dvh văng khỏi màn → phải ép `grid-row:auto`. **Nút Swap:** absolute vị trí 5 (`top calc(50dvh - 3dvh)`); GỘP mọi trạng thái + LỖI vào chính nút (`{error||status||'Swap'}`, lỗi→nút trắng viền/chữ đỏ, ellipsis); BỎ dòng "1 USDC kept for fees". **Max BTC:** chip 50/100% dùng `floorTo` (data.js) thay `toFixed` (toFixed làm tròn LÊN → vượt số dư → khoá nút); `overBalance` + epsilon 1e-9. **Số dài auto co:** `amountFontSize()` (data.js) co cỡ chữ theo độ dài → nhập `0.00000001` không bể layout. **Popup chuẩn:** `.popup-overlay`+`.popup-card` (index.css) tâm 30dvh (giữa vùng h2-5, chừa bàn phím nửa dưới), rộng 88%/340, max-h 56dvh cuộn nội bộ; áp cho TẤT CẢ popup (9 cái). **QRScanner:** ô quét căn tâm 25dvh (chú thích neo absolute dưới, không kéo lệch), chữ chú thích đen. **TxHistory row mới:** h1 ai · h2 `At <giờ> [+ Add]` (Add DỜI xuống h2) · h3-4 Note; icon + cụm tiền neo h1-2. **Menu 1 mục = 1 hàng:** Language (Ngôn ngữ h2, Tiền tệ h3, chip đồng bộ), Security (h2-5), About (h2-8) — đặt `gridRow` từng mục thay vì stack trong scroll container. **BỎ TOÀN BỘ LINE XÁM trừ NavBar:** xoá border-bottom ở `.menu-item`/`.confirm-row`/TxRow/DetailRow.
- **S21 (07-06):** Batch UX (8 việc, thuần layout/visual). **(1) Login:** nút Email `gridRow 6/11`→`9/11` (về ranh giới h9-10). **(2) PinGate:** cụm "Enter your PIN" `row-2-8`→`row-1-5 center col` (căn giữa nửa trên, đồng bộ visual). **(3) Swap — nút tự hiện trạng thái:** bỏ dòng caption trạng thái riêng; label nút = `{status || 'Swap'}` (Preparing… / Enter PIN… / Submitted), status strings rút gọn cho vừa nút; dòng dưới chỉ còn lỗi (đỏ) hoặc nhắc phí gas. **(4) Caret ô nhập số:** thêm `.caret` (underscore `_` nhấp nháy, `@keyframes caret-blink` trong index.css) sau số ở SendAmount/CreateQR/Swap-FROM → cho biết số sẽ vào đâu (thay `{digits || '0'}` = `{digits}<span class=caret>_</span>`). **(5) Swap redesign:** cụm FROM/TO to hơn (CARD padding 20/18, AMT_BIG 46, AMT 32, token icon 48) + container `justifyContent center→flex-end` (đẩy cụm xuống sát nút Swap+numpad = liền mạch EURC→NUMPAD; khoảng trống trên = cách title). **(6) HomeSend:** token list `row-3-6`→`row-3-5`; nút Hold-to-show-token `top 60%`(translateY -100%) → `top 55%, translate(-50%,-50%)` = giữa h6, tách hẳn vùng thông báo h7. **(7) QR Library (SavedQRList):** nút Back `btn-secondary`+center → `btn-primary` (xanh) + `justifyContent flex-end` width 44% (bên phải, thuận ngón cái). **(8) Icon token:** user thay `public/tokens/{usdc,eurc,cirbtc}.png` — code đã ref `/tokens/{sym}.png`, không cần sửa. ⚠️ **node_modules bị Syncthing xé thiếu file** (mất `.bin/vite`, native rollup, `abitype/version.js`…) → đã `rm -rf node_modules && npm ci` cài lại, build OK (1271 modules).
- **S19 (07-05):** **🔐 Khoá mở ví bằng CHÍNH PIN Circle** (bỏ ý tưởng passcode riêng — user chốt "1 mã đủ"). Login **lần 1** (vừa tạo PIN) vào thẳng; **lần 2+/mở lại app** → màn `PinGate` "Enter your PIN" tự bật → ký 1 message rỗng (`POST /user/sign/message`, không gas/không on-chain, ví EOA ký được ngay) verify PIN → mở ví. Bịt lỗ "gõ email lạ soi tiền". Cờ mở khoá phiên = `sessionStorage.ez_pin_ok`. Helper `signMessageChallenge` (circle.js) + action `signMessage` (wallet.js). **Thử Email OTP rồi TẮT:** dựng đủ luồng (`/users/email/token` + `sdk.verifyOtp`, cờ `EMAIL_OTP_ENABLED=false` trong EnterEmail) + **cấu hình SMTP thật ở Circle Console** (Mailtrap sandbox: Host `sandbox.smtp.mailtrap.io`:587, template có `{{code}}`) — nhưng test thấy **user OTP ký bằng Confirmation UI, KHÔNG có PIN** ("Contract Interaction" khó hiểu) → tắt, giữ Email+PIN. **Bỏ nút Google khỏi UI** (hạ tầng giữ). **Numpad dời lên nửa hàng** (SendAmount/CreateQR: `marginTop:-5dvh` → numpad ~hàng 6.5-8.5, nút confirm về đúng chỗ). Đã xoá `Passcode.jsx`+`passcode.js` (approach bỏ).
- **S18 (07-04):** Batch UX (11 việc user gộp): **(1)** `.menu-item` → hàng cao cố định `min-height:56px` (bỏ `flex:1` chia đều) → About/Security/Menu mỗi mục = 1 hàng tự nhiên xếp từ trên. **(2)** BỎ Onboarding (màn Welcome/chọn tiền tệ) — Login+EnterEmail vào thẳng HomeSend; tiền tệ giờ ở Menu. **(3)** Menu: item `Language & Currency` (bật + English); nút Nạp tiền + cảnh báo hết-USDC ở Home → **auto-copy địa chỉ ví rồi mở Circle Faucet**. **(4)** Swap "Available" → `fs-item` (bằng chip 50/100%). **(5) QR:** QR ở màn Nhận KHÔNG tự lưu vào kho nữa (chỉ Share+Back); Kho QR có ô **đặt tên** (kiểu memo, "Name your QR", `saveToLibrary` flag) — dành tiểu thương tạo menu; ô QR hiện Tên (đen)+tiền (xám). **(6)** Wire `pencil`+`swap` vào Icon.jsx. **(7)** PIN sai bị khoá → message ngắn thân thiện (thay message Circle dài). **(8) Swap rõ nghĩa 2 màn:** NotifArea + TxHistory nhận diện swap (cùng tx-hash có cả transfer RA và VÀO ví) → ghi "Swap complete"/"Swapped" thay vì "Received từ [contract lạ]" (người bán rau khỏi hoang mang). GIỮ 2 thông báo riêng. **(9)** `ErrorBoundary` bọc screen → lỗi render không làm trắng màn ("nổ tung"), hiện nút Reload.
- **S17 (07-04):** ✅ Cache số dư+tỷ giá → chuyển màn hết "..." nhấp nháy (xem mục 3). User vẽ thêm icon: `human` (vẽ lại), `copy` (sửa lại), `swap` (mới), `pencil` (edit). Quy ước: edit=pencil, xóa=X (khỏi trash). **🎨 DESIGN TẠM DỪNG — user tự làm UI** (xem note "Design status" cuối mục 4).
- **S16 (07-04):** ✅ Swap execute chạy thật trên deploy (verify). **Sửa quy đổi giá: base USD, ghim USDC=$1** (bỏ đi-vòng-VND → stablecoin đúng 1:1, hết "$5"→"$4.99"); rename `vnd→usd`/`getUsdRate`/`estimateFeeUsd`/`totalUsd` khắp 8 file (build OK). **Layout Swap:** card FROM chiếm đủ 2 hàng (2-3), token/số to hẳn (icon 44, số 40px). **Đính chính Google login:** social login duyệt bằng Confirmation UI chứ không PIN (docs) → khui được nhưng mất lớp chống-người-nhà; user giữ Email+PIN, đi hỏi dev.
- **S15 (07-04):** ✅ **Sửa swap đúng cách adapter** (đọc source SDK, không đoán): gọi `ADAPTER.execute(executionParams, tokenInputs, signature)` — ABI copy từ `@circle-fin/adapter-viem-v2`; chiến lược 'approve' (tokenInputs permitType=NONE + approve riêng); batch qua Multicall3From 1 PIN; encode bằng viem; round-trip encode→decode test khớp byte. Tách lõi `functions/api/_swapCore.js` (chung swap.js + dev-server, hết footgun sync). Thêm action `simulate` + script `verify-swap.mjs` (eth_simulateV1, không tốn tiền/PIN). **VERIFY ĐẠT: 2 EURC→USDC, USDC ví +3.12254 khớp Kit → bật `SWAP_ENABLED=true`.** Thêm mục 0 (combo build-on-Arc: 6 link Circle+Arc skills/mcp/llms.txt).
- **S14 (07-04):** 🔴 **Đào ra ROOT CAUSE swap mất tiền** = phải gọi ADAPTER contract (`0xBBD70b01`) với intent có chữ ký, KHÔNG bóc instructions chạy tay (bỏ qua settlement → USDC kẹt ở adapter). Bằng chứng: trace log tx + eth_simulateV1 (input tiêu, output không về). **Đã DISABLE swap** (`SWAP_ENABLED=false`). Thêm Circle codegen MCP (`claude mcp add`, cần restart). Layout Swap theo spec user (h2-3/4/5/6 + 50%/100% + `~`). **Cách sửa đúng đã note kỹ ở mục 3.**
- **S13 (07-04):** 16 UX fix (email hint giữ khi đăng xuất, Hold to show tokens, Security divider, Recovery/Currency làm mờ, TxHistory gọn bỏ chữ token, check.svg, CreateQR chip phải + USD default + cirBTC + numpad phẩy, QR số 1 style, quét-gì-hiện-đó, ShowQR chỉ Share/Back + auto-save kho). Swap layout theo spec user (FROM h2-3, arrow h4, TO h5, Swap h6, numpad chuẩn h7-9; 50%/100% thay Max; `~` thay `≈`).

## Quyết định & hướng đã thử (Decisions / Failed Approaches)

- **[07-05] S19 — Khoá mở ví = CHÍNH PIN Circle, KHÔNG tạo passcode riêng.** Lý do: 1 mã đủ (đỡ rối); passcode riêng chỉ cần nếu bật social/OTP (không PIN) — mà đang tắt. Cơ chế: `POST /user/sign/message` (ví EOA, không gas/không chain) → executeChallenge nhập PIN. Chỉ gate login lần 2+/mở lại app; lần 1 vừa tạo PIN nên bỏ qua (thừa). **Tried:** app passcode 4→6 số lưu Cloudflare KV + reset qua OTP → **bỏ** (rối, thừa, cần KV/wrangler user không tiện). **Tried:** Email OTP (SMTP Mailtrap đã cấu hình thật ở Console) → **tắt** vì user OTP mất PIN (Confirmation UI). Code OTP + PinGate giữ nguyên (OTP sau cờ `EMAIL_OTP_ENABLED=false`).
- **[07-05] SMTP đã cấu hình ở Circle Console** (User Controlled → Configurator → Email): Mailtrap sandbox, From `no-reply@ezwallet.app`, template chứa `{{code}}`. Dùng cho Email OTP nếu bật lại. Sandbox = mã vào inbox Mailtrap (không tới hòm thư thật) — production phải đổi SMTP thật.

- **[07-04] S16 — Tiền hiển thị base USD, KHÔNG đi vòng VND.** Cách cũ: token→VND (CoinGecko `vs_currencies=vnd`)→chia lại → stablecoin lệch 1:1 do noise + double-conversion ("$5"→"$4.99"). Fix: giá USD, **USDC ghim đúng 1** (nó LÀ đơn vị USD), EURC/cirBTC giá USD live; `getDisplayRates` trả USD/đơn vị; `displayNum=usd/rate`. Reason: đúng bản chất (USDC=$1), hết lệch, đỡ 1 tầng FX vô nghĩa.
- **[07-04] S16 — Google login: social login KHÔNG dùng PIN mà dùng Confirmation UI** (docs Circle: confirmation UI áp cho transfer/contractExecution/sign, KHÔNG cho PIN method). 403 `PUT /user/pin` cho SSO = gọi sai loại API (SSO không có PIN), không phải bị chặn. Khui được nhưng đánh đổi: mất lớp PIN chống người-nhà. User giữ Email+PIN mặc định, hoãn Google để hỏi dev.
- **[07-04] S15 — CÁCH ĐÚNG execute swap = gọi `ADAPTER.execute(ExecutionParams, TokenInput[], bytes sig)`.** Nguồn: source `@circle-fin/adapter-viem-v2` (`adapterContractAbi` + `executeSwap`) và `provider-stablecoin-service-swap` (`prepareEvmSwapAction`/`buildTokenInputs`). Ví PIN không có adapter SDK → replay REST: lấy `transaction.executionParams`+`signature` nguyên xi, tự dựng `tokenInputs` (chiến lược 'approve' = `[{permitType:NONE, token:tokenIn, amount:inputBase, permitCalldata:'0x'}]`) + `approve(tokenIn→adapter, inputBase)` trước. Adapter tự settlement (kéo token, chạy instructions, ghi có beneficiary=ví). Encode bằng viem; **KHÔNG hand-roll** (tuple lồng bytes dễ sai → mất tiền). **Chưa verify eth_simulateV1 với ví thật** (cần user chạy `verify-swap.mjs`).
- **[07-04] Quyết định: dùng viem trong Cloudflare Function** (lệch ghi chú cũ "no viem in CF function"). Lý do: encode `execute()` có tuple[] lồng dynamic bytes, hand-roll rủi ro sai offset cao trên đúng đoạn code mất tiền; viem đã là dep, CF Pages bundle được. Giữ hand-roll cho các chỗ đơn giản khác (send.js memo).
- **[07-04] Tried (S11-14):** bóc `instructions[]` chạy tay (trực tiếp / qua Multicall3From) → bỏ qua settlement adapter → USDC kẹt ở adapter, MẤT TIỀN. **Switched to:** gọi `ADAPTER.execute` với intent có chữ ký (S15).
- **[07-04] SWAP THIẾU APPROVE = root cause "báo xong nhưng không nhận USDC".** Kit instruction có `tokenIn`+`amountToApprove`; router gọi `transferFrom` nên PHẢI approve token cho `target` trước. Thiếu → on-chain revert `ERC20: transfer amount exceeds allowance` (tx vẫn lên chain, EURC ra, USDC không về). **Fix:** chèn `approve(target, amountToApprove)` trước mỗi instruction, gộp chung Multicall3From atomic. **Verify:** `eth_call` Arc RPC 2 chiều EURC↔USDC → OK; router tự ép `minTokenOut`. Grounded docs: `/app-kit/quickstarts/swap-tokens-same-chain` — `kit.swap()` tự approve; **KHÔNG có adapter cho ví User-Controlled (PIN)** → buộc replay REST thủ công. **CHƯA verify swap ký PIN thật giao USDC** (cần user test trên deploy — mô phỏng OK ≠ chạy thật 100%).
- **[07-04] Tried:** batch swap KHÔNG approve (S11-12) → on-chain revert allowance. **Switched to:** approve prepend (S13).
- **[07-03] Tried:** 2 challenge approve+swap RỜI → swap simulate trước khi approve mine → revert. **Switched to:** gộp 1 tx Multicall3From atomic.
- **[07-03] Tried:** Kit amount dạng decimal ("20", "88.57") → 400 / "No route" (bị hiểu là base units → dust). **Switched to:** quy ra base units trước khi gọi Kit.
- **Docs tham chiếu:** Circle developers.circle.com (W3S + Stablecoin/App Kit) · Arc docs.arc.io (= MCP arc-docs). Đọc docs THẬT trước, verify bằng gọi API/eth_call, KHÔNG đoán.
