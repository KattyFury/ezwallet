# EZwallet — Spec dự án & bộ shill

> **File này để LÀM GÌ:** mọi thứ cần để nói về EZwallet ra ngoài — một dòng chốt, fact sheet
> (chỉ được nói những gì trong đó), điểm khác biệt, và **copy sẵn để đăng** (X, bài dài, tiếng Việt,
> Discord/TG). Copy trong mục 8 dán là dùng được, không cần sửa.
>
> **Cập nhật:** 2026-07-29 · Đối chiếu sự thật với `HANDOFF.md` (trạng thái kỹ thuật) + `README.md`.
> Sửa sản phẩm → sửa mục 2 và 6 của file này TRƯỚC khi đăng bài mới.

---

## 1. Một dòng — chọn theo chỗ đăng

| Độ dài | EN (dùng làm mặc định) | VN |
|---|---|---|
| **6 chữ** | A stablecoin wallet for your grandma. | Ví stablecoin cho bà bạn dùng. |
| **1 câu** | A stablecoin wallet simple enough for your grandparents to use — email + PIN, no seed phrase, no gas token. | Ví stablecoin đơn giản tới mức ông bà cũng dùng được — email + mã PIN, không seed phrase, không cần mua token trả phí. |
| **1 đoạn** | EZwallet is a mobile-first stablecoin wallet built for people who don't know what a wallet is. You sign in with an email and a 6-digit PIN — no seed phrase to lose. It runs on Arc, where USDC *is* the gas token, so nobody has to buy a second coin just to move the first one. Send, receive by QR, swap by dragging a slider. Live on Arc Testnet. | EZwallet là ví stablecoin mobile-first dành cho người **không biết ví là gì**. Đăng nhập bằng email + mã PIN 6 số — không có seed phrase để mất. Chạy trên Arc, nơi **USDC chính là token trả phí**, nên không ai phải đi mua thêm coin thứ hai chỉ để chuyển được coin thứ nhất. Gửi, nhận bằng QR, đổi tiền bằng cách kéo thanh trượt. Đang chạy trên Arc Testnet. |

**Tagline chốt (dùng thống nhất mọi nơi):**
> *A stablecoin wallet simple enough for your grandma to use.*

---

## 2. Fact sheet — CHỈ được nói những gì trong bảng này

Mọi con số dưới đây đều verify được (chạy thật / đọc on-chain / có trong code). **Ngoài bảng này thì đừng chế.**

