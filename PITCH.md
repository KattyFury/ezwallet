# EZwallet – project spec & messaging kit

> **WHAT THIS FILE IS FOR:** everything needed to talk about EZwallet publicly – the one-liner, the fact sheet
> (say only what is in it), the differentiators, and **ready-to-post copy** (X, long form,
> Discord/TG). The copy in section 8 can be pasted as-is.
>
> **Updated:** 2026-08-25 · Cross-check the facts against `HANDOFF.md` (technical state) + `README.md`.
> Change the product → update sections 2 and 6 of this file BEFORE posting anything new.

---

## 1. The one-liner – pick by where it goes

| Length | Copy |
|---|---|
| **6 words** | A crypto wallet for my mom. |
| **1 sentence** | A crypto wallet simple enough for my mom to use – email + PIN, no seed phrase, no gas token. |
| **1 paragraph** | EZwallet is a mobile-first crypto wallet built for people who don't know what a wallet is. You sign in with an email and a 6-digit PIN – no seed phrase to lose. It runs on Arc, where USDC *is* the gas token, so nobody has to buy a second coin just to move the first one. Send, receive by QR, swap by dragging a slider. Live on Arc Testnet. |

**The settled tagline (used consistently everywhere):**
> *A crypto wallet simple enough for my mom to use.*

> ⚠️ **Voice rule:** write that sentence exactly, with no variants (no "grandma", no "your mom").
> Long dashes: **ONLY the en dash `–` (U+2013)**, never the em dash `—` (U+2014).

---

## 1.5. Core belief (everything in this file has to follow it)

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

People should not have to adapt to crypto – crypto has to adapt to people,
simple enough for anyone to use while keeping full ownership of their
money. Every post and every piece of copy here should come back to that belief, not just
list features.

---

## 2. Fact sheet – say ONLY what is in this table

Every number below is verifiable (actually run / read on-chain / present in the code). **Outside this table, invent nothing.**

