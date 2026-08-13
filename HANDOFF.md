# HANDOFF – EZwallet

**Cập nhật:** 2026-08-05 · **Local:** `D:\Files\Claude\build_on_arc\ezwallet`

### 🔗 4 LINK CHÍNH THỨC — dùng bộ này khi giới thiệu dự án (user chốt 08-04)
| | |
|---|---|
| **Demo** | https://ezwallet.cash (domain mua trên Cloudflare 07-29; `ezwallet.pages.dev` chạy song song, auto-deploy từ `main`) |
| **GitHub** | https://github.com/KattyFury/ezwallet |
| **Video** | https://youtu.be/UIR4Ee3Wp_Y |
| **Deck** | https://canva.link/zr3ik84radd39vc |

### 📍 ĐANG Ở ĐÂU (cuối phiên 08-04)

- **Chỉ còn 1 nhánh: `main`.** Mọi nhánh WIP đã merge và xoá. Ai làm gì cũng trên `main`.
- **Production đang chạy:** tiếng Anh mặc định + hạ tầng đa ngôn ngữ + tiền tệ VND (đều đã merge, đều chọn được nhưng không tự bật).
- **Chia việc:**
  - **LongDC** → thêm ngôn ngữ mới + sửa sạn bản tiếng Việt (xem mục bàn giao ở dưới).
  - **User + Claude** → tinh chỉnh **UX/UI bản tiếng Anh**. Đây là việc đang làm dở khi phiên kết thúc, chưa bắt đầu sửa gì.
- **Việc còn treo cần bấm tay:** gửi tin nhắn cho Circle support (4 câu hỏi đã soạn xong trong lịch sử chat, chưa gửi) · CI workflow cần `gh auth refresh -h github.com -s workflow`.

> ⚠️ **`PITCH.md` và `DECK-DESIGN-SPEC.md` trong repo ĐÃ LỖI THỜI** (user xác nhận 08-04) — bài giới thiệu và slide thật giờ nằm ở **video YouTube + deck Canva** phía trên, không phải 2 file .md đó. **Đừng dùng chúng làm nguồn khi viết nội dung giới thiệu, và đừng tốn công cập nhật chúng** cho tới khi user quyết định giữ lại hay bỏ. Vẫn để trong repo (không xoá) vì còn chứa vài chốt về Brand Voice.

> **Ví stablecoin cho người dùng phổ thông / người già.** UX đơn giản, mobile-first. **Đã chạm mốc user hài lòng (07-18): toàn bộ luồng – login, PIN, gửi, swap tiền thật – user tự test trên deploy, chạy mượt.**
> ĐẦU MỖI PHIÊN đọc CẢ `HANDOFF.md` (file này) + `CLAUDE.md` (cách làm việc với user).
> Nguyên tắc: **chạy tech chuẩn Circle/Arc, đọc docs + verify bằng API/eth_call thật trước khi làm, KHÔNG đoán.**
> Lịch sử chi tiết từng phiên: `git log` (mô tả commit ghi đủ) – file này chỉ giữ TRẠNG THÁI CUỐI + luật + bài học.

**Tài liệu ĐỐI NGOẠI (đừng nhét nội dung marketing vào file này):** `README.md` = giới thiệu kỹ thuật EN cho GitHub · **`PITCH.md` (07-29) = spec dự án + BỘ SHILL** (một dòng chốt, fact sheet "chỉ được nói gì", 5 điểm khác biệt, guardrails 6 câu cấm, copy sẵn cho X/LinkedIn/tiếng Việt, FAQ khó, lịch phát) · `DECK-DESIGN-SPEC.md` = hệ thiết kế deck 9 trang. ⚠️ Đổi tính năng/trạng thái sản phẩm → **sửa mục 2 và 6 của `PITCH.md`** kẻo copy đăng ra ngoài bị sai sự thật.