| Hạng mục | Sự thật |
|---|---|
| **Trạng thái** | Chạy được, public, **Arc Testnet** — tiền test, không có giá trị thật. Chưa lên mainnet. |
| **Link sản phẩm** | https://ezwallet.cash |
| **Mã nguồn** | https://github.com/KattyFury/ezwallet — **MIT, mở hoàn toàn** |
| **Pitch deck** | [Google Slides](https://docs.google.com/presentation/d/1-MuqJeSV1Riwg3Bx6IXZSuNumqbtM83dmzG48-vIRDQ/edit?usp=sharing) |
| **Đăng nhập** | Email + **PIN 6 số**. KHÔNG seed phrase. Khoá do **Circle User-Controlled Wallets (MPC)** giữ; PIN ký từng giao dịch. |
| **Chain** | **Arc** (L1 của Circle) Testnet, chainId `5042002`, explorer `testnet.arcscan.app` |
| **Phí gas** | Trả bằng **USDC** (Arc dùng USDC làm native gas) — thực đo **dưới $0.01/giao dịch** |
| **Token hỗ trợ** | USDC · EURC · cirBTC |
| **Tính năng chạy thật** | Gửi (kèm lời nhắn on-chain qua Memo precompile của Arc) · Nhận bằng QR (đặt sẵn số tiền + kho QR) · **Swap bằng thanh trượt %** · Danh bạ có ảnh · Lịch sử + biên lai lưu về máy · Hiển thị số dư theo USDC hoặc EURC |
| **Swap chạy bằng** | Circle **Stablecoin Kit**, route qua LiFi, settle qua Swap Adapter — **1 lần nhập PIN cho cả approve + swap** (gộp qua Multicall3) |
| **Mô hình doanh thu** | Phí app **0,1%** trên mỗi lệnh swap (trừ ở token đầu vào, hiển thị trong "You receive"). Đang chạy trên testnet. |
| **Quy mô app** | 20 màn, PWA (thêm vào màn hình chính iOS được), 1 font, lưới 10 hàng cố định |
| **Hạ tầng** | React 18 + Vite · Cloudflare Pages + Pages Functions (API key nằm server-side) · viem đọc on-chain |
| **Người làm** | Hieu Nguyen — [0xhieu.xyz](https://0xhieu.xyz) · X [@0xhieuxyz](https://x.com/0xhieuxyz) · TG [@nguyen0xhieu](https://t.me/nguyen0xhieu) · GitHub [KattyFury](https://github.com/KattyFury) |
| **Cách làm** | Xây end-to-end **cùng AI (Claude)** bởi người **không có nền lập trình**. Quyết định sản phẩm/UX/thiết kế là của người; phần code viết qua hội thoại rồi chạy thật để verify. |

---

## 3. Câu chuyện 30 giây (khung kể mọi lúc)

1. **Vấn đề:** ví crypto được thiết kế cho người đã hiểu crypto. Seed phrase 12 từ, địa chỉ `0x` dài ngoằng, phải mua ETH mới chuyển được USDC — mỗi thứ là một bức tường. Với người lớn tuổi thì đó là chấm hết ngay bước 1.
2. **Nhận ra:** stablecoin đã đủ tốt để là "tiền" với người thường rồi. Thứ chưa đủ tốt là **cái ví**.
3. **Giải pháp:** bỏ hết từ vựng crypto khỏi bề mặt. Email + PIN. Phí trả bằng chính đồng tiền bạn đang cầm. Chữ to, mỗi màn một hành động chính. Muốn đổi tiền thì **kéo thanh trượt**, không phải gõ số thập phân.
4. **Bằng chứng:** không phải mockup — vào link bấm thử được ngay, code mở MIT.

---

## 4. 5 điểm khác biệt (mỗi cái đều có bằng chứng)

| # | Điểm | Bằng chứng để chốt |
|---|---|---|
| 1 | **Không seed phrase** — email + PIN 6 số | Circle MPC giữ khoá; PIN ký từng lệnh. Mất máy không mất tiền. |
| 2 | **Không cần token trả phí riêng** | Arc dùng USDC làm native gas → cầm USDC là dùng được, không phải đi mua ETH trước. |
| 3 | **Swap không cần gõ số** | Kéo thanh trượt chọn % số dư, có 5 mốc nam châm + chip gợi ý số chẵn. Đây là thứ mọi người thử xong đều nhắc. |
| 4 | **Lời nhắn nằm trên blockchain** | Gửi kèm câu "Mẹ gửi con tiền nhé" qua Memo precompile của Arc — như nội dung chuyển khoản ngân hàng. |
| 5 | **Thiết kế cho mắt kém** | Chữ to, lưới 10 hàng cố định, mỗi màn một nút chính, nút bấm được đều có bóng. Accessibility là tính năng, không phải khẩu hiệu. |

**Điểm số 3 và số 4 là thứ dễ viral nhất — luôn để trong 2 tweet đầu.**

---

## 5. Nói với ai

- **Vòng 1 (dễ nhất):** builder/hackathon Arc + Circle, dev DeFi quan tâm UX, người theo dõi sẵn của anh.
- **Vòng 2:** cộng đồng crypto Việt (Telegram/FB group) — chủ đề "làm sản phẩm thật thay vì farm airdrop".
- **Vòng 3:** nhóm no-code / build-with-AI (rất hợp câu chuyện "người không biết code làm ra ví chạy được").
- **Ai KHÔNG phải target:** degen tìm yield, người tìm ví multi-chain đủ tính năng. Đừng cố bán cho họ.

---

## 6. Trạng thái & lộ trình (nói rõ đâu là hiện tại, đâu là tương lai)

**Đang có (hiện tại, chạy thật):** login email+PIN · gửi kèm lời nhắn · nhận QR + kho QR · swap 3 token · danh bạ · lịch sử + biên lai · PWA cài lên iPhone.

**Chưa có (nói thẳng khi bị hỏi):** chưa lên mainnet · mới 1 chain · UI chỉ tiếng Anh (màn PIN của Circle là iframe chỉ có tiếng Anh) · chưa có Google login · quét QR chỉ đọc QR ví crypto, không đọc QR ngân hàng.

**Định hướng (ghi rõ là TƯƠNG LAI, không hứa ngày):** mainnet · app native iOS/Android (FaceID thay PIN) · thêm ngôn ngữ & tiền tệ · vài dịch vụ tài chính chọn lọc nhúng thẳng vào app.

---

## 7. GUARDRAILS — 6 câu TUYỆT ĐỐI không được nói

Shill sai một câu là mất uy tín cả dự án. Đây là loại lỗi không sửa lại được:

1. ❌ Không nói/ám chỉ **mainnet** hay **tiền thật**. Mọi bài phải có chữ **Arc Testnet** hoặc "test money".
2. ❌ Không hứa **lãi suất, lợi nhuận, yield, "tiền của bạn được bảo hiểm"**. EZwallet không phải ngân hàng.
3. ❌ Không nói **"non-custodial"** kiểu tuyệt đối. Nói đúng: *khoá do Circle MPC quản lý, người dùng ký bằng PIN* — đây là **user-controlled**, không phải seed-phrase self-custody. Ai hỏi kỹ thì trả lời đúng như vậy.
4. ❌ Không chế **số người dùng, TVL, số giao dịch**. Chưa có thì nói chưa có.
5. ❌ Không dùng **ảnh giao diện dựng/mockup**. Chỉ dùng ảnh/GIF thật trong `docs/` (mục 9).
6. ❌ Không nói **"đã audit"** — chưa audit.

> Sức mạnh của bài shill này nằm ở chỗ **thật**. "Chưa lên mainnet, chưa audit, code mở đây, vào bấm thử đi" thuyết phục hơn mọi tính từ.

---

## 8. Copy sẵn để đăng

### 8.1 · Thread X (EN) — bài chính, đăng 1 lần rồi ghim

> **1/**
> My grandma will never write down 12 words on a piece of paper.
> So I built a stablecoin wallet where she doesn't have to.
> Email + a 6-digit PIN. No seed phrase. No gas token.
> Live on Arc Testnet 👇
> ezwallet.cash
>
> **2/**
> The thing everyone notices first: you don't type numbers to swap.
> You drag a slider to pick how much of your balance to convert. It snaps to 0/25/50/75/100%, and offers round numbers as one-tap chips.
> Typing "0.0247" is a UI failure. [GIF: docs/flow-swap.gif]
>
> **3/**
> Second thing: the message rides on-chain with the money.
> "Mommy, I sent you money" — written into the transfer through Arc's Memo precompile, the same way you'd write a note on a bank transfer.
> Money without context is a number. Money with a note is a message. [GIF: docs/flow-send.gif]
>
> **4/**
> Why nobody needs a second token here:
> Arc uses USDC as its native gas currency.
> You hold USDC → you can spend USDC. No "buy ETH first to move your USDC" wall.
> Measured fee per transaction: under $0.01.
>
> **5/**
> How the wallet actually works:
> Circle User-Controlled Wallets (MPC). No seed phrase exists to lose — the PIN authorises every signature.
> Lose your phone, keep your money.
>
> **6/**
> Design brief was one question: could my mom use this?
> → Big type, fixed 10-row grid, one primary action per screen
> → Real token names always shown, never hidden
> → Every tappable thing looks tappable
> Accessibility as a feature, not a checkbox. [IMG: docs/app-home.jpg]
>
> **7/**
> Full honesty:
> · Arc Testnet only — the money is test money
> · Not on mainnet, not audited
> · English-only UI for now
> · One chain
> I'd rather say that than let you find out yourself.
>
> **8/**
> And the part that matters to me most:
> I'm not a developer. I built this end to end with Claude — the product decisions and UX rules are mine, the code came out of conversation, and every flow was verified by actually running it.
> If you have an idea and no CS degree: it's doable.
>
> **9/**
> Try it (2 minutes, free test money):
> 🔗 ezwallet.cash
> 💻 github.com/KattyFury/ezwallet (MIT)
> Built on @Arc + @circle.
> Tell me the first thing that confuses you — that's the bug I want.

### 8.2 · Tweet lẻ (xoay vòng, mỗi tuần 1-2 cái)

- *"Type the exact amount" is the most user-hostile pattern in crypto. I replaced it with a slider that snaps to round numbers. Grandma-tested. → ezwallet.cash* [GIF swap]
- *Sent my mom $20 on-chain with the note "Mommy, I sent you money" attached. She didn't have to know what a wallet is. Arc Testnet, but the flow is real.* [GIF send]
- *Wallet UX bar I'm holding myself to: if a 70-year-old needs one explanation to use a screen, the screen is wrong.*
- *No seed phrase. No gas token. No hex address to paste. What's left is: a name, an amount, and a note. That's a wallet.*
- *Building in public update: shipped QR storage — save the QR codes you use often (rent, coffee, your kid) and reuse them.* [IMG qr-storage]
- *I can't code. I shipped a working stablecoin wallet. The bottleneck was never the syntax — it was knowing exactly what I wanted, and refusing "it should work" as an answer.*

### 8.3 · Bài dài EN (LinkedIn / Warpcast / Mirror / Reddit)

> **I built a stablecoin wallet for people who don't know what a wallet is.**
>
> Every crypto wallet I've handed to a non-crypto person died at the same place: the seed phrase screen. Twelve random words, "write these down, if you lose them your money is gone forever." That's where normal people stop — and it's exactly where my mom stopped.
>
> So I built EZwallet. You sign in with an email and a 6-digit PIN. There is no seed phrase, because Circle's MPC infrastructure holds the keys and the PIN authorises each signature. It runs on Arc, Circle's chain where USDC is the native gas token — so you never hit the "buy a second coin to move your first coin" wall. Fees measure under a cent.
>
> Three design decisions I'd defend anywhere:
> · **Swapping is a slider, not a text field.** You drag to pick a percentage of your balance; it snaps to round numbers. Asking a first-time user to type "0.0247" is a UI failure, not a user failure.
> · **Notes go on-chain with the money.** Arc has a memo precompile, so a transfer can carry "Mommy, I sent you money" the way a bank transfer carries a description. Money with context is a message; money without it is a number.
> · **Big type, one action per screen.** Fixed 10-row grid, real token names always visible, everything tappable looks tappable. Designed for weaker eyes and low tolerance for clutter.
>
> Where it honestly stands: Arc Testnet only, not on mainnet, not audited, English-only UI, one chain. The money is test money. I'd rather lead with that than have you discover it.
>
> One more thing: I'm not a developer. I built this end to end with Claude. The product thinking, the UX rules and the design calls are mine; the implementation came out of conversation and was verified by running every flow for real. If you've got an idea and no engineering background — the gap is smaller than it was a year ago.
>
> Try it (free test money, ~2 minutes): **ezwallet.cash**
> Source, MIT: **github.com/KattyFury/ezwallet**
>
> Tell me the first thing that confuses you. That's the bug I actually want.

### 8.4 · Bài tiếng Việt (Telegram / Facebook group)

> **Mình vừa làm xong một cái ví crypto cho... mẹ mình dùng.**
>
> Mọi ví mình từng đưa cho người không chơi crypto đều chết ở đúng một chỗ: màn hình seed phrase. 12 từ tiếng Anh ngẫu nhiên, "ghi ra giấy đi, mất là mất tiền luôn đấy". Người thường dừng ngay ở đó.
>
> Nên mình làm **EZwallet**: đăng nhập bằng **email + mã PIN 6 số**, không có seed phrase để mà mất (khoá do hạ tầng MPC của Circle giữ, PIN dùng để ký từng giao dịch). Chạy trên **Arc** — chain mà **USDC chính là token trả phí**, nên không dính cái cửa ải "muốn chuyển USDC thì đi mua ETH trước". Phí đo thật: **dưới $0.01/giao dịch**.
>
> 3 thứ mình tâm đắc:
> • **Đổi tiền bằng cách KÉO THANH TRƯỢT**, không gõ số. Bắt người mới gõ "0.0247" là lỗi của giao diện chứ không phải lỗi người dùng.
> • **Lời nhắn đi kèm tiền, nằm trên blockchain** — gửi kèm câu "Mẹ gửi con tiền nhé" y như nội dung chuyển khoản ngân hàng.
> • **Chữ to, mỗi màn một nút chính** — làm cho người mắt kém dùng được.
>
> Nói thẳng phần chưa được: **mới chạy Arc Testnet, tiền là tiền test không có giá trị thật**, chưa lên mainnet, chưa audit, giao diện mới có tiếng Anh.
>
> Và điều mình muốn kể nhất: **mình không phải dev**. Toàn bộ app này mình làm cùng AI (Claude) — ý tưởng sản phẩm, luật UX, hướng thiết kế là của mình; code viết qua hội thoại rồi chạy thật để kiểm chứng từng luồng. Ai đang có ý tưởng mà không biết code: làm được, thật.
>
> Vào bấm thử 2 phút (có sẵn tiền test): **ezwallet.cash**
> Code mở MIT: **github.com/KattyFury/ezwallet**
>
> Ai thử xong nhắn mình chỗ đầu tiên thấy khó hiểu nhé — đấy mới là bug mình cần.

### 8.5 · Ba dòng (Discord, Telegram, form hackathon, bio dự án)

> **EZwallet** — a stablecoin wallet simple enough for your grandma.
> Email + PIN (no seed phrase) · USDC pays its own gas on Arc · swap by dragging a slider · notes ride on-chain with the money.
> Live on Arc Testnet: ezwallet.cash · MIT: github.com/KattyFury/ezwallet

### 8.6 · Một dòng cho bio / chữ ký

> Building EZwallet — a stablecoin wallet simple enough for your grandma. Arc Testnet, MIT, ezwallet.cash

---

## 9. Ảnh/GIF được phép dùng (đều là ảnh THẬT, nằm sẵn trong repo)

| File | Dùng cho |
|---|---|
| `docs/flow-swap.gif` | **Mạnh nhất** — thanh trượt swap. Luôn để tweet 2. |
| `docs/flow-send.gif` | Gửi kèm lời nhắn. Tweet 3. |
| `docs/flow-login.gif` | Đăng nhập email + PIN (chứng minh "không seed phrase"). |
| `docs/flow-receive.gif` | Nhận bằng QR. |
| `docs/app-home.jpg` · `app-swap.jpg` · `app-receive.jpg` · `app-contacts.jpg` · `app-qr-storage.jpg` · `app-create-qr.jpg` | Ảnh tĩnh từng màn — dùng cho bài dài / carousel. |
| `design/logo.svg` | Logo (nền sáng dùng bản màu, nền gradient dùng bản trắng). |

Deck 9 trang: xem `DECK-DESIGN-SPEC.md` (hệ thiết kế) + link Google Slides ở mục 2.

---

## 10. Câu hỏi khó — trả lời thật, đừng vòng vo

| Bị hỏi | Trả lời |
|---|---|
| *"Custodial hay non-custodial?"* | User-controlled: khoá do **Circle MPC** quản lý, mọi chữ ký cần **PIN của người dùng**. Không phải self-custody kiểu seed phrase, và mình không giấu điều đó. Đánh đổi có chủ ý: bỏ seed phrase để người thường dùng được. |
| *"Mất PIN thì sao?"* | Có luồng khôi phục PIN của Circle (`user/pin/restore`) kèm câu hỏi bảo mật đặt lúc tạo ví. |
| *"Khác gì Coinbase Wallet / Trust Wallet?"* | Chúng nó làm cho người **đã** hiểu crypto và cố gắng làm mọi thứ. EZwallet cố tình chỉ làm 4 việc (gửi/nhận/đổi/danh bạ) và làm cho người **chưa** hiểu gì. Không có dApp browser — cố ý, vì đó là chỗ người già bị lừa. |
| *"Sao chỉ testnet?"* | Vì Arc mới có testnet cho công chúng và mình không muốn cầm tiền thật của ai khi chưa audit. Lên mainnet là bước tiếp theo, không hứa ngày. |
| *"AI viết code thì tin được không?"* | Từng luồng đều chạy thật để verify — swap còn mô phỏng bằng `eth_simulateV1` trước khi ship. Code mở MIT, đọc thoải mái. Và mình nói thẳng là chưa audit. |
| *"Kiếm tiền kiểu gì?"* | Phí app 0,1% trên mỗi lệnh swap. Gửi/nhận không thu phí. |
| *"Có token / airdrop không?"* | **Không.** Không có token, không có điểm, không có airdrop. Đừng farm. |

---

## 11. Thứ tự phát (gợi ý 2 tuần đầu)

1. **Ngày 1** — Thread 8.1 trên X, ghim lên đầu profile. Đổi bio thành 8.6.
2. **Ngày 1-2** — Đăng 8.4 vào các group Việt + Telegram cộng đồng của anh.
3. **Ngày 3** — 8.3 lên LinkedIn/Warpcast (nhấn mạnh góc "không biết code vẫn ship được" — góc này kéo được người ngoài crypto).
4. **Ngày 4-5** — Gửi 8.5 vào Discord/TG của Arc + Circle, kèm GIF swap. Hỏi feedback, đừng xin retweet.
5. **Từ tuần 2** — mỗi tuần 1-2 tweet lẻ (8.2) + 1 update "vừa ship cái gì". Nhịp đều quan trọng hơn một bài nổ.
6. **Luôn luôn** — ai thử xong phản hồi thì **trả lời từng người**. 10 người thật dùng đáng giá hơn 1000 impression.