| Item | Fact |
|---|---|
| **Status** | Working, public, **Arc Testnet** – test money, no real value. Not on mainnet. |
| **Product link** | https://ezwallet.cash |
| **Source** | https://github.com/KattyFury/ezwallet – **MIT, fully open** |
| **Pitch deck** | [Google Slides](https://docs.google.com/presentation/d/1-MuqJeSV1Riwg3Bx6IXZSuNumqbtM83dmzG48-vIRDQ/edit?usp=sharing) |
| **Sign-in** | Email + a **6-digit PIN**. NO seed phrase. Keys held by **Circle User-Controlled Wallets (MPC)**; the PIN signs each transaction. |
| **Chain** | **Arc** (Circle's L1) Testnet, chainId `5042002`, explorer `testnet.arcscan.app` |
| **Gas fees** | Paid in **USDC** (Arc uses USDC as native gas) – measured at **under $0.01 per transaction** |
| **Supported tokens** | USDC · EURC · cirBTC |
| **Features that genuinely work** | Send (with an on-chain note through Arc's Memo precompile) · Receive by QR (preset amounts + a QR library) · **Swap with a % slider** · Contacts with photos · History + receipts saved to the device · Balances shown in USDC or EURC |
| **Swap runs on** | Circle **Stablecoin Kit**, routed through LiFi, settled through the Swap Adapter – **one PIN entry for approve + swap together** (batched through Multicall3) |
| **Revenue model** | An app fee of **0.1%** per swap (taken from the input token, shown in "You receive"). Running on testnet. |
| **App size** | 20 screens, PWA (installable on the iOS home screen), one font, a fixed 10-row grid |
| **Infrastructure** | React 18 + Vite · Cloudflare Pages + Pages Functions (the API key stays server-side) · viem for on-chain reads |
| **Who built it** | Hieu Nguyen – [0xhieu.xyz](https://0xhieu.xyz) · X [@0xhieuxyz](https://x.com/0xhieuxyz) · TG [@nguyen0xhieu](https://t.me/nguyen0xhieu) · GitHub [KattyFury](https://github.com/KattyFury) |
| **How it was built** | Built end to end **with AI (Claude)** by someone with **no programming background**. The product, UX and design decisions are human; the code came out of conversation and was verified by running it for real. |

---

## 3. The 30-second story (the frame to use every time)

1. **The problem:** crypto wallets are designed for people who already understand crypto. A 12-word seed phrase, long `0x` addresses, having to buy ETH before you can move USDC – each one is a wall. For an older person it is over at step 1.
2. **The realisation:** stablecoins are already good enough to be "money" for ordinary people. What is not good enough yet is **the wallet**.
3. **The solution:** take the crypto vocabulary off the surface. Email + PIN. Fees paid in the money you are already holding. Big type, one primary action per screen. To swap, **drag a slider** instead of typing decimals.
4. **The proof:** it is not a mockup – open the link and use it right now, the code is MIT.

---

## 4. Five differentiators (each with its evidence)

| # | Point | Evidence to close with |
|---|---|---|
| 1 | **No seed phrase** – email + a 6-digit PIN | Circle MPC holds the keys; the PIN signs each transaction. Losing the phone does not lose the money. |
| 2 | **No separate gas token needed** | Arc uses USDC as native gas → holding USDC is enough, no buying ETH first. |
| 3 | **Swapping without typing numbers** | Drag a slider to pick a % of the balance, with 5 magnet marks + round-number chips. This is the thing everyone mentions after trying it. |
| 4 | **Notes live on the blockchain** | Send "Mommy, I sent you money" through Arc's Memo precompile – like the description on a bank transfer. |
| 5 | **Designed for weaker eyesight** | Big type, a fixed 10-row grid, one primary button per screen, and everything tappable has a shadow. Accessibility as a feature, not a slogan. |

**Points 3 and 4 are the most shareable – always keep them in the first 2 tweets.**

---

## 5. Who to talk to

- **Ring 1 (easiest):** Arc + Circle builders/hackathon people, DeFi devs who care about UX, the existing following.
- **Ring 2:** crypto communities that care about "shipping a real product instead of farming airdrops".
- **Ring 3:** no-code / build-with-AI groups (a great fit for the "someone who cannot code shipped a working wallet" story).
- **Who is NOT the target:** degens hunting yield, people who want a full-featured multi-chain wallet. Do not try to sell to them.

---

## 6. Status & roadmap (be explicit about what is now and what is later)

**Available now (real, working):** email+PIN login · sending with a note · QR receiving + the QR library · 3-token swap · contacts · history + receipts · PWA installable on iPhone.

**Not available (say it plainly when asked):** not on mainnet · one chain only · English-only UI (Circle's PIN screen is an English-only iframe) · no Google login · the QR scanner reads crypto wallet QRs only, not bank QRs.

**Direction (label it clearly as THE FUTURE, promise no dates):** mainnet · native iOS/Android apps (FaceID instead of a PIN) · more currencies · a few selected financial services embedded in the app.

---

## 7. GUARDRAILS – 7 things NEVER to say

One wrong sentence costs the project its credibility. This is the kind of mistake that cannot be walked back:

1. ❌ Never say or imply **mainnet** or **real money**. Every post must carry the words **Arc Testnet** or "test money".
2. ❌ Never promise **interest, profit, yield, "your money is insured"**. EZwallet is not a bank.
3. ❌ Never claim **"non-custodial"** in absolute terms. The accurate wording: *keys managed by Circle MPC, the user signs with a PIN* – this is **user-controlled**, not seed-phrase self-custody. Answer exactly that to anyone who digs.
4. ❌ Never invent **user counts, TVL or transaction numbers**. If there are none, say there are none.
5. ❌ Never use **mocked-up UI images**. Only the real screenshots/GIFs in `docs/` (section 9).
6. ❌ Never say **"audited"** – it has not been audited.
7. ❌ Do not promote **"contacts backed up to the cloud"** (added 07-29, updated 08-06). The old reason (weak auth: knowing an email opened the address book) is **NOW FIXED** – the door is a PIN signature from the wallet itself (HANDOFF section 3). But the feature is **STILL NOT LIVE in production** because the KV binding has not been created, and the signing flow can only be verified on a real deploy. → **Only talk about it after enabling KV + completing the 08-06 deploy checklist.** Until then it stays a silent feature; do not mention it.

> The strength of this messaging is that it is **true**. "Not on mainnet, not audited, here is the open code, go try it" is more convincing than any adjective.

---

## 8. Ready-to-post copy

### 8.1 · X thread (the main post – publish once and pin it)

> **1/**
> My mom will never write down 12 words on a piece of paper.
> So I built a crypto wallet where she doesn't have to.
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
> "Mommy, I sent you money" – written into the transfer through Arc's Memo precompile, the same way you'd write a note on a bank transfer.
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
> Circle User-Controlled Wallets (MPC). No seed phrase exists to lose – the PIN authorises every signature.
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
> · Arc Testnet only – the money is test money
> · Not on mainnet, not audited
> · English-only UI for now
> · One chain
> I'd rather say that than let you find out yourself.
>
> **8/**
> And the part that matters to me most:
> I'm not a developer. I built this end to end with Claude – the product decisions and UX rules are mine, the code came out of conversation, and every flow was verified by actually running it.
> If you have an idea and no CS degree: it's doable.
>
> **9/**
> Try it (2 minutes, free test money):
> 🔗 ezwallet.cash
> 💻 github.com/KattyFury/ezwallet (MIT)
> Built on @Arc + @circle.
> Tell me the first thing that confuses you – that's the bug I want.

### 8.2 · Standalone tweets (rotate, 1-2 per week)

- *"Type the exact amount" is the most user-hostile pattern in crypto. I replaced it with a slider that snaps to round numbers. Mom-tested. → ezwallet.cash* [GIF swap]
- *Sent my mom $20 on-chain with the note "Mommy, I sent you money" attached. She didn't have to know what a wallet is. Arc Testnet, but the flow is real.* [GIF send]
- *Wallet UX bar I'm holding myself to: if a 70-year-old needs one explanation to use a screen, the screen is wrong.*
- *No seed phrase. No gas token. No hex address to paste. What's left is: a name, an amount, and a note. That's a wallet.*
- *Building in public update: shipped QR storage – save the QR codes you use often (rent, coffee, your kid) and reuse them.* [IMG qr-storage]
- *I can't code. I shipped a working crypto wallet. The bottleneck was never the syntax – it was knowing exactly what I wanted, and refusing "it should work" as an answer.*

### 8.3 · Long form (LinkedIn / Warpcast / Mirror / Reddit)

> **I built a crypto wallet for people who don't know what a wallet is.**
>
> Every crypto wallet I've handed to a non-crypto person died at the same place: the seed phrase screen. Twelve random words, "write these down, if you lose them your money is gone forever." That's where normal people stop – and it's exactly where my mom stopped.
>
> So I built EZwallet. You sign in with an email and a 6-digit PIN. There is no seed phrase, because Circle's MPC infrastructure holds the keys and the PIN authorises each signature. It runs on Arc, Circle's chain where USDC is the native gas token – so you never hit the "buy a second coin to move your first coin" wall. Fees measure under a cent.
>
> Three design decisions I'd defend anywhere:
> · **Swapping is a slider, not a text field.** You drag to pick a percentage of your balance; it snaps to round numbers. Asking a first-time user to type "0.0247" is a UI failure, not a user failure.
> · **Notes go on-chain with the money.** Arc has a memo precompile, so a transfer can carry "Mommy, I sent you money" the way a bank transfer carries a description. Money with context is a message; money without it is a number.
> · **Big type, one action per screen.** Fixed 10-row grid, real token names always visible, everything tappable looks tappable. Designed for weaker eyes and low tolerance for clutter.
>
> Where it honestly stands: Arc Testnet only, not on mainnet, not audited, English-only UI, one chain. The money is test money. I'd rather lead with that than have you discover it.
>
> One more thing: I'm not a developer. I built this end to end with Claude. The product thinking, the UX rules and the design calls are mine; the implementation came out of conversation and was verified by running every flow for real. If you've got an idea and no engineering background – the gap is smaller than it was a year ago.
>
> Try it (free test money, ~2 minutes): **ezwallet.cash**
> Source, MIT: **github.com/KattyFury/ezwallet**
>
> Tell me the first thing that confuses you. That's the bug I actually want.

### 8.4 · Three lines (Discord, Telegram, hackathon forms, project bios)

> **EZwallet** – a crypto wallet simple enough for my mom to use.
> Email + PIN (no seed phrase) · USDC pays its own gas on Arc · swap by dragging a slider · notes ride on-chain with the money.
> Live on Arc Testnet: ezwallet.cash · MIT: github.com/KattyFury/ezwallet

### 8.5 · One line for a bio / signature

> Building EZwallet – a crypto wallet simple enough for my mom to use. Arc Testnet, MIT, ezwallet.cash

---

## 9. Approved images/GIFs (all REAL, already in the repo)

| File | Used for |
|---|---|
| `docs/flow-swap.gif` | **The strongest one** – the swap slider. Always tweet 2. |
| `docs/flow-send.gif` | Sending with a note. Tweet 3. |
| `docs/flow-login.gif` | Email + PIN sign-in (proving "no seed phrase"). |
| `docs/flow-receive.gif` | Receiving by QR. |
| `docs/app-home.jpg` · `app-swap.jpg` · `app-receive.jpg` · `app-contacts.jpg` · `app-qr-storage.jpg` · `app-create-qr.jpg` | Still screenshots of each screen – for long form / carousels. |
| `design/logo.svg` | The logo (the colour version on light backgrounds, the white version on gradients). |

The 9-page deck: see `DECK-DESIGN-SPEC.md` (the design system) + the Google Slides link in section 2.

---

## 10. Hard questions – answer honestly, do not dodge

| Asked | Answer |
|---|---|
| *"Custodial or non-custodial?"* | User-controlled: the keys are managed by **Circle MPC** and every signature needs **the user's PIN**. It is not seed-phrase self-custody, and I do not hide that. A deliberate trade-off: drop the seed phrase so ordinary people can actually use it. |
| *"What if I lose my PIN?"* | Circle has a PIN recovery flow (`user/pin/restore`) using the security questions set when the wallet was created. |
| *"How is it different from Coinbase Wallet / Trust Wallet?"* | They are built for people who **already** understand crypto and try to do everything. EZwallet deliberately does 4 things (send/receive/swap/contacts) and does them for people who understand **nothing** yet. No dApp browser – on purpose, because that is where older people get scammed. |
| *"Why testnet only?"* | Because Arc has only opened a testnet to the public, and I do not want to hold anyone's real money before an audit. Mainnet is the next step, with no date promised. |
| *"Can AI-written code be trusted?"* | Every flow was run for real to verify it – the swap is even simulated with `eth_simulateV1` before shipping. The code is MIT, read it freely. And I say plainly that it is not audited. |
| *"How does it make money?"* | A 0.1% app fee on each swap. Sending and receiving are free. |
| *"Is there a token / airdrop?"* | **No.** No token, no points, no airdrop. Do not farm it. |

---

## 11. Release order (a suggestion for the first 2 weeks)

1. **Day 1** – thread 8.1 on X, pinned to the profile. Change the bio to 8.5.
2. **Day 3** – 8.3 on LinkedIn/Warpcast (lean on the "cannot code, still shipped" angle – it reaches people outside crypto).
3. **Days 4-5** – send 8.4 into the Arc + Circle Discord/TG with the swap GIF. Ask for feedback, do not ask for retweets.
4. **From week 2** – 1-2 standalone tweets (8.2) per week + one "just shipped" update. A steady rhythm beats one big post.
5. **Always** – reply individually to everyone who tries it. 10 real users are worth more than 1000 impressions.