Tài nguyên AI: Circle [skills](https://developers.circle.com/ai/skills) · [mcp](https://developers.circle.com/ai/mcp) – Arc [skills](https://docs.arc.io/ai/skills) · [mcp](https://docs.arc.io/ai/mcp). Local đã có: Circle Skill (`circle:*`), Circle MCP (`mcp__circle__*`), Arc MCP (`mcp__arc-docs__*`).

---

## 0. Core value – MỌI quyết định của dự án đều xoay quanh đây

> EZwallet was built on a simple belief: everyone should be able to own their
> own money, without needing to become a crypto expert.
>
> Self-custody shouldn't mean memorizing seed phrases, copying long wallet
> addresses, or worrying about gas tokens. Those are technical barriers, not
> the value of crypto.
>
> We believe people shouldn't have to adapt to crypto. Crypto should adapt to
> people, making it simple enough for anyone to use while preserving full
> ownership of their money.

Dịch: EZwallet được xây trên một niềm tin đơn giản – ai cũng nên được tự giữ
tiền của mình, mà không cần trở thành chuyên gia crypto. Tự quản lý tài sản
không nên có nghĩa là phải nhớ seed phrase, chép tay địa chỉ ví dài ngoằng, hay
lo token trả phí gas – đó là rào cản kỹ thuật, không phải giá trị cốt lõi của
crypto. Con người không cần thích nghi với crypto; crypto phải thích nghi với
con người, đơn giản đến mức ai cũng dùng được mà vẫn giữ trọn quyền sở hữu.

**Áp dụng:** mọi tính năng/quyết định UX/kiến trúc trong file này đều phải trả
lời được câu hỏi "cái này có làm crypto đơn giản hơn cho người dùng phổ thông,
hay đang bắt họ thích nghi với crypto?". Lệch khỏi đây thì dừng lại hỏi user.

---

## 1. Stack & hạ tầng

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Ví:** Circle **User-Controlled Wallet** (MPC EOA, ký bằng **PIN** qua `@circle-fin/w3s-pw-web-sdk`, nạp lười – xem gotcha mục 7).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balance/giá:** on-chain bằng viem (`src/chain.js`, Multicall3 1 request) + giá CoinGecko (cache 60s). **Swap:** Circle Stablecoin Kit REST (mục 4). **QR:** `qrcode.react` (tạo) + `jsqr` (quét).
- **QUYỀN CLOUDFLARE CỦA CLAUDE (làm 08-01 – user: "tìm cách để thay tôi làm việc đi"):** đã chạy `npx wrangler login` (user bấm Allow 1 lần), token OAuth lưu ở `C:\Users\Dell\AppData\Roaming\xdg.config\.wrangler\config\default.toml` (key `oauth_token`). Account `f9df99b7751b7dc3c80a22b6911c6f2b`. Dùng được cho REST API bằng header `Authorization: Bearer <oauth_token>` – `wrangler` CLI thiếu nhiều lệnh (vd KHÔNG có `pages domain`), REST mới đủ.
  **✅ LÀM ĐƯỢC:** thêm/xoá/xem custom domain của Pages · xem + PATCH cấu hình project (env vars, **KV binding**) · tạo/ghi/đọc KV namespace · xem deployment, rollback.
  **✅ ĐÃ CÓ THÊM API TOKEN RIÊNG (user tạo 08-01, tên `claude-code`)** – nằm trong **`.env.txt`**: `CF_API_TOKEN=` + `CF_ACCOUNT_ID=f9df99b7751b7dc3c80a22b6911c6f2b`. Token này **CÓ quyền DNS Edit** (thứ mà token `wrangler login` thiếu) → Claude tự tạo/sửa bản ghi DNS được. Dùng: đọc 2 dòng đó từ `.env.txt`, gọi REST với `Authorization: Bearer <token>`. **ĐỪNG in token ra chat/log, ĐỪNG commit** (`.env.txt` đã trong `.gitignore` dòng 5 – đã verify `git check-ignore` + chưa từng bị commit lần nào). Token hỏng/lộ thì user vào My Profile → API Tokens → Roll/Delete là chết ngay.
  **Ghi nhớ khi đọc cấu hình Pages qua API:** biến môi trường trả về `type=secret_text` **KHÔNG có `value`** – đó là Cloudflare mã hoá và ẩn đi, **KHÔNG PHẢI biến bị trống**. `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` đều đang ở dạng này (verify 08-01), đừng hoảng rồi đi set lại.
- **Domain (07-29):** `ezwallet.cash` (mua trên Cloudflare → zone sẵn trong cùng account) gắn vào Pages project `ezwallet` qua **Workers & Pages → ezwallet → Custom domains**. Apex là link chính; `ezwallet.pages.dev` KHÔNG mất (Pages luôn giữ subdomain gốc) nên link cũ vẫn sống. **Code KHÔNG hardcode domain nào** – Login/Circle dùng `window.location.origin`, `manifest.json` dùng `start_url: "/"` → đổi domain không phải sửa code. ⚠️ **Khi làm lại Google login (roadmap mục 4): PHẢI thêm origin `https://ezwallet.cash` vào allowlist redirect URI ở Circle Console + Authorized origins ở Google Cloud Console**, kẻo dính lỗi 155140 (docs Circle: `redirectUri` chỉ có ở luồng SOCIAL login; luồng email+PIN đang dùng KHÔNG cần khai domain – đã tra docs 07-29).
- **Secrets** (`.env.txt` + `.dev.vars` gitignored, set trên Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit). **ID hardcode** (không phải secret): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com`.
- **Dev local (Windows – KHÔNG dùng `wrangler pages dev`, lỗi "write EOF"):** Terminal 1 `node dev-server.js` (proxy 8787, import trực tiếp `functions/api/*`) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **Circle SDK KHÔNG chạy localhost** → luồng PIN/login/swap chỉ test được trên deploy.
- **MOCK MODE – `npm run mock` (canh UI/flow local, KHÔNG cần Circle):** `src/mock.js` + cờ `VITE_MOCK=1`. Bỏ qua Login/PIN → vào thẳng HomeSend với ví ảo + số dư ảo (`MOCK_AMOUNTS`); chặn `/api/*` + ArcScan trả data giả; Gửi/Swap giả lập thành công. KHÔNG vào production. **Verify UI = Playwright 390×844 VÀ 375×812 trên mock** (bài học 07-23: chỉ đo 390 là sót lỗi tràn). ⚠️ Playwright KHÔNG nằm trong repo (đừng thêm vào `package.json`) – harness đặt ngoài ở `C:\tmp\ezw-verify` (`npm i playwright` + `npx playwright install chromium`, script `verify.mjs`); máy cài lại Win thì dựng lại thư mục đó, ~2 phút.

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

## 2. Mô hình tiền & hiển thị (user chốt – đừng hiểu sai lại)

- **Token LUÔN hiện TÊN THẬT** (USDC/EURC/cirBTC) ở danh sách token, lịch sử (dòng phụ), biên lai.
- **"Tiền hiển thị"** = lớp quy đổi qua tỷ giá fetch (KHÔNG swap thật): `ez_currency` ∈ {USDC, EURC}, mặc định USDC. Ký hiệu USDC→`$`, EURC→`€`. **Base quy đổi = USD, USDC ghim $1** (`getDisplayRates()` trả USD/1 đơn vị; `displayNum(usd,cur,rates)=usd/rate[cur]`).
- **Màn Gửi nhập theo "USD"** (nhãn thân thiện) = gửi USDC 1:1; chọn token thật qua chip.
- **Format tiền MỘT CHUỖI MỘT STYLE:** `fmtMoney()` → `$2` / `€2` / `2 USDC`. CẤM tách số đậm + ký hiệu thường.
- **Chừa phí:** `GAS_RESERVE_USDC = 1` – khả dụng USDC luôn trừ 1 (gas Arc trả bằng USDC).
- **App CHỈ English + USD/EUR (chốt lại 08-12):** `READY_LANGS = ['en']` trong `i18n.js`, `SUPPORTED_CURRENCIES = ['USDC','EURC']` trong `data.js`. Màn Language vẫn hiện VI/中文 + CNY/VND nhưng **disabled** (cờ `locked` của ngôn ngữ lấy tự động từ `READY_LANGS`). Từ điển VN + toàn bộ tỷ giá/format VND **giữ nguyên trong code**, chưa xoá – bật lại = thêm `'vi'` vào `READY_LANGS`, thêm `'VND'` vào `SUPPORTED_CURRENCIES` + `CURRENCIES` (`SendAmount.jsx`) + bỏ `locked` ở `Language.jsx`. Máy đã lỡ lưu `ez_lang='vi'` / `ez_currency='VND'` tự rơi về `en`/`USDC` (cả 2 hàm đọc đều lọc theo danh sách).
  - **Lý do tắt (bug thật):** `QRScanner.parseQR()` mặc định `currency: 'VND'` cho QR không ghi tiền tệ (địa chỉ `0x` trần / link thiếu `&cur`). Hồi VND còn khoá thì `SendAmount` coi `'VND'` là "không rõ" → rơi về USD, nên vô hại. Mở VND ngày 08-04 làm chuỗi đó thành hợp lệ → **quét QR trên app English/USD lại mở màn nhập tiền bằng VND**. Đã sửa mặc định thành `'USD'`.

---

## 3. Tính năng (trạng thái cuối – ✅ chạy thật / verify on-chain hoặc trên deploy)

- **Email login → tạo ví** (userId=email, authMode PIN) + câu hỏi bảo mật. **Khoá mở ví:** mở lại app → `PinGate` tự bật PIN Circle (ký message rỗng, không gas). Google login **ẩn khỏi UI** (hạ tầng giữ, gồm dep `cookies-next` + `refreshSocialToken`). Email OTP đã dựng nhưng **TẮT VĨNH VIỄN theo ràng buộc của Circle (user chốt 07-29): Circle chỉ cho PIN đi với luồng `userId=email` thuần; user Email-OTP/SSO KHÔNG CÓ PIN** (xem mục 7) → bật OTP = mất PIN = mất luôn UX cốt lõi. **ĐỪNG đề xuất "bật Email OTP" như giải pháp cho bất cứ vấn đề gì nữa** (`EMAIL_OTP_ENABLED=false`).
- **SAO LƯU danh bạ + kho QR lên Cloudflare KV (07-29):** `functions/api/sync.js` + `src/sync.js`. localStorage VẪN là nguồn sự thật; KV chỉ là bản sao chống mất khi đổi máy / xoá cache / đổi domain. Kéo về 1 lần lúc mở app (`App.jsx`), đẩy lên sau mỗi lần sửa (debounce 1.5s). **Gộp = BẢN SỬA MỚI NHẤT THẮNG** theo mốc `ez_sync_at_<addr>` (không dùng union vì union làm lệnh XOÁ không bao giờ ăn). **Khoá KV = ĐỊA CHỈ VÍ, server tự hỏi Circle `GET /wallets` bằng userToken để lấy – KHÔNG tin client khai**. **AVATAR KHÔNG BAO GIỜ LÊN SERVER** (server whitelist field: danh bạ chỉ `id/name/address`); pull về thì giữ lại ảnh đang có ở máy theo `id`. Chưa tạo KV binding → API trả 503 `sync-disabled`, client im lặng bỏ qua, app chạy y như cũ. Cần binding tên **`EZ_SYNC`** (Workers & Pages → ezwallet → Settings → Bindings → KV namespace). Local: `dev-server.js` có KV giả trong RAM. Test: `test/sync.test.mjs` (9/9, khoá các bất biến trên).
  ✅ **NỢ KỸ THUẬT 07-29 ĐÃ TRẢ (08-06) – AUTH = CHỮ KÝ PIN.** Cửa vào KHÔNG còn là `userToken` (cái chỉ cần biết email là xin được). Luồng mới: `/api/sync` action `nonce` phát nonce dùng-một-lần (TTL 5') → `PinGate` cho Circle ký câu `Unlock EZwallet. Nonce: <uuid>` bằng **chính lượt nhập PIN đang có** (KHÔNG thêm bước nào cho user) → action `session` recover địa chỉ từ chữ ký bằng **viem `recoverMessageAddress`** (mạnh hơn `verifyMessage` vì client không khai địa chỉ) → cấp token phiên TTL 24h, client giữ ở `sessionStorage.ez_sync_token`. `pull`/`push` mang token đó. **Server KHÔNG còn gọi Circle trên đường sync** (có test khoá điều này). Khoá KV vẫn `bak:<addr>` ⇒ dữ liệu sao lưu bằng bản cũ đọc lại nguyên vẹn. **CHỐT AN TOÀN:** `session` trả kèm `address`, client đối chiếu với `ez_wallet_addr`; lệch → vứt token, tắt sao lưu phiên đó (thà TẮT còn hơn ghi nhầm khoá). Test: `test/sync.test.mjs` 15/15.
- **Gửi tiền** USDC/EURC/cirBTC (`send.js`): transfer thường hoặc qua Memo contract khi có lời nhắn (UTF-8 ok). `idempotencyKey` chống gửi trùng.
- **Swap** USDC↔EURC↔cirBTC – BẬT, verify eth_simulateV1 đạt + **user test TIỀN THẬT trên deploy OK (07-18)**. Màn Swap = thanh trượt % (5 mốc 0/25/50/75/100, nam châm ±2%) + chip gợi ý số chẵn (`roundHint.js`, test `node test/roundHint.test.mjs` **26/26**). **Luật gợi ý — user chốt 08-13 (bản thứ 3, đừng đổi lại):** `số ≥ 30` → bước **1 (hàng đơn vị)** · `3 ≤ số < 30` → bước **0,5** · `số < 3` → co nhỏ theo độ lớn. Lấy bội **GẦN NHẤT** làm tâm + 1 bước mỗi bên.
  ⇒ 9,15 → 8,5·9·9,5 · 17,3 → 17·17,5·18 · 101,3 → 100·101·102 · 0,0083 → 0,008·0,0085·0,009
  **2 bản trước đều SAI, đừng quay lại:** 07-17e ghim bước 0,5 cho mọi số → 39.000 gợi ý "39.000,5". 08-04 dùng `u = 0,5 × 10^floor(log10(số))` → bước **nhảy GẤP 10 ngay tại mốc 10** (9,99 bước 0,5 mà 10,0 bước thành 5) ⇒ kéo 14,55 lại gợi ý "10·15·20", user báo lỗi 08-13. **Bài học: bước theo luỹ thừa 10 thì mỗi thập phân chỉ có 1 bậc — quá thô.** Bản này chỉ có MỘT bậc nhảy (0,5 → 1 tại mốc 30) và nhảy 2 lần chứ không phải 10 lần.
  ⚠️ Nhánh `< 3` BẮT BUỘC GIỮ: cirBTC vài phần nghìn, ghim bước 0,5 thì tâm làm tròn về 0 → lọc sạch (`v > 0`) → hàng chip TRỐNG TRƠN.
  ⚠️ **Bài học 08-13:** commit 08-04 sửa `roundHint.js` mà **quên sửa `test/roundHint.test.mjs`** → 5 case kẹt ở spec cũ, `npm test` đỏ suốt 9 ngày dù app chạy đúng; nhìn quen rồi thì test mất tác dụng cảnh báo. Đã đồng bộ lại 08-13. **Sửa `roundHint.js` lần sau phải sửa test TRONG CÙNG COMMIT.**
- **SERVICE HUB (08-12)** – `src/screens/ServiceHub.jsx`, **tab 1 của NavBar** (icon `hub`, nhãn "Services"), thay chỗ tab Swap cũ. Lưới 2 cột ô VUÔNG nổi trong box xám, hình học copy màn Kho QR. Danh sách dịch vụ = mảng `SERVICES` trong file đó, thêm dịch vụ = thêm 1 dòng:
  - **Swap** → mở màn `Swap` (nội dung màn KHÔNG đổi gì).
  - **Piggy Bank** · **Dollar-Cost Averaging** → `screen: null` ⇒ ô tự mờ 0.4 + `disabled`. Chưa làm.
  - ⚠️ **Màn Swap không còn tab riêng** ⇒ hàng 10 của nó là **CHỮ "Exit" đỏ, bold, canh giữa** (KHÔNG phải nút pill — user sửa 08-13: bản đầu làm `.btn-error` gradient đỏ to đùng, nhìn nặng và đá nhau với nút Swap gradient xanh ngay trên). Vùng chạm phủ cả hàng cho người lớn tuổi dễ bấm. **ĐỪNG dùng class `.row10-single`**: class đó `position:absolute; top:85dvh` = neo tâm **90dvh (vị trí hàng 9)**, mà hàng 9 màn Swap đang có nút "Swap" → dính sát nhau. Phải để `gridRow 10` (tâm 95dvh = đúng băng NavBar vừa nhả).
  - **Cỡ chữ/icon trong hub — CHỐT SAU 2 LẦN LỆCH (user 08-13), đừng đẩy lại 2 cực:** `icon 48 + chữ --fs-item 17` = user chê **"nhỏ quá"** → `icon 64 + chữ --fs-title 30` = user chê **"to quá"** → **CHỐT GIỮA: `icon 56` + chữ `--fs-md-lg` 21** (= đúng cỡ chữ NÚT của app, mà mấy ô này vốn là button). Ở cỡ này "Piggy Bank" gọn 1 dòng, chỉ "Dollar-Cost Averaging" xuống 2 dòng.
  - **Ô KHÔNG ÉP VUÔNG** (`aspectRatio:1`) — ô ra ~160×150 (gần vuông trên điện thoại) nhưng cột hẹp nhất (Android 360 → 145px) thì nội dung 150px vẫn cao hơn cột; ép vuông là tràn chữ, mà `aspectRatio` KHÔNG tự cao thêm theo nội dung. Dùng **`gridAutoRows:'1fr'`** cho các hàng cao bằng nhau (bỏ mặc thì 3 ô cao 147/180/213, so le rất xấu); phải để `alignItems` mặc định `stretch`, đừng đặt `'start'`. Box xám có **`marginBottom:'2dvh'`** = khe trước NavBar (user báo dính navbar), đúng luật chừa đáy của mọi màn khác. Đo Playwright 4 cỡ màn: 3 ô cao bằng nhau, không tràn ô/tràn box/tràn ngang.
  - Mục **Service Hub trong MenuScreen**: mở khoá 08-12 → **BỎ HẲN 08-13** (user chốt). Nó đã là tab 1 navbar, để thêm 1 cửa trong Menu là 2 đường vào cùng 1 chỗ, thừa với người dùng phổ thông. Menu về lại **4 mục hàng 4-7 + Sign out hàng 8** (đúng bố cục trước 07-31), hàng 9 để trống làm khe trước NavBar.
- **Balance on-chain + tỷ giá live** có cache (`_balCache`/`_ratesCache`) – chuyển màn hiện số cũ ngay, fetch nền cập nhật.
- **TxHistory** (ArcScan + memo event, box xám, nhóm theo ngày), **Contacts** (per-account, avatar cropper, box xám), **QR** (tạo/quét/kho), **thông báo in-app** (NotifArea), **biên lai** (canvas → Photos qua Web Share), per-account store (`store.js`).
- **Đổi PIN** (email user): `PUT /v1/w3s/user/pin` ✅. **`refreshSession()`** gọi TRƯỚC mọi thao tác PIN (userToken sống 60').
- **ĐÃ XOÁ 07-18 (dọn code chết):** màn `Onboarding` + `ComingSoon` (mất đường điều hướng tới từ lâu – cần lại thì lấy từ git history), ~30 class CSS mồ côi (modal-*, pin-dot*, text-*, token-item…), key `ez_onboarded`.
- **KIỂM TOÁN + DỌN VÒNG 2 – 07-29** (script audit ngoài repo: `C:\tmp\ezw-verify\audit*.mjs` – đồ thị import, export mồ côi, class/biến CSS mồ côi, icon, i18n, localStorage, dependency). **Đã xoá:** 3 class span `.row-2-3/.row-3-4/.row-3-6` · 4 biến CSS `--font-title/--fs-huge/--fs-sub/--is-title` · `import React` thừa (Login.jsx – JSX transform tự động không cần) · hàm `shortenAddr` (HomeReceive, chết từ 07-19) · `fmtAmount` (chain.js) · **37 key i18n EN chết** (màn ComingSoon đã xoá, chuỗi "Swap sắp ra mắt", hint cũ, key trùng `'Lịch sử giao dịch '` dư dấu cách). **Icon:** 7 icon KHÔNG màn nào render đã **bỏ import khỏi `Icon.jsx`** (~2.9KB raw rời bundle) – `back · facebook · google · hint · left · right · swap` – **FILE .svg VẪN GIỮ trong `icon/`** (tranh user vẽ); dùng lại = thêm 1 dòng import + 1 tên vào `ICONS`.
  **Icon thêm 08-12:** `exchange · pig · dca` (lấy từ kho `D:\Files\Claude\Icons`) cho Service Hub. ⚠️ 3 file này **viewBox 200×200** trong khi mọi icon khác 100×100 – **CỐ Ý, user vẽ gấp đôi vì 3 icon này hiện TO** (nên nét mảnh hơn tương đối là đúng ý đồ). **ĐỪNG "chuẩn hoá" về 100×100 hay nhân đôi `stroke-width`.** Chuẩn hoá khi chép vào repo chỉ gồm: `width/height` → `100%`, `stroke/fill="black"` → `currentColor`. Icon `trade` VẪN dùng (nút đảo chiều trong màn Swap) dù navbar đã bỏ.
  **CỐ TÌNH GIỮ (đừng "dọn" tiếp, đây KHÔNG phải rác):** hạ tầng Google login (`refreshSocialToken`, `cookies-next`, key `ez_login_method`, state `googleErr`, key i18n `'Đăng nhập với Google'`) – roadmap mục 4 sẽ làm lại · `getLang/setLang` (mở lại i18n) · `design/logo-icon.svg` (để dành) · **map ZH trong i18n.js KHÔNG đụng** (nhiều key/1 dòng, sửa dễ nhầm; thừa vài key ở locale đang tắt thì vô hại) · `public/tokens/*.png` (nạp ĐỘNG qua `/tokens/${sym}.png` – script quét tĩnh báo "không dùng" là SAI) · `.row-4`…`.row-7` (MenuScreen ghép động `` `row-${i+4}` ``) · export dùng nội bộ trong `_swapCore.js`/`chain.js`/`data.js` (không đụng đường tiền vì lý do thẩm mỹ).
  **Verify sau khi dọn:** `npm test` 17/17 · `npm run build` OK · Playwright mock đi HẾT 14 màn, đếm `<svg>` từng màn để bắt icon mất, **0 lỗi console**.

---

## 4. Swap – cách hoạt động (⚠️ đụng tiền thật, đọc kỹ)

**Luồng (`functions/api/_swapCore.js` – lõi dùng chung swap.js + dev-server):**
1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → trả **1 INTENT CÓ CHỮ KÝ**. ⚠️ `amount` = **SỐ NGUYÊN BASE UNITS** (decimal → 400; quá nhỏ → 422 `331001` "No route").
2. Nộp intent cho **Swap Adapter**: `execute(executionParams, tokenInputs, signature)` + `approve(tokenIn→adapter)` trước, batch `[approve, execute]` qua **Multicall3From = 1 PIN**. ABI copy nguyên từ source SDK; encode bằng **viem** (tuple lồng dynamic bytes – hand-roll dễ sai offset → mất tiền).
3. Adapter kéo token vào, chạy route (provider bên thứ ba – thực đo `lifi`), **GOM output ghi có cho ví** (settlement).

**⚠️ ĐỪNG LẶP sai lầm cũ:** KHÔNG bóc `instructions[]` chạy tay – bỏ qua settlement → output **KẸT Ở ADAPTER, MẤT TIỀN** (tx vẫn status=1). Mọi thay đổi swap PHẢI verify `node verify-swap.mjs <ví> EURC USDC 2` (eth_simulateV1, không tốn tiền) – chỉ ship khi số dư tokenOut TĂNG đúng. Mẹo: cần ví có số dư để mô phỏng → lấy holder bất kỳ từ ArcScan API `/api/v2/tokens/<addr>/holders` (sim không cần key).

**PHÍ APP 0.1% (user chốt 07-23):** `_swapCore.js` gửi `config.customFee = { percentageBps: FEE_BPS=10, recipientAddress: FEE_RECIPIENT=0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6 }` trong body `/v1/stablecoinKits/swap` (field chuẩn – mổ từ source `@circle-fin/provider-stablecoin-service-swap`, schema nhận `percentageBps` 1..10000 HOẶC `amount` base units, kèm `recipientAddress`; địa chỉ ví nhận là public, không phải secret). Cơ chế: phí trừ ở **TOKEN ĐẦU VÀO**, adapter contract của Circle tự chuyển về ví nhận ngay trong tx swap (KHÔNG deploy contract gì); `estimatedAmount` trả về **ĐÃ TRỪ PHÍ** → UI "You receive" không phải sửa. Verified sim 07-23: swap 2 EURC→USDC, ví fee +0.002 EURC (đúng 0.1%), user nhận khớp estimate. `simulateSwap` giờ đo cả số dư FEE_RECIPIENT (calls[1,2,5,6]), verify-swap.mjs in dòng "Phí app". ⚠️ Docs Circle: Circle giữ 10% custom fee (90% về ví) – sim testnet thấy về đủ 100%, LÊN MAINNET ĐO LẠI.

---

## 5. Design System (`src/index.css` :root) – TRẠNG THÁI CUỐI

**Font: CHỈ 1 FONT = BARLOW** toàn app (4 biến `--font-*` đều trỏ Barlow, giữ tên cũ để khỏi sửa JSX). Load weights `300;400;500;600`.
**Đậm nhạt:** `--fw-light 300` = SỐ HERO to (số dư, số tiền – user chốt 07-17f GIỮ Light, đừng bold) · `400` body · `500` nút/item/label/giá trị-quan-trọng · `600` tiêu đề + active. **KHÔNG 700** (`--fw-bold` khoá = 600).
**Cỡ chữ + TÊN USER GỌI:** amount 52 · huge 38 ("siêu to", số màn Swap) · title 30 ("to") · num 24 · md-lg 21 ("vừa-to" = BUTTON + slogan + chữ nhập) · body 19 ("vừa" = nội dung + NAVBAR) · item 17 ("vừa-nhỏ") · label 15 ("nhỏ") · tiny 13 ("mini"). User gọi tên nào tra bảng này.
**Icon:** thang `--is-*` ghép 1-1 với `--fs-*` – icon đứng cạnh chữ nào dùng size cỡ đó. Icon ĐỨNG MỘT MÌNH mới dùng số cứng (SendReceipt check 76, avatar Contacts, nút xoá QR, nút đảo Swap, numpad erase). Icon mới BẮT BUỘC `width/height="100%"` + `stroke="currentColor"`.

**Gradient (user chốt 07-17d, dọc nhạt trên → đậm dưới, cả 2 đầu màu đặc – 0%/100% là VỊ TRÍ neo, đừng nói "trên 0%" gây hiểu nhầm):**
- Brand: `#0088FF → #0B53BF` (nền `.btn-primary` + `.action-card.primary`)
- Xanh lá `#34C759 → #16A34A` (`.btn-success`) · Đỏ `#FF4D51 → #DC2626` (`.btn-error`) · Vàng `#FFCC00 → #F59E0B` (token giữ, class btn-warning đã bỏ vì chưa dùng – thêm lại thì CHỮ ĐEN)
- **DROP SHADOW nút bấm được (user chốt 07-22d – bản cuối):** bóng **THẲNG ĐỨNG** (offset-x 0, đổ dọc) `box-shadow: 0 4px 6px rgba(0,0,0,ALPHA)` – **VỪA, KHÔNG TỎA** (blur nhỏ 6px), bóng ĐEN (đừng tô theo màu nút). **ALPHA khác nhau để NHÌN NGANG BẰNG (user chốt 07-22g): nút GRADIENT `.35`, nút TRẮNG/chip `.25`** – nền tối của nút gradient "nuốt" bóng đen nên phải đậm hơn mới trông bằng nút trắng. Áp: `.btn-primary/.btn-success/.btn-error/.btn-secondary` + `.action-card` + `.action-card.primary` (class), VÀ **mọi nút/chip pill inline bấm được** (user chốt 07-22f "mọi button có bóng cho bà già hiểu"): chip token Swap `TokenRow`, "Hold to show tokens" (HomeSend), nút copy địa chỉ (HomeReceive), chip English/USD (Language). ĐỪNG tô màu nút, đừng tăng blur. **Nút pill trắng "Hold to show tokens" + copy địa chỉ: chữ ĐEN (07-22f, trước muted).**
- **NÚT ĐỨNG ĐƠN ĐỘC = RỘNG 3/4 MÀN (user chốt 07-29 – "cho các button đứng đơn độc to ra cùng 1 dạng cho đồng bộ"):** `width: min(75vw, calc(var(--screen-max) * 0.75))` (neo vào .screen, KHÔNG dùng % vì khung cha đang thụt lề 20px → % ra số khác nhau mỗi màn). Đã áp: "Hold to show tokens" (HomeSend), "Tap to copy your wallet address" (HomeReceive), **nút Swap** (trước 66.67%). **+ `.row10-single .btn` (index.css) đổi 66.67% → 3/4** (user chốt 07-29, ăn About/Language/Security) **+ nút Reload màn ErrorBoundary**. Đo Playwright 07-29: MỌI nút đơn độc = **293px @390 · 281px @375**, bằng nhau; tâm `.row10-single` vẫn đúng 90dvh. Cặp nút `.row10-dual` (44% mỗi nút) GIỮ NGUYÊN – luật này chỉ cho nút đứng MỘT MÌNH. **Ngoại lệ CỐ Ý: nút "Sign in with Email" màn Login vẫn 80%** – nó ăn theo bề rộng dòng slogan phía trên (cũng 80%), hạ về 75% là lệch cặp; đừng "đồng bộ" nhầm.
  - ⛔ **RÚT LẠI 08-13 CHO ĐÚNG 2 NÚT PILL TRẮNG** (user: *"hơi hối hận khi để nó to quá như này"*): **"Hold to show tokens"** (HomeSend) và **"Tap to copy your wallet address"** (HomeReceive) **BỎ bề rộng 3/4 màn, đổi sang ÔM SÁT CHỮ** – `padding: '0 18px'` + `maxWidth` + `overflow/textOverflow` làm lưới an toàn. Đo được nút/chữ = **1.26×** và **1.16×** (đúng tinh thần user "chữ 50 thì nút 60"). ⚠️ 2 nút này TRƯỚC ĐÂY cố tình bằng nhau ("1 CẶP" ở cùng toạ độ 55% của 2 tab) – **giờ CỐ Ý lệch nhau vì 2 câu dài khác nhau, đừng "sửa cho đều"**. ⚠️ An toàn với bug cũ 07-29 (chữ rớt xuống dòng trên iPhone đời cũ khi bề rộng tự co) vì cả 2 nút đã có `whiteSpace:'nowrap'`. Luật 3/4 màn VẪN GIỮ cho các nút đơn độc còn lại (nút Swap, `.row10-single`, Reload).
- **Nút trong cặp `.row10-dual` = CHỮ TRẦN, KHÔNG icon** (user chốt 07-29: nút "Add" màn Contacts từng có icon `add` → lạc so với mọi cặp Back/<hành động> khác trong app).
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

**LUẬT BOX (linh hồn thiết kế – chuẩn lấy từ màn Swap):**
- **Tách khối bằng NỀN surface + border:none + bo 20 (card lớn) / 8-12 (chip, ô nhập)** – KHÔNG viền xám trên nền trắng.
- **Phần tử BẤM ĐƯỢC nằm TRONG box xám → TRẮNG + VIỀN XÁM 1.5px** (chip token Swap, nút Hold, chip Language, avatar placeholder Contacts...). Chữ trong nút đó vẫn theo vai trò (Hold = muted).
- Box xám đang phủ: 2 card màn Swap (Fee/Rate từ 07-20 là dòng chữ trần, KHÔNG box) · vùng token HomeSend (hàng 3→5.5, `height calc(100%+5dvh)`) · list Contacts/TxHistory (row 2-8) · **SavedQRList (row 2-8, 07-23): lưới 2 CỘT (3 cột cũ QR bé), mỗi QR = box TRẮNG viền xám 1.5 bo 16 + drop shadow .25 + X xóa góc trên-phải; box xám padding 10 + gap 10 (box trắng cách lề xám đúng 10px), QR CO GIÃN theo box (svg width 100% height AUTO – viewBox tự giữ vuông; ép height 100%/aspectRatio từng lệch 3px, khung cứng 104 từng méo) + tên fs-item 17 + tiền fs-label 15. ⚠️ 3 BÀI HỌC: (1) KHÔNG dùng .scroll-thin TRONG box xám (margin-right -20 làm tràn phải – PC có scrollbar-gutter bù nên nhìn ổn, iOS KHÔNG → vỡ; dùng .scroll-hidden); (2) verify layout phải đo THÊM 375px, đừng chỉ 390; (3) cột lưới PHẢI `minmax(0,1fr)` + ô "+" KHÔNG aspectRatio (bug 07-23c: 3 QR → hàng 2 = [QR | +], nút + aspectRatio bị kéo cao bằng box QR → PHÌNH NGANG → 2 cột lệch hẳn; test lưới phải test SỐ LẺ item).** · Language (2-3) · Security (2-4) · About (2-8) · mọi ô nhập (`.address-input`, `.memo-row`; lỗi = inset shadow đỏ).
- **THÔNG BÁO thật** (nhận/gửi/lỗi) = **nền màu nhạt KHÔNG viền, chữ ĐEN** (received lá, sent xanh, error đỏ). **HINT = KHÁC HẲN (user chốt 07-22d – CHUẨN HINT TOÀN APP):** nền **TRẮNG + VIỀN XANH brand 1.5px + chữ/icon XANH brand** (đồng bộ chip gợi ý số tiền màn Swap). Áp cho MỌI hint: khối hint `HintBlock` (NotifArea Home), chip gợi ý email + chip domain EnterEmail, chip số chẵn + hint "Slide to adjust…" màn Swap. **KHÔNG nền vàng, KHÔNG icon bóng đèn** (user chốt 07-22e: bỏ `hint.svg` cho giống mọi hint – chỉ viền + chữ). Format khối hint Home: mỗi dòng `Label: desc`, label medium BẤM ĐƯỢC (đi tới nút cùng tên hàng 9), câu dài xuống dòng. **CỠ CHỮ HINT = `--fs-item` 17 CỐ ĐỊNH toàn app (user chốt 07-22e: chip sign-in trước 21px đã hạ về 17 cho bằng hint Home/Swap) – đừng để hint nào to hơn. BO GÓC: chip hint = PILL `borderRadius 999` (Swap/EnterEmail); khối hint nhiều dòng Home = `12` (user chốt 07-22g: chip sign-in trước bo 10 nhìn vuông, đã sửa pill).**
- **TÍN HIỆU "BẤM ĐƯỢC" = NỀN TRẮNG + VIỀN XÁM 1.5px** (user chốt 07-21 – nền `--color-surface` xám đọc như "lõm vào / không bấm được"). Đã áp: `.action-card` phụ (Contacts/Paste/QR Storage/Share; card `.primary` Scan QR/Create QR vẫn gradient, `border:none`) · ô SỐ TIỀN card "You pay" màn Swap (card "You receive" để trần – output không phải input) · gợi ý email + chip domain màn EnterEmail. Ô nhập text (`.address-input`) vẫn nền surface – đó là input thật, có caret/placeholder nên không lẫn.
- Toggle/lọc BẬT = nền trắng + viền brand + chữ brand. Nút chính 2/3 bề ngang, phụ 1/2.
- KHÔNG em-dash (dùng `–`), KHÔNG emoji. Scrollbar: `.scroll-thin`/`.scroll-hidden`.

**Thẻ xem trước khi CHIA SẺ LINK (07-29):** `public/og.png` **1200×630** + đủ thẻ `og:*` / `twitter:*` / `description` / `canonical` trong `index.html`. Trước đó trang không có meta nào → dán link lên X/Telegram/Facebook ra **ô trống trơn**. Ảnh nền gradient brand (#0088FF→#0B53BF), logo knockout trắng, **ảnh app THẬT** (`docs/app-home.jpg`) – dựng bằng Playwright chụp 1 file HTML (script mẫu ở `C:\tmp\ezw-verify\og-card.html` + `make-og.mjs`). **Đây là BẢN NHÁP, user thay bằng bản tự thiết kế lúc nào cũng được** – chỉ cần giữ đúng **1200×630** và tên `og.png`. ⚠️ `og:image` PHẢI là URL tuyệt đối; X/Facebook **cache thẻ** → đổi ảnh xong phải dùng công cụ debug của họ ép quét lại, hoặc đổi tên file.

**ĐỔI SLOGAN (08-02):** slogan chốt giờ là **"A crypto wallet simple enough for my mom to use."** (bỏ hẳn "your grandma" / "stablecoin wallet" ở các câu thương hiệu – từ "stablecoin" vẫn dùng ở chỗ tả sự thật sản phẩm). Đã đồng bộ: `<title>` + `og:title` + `twitter:title` + `og:image:alt` (`index.html`) · `public/og.png` dựng lại · `package.json` · `README.md` · `PITCH.md` (mục 1 + 8) · `DECK-DESIGN-SPEC.md` (thesis + P1 + mục 3). Luật văn phong chốt trong `CLAUDE.md` mục **Brand Voice**. **Cũng đã đổi TOÀN BỘ em dash `—` → en dash `–`** trong mọi chữ người đọc nhìn thấy (html, md, package.json, .env.example) – comment code tiếng Việt trong `src/`, `functions/` giữ nguyên. `og:image` bump thành `og.png?v=2` để ép X/Facebook quét lại thẻ (chúng cache theo URL); **đổi ảnh lần sau nhớ bump tiếp `?v=3`**.

**Brand assets:** `design/logo.svg` (Login + biên lai, viewBox 1160×380) · `design/logo-icon.svg` (để dành) · favicon `/fav_icon.png` · app icon `/icon.png` 512×512.

> 🎨 **Design: user tự làm UI, icon user tự vẽ (viewBox 100, stroke 10).** Đừng tự redesign; chờ user đưa hướng rồi port. Mốc thẩm mỹ: Coinbase Wallet – số to nhạt, tile nền nhạt, nhiều khoảng thở.

---

## 6. Layout Rules

- **Lưới 10 hàng** (`.screen` grid 10×1fr, 100dvh, padding `0 20px`, `position:relative`). Sub-screen: hàng 1 tiêu đề, nút ở `.row10-single`/`.row10-dual` (absolute top 85dvh, tự ép `grid-row:auto`). 4 màn chính: NavBar hàng 10 full-bleed, chữ+icon `--fs/is-body 19`. **Tab CHƯA CHỌN = `--color-muted-2` #8E8E93 (xám TRUNG BÌNH, user chốt 07-22d – #636366 xám đậm nhìn dull); tab ĐANG CHỌN = đen + gạch brand trên đầu.**
- **⚠️ `.screen` PHẢI có `grid-template-columns: minmax(0,1fr)`** – bỏ là 1 chuỗi `nowrap` dài phình cột, lệch cả màn. **Flex item chứa chữ nowrap PHẢI `minWidth:0`.**
- **LUẬT BÀN PHÍM TOÀN APP (user chốt 07-23 "hướng A" – trị dứt điểm xung đột 2 bàn phím):** **NHẬP TIỀN = numpad app** (to, có dấu chấm, không lệ thuộc locale) · **NHẬP CHỮ = bàn phím iPhone** · **KHÔNG BAO GIỜ 2 cái cùng hiện.** Cụ thể: SendAmount + CreateQR – focus ô text (note/tên QR/popup note) → `typingText` ẨN panel numpad, blur → hiện lại. Popup Add QR (SavedQRList) – ô Amount KHÔNG phải `<input>` nữa (bàn phím decimal iPhone locale VN hiện dấu `,` bị regex nuốt + lệch chuẩn app) mà là div bấm mở SHEET numpad app (geometry y hệt sheet Swap, render SAU popup nên nổi trên, popup neo nửa trên không che nhau; bấm ô = blur ô Name trước cho bàn phím iPhone hạ xuống). Đừng thêm màn nào có input tiền bằng bàn phím hệ thống nữa.
- **Numpad TOÀN APP = kiểu "XÁM VỪA" (user chốt 07-22g: `--color-surface-2` #D1D1D6, KHÔNG dùng surface #F2F2F7 nhạt nữa – cho phím trắng nổi):** panel/sheet nền `--color-surface-2` full-bleed từ NỬA HÀNG 6 → đáy màn, bo góc trên 20, PHÍM TRẮNG tile bo 12 khe 8px – class chung `.numpad-gray` (index.css). SendAmount + CreateQR: `gridRow 6/11, margin 5dvh -20px 0, padding 24px 20px 0`, Numpad flex 5.5 + vùng nút/đệm flex 3.5, nút `.row10-dual` nổi trên nền xám. Swap: sheet overlay cùng geometry (xem mục Swap), flex 5.5/0.5/2/1. **Đệm xám trên 24px + phím THẤP (numpad 5.5 phần, KHÔNG phải 6)** – user chốt 07-20c: phím to quá thì giảm chiều cao phím, nút Back/Done LUÔN neo biên hàng 9-10, đừng xê dịch.
- **Caret ô nhập số = dấu `_` ĐEN nhấp nháy** (class `.caret` màu `--color-content`, user chốt 07-22c: caret xám lạc màu với text đen; ăn cả Swap/SendAmount/CreateQR). Khi TRỐNG = CHỈ caret, không vẽ số 0 mờ (user chốt 07-20b tại Swap): KHÔNG vẽ số 0 mờ đứng cạnh caret ("0 là 0, _ là _"). **You receive khi CHƯA nhập số = TRỐNG HẲN (prop `idle`, user chốt 07-23)** – "…" CHỈ dành cho "đã nhập số, estimate đang tải" (trước hiện "…" cả lúc idle nhìn như tải mãi không xong). **Màn Swap – QUY HOẠCH VÙNG (user chốt 07-20e, BẢN CUỐI):** khu hàng 2→9 là 1 flex column `justify-content: space-between` (paddingBottom 2dvh) chia **3 KHỐI**, 2 khe giữa TỰ ĐỘNG BẰNG NHAU (user: "cụm You pay/receive cách cụm hint+slider = cụm đó cách nút Swap", không chỗ nào trống lệch): (1) You pay + ⇅ + You receive + Fee/Rate; (2) chip gợi ý + PctSlider – **hàng chip PHẢI `height: 40` CỐ ĐỊNH** (bug 07-21: `hints.map` rỗng → hàng cao 0 → space-between kéo cả cụm trượt xuống mỗi lần hint hiện/tắt; chừa sẵn chỗ thì slider đứng yên, chip chỉ mờ/hiện). **07-23 (đảo 07-22e): BỎ hint pill "Slide to adjust…" – khi CHƯA chọn số hàng này để TRỐNG (vẫn giữ height 40), hướng dẫn chuyển vào NÚT SWAP: nút hiện "Slide or tap here to enter" (chữ fs-item 17 – 21 mặc định bị cắt ellipsis, verify Playwright scrollW≤clientW) + bấm = mở numpad (openPad); có số → nút về "Swap" như cũ, chip gợi ý số chẵn hiện lại.** Verify bằng cách đo `getBoundingClientRect().top` của track + nút Swap ở pct=0 và pct=50, phải TRÙNG; (3) **nút Swap = PILL `.btn` mặc định** (bo 50, cao 6dvh – user chốt 07-21, ĐẢO bản 07-20e "vuông 8dvh" vì không match nút các màn khác) **ĐỒNG TÂM với action-card Scan QR/Create QR**: khối bọc copy y hệt hình học `.action-grid` = `height 8dvh` + `marginBottom 2dvh`, nằm cuối flex space-between vùng `2/10` → band 80→88dvh, nút canh giữa ⇒ **tâm 84dvh** khớp action-card. **BỀ NGANG = 3/4 MÀN (07-29, trước 66.67%)** – xem luật "nút đứng đơn độc" mục 5; tâm dọc KHÔNG đổi (đo lại 07-29: nút Swap cy=709 = Create QR cy=709 @390). ⚠️ ĐỪNG thêm `paddingBottom` cho vùng cha (marginBottom của khối đã lo 2dvh) và đừng đổi lại height/radius. Verify: đo `centerY` của Scan QR (Send), Create QR (Receive), Swap – phải BẰNG NHAU (đo được 783px cả 3). Nút vẫn là NƠI DUY NHẤT hiện trạng thái Preparing/Enter PIN/Submitted/lỗi. You pay/receive card = flex column **height `calc(20dvh - 5px)` + justify-content CENTER + gap 10** (user chốt 07-22f: mỗi card 20dvh-5px, cộng khe ⇅ 10px = đúng 40dvh → 2 card FIT KHÍT hàng 2-5, Rate/Fee về đúng nửa trên hàng 6; đo Playwright 390×844: You pay 10→29.4dvh, You receive 30.6→50dvh, Rate/Fee 51.2→53.6dvh – ĐỪNG để lố 40dvh kẻo đẩy Rate/Fee lệch). Center+gap để kéo nhãn GẦN chip token. **Hàng balance: You pay = "Available: <số> <token>" (balLabel="Available"), You receive = "Balance: <số> <token>" (balLabel="Balance") – 07-22g user yêu cầu GIỮ Available bên You pay (đừng bỏ). Chip token [SYM] có drop shadow đen như mọi nút.** Nút ⇅ margin **-17/-17** trên nút 44px → net 10px flow = KHE 10px giữa 2 card (user chốt 07-22b: chạm sát xấu; You receive dời xuống 31.2→51.2dvh, Rate/Fee 52.4→54.7dvh vẫn nửa trên hàng 6). Nút bắc cầu qua khe; **nút ⇅ (user chốt 07-29 – ĐẢO bản 07-22h nền xanh nhạt/icon xanh đậm): vòng tròn `--grad-brand` GRADIENT + icon `trade` TRẮNG + drop shadow .35 (chuẩn nút gradient)** – cùng hệ với `.btn-primary`/`.action-card.primary`; nút vẫn 44px, khe 10px không đổi. *(Icon ở đây là `trade.svg`, KHÔNG phải `swap.svg` – user quen gọi "icon swap", đừng sửa nhầm file.)* **Fee/Rate**: 1 dòng fs-item 17, `Rate:` căn TRÁI · `Fee:` căn PHẢI, nhãn xám + SỐ LIỆU ĐEN. Card nội dung: nhãn · [chip token ▼ trái | SỐ TO phải, KHÔNG lặp tên token] · [Available trái | ~$ phải]; **nhãn You pay/receive `--fs-body` 19, hàng phụ Available + ~$ `--fs-item` 17** (07-21: 2 cái bằng nhau làm MẤT phân cấp nặng–nhẹ), chip logo 32 + chữ 19, số base 52 co giãn. **Numpad Swap:** bấm SỐ TIỀN You pay → sheet trượt từ dưới lên chiếm **nửa hàng 6 → hàng 10** (55→100dvh): NỀN XÁM surface + PHÍM TRẮNG tile bo 12 khe 8px (nổi button), KHÔNG khoảng trắng thừa trên đầu, overlay TRONG SUỐT (user chốt: numpad bật mà màn chính mờ đi là SAI); trong sheet Numpad 30dvh + nút Back/Done pill 44% ở 85-95dvh (khớp .row10-dual) + đệm 5dvh. Gõ live cập nhật số + pct + estimate; Back = hủy số vừa gõ, Done/bấm ra ngoài = giữ; slider + chip gợi ý giữ nguyên.
- **CẤM GỬI CHO CHÍNH MÌNH (user chốt 07-31 – "phải không cho phép tao gửi tiền vào ví mình chứ"):** chặn ở **3 chỗ** vì có 3 đường vào màn Gửi – `PasteAddress` (địa chỉ đúng chuẩn nhưng là ví mình → nút không đi tiếp + báo đỏ, và KHÔNG đọc clipboard đè lên), `QRScanner` (quét trúng QR nhận tiền của chính mình → báo rồi quét tiếp, cả camera lẫn chọn ảnh), `SendAmount` (**chốt chặn cuối** cho đường Danh bạ – user tự lưu ví mình thành contact; dùng `walletAddr` lấy từ Circle chứ KHÔNG dùng localStorage vì PWA có thể vắng key). Helper dùng chung: `isOwnAddress()` trong `data.js`.
- **TỰ GỬI CHO CHÍNH MÌNH KHÔNG PHẢI SWAP (bug 07-31):** giao dịch tự gửi có `from == to` trên **CÙNG 1 DÒNG**, mà `swapHashes` chỉ cần "có ra + có vào" → gán nhãn **"Swapped 5.00 USDC to USDC"**, user tìm chữ "Sent" không thấy nên tưởng giao dịch BIẾN MẤT. Sửa: dòng nào vừa ra vừa vào thì BỎ QUA (swap thật luôn có 2 DÒNG RIÊNG), và TxRow hiện **"Sent to yourself"**. Mock có sẵn ca này (`0xmockself1`) để test lại.
- **TxHistory PHẢI TỰ SORT + key DateHeader kèm chỉ số (bug 07-31):** list render thẳng theo mảng, nhãn ngày lặp lại → 2 `DateHeader` **trùng key** → React cảnh báo *"children to be duplicated and/or omitted"* = **có thể bỏ mất dòng giao dịch**. Đã sort `timeStamp` giảm dần ở client + `key={h-<ngày>-<i>}`.
- **TxHistory LUÔN hiển thị ĐẦY ĐỦ lịch sử** (user chốt 07-20, sửa hiểu nhầm 07-19: từng cắt còn 24h + hint cách dùng → SAI). Chỉ THÔNG BÁO (NotifArea) mới là thứ "trong ngày"; lịch sử là sổ đối soát, không cắt, KHÔNG hint trong đó.
- **TxHistory: swap = 2 DÒNG riêng, KHÔNG gộp** (user chốt 07-20d, đảo quyết định gộp 07-19 – gộp "Swapped X → Y" làm MẤT 2 số -X / +Y ở cánh phải). Mỗi leg là 1 TxRow: leg ra "-$X / X EURC" (đỏ), leg vào "+$Y / Y USDC" (xanh). **Tiêu đề cả 2 dòng = "Swapped <outAmt> <outSym> to <inSym>"** (vd "Swapped 20.00 USDC to EURC" – user chốt 07-20d "Swapped" trơ thiếu info) + **phụ đề "Swap completed · At <giờ>"**. Cần `swapPairs` (map hash→{outAmt,outSym,inSym}, dò từ `txs` để tab Gửi/Nhận vẫn đủ hướng) truyền `swapInfo` vào TxRow. Đã xoá `SwapRow` + `buildDisplayList`. Font TxRow GIẢM cho fit màn: icon 40→34, tiền phải fs-num 24→fs-md-lg 21, token/giờ/note fs-tiny 13, padding dọc 11, gap 10.
- **GỘP là gộp 2 THÔNG BÁO swap (NotifArea), KHÔNG phải lịch sử** (user nhắc 07-20d): 1 thông báo `Swapped X EURC to ~Y USDC (complete)` (thất bại → `(failed)`), phát từ `Swap.jsx handleSwap`; `NotifArea.pollIncoming` đã TẮT branch `outHashes` (không thêm "Swap complete·received" riêng nữa).
- **Slider % (PctSlider):** nam châm hút mốc theo HÀNH VI (user chốt 07-20d) – CLICK/TAP `SNAP_TAP = ±9%` (dễ trúng mốc), ĐANG KÉO `SNAP_DRAG = ±2%` (không lấn ý người kéo). `pctFromEvent(e, snapZone)`: down()→SNAP_TAP, move()→SNAP_DRAG. Verified Playwright: click@47%→50, drag→47% giữ nguyên. Mốc dot 14px, nhãn % fs-item 17 + BẤM ĐƯỢC (chạm nhãn nhảy tới mốc). Marker 0/25/50/75/100.
- **ShowQR (xem/ tạo QR nhận tiền):** QR TO = `min(30dvh,78vw)` (bằng QR màn Nhận), cao 3 hàng (2-4); hàng 5→8 số tiền TO `fs-amount` light + phụ đề `fs-md-lg`; nút Share/Back ở `.row10-dual` (9-10). Tiêu đề ĐỘNG theo cờ `fromStorage` (07-20d, KHÔNG dựa vào có/không tên): mở QR ĐÃ LƯU từ kho → `QR Storage: <tên>` (không đặt tên → `QR Storage: Item`); tạo QR mới (màn Nhận/custom) → `Create receive QR`. SavedQRList onClick PHẢI truyền `name: q.name` + `fromStorage: true`. **Add-to-QR-Storage (SavedQRList popup, 07-23 đổi title từ "Add to library"):** ô Amount = div mở sheet numpad app (xem LUẬT BÀN PHÍM), placeholder kèm ký hiệu tiền tệ mặc định – `Amount (${displaySymbol(getDisplayCurrency())})` (USDC→$, EURC→€).
- **HINT (NotifArea) = `Label: mô tả`, label BOLD (medium), KHÔNG gạch chân, BẤM ĐƯỢC** (user chốt 07-21 bản cuối – từng thử gạch chân rồi bỏ, giữ lại bold): mỗi dòng `{label, desc, onClick}`, bấm vào label đi ĐÚNG nơi nút cùng tên ở hàng 9 dẫn tới; câu dài ĐƯỢC XUỐNG DÒNG (bỏ nowrap/ellipsis – chỉ thông báo THẬT mới giữ 1 dòng cắt "…"). **Nhãn hint PHẢI TRÙNG nhãn nút hàng 9.**
  **Text chốt (đừng tự sửa):** Send – `Paste: Paste a wallet address` → PasteAddress · `Scan QR: Scan a QR code to send` → QRScanner · `Contacts: Save people you send to often` → Contacts (thứ tự hint = thứ tự nút hàng 9 trái→phải, user chốt 07-23: Contacts dùng nhiều → nằm PHẢI). Receive – `QR Storage: Save your favorite QR codes` → SavedQRList · `Create QR: Create a QR to receive money` → CreateQR · `Share: Share your wallet address` → handleShare.
  ⚠️ Khi có thông báo thật, hint bị đẩy lên + mờ mép trên (đúng thiết kế ưu tiên: hint thấp nhất). Box token màn Send VẪN scroll khi nhiều token (đừng bỏ overflow).
- **SendAmount – NOTE MẶC ĐỊNH** (user chốt 07-20e): cụm Send-to/số tiền/note gom 1 flex column `gridRow 2/6` **gap 4dvh** (07-22c: 2dvh quá sát/ngộp → giãn ra cho thoáng, vẫn là 1 cụm căn giữa). Ô note có **icon `option` bên PHẢI** (nút 52×52 nền surface) → popup "Set your default note" (input "Type here", Back/Save), lưu `localStorage ez_default_note`. memo khởi tạo = note mặc định → hiện như VALUE thật (không phải placeholder mờ); **click vào ô note lần đầu (onFocus) mà đang là note default → XOÁ để gõ mới** (`noteTouched` chặn xoá lại). Mọi lần gửi memo tự mang note mặc định.
- **CreateQR ĐỒNG BỘ HÌNH HỌC SendAmount (user chốt 07-23 "2 màn cùng chức năng phải giống nhau"):** cụm gridRow 2/6 flex column gap 4dvh y hệt – dòng 1 "Amount to receive" (chỗ "Send to: X", CHỮ ĐEN medium fs-md-lg) · dòng 2 số + chip [USD] copy nguyên style bên Gửi (chip fs-md-lg + mũi tên brand) · dòng 3 = ô tên QR (fromLibrary) hoặc **placeholder height 52** – thiếu hàng 3 là justify-center kéo cả cụm tụt 43px, mất đồng bộ. Verify: đo top của nhãn/caret/chip 2 màn phải TRÙNG (155/214/240 @390×844).
- **BalanceHeader số dư TO** (user chốt 07-20e, lấp chỗ trống): `amountFontSize(str, 76, 7, 40)` – base 76px (trước fs-amount 52), tự co theo độ dài (7 ký tự vừa khít, dài hơn co xuống, sàn 40), `whiteSpace nowrap` + padding 12 để số lớn vẫn vừa bề ngang. Dùng chung HomeSend/HomeReceive/MenuScreen.
- **ShowQR title = `QR: <tên>`** (user chốt 07-20e, bỏ chữ "Storage" cho gọn – tên dài đỡ thiếu chỗ); QR không tên → `QR: Item`; tạo mới → `Create receive QR`.
- **SavedQRList hàng 9 = `.row10-dual`: [Back TRẮNG] + [Add XANH]** (user chốt 07-29, thay `.row10-single` Back xanh cũ). Add mở ĐÚNG popup "Add to QR Storage" như ô "+" trong lưới (`setAdding(true)`) – thêm QR là hành động chính của màn, không bắt user cuộn xuống tìm ô "+".
- **SavedQRList xóa QR = POPUP CONFIRM** (user chốt 07-20e, chống bấm nhầm): bấm × → popup `Delete QR: <tên>` (không tên → số tiền) + [Quay lại][Confirm đỏ], KHÔNG xóa ngay. Chuẩn popup tâm vùng hàng 1-6.
- **Chevron `right2` (hàng đi tiếp) = `--color-brand`** (07-20, trước là `--color-faint` nhìn như disabled); `--color-faint` chỉ còn cho placeholder/icon ẩn. Ô nhập text chuẩn = cao 52 + `--fs-md-lg` (email/memo/paste address đã đồng bộ).
- **Input text ở hàng 1-4 hoặc popup neo nửa trên** (`.popup-card` tâm 30dvh) – bàn phím iPhone che nửa dưới. Không autoFocus trong popup. **Khoá cuộn trang** (`App.jsx` listener) – ĐỪNG xoá.
- **Vị trí 55dvh = "dòng phụ giữa màn"** dùng chung: nút Hold-to-show (Gửi) và dòng địa chỉ+copy (Nhận) neo absolute top 55% → qua lại tab không nhảy. QR màn Nhận = `min(30dvh, 78vw)` chiếm hàng 3-6.
- **HomeSend:** h1-2 số dư · h3-5.5 box token · h7-8 NotifArea · h9 3 action-card (trái→phải **Paste · Scan QR · Contacts**, user chốt 07-23) · h10 NavBar. **QRScanner (07-29):** hàng 1 = TIÊU ĐỀ "Scan QR" (đồng bộ mọi sub-screen – trước màn này không có tiêu đề, ô quét chiếm luôn hàng 1); cụm ô quét + 2 dòng chú thích dời xuống căn tâm **hàng 2-7**; nút phải (xanh) = **"Done" KHÔNG phải "Back"** (user chốt 07-29: nút xanh = hành động chính/kết thúc, chữ Back trên nút xanh đọc sai vai trò – Back luôn là nút TRẮNG phụ).
- **SendReceipt (07-23):** confirm-box + canvas biên lai có dòng **Address = địa chỉ RÚT GỌN `0x1234…5678`** (user chốt: KHÔNG để full – dài xấu), và **CHỈ hiện khi Send to là TÊN danh bạ** (không tên thì Send to đã là địa chỉ rút gọn → thêm nữa là trùng). Canvas `H = 590 + 60·(có Address) + 60·(có Note)` – đáy dòng cuối + **50px khoảng thở + logo + 22 lề** (trước logo dính sát divider dòng cuối – đừng để lại).
- **TxHistory row:** trái `[icon] Sent/Received` + giờ + [Add to Contacts] + Note; phải `±$` (đỏ/xanh lá) + token thật xám. **KHÔNG kẻ line xám ngăn cách** trong list/box (trừ NavBar + hàng Rate/Fee).
- **`<button>/<input>` phải kế thừa font** – đã có rule global `font-family: inherit`, đừng xoá.

---

## 7. Gotchas Circle/Arc (xương máu – giữ vĩnh viễn)

**Circle W3S:**
- **Màn PIN = iframe `pw-auth.circle.com` (cross-origin):** không sửa được cấu trúc UI, **KHÔNG auto-mở bàn phím số được** (browser cấm focus xuyên origin, iOS bắt chạm trực tiếp – user hỏi rồi, ĐỪNG đào lại). **Cũng KHÔNG đóng iframe sớm hơn được sau khi nhập xong PIN** (user hỏi 07-20): SDK đã tự gỡ iframe NGAY tại message `onComplete` (đọc source `messageHandler`); phần "đứng lại" 1-3s sau khi gõ số = spinner Circle xử lý challenge bên trong iframe. Tự gỡ iframe khi challenge chưa settle = mất kết quả ký (root cause bug PIN cũ) – ĐỪNG làm.
- **⚠️ ĐẢO 08-04: đã BẬT tiếng Việt cho màn PIN/bảo mật qua `setLocalizations`** (bản dịch ở `src/circleLocalizations.js`, gọi trong `circle.js:getSDK()` + 2 chỗ tạo SDK trong `Login.jsx`). Quyết định cũ "English thuần vì Circle chỉ localize được nửa vời" (07-01) SAI: đọc kỹ docs (customization.md + web-sdk-ui-customizations, tra 08-04) thì Recovery Method + câu hỏi bảo mật ĐỀU localize được, không hardcode như tưởng trước. **Đúng 1 phần:** không có field nào cho CHỮ LỖI runtime (PIN sai/khoá...) → phần đó vẫn tiếng Anh, chấp nhận được vì hiếm khi hiện. **CHƯA localize** `transactionRequest`/`contractInteraction`/`signatureRequest`/`emailOtp` (SDK có hỗ trợ nhưng field trộn nhãn tĩnh + giá trị động, cần test kỹ trước khi động vào – làm sau khi phần này chạy êm). Muốn thêm ngôn ngữ khác (ngoài `vi`): thêm key mới vào `CIRCLE_LOCALIZATIONS` trong `circleLocalizations.js`.
- **2 bug phát hiện lúc test tiếng Việt thật (08-04), đã fix:**
  1. `requiredMark` (chữ "Bắt buộc" cạnh Câu hỏi/Câu trả lời) bị SDK ghép DÍNH LIỀN vào label trước, không tự chèn khoảng trắng ("Câu hỏiBắt buộc") → sửa `requiredMark: ' (bắt buộc)'` (tự đệm khoảng trắng + ngoặc).
  2. 3 dòng cảnh báo rủi ro ở màn "Xác nhận bảo mật" ra tiếng Anh dù đã set `setLocalizations` — vì nó thuộc field `securityConfirmItems` của method **KHÁC** (`setCustomSecurityQuestions`), không nằm trong `Localizations` object. Đã gọi thêm method này (3 chỗ, giống `setLocalizations`) với bản dịch ở `CIRCLE_SECURITY_CONFIRM_ITEMS` (`circleLocalizations.js`).
- **✅ 08-04c – XÁC NHẬN THẬT: `inputMatch` (màn "Xác nhận bảo mật") ĐỔI ĐƯỢC cụm từ SDK validate.** Set `inputMatch: 'Tôi đồng ý'` → test trên deploy, gõ "Tôi đồng ý" thì nút Tiếp tục sáng lên thật. Không phải chữ hiển thị suông như lo ngại ban đầu.
- **🔴🔴 08-04 – ROOT CAUSE bug "màn Câu hỏi bảo mật RỖNG": GỌI SAI CHỮ KÝ `setCustomSecurityQuestions`. Lỗi của mình, KHÔNG phải Circle.** Method này nhận **THAM SỐ VỊ TRÍ**, không phải object:
  ```js
  setCustomSecurityQuestions(questions?: SecurityQuestion[] | null, requiredCount = 2, securityConfirmItems?: string[])
  ```
  (verify: `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts:91`; thân hàm `index.js:254` gán thẳng `this.securityQuestions = questions`, KHÔNG destructure.) Gọi kiểu object `setCustomSecurityQuestions({ questions, securityConfirmItems })` → SDK nhận nguyên **object** vào chỗ đáng lẽ là **mảng** `questions` → danh sách câu hỏi hỏng → **màn rỗng, chặn cả luồng tạo ví**; đồng thời `securityConfirmItems` (tham số THỨ 3) không bao giờ tới nơi → 3 dòng cảnh báo giữ nguyên English. **Một lỗi giải thích cả 2 triệu chứng.** Đã sửa: `sdk.setCustomSecurityQuestions(CIRCLE_SECURITY_QUESTIONS.vi, 2, CIRCLE_SECURITY_CONFIRM_ITEMS.vi)` ở cả 3 chỗ. Check: `grep -rn "setCustomSecurityQuestions({" src/` phải RỖNG.
  **Bài học:** 3 lần đo trước đó đều đổi SAI biến (bỏ `questions`, rồi tắt method, rồi tắt cả `Localizations.securityQuestions`) vì suy luận từ triệu chứng thay vì ĐỌC CHỮ KÝ HÀM trong `node_modules` — thứ có sẵn ngay từ đầu, đọc mất 30 giây. Gặp SDK cư xử lạ: đọc `.d.ts` + thân hàm TRƯỚC, đừng đoán mò rồi thử-sai trên production.
- **`Localizations.securityQuestions` VÔ TỘI** — đã bật lại đầy đủ. Ảnh user chụp ở bản `f02cd86` (lúc chỉ có `setLocalizations`, chưa gọi `setCustomSecurityQuestions`) cho thấy màn hiện ĐẦY ĐỦ dropdown + ô nhập → khối này chưa bao giờ làm rỗng màn.
- **✅ 08-04e – fix nốt `securityIntros` dính chữ:** "Thiết lậpkhôi phục tài khoản" cùng bệnh với `requiredMark` (SDK ghép `headline`+`headline2` không tự chèn dấu cách) → đệm khoảng trắng đầu `headline2`.
- **`getSDK()` là ASYNC (nạp lười 740KB SDK+polyfill)** – mọi chỗ gọi PHẢI `await getSDK()`. Quên await → PIN chết câm. Check: `grep -rn "getSDK()" src/ | grep -v await` phải RỖNG.
- **userToken sống 60'** → `refreshSession()` trước MỌI thao tác PIN.
- **Sai PIN KHÔNG đóng iframe** – `executeChallenge` BỎ QUA `RETRYABLE_CODES` (155112/155703/155704/155115/155705), chỉ settle khi success/lỗi terminal. `155701` = user tự huỷ → im lặng.
- 3 endpoint PIN: `POST /user/pin` đặt · `PUT` đổi · `POST /user/pin/restore` quên. User SSO/OTP không có PIN → 403.
- `contractExecution`: field phẳng `feeLevel:'MEDIUM'`, nhận `abiFunctionSignature`+`abiParameters` hoặc `callData`. Lỗi Circle: trả nguyên văn `message (HTTP status, code)`; dò `e?.message || e?.error?.message`.
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.

**Arc / Stablecoin Kit:**
- **RPC công cộng RATE LIMIT chặt (HTTP 429):** đọc nhiều thứ PHẢI gộp Multicall3 (`publicClient.multicall()` tự dùng); retry giãn ≥600ms; retry dày = tự đâm vào 429 vĩnh viễn (bài học 07-17b). **Đọc hỏng → hiện `…`, KHÔNG vẽ 0.**
- Gas trả bằng USDC (nội bộ 18 decimals), rất rẻ – hiện `< $0.01` thay vì `$0.00`.
- **ArcScan (Blockscout) BỎ QUA `limit` – phải dùng `page` + `offset`** (đo thật 07-31, ví nhiều giao dịch): `&limit=50` → trả **10.000 dòng / 11,7s**; `&page=1&offset=50` → 50 dòng / **0,4s**; `offset=1000` → 1,7s. TxHistory từng dùng `limit=50` nên **âm thầm tải TOÀN BỘ lịch sử ví** mỗi lần mở. `sort=desc` thì ArcScan CÓ tôn trọng – nhưng list vẫn **tự sort ở client**, đừng tin thứ tự API.
- **ĐỪNG gộp `txlist` (chuyển native) vào lịch sử** (đã thử và LOẠI 07-31): Arc lấy USDC làm native token nên tưởng `tokentx` bỏ sót chuyển native → đo ra **0 giao dịch bị thiếu** trong cùng khung thời gian (Blockscout index luôn chuyển native thành token transfer). Gộp thêm `txlist` sẽ **ĐẾM TRÙNG 70/75 giao dịch**.
- **RPC Arc lần gọi NGUỘI ~3,3s** (các lần sau 130–360ms; đo 07-31). Nên MỌI màn đọc số dư PHẢI seed từ cache tầng module (`cachedBalances`) rồi fetch nền – HomeSend/HomeReceive/Swap giờ đều làm vậy. Màn nào bắt đầu từ `{}` là user nhìn `…` mất mấy giây.
- **CORS RPC: production OK, localhost KHÔNG.** `rpc.testnet.arc.network` echo `access-control-allow-origin` theo Origin thật (verify bằng trình duyệt chạy TRONG origin `ezwallet.cash`: 200, 535ms) nhưng chặn `http://localhost:5173`. → `npm run mock` thấy log CORS đỏ từ RPC là **BÌNH THƯỜNG**, không phải bug production, ĐỪNG đi sửa.
- Kit `amount` = base units (mục 4).

**PWA (thêm vào màn hình chính iOS):**
- **Dải xám trên cùng ở status bar = nền `body`.** iOS standalone PWA thiếu `viewport-fit=cover` (index.html) nên nội dung bó trong safe-area; vùng status bar (ngoài viewport) bị iOS lấp bằng **màu nền `body`**. Trước để `--color-gray` → lộ dải xám. Fix 07-19: `body background = --color-white` (index.css) → hoà trắng với `.screen`. **ĐỪNG đổi body bg mặc định về xám lại.** ⚠️ Cập nhật 07-22: nền NGOÀI khung app trên desktop/tablet = XANH DƯƠNG PASTEL NHẠT NHÒA qua `@media (min-width: 481px) { body { background: #D6EAFB } }` (user chốt 07-22c – từ #0B53BF→#0088FF→#D6EAFB, càng lúc càng nhạt cho đỡ chói; đảo bản xám 07-21) – an toàn vì điện thoại luôn ≤430px nên không chạm ngưỡng; `.screen` có nền trắng riêng nên khung app không bị xám lây. Muốn full-bleed kiểu native thì thêm `viewport-fit=cover` + `env(safe-area-inset-*)` padding cho `.screen` (đụng lưới 10 hàng – user đã chọn KHÔNG làm, giữ nền trắng).
- iOS cache meta/manifest lúc "Add to Home Screen" → đổi manifest/meta không ăn cho tới khi **xoá app + Add lại** (đổi CSS như trên thì ăn ngay lần mở kế).

**Khác:**
- iOS Safari: không BarcodeDetector → jsQR; Web Share API lưu Photos; không dùng `clipboard.readText()` (dialog phiền). **Ngoại lệ duy nhất: nút Dán ở PasteAddress** – và CHỈ đọc khi ô trống (07-23): popup "Paste|Speak" là XÁC NHẬN CỦA iOS 16+ (bảo mật clipboard, web không tắt được, cũng KHÔNG thay bằng popup riêng được – popup mình sẽ đứng TRƯỚC popup iOS thành 2 lần bấm; "Speak" do máy bật Spoken Content); ô đã có địa chỉ EVM hợp lệ → **nhãn nút đổi "Paste"→"Confirm"** + đi tiếp thẳng, không đụng clipboard → không popup. User hỏi rồi (2 lần), đừng tìm cách "tắt/thay popup" nữa.
- Màn không có NotifArea → lỗi hiện qua `ErrorToast` (truyền `sendError` qua navigate).
- Sign-out chỉ xoá session keys, GIỮ `ez_contacts/ez_saved_qrs/ez_lang/ez_currency`.
- **localStorage GẮN THEO ORIGIN → đổi domain là "mất" dữ liệu local (07-29, không phải bug):** ai từng dùng app trên `ezwallet.pages.dev` thì sang `ezwallet.cash` sẽ thấy **chưa đăng nhập + trống danh bạ / kho QR / thông báo** – vì `ez_*` nằm ở origin cũ. **VÍ VÀ TIỀN KHÔNG MẤT** (ví gắn với email ở Circle: đăng nhập lại đúng email + PIN là ví cũ trở lại). Riêng `ez_contacts`/`ez_saved_qrs` thì phải nhập lại tay, hoặc mở lại link cũ để xem. Đừng hứa với user là "y nguyên".

---

## 7b. QR – KHOÁ MẠNG ARC (user chốt 2026-08-13)

**`src/qr.js` = NGUỒN SỰ THẬT DUY NHẤT của định dạng QR.** Mọi chỗ vẽ (HomeReceive · ShowQR · SavedQRList) gọi `buildQR()`, chỗ đọc (QRScanner) gọi `parseQR()`. **ĐỪNG nối chuỗi `ezwallet:...` bằng tay ở màn nào** – trước 08-13 rải 3 chỗ, sửa 1 chỗ là lệch.

```
ezwallet:0xABC…@5042002                      ← QR mặc định màn Nhận
ezwallet:0xABC…@5042002?amount=25&cur=USD    ← QR có sẵn số tiền
```

**Vì sao khoá:** QR mặc định TRƯỚC ĐÂY vẽ **địa chỉ trần `0x…`**. Địa chỉ EVM giống hệt nhau trên MỌI chuỗi ⇒ ví bất kỳ đang ở Ethereum/Base/BSC quét là gửi được, tiền sang chuỗi khác là **mất luôn**. Đối tượng app là người lớn tuổi, không có cửa tự nhận ra sai chuỗi. Chủ trương của user: **"giờ chỉ dùng 1 mạng thôi"**; sau này tính CCTP Unified Balance, và có thể theo mô hình *"chain khác nhau = ngân hàng khác nhau"*.

**Phân vai CỐ Ý bất đối xứng (đừng "sửa cho nhất quán"):**
- **QR = KHOÁ** Arc. Đây là đường bấm-một-phát-là-gửi, phải chặn.
- **Địa chỉ dạng chữ (nút copy / Share) = ĐỂ TRẦN**, không kèm chuỗi. Đây là lối thoát để nạp từ sàn / ví khác. User chốt: *"địa chỉ ví thì không sao"*.

**⚠️ CỐ TÌNH KHÔNG DÙNG EIP-681 (`ethereum:0x…@5042002`):** chuẩn đó CÓ trường chainId, nhưng nhiều ví cài ẩu – đọc địa chỉ rồi **bỏ qua `@chainId`** và gửi trên chuỗi đang mở ⇒ còn nguy hơn địa chỉ trần vì mình tưởng đã khoá. Scheme lạ `ezwallet:` thì ví khác chỉ có một cửa là **từ chối**.

**parseQR nhận 3 dạng** (đã test round-trip): `ezwallet:…@5042002` chuẩn · `ezwallet:…` **không có @chain** (QR CŨ đã in/share/lưu ảnh trước 08-13 – coi như Arc, phải còn quét được) · **`0x…` trần** (QR từ ví ngoài mình quét ĐỂ GỬI ĐI – khoá cái này là user hết đường gửi cho người ngoài). QR EZwallet của chuỗi khác → trả `{ wrongChain }` → màn quét báo *"QR của mạng khác – ví này chỉ dùng trên Arc"*. **`{ wrongChain }` KHÔNG có `.address`** – bắt riêng trước nhánh hợp lệ, không thì sang màn nhập tiền với address `undefined`.

**Đổi chuỗi (lên mainnet / thêm chuỗi) → sửa `ARC_CHAIN_ID` trong `src/qr.js`** (`chain.js` import lại hằng này cho `defineChain`, không khai 2 nơi).

---

## 7e. THÔNG BÁO NHẬN TIỀN – nhịp hỏi (bug user báo 2026-08-13)

**Triệu chứng:** *"thông báo nhận tiền xuất hiện rất lâu"*, trong khi **gửi thì hiện ngay**.

**Gốc:** `NotifArea.pollIncoming` — tên là *poll* (hỏi lặp lại) nhưng gọi **ĐÚNG MỘT LẦN** lúc mở màn (`useEffect(..., [])`), và **toàn app không có `setInterval` nào**. Ngồi yên ở màn Gửi/Nhận thì tiền về cũng không ai hỏi lại → thông báo chỉ hiện khi user vô tình chuyển tab qua lại (component remount). Chiều **GỬI** hiện ngay vì `SendReceipt` tự `addNotif` tại chỗ, không phải hỏi mạng — nên chỉ chiều NHẬN chậm.

**⚠️ VÌ SAO KHÔNG PHẢI LỖI NHỎ:** app cho người lớn tuổi. Được báo *"đã chuyển tiền rồi"* mà mở app không thấy gì thì người ta **LO**, rồi gọi điện hỏi, rồi bấm lung tung. Im lặng ở màn hình tiền bạc là lỗi nặng. Đừng "tối ưu" bỏ việc hỏi lặp đi.

**NHỊP HỎI THEO VIỆC USER ĐANG LÀM (user chốt):**

| Màn | Nhịp | Vì sao |
|---|---|---|
| **Nhận** | **5s** (`pollMs={5000}`) | Vừa chìa QR cho người ta, **đang đứng chờ** tiền vào |
| **Gửi** | **15s** (mặc định) | Không ai chờ tiền vào ở màn này |

- **Bỏ qua nhịp khi tab ẩn** (tốn pin/dữ liệu mà user có nhìn đâu) + **hỏi NGAY khi quay lại app** (`visibilitychange`) — kịch bản hay gặp nhất: được báo đã chuyển tiền → mở app lên → phải thấy liền.
- Cờ module `polling` chống chồng lệnh khi mạng chậm.
- ⚠️ **Muốn nhanh hơn ở màn nào thì truyền `pollMs` cho RIÊNG màn đó**, ĐỪNG hạ nhịp mặc định: mỗi nhịp là 1 request nhân với mọi máy đang mở app.
- ⚠️ Deps của effect là `[pollMs]`, không phải `[]`.

**Đo Playwright:** cùng 22s → màn Nhận **4 lần, cách đều 5.0s**; màn Gửi **1 lần**. Ẩn/hiện tab → hỏi ngay lập tức.

**CÒN THIẾU:** việc hỏi chỉ chạy khi đang ở **màn Gửi hoặc Nhận** (2 màn duy nhất render `NotifArea`). Đang ở Lịch sử/Menu/Swap mà tiền về thì không có gì báo tới khi quay lại Home. Muốn báo ở mọi màn phải dời việc hỏi lên tầng `App.jsx` — **chưa làm, cần user duyệt vì đụng kiến trúc**.

---

## 7d. NÚT BÁO LỖI → TELEGRAM (2026-08-13) – ĐANG CHẠY THẬT

Icon 🐛 **xám** (`--color-muted-2`) sát mép phải, canh giữa **hàng 1**, hiện ở **MỌI màn kể cả Login/PinGate** (lỗi hay xảy ra nhất là lúc chưa vào được app). Render 1 lần ở `App.jsx` trong khung neo `maxWidth: var(--screen-max)` → bám mép phải **của app**, không phải mép màn hình desktop.

⚠️ **MÀU: đừng đổi sang xanh/đỏ** (user đã cân nhắc cả 3): xanh brand = màu "bấm cái này đi" → tranh chỗ với nội dung chính trên mọi màn; đỏ = màu lỗi/nguy hiểm → chấm đỏ cạnh số dư làm người lớn tuổi tưởng **tiền của họ** có vấn đề. Xám = "công cụ nằm đó, chưa dùng tới" (= icon navbar chưa chọn).

**`functions/api/bug.js` — bot CHỈ LÀ TOKEN, KHÔNG chạy nền, KHÔNG cần VPS.** Nó không nghe, không poll, không webhook: mỗi lần bấm nút là 1 lệnh `fetch` tới `api.telegram.org` rồi kết thúc. (Khác hẳn bot TemBro trên VPS phải bật 24/7.)

- ⚠️ **KHÔNG dùng `parse_mode`** — chữ user gõ tự do, bật Markdown/HTML là gãy tin nhắn (dấu `*_\`<>`) hoặc chèn được thẻ. Text thuần thì không phải escape gì.
- ⚠️ **Whitelist đúng 5 field** (`message/screen/wallet/device/version`). Client **KHÔNG được gom localStorage** gửi lên. `ez_user_token` / `ez_encryption_key` / `ez_refresh_token` / `ez_sync_token` lọt ra là **MẤT VÍ**. Địa chỉ ví thì gửi (công khai, và không có nó thì không tra được giao dịch lỗi).
- Chặn dội tin **5 lần/giờ/IP** qua KV `EZ_SYNC`. **Chưa có KV → BỎ QUA chặn chứ không chặn hết**: thà nhận spam còn hơn khoá nhầm người đang thật sự cần kêu cứu.
- Telegram trả **200 kèm `ok:false`** khi sai chat_id / bot bị chặn ⇒ phải đọc `ok`, đừng tin mỗi HTTP status.
- Chưa đặt biến → **503 `bug-report-disabled`**, app chạy bình thường (đúng lối `sync.js` khi chưa có KV binding).

**Biến môi trường (ĐÃ ĐẶT trên Cloudflare Pages production, dạng encrypted):** `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID`. Bot `@ezwallet_report_bot` ("EZwallet Bug Report"). Giá trị cũng nằm ở `.env.txt` local (gitignore) cho `dev-server.js` chạy được.
⚠️ **Pages CHỈ áp biến mới cho deployment MỚI** — đặt biến xong phải tạo deployment mới (`POST …/pages/projects/ezwallet/deployments -F branch=main`), bản đang chạy sẽ **không** tự nhận.
⚠️ Telegram **chặn bot nhắn cho ai chưa bấm Start với nó** — đổi người nhận thì người đó phải Start trước.

**Phiên bản trong báo lỗi** = 7 ký tự commit, nhúng lúc build (`vite.config.js` → `__APP_VERSION__`): Cloudflare có sẵn `CF_PAGES_COMMIT_SHA`, local hỏi `git`, hỏng cả hai → `'dev'` (không để build chết).

**Đã verify trên production:** POST thật → `{"ok":true}` + tin về Telegram. Tin rỗng → 400 `empty-message`. *(Chặn 5 lần/giờ mới chỉ đọc code, chưa bắn thử vì thử là spam Telegram user.)*

---

## 7bb. Web Share trên iOS – `files` + `text` làm RỤNG BỚT APP NHẬN (bug user báo 2026-08-13)

**Triệu chứng:** bấm Share ở màn Nhận → bảng chia sẻ iOS **hiện ra bình thường** nhưng **MẤT Messages/Zalo** trong danh sách app nhận.

**Cách khoanh vùng (dùng lại được cho bug share sau này):** hỏi user 2 câu — *bảng có hiện không* (hiện ⇒ `navigator.share()` KHÔNG bị chặn, loại bỏ giả thuyết "gọi share ngoài cú chạm") và *2 nút share kia còn chạy không* (còn ⇒ lỗi nằm ở riêng chỗ này, không phải `saveImage.js`). Rồi `grep saveImageToPhotos(` → **màn Nhận là chỗ DUY NHẤT truyền tham số `text`**; ShowQR và SendReceipt chỉ gửi ảnh và vẫn chạy tốt. ⇒ thủ phạm là `text`.

**Luật rút ra:** `navigator.share({ files, text })` làm iOS **lọc bớt app nhận**. Chỉ gửi `{ files }` thì Messages hiện lại.

**⚠️ BẢN SỬA ĐẦU ĐÃ BỊ USER BÁC — đọc kỹ kẻo sửa vòng lại.** Bản đầu bỏ `text` và **vẽ địa chỉ lên ảnh**; user chê *"gắn địa chỉ vào QR xấu lắm"* và chốt: ***"miễn sao là cái đó share 2 thứ, not 1 thứ"***.

**TRẠNG THÁI CUỐI (user chốt 08-13):**

| Chỗ share | Gửi gì | Ghi chú |
|---|---|---|
| **Màn Nhận** | **ẢNH + TEXT địa chỉ ví** | ⚠️ Kèm text ⇒ iOS lọc bớt app nhận (Messages có thể rụng). **User BIẾT và CHẤP NHẬN.** ĐỪNG bỏ `text` đi để "sửa" lần nữa. |
| **ShowQR / Kho QR** | **CHỈ ẢNH** | Ở đây thứ quan trọng là SỐ TIỀN trong QR; quét là ra địa chỉ, đính thêm vừa thừa vừa rụng app nhận. |
| **Biên lai** | CHỈ ẢNH | không đổi |

**Ảnh QR dùng chung `saveImage.brandedQrCanvas()`** — QR + chữ **"Only Arc Testnet"** + logo EZwallet. **KHÔNG vẽ địa chỉ lên ảnh.** Cả màn Nhận lẫn ShowQR đều đi qua hàm này, đừng vẽ tay ở màn nào.
**Tiện thể xong luôn việc B đang treo ở mục 9:** ảnh chia sẻ giờ CÓ nhãn mạng. Màn hình thì vẫn chưa (user còn phải chọn chỗ đặt).

---

## 7c. ÂM THANH báo thành công (user chốt 2026-08-13) — ⚠️ ĐANG LÀM DỞ

**Trạng thái:** `src/sound.js` đã viết xong. **CHƯA nối vào màn nào, CHƯA có nút tắt, CHƯA test, CHƯA commit.** Việc còn lại ở mục 9.

**4 quyết định của user (đã cân nhắc phương án khác rồi mới chốt — đừng đề xuất lại):**

| | Chốt | Đã LOẠI, vì sao |
|---|---|---|
| Kêu ở đâu | **Gửi tiền xong** (SendReceipt) · **Swap xong** | ❌ *Nhận được tiền*: tiền tự về, KHÔNG có cú chạm nào ⇒ iOS chặn phát âm, phải giữ AudioContext sống cả phiên. ❌ *Copy/lưu QR/việc nhỏ*: kêu nhiều thì tiếng **mất thiêng**, đúng lúc tiền rời ví lại không nổi bật |
| Tiếng lấy đâu | **Tự sinh Web Audio** (2 nốt sin đi lên C6→E6, ~0,3s) | ❌ *File mp3*: phải xin/đi tìm file, tăng dung lượng, dính bản quyền, lần đầu có thể trễ |
| Nút tắt | **CÓ** — thêm 1 hàng vào màn `Language` (đang có 2 hàng Ngôn ngữ + Tiền tệ) | ❌ *Không có nút tắt*: nếu iOS phát kể cả khi điện thoại đang im lặng thì user hết đường tắt |
| Mặc định | **BẬT** (`localStorage.ez_sound`, chỉ ghi `'off'` khi tắt) | — |

**⚠️ LUẬT iOS — lý do có `unlockOnFirstTouch()`:** `AudioContext` sinh ra ở trạng thái `suspended`, **chỉ `resume()` được BÊN TRONG một cú chạm của user**. Lúc gửi tiền xong thì đã qua nhiều `await` (ký PIN trong iframe Circle, chờ on-chain) ⇒ **chuỗi cử chỉ ĐỨT**, gọi `resume()` ở đó là quá muộn. Nên phải mở khoá sẵn ở **cú chạm ĐẦU TIÊN vào app** (App.jsx gọi 1 lần). Chạm vào iframe PIN của Circle **không tính** cho trang mình.

**⚠️ CHƯA BIẾT, phải test trên máy thật của user:** iOS có tôn trọng **nút gạt im lặng** với Web Audio hay không — khác nhau theo đời iOS. Đây chính là lý do bắt buộc có nút tắt trong app.

**⚠️ Rung (`navigator.vibrate`) KHÔNG khả thi trên iPhone** — Safari iOS không hỗ trợ, chỉ Android có. Đừng hứa "rung + kêu".

**Luật vàng:** `playSuccess()` phải **im lặng khi lỗi** (mọi thứ bọc try/catch, thiếu `AudioContext` thì return) — **TUYỆT ĐỐI không để tiếng chuông làm văng luồng tiền**.

---

## 8. localStorage keys

**Session:** `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (email login), `ez_refresh_token`/`ez_google_email`/`ez_google_deviceId`/`ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`, `ez_notified_hashes`, `ez_faucet_pending`. `sessionStorage.ez_pin_ok` = cờ mở khoá phiên; **`sessionStorage.ez_sync_token`** = token sao lưu danh bạ, đổi từ chữ ký PIN ở `PinGate` (08-06) – **cố ý để sessionStorage** để nó chết cùng phiên app, mở lại app là ký lại.
**Bền:** `ez_contacts_<addr>`, `ez_saved_qrs_<addr>` (per-account, xem `store.js`), `ez_lang`, `ez_currency`, `ez_default_note`, **`ez_sync_at_<addr>`** (mốc sửa cuối – trọng tài của luật "bản mới nhất thắng" khi sao lưu KV).

---

## 9. Việc tiếp theo

### 🟠 ĐANG DỞ – phiên 2026-08-13 (làm tiếp cái này TRƯỚC)

**A. Âm thanh báo thành công** (quyết định đầy đủ ở mục 7c, đừng hỏi lại user):
1. `App.jsx` → gọi `unlockOnFirstTouch()` 1 lần trong `useEffect` lúc mở app.
2. `SendReceipt.jsx` → `playSuccess()` khi vào màn (cạnh chỗ `addNotif('Đã gửi…')`).
3. `Swap.jsx` → `playSuccess()` ngay sau `setSuccess(true)` (bước "đã gửi lệnh", chỗ user thấy nút xanh lá).
4. `Language.jsx` → thêm hàng thứ 3 **"Âm thanh: On/Off"**, dùng lại đúng component `Picker` + kiểu `CHIP` sẵn có (đừng chế toggle kiểu mới). Box xám phải nới `gridRow: '2 / 4'` → `'2 / 5'` cho 3 hàng cao đều.
5. **Đổi tên màn** `Language` → **"Settings"**: nhãn ở `MenuScreen` ITEMS + tiêu đề màn + key i18n. Lý do: màn không còn chỉ có ngôn ngữ & tiền tệ nữa. ⚠️ Việc TÁCH màn này khỏi Security (08-04) vẫn giữ, đừng gộp lại.
6. Key i18n EN cần thêm: `'Âm thanh'`→Sound · `'Bật'`→On · `'Tắt'`→Off · `'Cài đặt'`→Settings. Xong chạy `npm run check-lang en` phải 100%.
7. **Test trên máy thật của user** (Playwright headless KHÔNG nghe được tiếng, chỉ verify được là không văng lỗi + nút tắt ghi đúng localStorage): kiểm iOS có tôn trọng **nút gạt im lặng** không.

**B. Nhãn mạng dưới QR màn Nhận – CHỜ USER CHỌN CHỖ ĐẶT.** QR đã khoá Arc ở tầng dữ liệu (mục 7b) nhưng **màn hình không có chữ nào nói đây là mạng gì** – máy thì đọc được `@5042002`, người thì chỉ thấy ô vuông đen trắng. Hợp với mô hình user đang nghĩ tới: *"chain khác nhau = ngân hàng khác nhau"*. Vướng: màn Nhận đã kín (hàng 6 nút copy, 7-8 vùng gợi ý, 9 ba nút) → **đặt ở đâu là quyết định bố cục của user, đừng tự chèn**.

### 🔴 CHỜ USER BẤM TAY – chốt phiên 2026-07-31 (đọc mục này TRƯỚC)

> Code xong hết và đã push. Còn **2 việc chỉ làm được trên Cloudflare Dashboard** (Claude không đăng nhập được: `wrangler login` cần OAuth qua browser, và **wrangler v4 KHÔNG có lệnh gắn custom domain cho Pages** – đã kiểm tra `wrangler pages --help`, chỉ có project/deployment/deploy/secret/download).

**0. `www.ezwallet.cash`** – ✅ **XONG 08-01, Claude tự làm** (thêm custom domain vào Pages qua REST + tạo `CNAME www → ezwallet.pages.dev` proxied bằng token `claude-code`). Đo sau khi tạo: www lên sau **15 giây**, cả 2 domain HTTP **200**, SSL hợp lệ (`ssl_verify_result=0`), cùng phục vụ 1 app. **KHÔNG cần redirect www → apex**: `index.html` đã có `<link rel="canonical">` trỏ `https://ezwallet.cash/` nên SEO không bị trùng nội dung.

**1. Gắn domain `ezwallet.cash`** – ✅ **XONG** (đo 07-29 tối: A `172.67.168.76`/`104.21.94.133` + AAAA, HTTPS **200**, SSL hợp lệ, server Cloudflare). ⚠️ **`www.ezwallet.cash` CHƯA gắn** (không phân giải) – muốn www chạy thì Custom domains → thêm `www.ezwallet.cash`.

**2. Tạo KV binding cho sao lưu danh bạ** – ✅ **XONG 08-06, Claude tự làm** (KHÔNG cần vào Dashboard: `wrangler` đã đăng nhập sẵn bằng OAuth, có scope `workers_kv (write)` + `pages (write)`).
  - Namespace `EZ_SYNC` id `5aec627d80c74c3981944dc070b3bbf0` (`wrangler kv namespace create EZ_SYNC`).
  - Gắn vào Pages project bằng REST `PATCH /accounts/{acct}/pages/projects/ezwallet` với `deployment_configs.production.kv_namespaces` (+ `preview`). **PATCH là merge** – 3 env var `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` đã kiểm tra lại sau khi PATCH: còn nguyên.
  - Deploy lại bằng REST `POST .../deployments` (branch `main`) → deployment `7dd93cfe`, commit `d01f7b6`.
  - **⚠️ ĐỪNG dùng `wrangler pages deploy` hay thêm `pages_build_output_dir` vào `wrangler.toml`** cho project này: nó đang nối GitHub (`source: github/ezwallet`, prod branch `main`). Deploy trực tiếp = deployment direct-upload lạc khỏi luồng Git; chuyển sang cấu hình bằng `wrangler.toml` thì env var đặt ở Dashboard có thể bị bỏ qua → gãy `API_KEY` = gãy login/swap. Đường REST ở trên là đường an toàn, dùng lại lần sau.
  - **Verify trên production (08-06):** `POST https://ezwallet.cash/api/sync {"action":"nonce"}` → **200** (trước là 503). Chạy hết luồng bằng khoá test viem: nonce → ký → session (`address` recover khớp ví ký) → push → pull (avatar bị loại đúng) → replay nonce **401 bad-nonce** → token bịa **401 bad-token**. **Đã xoá sạch 3 key test khỏi KV sau khi đo** (`wrangler kv key list` trả `[]`).
  - **CÒN LẠI = 1 thứ duy nhất chưa verify được bằng máy:** chữ ký THẬT của Circle có đúng chuẩn EIP-191 như server giả định không (Circle SDK không chạy localhost, và khoá test không thay được MPC). → checklist 🔴 ở mục 3.

**2b. CI chưa lên được** – `.github/workflows/ci.yml` **đã viết sẵn, nằm LOCAL, chưa commit**: GitHub từ chối push vì token `gh` thiếu scope `workflow`. Sửa: chạy `gh auth refresh -h github.com -s workflow` (mở browser) rồi `git add .github && git commit && git push`. Badge CI trong README cũng đã tạm bỏ, thêm lại khi workflow lên.

*(Muốn Claude tự làm 2 việc trên: tạo API token Cloudflare quyền **Account → Cloudflare Pages → Edit**, ghi vào `.env.txt` dạng `CF_API_TOKEN=` + `CF_ACCOUNT_ID=` – file đã gitignore, token không cần dán vào chat – rồi bảo Claude gọi REST API.)*

**3. Checklist test TRÊN DEPLOY** (những thứ localhost không test được vì Circle SDK không chạy trên localhost):
- [ ] Mở `https://ezwallet.cash` → login email + **PIN** chạy bình thường trên domain mới
- [ ] Gửi tiền 1 lệnh + swap 1 lệnh (chắc chắn đổi domain không phá đường tiền)
- [ ] **Fix 07-31 – lịch sử:** giao dịch user lỡ tự gửi cho chính mình phải hiện **"Sent to yourself"** (KHÔNG còn "Swapped … USDC to USDC"), thứ tự mới→cũ đúng, mở nhanh hơn hẳn
- [ ] **Fix 07-31 – chặn tự gửi:** dán địa chỉ ví mình → báo đỏ, không đi tiếp · quét QR nhận tiền của chính mình → báo, không đi tiếp
- [ ] **Fix 07-31 – mượt:** mở màn Swap thấy số dư **ngay** (không đứng `…`) · mở Lịch sử lần 2 phải tức thì (lời nhắn đã nhớ)
- [ ] Thẻ chia sẻ link: dán `ezwallet.cash` vào Telegram cho chính mình → phải ra ảnh + tiêu đề (X/Facebook cache thẻ, xem mục 5)
- [ ] 6 sửa UI 07-29: nút 3/4 màn (Swap · Tap-to-copy · Hold-to-show · Back ở About/Language/Security) · nút ⇅ gradient + icon trắng · Scan QR có tiêu đề hàng 1 + nút **Done** · Contacts nút Add không icon · QR Storage có cặp **Back | Add**
- [ ] ⚠️ Nhắc lại: user cũ trên `ezwallet.pages.dev` sang domain mới sẽ thấy **chưa đăng nhập + trống danh bạ** (localStorage theo origin). Ví/tiền không mất. Xem gotcha mục 7.
- [ ] **Mới 08-04 – localize PIN tiếng Việt:** tạo ví mới (màn Tạo PIN + Xác nhận PIN) · Đổi PIN (Security) · Quên PIN (câu hỏi bảo mật) → chữ phải ra tiếng Việt như `circleLocalizations.js`, không vỡ layout/tràn chữ. Lỡ nhập sai PIN thì câu lỗi vẫn tiếng Anh – ĐÚNG như thiết kế, không phải bug.
- [ ] **🔴 Mới 08-06 – AUTH SAO LƯU DANH BẠ.** KV binding + deploy + phần server ĐÃ verify xong bằng khoá test (mục 9 việc 2). Phần dưới đây là phần **chỉ máy thật mới đo được** vì cần PIN + Circle MPC ký:
  - [ ] Mở app → qua PinGate → **Console KHÔNG được có dòng `[sync] địa chỉ recover từ chữ ký KHÔNG khớp ví đang mở`**. Có dòng đó = Circle ký KHÔNG theo EIP-191 như giả định → sao lưu tự tắt (app vẫn chạy, không hỏng gì) nhưng **báo lại ngay**, phải đổi cách verify ở `functions/api/sync.js`.
  - [ ] Máy A thêm 1 danh bạ → máy B (cùng email + PIN) mở app → danh bạ hiện ra, **KHÔNG có ảnh** (đúng thiết kế, avatar không lên server).
  - [ ] Xoá danh bạ đó ở máy B → mở lại máy A → phải **mất luôn** (last-write-wins; sống lại = luật gộp hỏng).
  - [ ] Nhập SAI PIN 1 lần rồi nhập đúng → vẫn vào app **và** vẫn sao lưu được (nonce chưa bị tiêu khi ký hỏng).
  - [ ] Đăng xuất → `sessionStorage.ez_sync_token` phải mất; đăng nhập lại bằng email khác → **không** thấy danh bạ của tài khoản trước.
- [ ] **Mới 08-04b (fix sau lần test đầu):** màn "Câu hỏi bảo mật" – chữ "(bắt buộc)" phải tách rõ khỏi "Câu hỏi"/"Câu trả lời", không dính liền nữa. Màn "Xác nhận bảo mật" – 3 dòng cảnh báo phải ra tiếng Việt. **QUAN TRỌNG:** gõ đúng "Tôi đồng ý" vào ô xác nhận – nút Tiếp tục CÓ sáng lên không? Nếu KHÔNG sáng, báo lại ngay – nghĩa là phải đổi hướng dẫn sang "gõ I agree" (xem gotcha mục 7).

**Đã làm xong phiên 08-04:** Bật `setLocalizations` tiếng Việt cho màn PIN/bảo mật của Circle SDK (`src/circleLocalizations.js` mới + wire vào `circle.js`/`Login.jsx`) – đảo quyết định English-thuần 07-01 sau khi tra lại docs xác nhận phạm vi localize được rộng hơn tưởng (xem gotcha mục 7). Build production `npm run build` pass. **Chưa test được trên iframe thật** (Circle SDK không chạy trên localhost, xem mục 3) – cần tự bấm thử trên deploy: tạo ví mới / đổi PIN / quên PIN để xác nhận chữ Việt hiện đúng, không vỡ layout.
Test thật xong, user báo 2 lỗi (ảnh chụp): "Câu hỏiBắt buộc" dính liền + màn Xác nhận bảo mật vẫn 3 dòng English. Đã fix cả 2 (xem gotcha mục 7) + gọi thêm `setCustomSecurityQuestions` (method riêng, tách khỏi `setLocalizations`). Đổi luôn hướng dẫn màn Xác nhận bảo mật sang gõ "Tôi đồng ý" nhưng CHƯA CHẮC field `inputMatch` đổi được cụm từ SDK thật sự validate – cần test lại.
Soạn thêm 8 câu hỏi bảo mật tiếng Việt (`CIRCLE_SECURITY_QUESTIONS`), wire qua `setCustomSecurityQuestions({ questions })`. Test lại: `inputMatch`="Tôi đồng ý" CHẠY THẬT (nút sáng) ✅ — nhưng `questions` làm RỖNG TOÀN BỘ màn Câu hỏi bảo mật ❌ (chặn tạo ví) + kéo `securityConfirmItems` rơi lại English. Bỏ `questions`, giữ `securityConfirmItems` + fix nốt `securityIntros` dính chữ, deploy lại → **VẪN RỖNG Y HỆT** (user báo "vẫn ko thấy câu hỏi bảo mật để nhập"). Kết luận: KHÔNG phải do `questions`, mà do BẢN THÂN việc gọi `setCustomSecurityQuestions()` (xem gotcha mục 7). **Đã TẮT HẲN method này ở cả 3 chỗ gọi** — màn Câu hỏi bảo mật về lại English mặc định của Circle (chưa test lại). 3 dòng cảnh báo + bộ câu hỏi tiếng Việt tạm gác. Build pass, đã push. **Cần test lại:** màn Câu hỏi bảo mật có hết rỗng, dùng được để tạo ví không (ƯU TIÊN CAO NHẤT — nếu vẫn rỗng thì lỗi nằm ở chỗ khác, có thể là `Localizations.securityQuestions`, cần báo ngay).

Sau đó tìm ra ROOT CAUSE THẬT: **gọi SAI CHỮ KÝ `setCustomSecurityQuestions`** (tham số vị trí, không phải object) — xem gotcha mục 7. Sửa xong thì cả bộ câu hỏi tiếng Việt lẫn 3 dòng cảnh báo đều chạy. Từ đó làm tiếp: mở khoá đa ngôn ngữ, việt hoá triệt để, và tiền tệ VND.

---

### 👤 CHỦ SỞ HỮU: việc THÊM NGÔN NGỮ giao cho **LongDC** (user chốt 08-04)

> Từ 08-04, phần **thêm ngôn ngữ mới** do **LongDC** phụ trách. Hạ tầng đã dựng xong và có script gác cổng — đọc hết mục 🌏 bên dưới trước khi bắt tay. Tóm tắt cho người mới vào:
>
> **Đang có gì:** `vi` (tiếng Việt, ngôn ngữ gốc) và `en` đã xong 100%, đang mở. `zh` mới phủ **35%** từ điển và **chưa có** bản dịch Circle → đang khoá.
>
> **Luật bắt buộc (user chốt, không thương lượng):**
> - **"Đã Việt thì Việt all, đã Anh thì Anh all"** — không để user thấy màn nửa ngôn ngữ này nửa kia.
> - **"Một ngôn ngữ = một lượt build kỹ"** — dịch xong HẲN rồi mới mở, không mở dở dang.
>
> **Quy trình thêm 1 ngôn ngữ (vd `zh`):**
> 1. Bổ sung từ điển trong `src/i18n.js` (`const ZH = {...}`). Key = chuỗi tiếng Việt gốc.
> 2. Thêm bản dịch Circle trong `src/circleLocalizations.js`: cả 3 hằng `CIRCLE_LOCALIZATIONS`, `CIRCLE_SECURITY_QUESTIONS`, `CIRCLE_SECURITY_CONFIRM_ITEMS`. Bỏ bước này thì app dịch xong mà màn PIN vẫn tiếng Anh = vi phạm luật trên.
> 3. Chạy **`npm run check-lang zh`** cho tới khi báo "ĐỦ ĐIỀU KIỆN".
> 4. CHỈ KHI ĐÓ mới thêm `'zh'` vào `READY_LANGS` (`src/i18n.js`). **Đừng sửa cờ `locked` ở `Language.jsx`** — nó tự suy từ `READY_LANGS`.
> 5. Test trên **deploy thật**, không phải localhost (Circle SDK không chạy localhost).
>
> **4 cái bẫy đã dính, đừng dính lại** (chi tiết ở mục 7):
> - `setCustomSecurityQuestions` nhận **tham số vị trí** `(questions, requiredCount, securityConfirmItems)` — gọi kiểu object thì màn Câu hỏi bảo mật RỖNG TRẮNG, chặn tạo ví, **không báo lỗi gì**.
> - SDK **ghép thẳng** `questionHeader` + `requiredMark` và `headline` + `headline2`, KHÔNG tự chèn dấu cách → phải tự đệm khoảng trắng (tiếng Trung thì không cần, chữ Hán không dùng dấu cách giữa từ).
> - `common.showPin`/`hidePin` bị Circle bỏ qua (bug của họ, đã báo) — dịch cũng không ăn, đừng mất công đào.
> - Chữ lỗi runtime trong iframe **không localize được** (16 field, không field nào cho lỗi). Đây là giới hạn thật.
>
> **Làm trên nhánh nào:** đã merge hết vào `main` (08-04) và nhánh `wip/circle-vi-localization` đã xoá. LongDC làm thẳng trên `main`, hoặc nhánh ra từ `main`.
>
> **Sạn tiếng Việt:** user đã review bản tiếng Việt và báo "còn nhiều sạn" nhưng chấp nhận merge. Việc rà và sửa sạn đó thuộc phần LongDC — user KHÔNG liệt kê, tự tìm bằng cách dùng thử app ở chế độ tiếng Việt.

### 🌏 ĐA NGÔN NGỮ + TIỀN TỆ VND — phiên 08-04 (ĐÃ MERGE vào `main`)

> **ĐÃ MERGE vào `main` 08-04** (commit `1c3a6c0`), nhánh WIP đã xoá, đang chạy trên `ezwallet.cash`.
> **Mặc định là ENGLISH** — `detect()` KHÔNG đoán theo `navigator.language` nữa, máy cài tiếng Việt vẫn mở ra tiếng Anh. Tiếng Việt + VND nằm sẵn trong màn Language & Currency cho ai TỰ CHỌN. Lý do: video demo + deck giới thiệu đều tiếng Anh, app phải khớp thứ người ta xem.
> ⚠️ **Phần tiếng Việt + VND CHƯA ai bấm thử trên máy thật** (Circle SDK không chạy localhost). Rủi ro thấp vì đường đi mặc định không đổi, nhưng ai bật tiếng Việt mà gặp lỗi thì đó là lỗi trên PRODUCTION.
> 💡 Env var cho preview deployment (nhánh bất kỳ) đã set sẵn `API_KEY`/`KIT_KEY` qua Cloudflare API — nhánh mới push lên là có preview chạy được ngay, không cần cấu hình lại.

**LUẬT USER CHỐT 08-04 — áp vĩnh viễn:**
> **"ĐÃ VIỆT THÌ VIỆT ALL, ĐÃ ANH THÌ ANH ALL"** — không bao giờ để user thấy màn nửa ngôn ngữ này nửa kia.
> **"MỘT NGÔN NGỮ = MỘT LƯỢT BUILD KỸ"** — dịch xong hẳn 1 ngôn ngữ rồi mới mở, không mở dở dang.

- **`READY_LANGS` (`src/i18n.js`) = nguồn sự thật DUY NHẤT** cho cả `detect()` lẫn khoá/mở option ở màn Language. Hiện `['vi','en']`; `zh` nằm ngoài vì từ điển mới phủ 35% + chưa có bản dịch Circle. **ĐỪNG sửa cờ `locked` bằng tay ở `Language.jsx`** — nó tự tính từ `READY_LANGS`.
- **Gác cổng: `npm run check-lang`** (`scripts/check-lang.cjs`). Đo độ phủ từ điển + kiểm có bản dịch Circle chưa. **Bắt buộc chạy tới 100% trước khi thêm 1 mã vào `READY_LANGS`.** `en` được miễn yêu cầu Circle (English là mặc định sẵn của Circle). Soát mắt đã LỌT 2 lần (thẻ hành động 2 màn Trang chủ, nhãn "You pay/You receive") → dùng script, đừng tin mắt.
- **Lỗi Circle chia 2 loại** (ghi rõ trong `circle.js`): lỗi vẽ TRONG iframe (sai PIN…) = tiếng Anh, KHÔNG đổi được; lỗi terminal bắn ra ngoài = dịch được qua `circleErrorMessage()` map theo MÃ SỐ (đừng dò chữ tiếng Anh — Circle đổi câu là câm).
- **Bug Circle chưa fix:** `common.showPin`/`hidePin` bị iframe bỏ qua dù `common.continue` ăn (SDK 1.1.11, bản mới nhất). Đã báo support, giữ nguyên giá trị để khi họ fix là tự chạy.

**TIỀN TỆ VND (user chốt: gõ thẳng VND, app tự quy ra USDC):**
- Tỷ giá: thêm `vnd` vào ĐÚNG lệnh CoinGecko sẵn có (`chain.js fetchPrices`), **không thêm request** — free tier rate-limit chặt. Có `VND_PER_USD_FALLBACK` khi API chết. Lưu dạng **"USD mỗi 1 VND"** cho đồng bộ với mọi rate khác.
- **`CURRENCY_CFG` (`data.js`) = nguồn sự thật duy nhất** cho ký hiệu / vị trí ký hiệu / số lẻ / dấu phân cách. **₫ đứng SAU số** (`1.250.000 ₫`) còn $ đứng trước → phải dùng `fmtDisplay()`, ĐỪNG tự nối `${symbol}${số}` (đó là lý do phải sửa 4 màn).
- **⚠️ KHÔNG quy đổi tỷ giá LẦN HAI:** `SendAmount` chốt `tokenAmount` rồi truyền qua `SendConfirm` → `SendReceipt`. Tính lại ở màn sau = số user vừa xác nhận ≠ số thật sự rời ví (tỷ giá làm mới mỗi 60s).
- Đổi tiền tệ giữa chừng ở màn Gửi → **XOÁ số đang gõ** ("50" là 50 đô hay 50 đồng cách nhau 2 vạn lần).
- Ngưỡng "phí quá nhỏ" phải theo **số lẻ từng tiền tệ** (`decimalsOfCurrency`), đừng ghim `0.01`: phí 13 ₫ bị in thành "13,00 ₫" mà tiền Việt không có số lẻ.
- **2 hệ gợi ý KHÁC NHAU, đừng gộp** (user nhấn mạnh 08-04):
  - **Nhập tay** (`amountHint.js`, màn Gửi): thêm số 0 vào số vừa gõ — "50" → `5.000 · 50.000 · 500.000`. CHỈ cho VND (gõ "50" ở USD đã là 50 đô, gợi ý ×100 là bẫy chết người).
  - **Thanh trượt** (`roundHint.js`, màn Swap): làm tròn quanh giá trị đang trượt — 39.000 → `35.000 · 40.000 · 45.000`. Đơn vị làm tròn **co giãn theo độ lớn** (bản cũ ghim u=1 nên trượt tới 39.000 gợi ý "39.000,5" — hỏng). Đánh đổi user đã chốt (phương án A): 24,4 giờ ra `20 · 25 · 30` chứ không còn `24 · 24,5 · 25` như spec 07-17e.
- **Tự co cỡ chữ:** `BalanceHeader` + `SendAmount` chuyển từ `amountFontSize` (đếm ký tự) sang **`useFitFontSize`** (đo bề rộng thật bằng canvas) — số VND dài gấp đôi số USD nên đếm ký tự là tràn layout.

**CHƯA TEST TRÊN MÁY THẬT** (Circle SDK không chạy localhost): cần bấm thử trên link preview — đổi ngôn ngữ, chọn VND, gõ số ở màn Gửi, xem dòng "Thực gửi ... USDC" ở màn Xác nhận + Biên lai.

**Còn treo:** (1) tin nhắn gửi Circle support đã soạn xong, chưa gửi; (2) merge nhánh này vào `main` sau khi test xong; (3) tiếng Trung — chạy `npm run check-lang zh` tới 100% + thêm bản dịch Circle rồi mới thêm `'zh'` vào `READY_LANGS`.

**⚠️ CHECKLIST KHI MERGE nhánh này vào `main`** — README/PITCH hiện mô tả ĐÚNG cho `main` (English-only) nhưng sẽ thành SAI ngay khi merge. Phải sửa CÙNG LÚC merge, đừng sửa trước (README public sẽ quảng cáo thứ chưa live):
- `README.md:183-184` — *"**English-only UI.** The Circle PIN screen is a cross-origin iframe that only renders in English, so the rest of the app is kept in English to match."* → **XOÁ HẲN**. Đây chính là niềm tin SAI đã bị chứng minh ngược (Circle localize được, xem mục 7); để lại là tự mâu thuẫn với chính tài liệu của mình.
- `README.md:101` — "Show balances in USDC or EURC" → thêm VND.
- Thêm dòng "Tiếng Việt đầy đủ + hiển thị/nhập bằng VND" vào bảng tính năng `README.md` — điểm bán hàng mạnh nhất với người dùng Việt, đừng để lọt.
- **BỎ QUA `PITCH.md`** (nó cũng có 4-5 câu "English-only" ở dòng 62/108/110/173/211): file này đã lỗi thời, bài giới thiệu thật nằm ở video + deck Canva (xem đầu file). Sửa nó là công cốc. **Thứ CẦN cập nhật khi merge là VIDEO và DECK** — hai thứ người ta thật sự xem.

---

**Đã làm xong phiên 08-03:** `6f6b2cb` **core value** – thêm mục "0. Core value" vào file này + mục riêng vào `CLAUDE.md`/`README.md`/`PITCH.md` (nguyên văn 3 đoạn tiếng Anh user chốt + bản dịch), mọi tính năng/quyết định từ nay phải trả lời được câu "có làm crypto đơn giản hơn cho user phổ thông không". Nhân tiện phát hiện + sửa **GitHub repo description** đang lỡ dùng "your grandma" (vi phạm luật Brand Voice khoá trong `CLAUDE.md`) → đổi đúng slogan "my mom" + khớp core value. Đã grep xác nhận slogan ngắn đã nhất quán sẵn ở `package.json`/`index.html`/`SECURITY.md`/`DECK-DESIGN-SPEC.md`, không cần sửa thêm.

**Đã làm xong phiên 07-29 → 07-31** (`git log` mô tả đủ từng cái):
`81ee602` 6 sửa UI user báo · `c240911` `.row10-single` = 3/4 · `b181309` **PITCH.md** (spec + bộ shill) · `9b183b2` kiểm toán + dọn code chết vòng 2 · `7f61888` domain `ezwallet.cash` · `16dd010` sao lưu KV (đang TẮT trên production) · `039faea` **chuyên nghiệp hoá repo**: meta/OG + `public/og.png` + `SECURITY.md` + metadata `package.json` + homepage GitHub · `ef7f7cc` **4 bug thật**: tự-gửi bị gán nhãn Swap · phân trang ArcScan sai (10.000 dòng/11,7s) · không sort + trùng key React (có thể bỏ mất dòng) · Swap không dùng cache số dư; **+ chặn gửi cho chính mình** ở 3 đường vào · `b9a645e` lời nhắn: nhớ vĩnh viễn + tối đa 3 lệnh cùng lúc (bỏ kiểu bắn 30 lệnh/lần mở). (Máy kia: `b8d5978` fix QR mất số thập phân.)

---


> ✅ **07-18 user XÁC NHẬN TRÊN DEPLOY: mọi thứ chạy mượt – PIN (sau đổi `getSDK` async) + swap tiền thật OK.** Không còn việc chặn.

1. **Icon warning `!` nhìn nhỏ hơn icon khác cùng ô** – nguyên nhân: dấu `!` chỉ chiếm ~45/100 viewBox trong vòng tròn. CHỜ USER CHỌN: (a) phóng riêng, (b) user vẽ lại. Icon là bộ user vẽ – hỏi trước.
2. **Icon QR Library mới** – user sẽ tự vẽ (đã gợi ý: 2 thẻ xếp chồng + góc QR, viewBox 100 stroke 10). Vẽ xong thay trong `HomeReceive`.
3. **Trạng thái giao dịch thật** – poll txHash sau gửi → "đã lên blockchain" (swap đã có 2 trạng thái submitted/successful).
4. **Google login làm lại** qua Google Identity Services → đi luồng email (đổi kiến trúc, làm riêng buổi).
5. Batch gửi nhiều người (Multicall3From, encoder sẵn).
7. ~~**AUTH THẬT CHO SAO LƯU KV – bằng CHỮ KÝ PIN**~~ ✅ **XONG 08-06** – chi tiết ở mục 3. Câu hỏi chặn hồi đó ("`executeChallenge` có trả về chữ ký không?") đã trả lời được bằng cách đọc type SDK: **CÓ** – `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/types.d.ts:242` `SignMessageResult.data.signature`, không cần gọi thêm endpoint nào. Khác kế hoạch cũ 1 điểm: dùng `recoverMessageAddress` thay `verifyMessage` để client khỏi phải khai địa chỉ của mình. **CÒN LẠI = test trên deploy** (mục 3 checklist) vì Circle SDK không chạy localhost.
6. **Tối ưu bundle:** chunk SDK ~1MB phần lớn là crypto-browserify (polyfill `crypto` trong `vite.config.js`) – thử bỏ `'crypto'` xem SDK còn chạy không, NHƯNG chỉ test được trên deploy → làm riêng phiên, đừng gộp việc khác.
   - **ĐÃ LÀM 07-22g (user "app chưa mượt"):** `App.jsx` PREFETCH lúc `requestIdleCallback` – nạp nền các màn hay dùng (HomeSend/Receive/Swap/Menu/SendAmount/Contacts/TxHistory) + Circle SDK 1MB (bỏ qua khi MOCK) → đổi tab không chớp trắng, bước PIN không khựng vì tải nguội. KHÔNG đổi logic (chỉ warm cache; import() động vẫn chạy khi điều hướng thật). Đo bundle thật: `index`(SDK) 1026KB/gz281 · `chain`(viem) 270KB/gz83 · `QRScanner`(jsqr) 134KB – 2 cái sau lazy đúng. Chưa verify độ mượt trên deploy (mock không nạp SDK) – cần đo trên máy thật.

### Lộ trình / định hướng tương lai (brainstorm 07-24 – ⚠️ CHƯA chốt, CHƯA triển, chỉ ghi ý)

> User nêu 4 hướng dưới đây là TẦM NHÌN, không phải cam kết. Đừng tự build. Điểm chặn CHUNG của phần lớn: **Circle User-Controlled Wallet hỗ trợ native/biometric/EIP-712 tới đâu – phải đọc docs Circle verify TRƯỚC khi triển.**

1. **More Languages & Currencies (global users).** Hạ tầng i18n ĐÃ CÓ SẴN – hiện `LANG='en'` khoá cứng vì Circle SDK chỉ English; màn Language có VI/中文 + CNY/VND nhưng disabled (xem mục 2). Mở lại = cho `LANG` đọc localStorage + bỏ `locked`. Cần: bản dịch thật + tỷ giá cho CNY/VND (hiện base USD).
2. **Privacy Features (bảo vệ số dư/riêng tư).** Ý tưởng: ẩn số dư (tap để hiện), chế độ riêng tư. MỚI, chưa thiết kế.
3. **Native Mobile App.** Enable FaceID/vân tay (thay PIN), push notification thật, Keychain/Keystore (cất token an toàn hơn localStorage), lên App Store/Play Store. Hướng KHÔNG viết lại: bọc app React hiện tại bằng **Capacitor** + plugin native → tái dùng code. ⚠️ Verify: (a) màn PIN iframe Circle có chạy trong webview Capacitor không, (b) Circle native SDK (iOS/Android) gắn biometric với User-Controlled Wallet thế nào.
4. **In-App selective services (cung cấp dịch vụ cho khách).** KHÔNG mở dApp browser cho mọi dApp (ngược triết lý "an toàn cho người già" + đầy approve/scam). Thay vào: gói 1-2 hành động DeFi/dịch vụ uy tín CÓ CHỌN LỌC vào UI đơn giản của EZwallet, ẩn phức tạp phía sau. ⚠️ Verify: Circle ký được **EIP-712** + tx tuỳ ý không (hiện mới dùng contractExecution + ký message); cần mainnet + thêm chain (đang Arc Testnet). *(Không hứa lãi suất/sản phẩm cụ thể – thiết kế riêng khi triển.)*

> Đã cân nhắc & TẠM LOẠI: **Browser extension** – làm được nhưng desktop-only (ngược định vị mobile-first cho người già), + rủi ro Circle SDK/PIN iframe xung đột CSP của Manifest V3 + origin `chrome-extension://` chưa chắc Circle whitelist. PWA (đã có) hợp target hơn.

---

## 10. Bài học chính (đúc kết – chi tiết trong git log)

- **Swap phải qua `adapter.execute` với intent có chữ ký** – bóc instructions chạy tay = MẤT TIỀN (đã dính).
- **Retry dày với RPC rate-limit = tự giết mình** – gộp Multicall + backoff dài; số chưa chắc thì hiện `…` đừng vẽ 0.
- **Circle iframe giữ modal khi user nhập sai** – reject sớm promise = user nhập đúng lại nhưng kết quả rơi vào hư không.
- **Grid không khai cột / flex thiếu minWidth:0** = 1 chuỗi dài phá layout cả màn.
- **"Cải tiến" không verify từng bước** (retry, catch-về-0) từng gây regression nặng hơn lỗi gốc – mọi thay đổi UI verify Playwright mock, mọi thay đổi swap verify eth_simulateV1.
