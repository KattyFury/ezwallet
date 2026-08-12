<div align="center">

# EZwallet

**A crypto wallet simple enough for my mom to use.**

<sub>*Ví crypto đơn giản đến mức mẹ mình cũng dùng được.*</sub>

[![Live demo](https://img.shields.io/badge/live%20demo-ezwallet.cash-0B53BF?style=flat-square)](https://ezwallet.cash)
[![Network](https://img.shields.io/badge/network-Arc%20Testnet-16A34A?style=flat-square)](https://testnet.arcscan.app)
[![License](https://img.shields.io/badge/license-MIT-black?style=flat-square)](./LICENSE)

</div>

---

## Demo

<div align="center">

<table>
<tr>
<td align="center" width="50%"><img src="docs/flow-login.gif" width="240" alt="Sign in"><br><sub><b>1 · Sign in with email + PIN</b></sub></td>
<td align="center" width="50%"><img src="docs/flow-send.gif" width="240" alt="Send"><br><sub><b>2 · Send, with a note</b></sub></td>
</tr>
<tr>
<td align="center"><img src="docs/flow-receive.gif" width="240" alt="Receive"><br><sub><b>3 · Receive by QR</b></sub></td>
<td align="center"><img src="docs/flow-swap.gif" width="240" alt="Swap"><br><sub><b>4 · Swap by % slider</b></sub></td>
</tr>
</table>

</div>

---

### Screens

<div align="center">

<table>
<tr>
<td align="center" width="33%"><img src="docs/app-home.jpg" width="230" alt="Home"><br><sub><b>Balance & tokens</b></sub></td>
<td align="center" width="33%"><img src="docs/app-swap.jpg" width="230" alt="Swap"><br><sub><b>Swap by % slider</b></sub></td>
<td align="center" width="33%"><img src="docs/app-receive.jpg" width="230" alt="Receive"><br><sub><b>Receive by QR</b></sub></td>
</tr>
<tr>
<td align="center"><img src="docs/app-contacts.jpg" width="230" alt="Contacts"><br><sub><b>Contacts</b></sub></td>
<td align="center"><img src="docs/app-qr-storage.jpg" width="230" alt="QR storage"><br><sub><b>Saved QR codes</b></sub></td>
<td align="center"><img src="docs/app-create-qr.jpg" width="230" alt="Create QR"><br><sub><b>Create a receive QR</b></sub></td>
</tr>
</table>

</div>

---

## Core belief

> Crypto could be the future of money. Everyone should be able to own and use it.

Crypto is borderless, always-on, and cheap – but it wasn't built for people,
it was built for developers, and it solves problems most people don't have.
What people actually need is to send, receive, and hold money, simply. So
**crypto should adapt to people, not the other way around** – and as
software, then AI, takes over moving our money, **people should keep control
of it.**

Every product decision in this repo traces back to this belief.

## The problem

Most crypto wallets assume the user already understands crypto – seed
phrases, gas tokens, hex addresses. Each one is a wall for a first-time user,
and a dealbreaker for someone older who just wants to send money to family.

## The approach

EZwallet removes the crypto vocabulary from the surface:

- **No seed phrase.** Email + PIN to sign in.
- **No gas token.** Arc uses USDC as gas, so one token does everything.
- **Big type, one action per screen.** Built for weaker eyesight and low
  tolerance for clutter.

## Features

| | |
|---|---|
| 🔑 **Email + PIN login** | No seed phrase. Circle MPC holds the keys; the PIN signs every transaction. |
| 💸 **Send with a note** | Attach a message to a transfer. |
| 📷 **Receive by QR** | Show a QR to get paid, with an optional amount and a reusable QR library. |
| 🔄 **Swap with a % slider** | Drag to convert a % of your balance – no typing decimals. |
| 👥 **Contacts** | Save addresses under a name and avatar. |
| 🧾 **History + receipts** | Full transaction history with saveable receipts. |
| 🌐 **Multi-currency display** | Show balances in USDC, EURC, or VND. |

## Tech stack

| Layer | What it uses |
|---|---|
| **Wallet** | [Circle User-Controlled Wallets](https://developers.circle.com/w3s/programmable-wallets) – MPC key management, PIN-based signing (`@circle-fin/w3s-pw-web-sdk`) |
| **Chain** | [Arc](https://docs.arc.io) L1 testnet (`chainId 5042002`) – **USDC is the native gas token** |
| **Swap** | Circle Stablecoin Kit, routed through LiFi |
| **Frontend** | React 18 + Vite 5, `viem` for on-chain reads, `qrcode.react` / `jsqr` for QR |
| **Backend** | Cloudflare Pages + Pages Functions (`functions/api/*`) – keeps the Circle API key server-side |

Tokens on Arc Testnet: **USDC**, **EURC**, **cirBTC**. Transfer notes are written
on-chain through Arc's Memo precompile.

## Try it

1. Open **[ezwallet.cash](https://ezwallet.cash)**.
2. Create a wallet with your **email** – you'll receive a one-time code, then set
   a 6-digit PIN.
3. Get test money: **Menu → Deposit**. This copies your wallet address and opens
   the [Circle faucet](https://faucet.circle.com/) – paste the address there.
4. Send some to a friend, or have them show you their QR.

> Everything runs on **Arc Testnet**. The money is test money and is worth nothing.

## Local setup

**Requirements:** Node.js 18+ (developed on Node 22), a
[Circle console](https://console.circle.com) account for API keys.

```bash
git clone https://github.com/KattyFury/ezwallet.git
cd ezwallet
npm install
```

Create your env file and fill in the keys:

```bash
cp .env.example .env.txt      # .env.txt is gitignored
```

| Variable | Needed for |
|---|---|
| `API_KEY` | Circle Programmable Wallets (login, PIN, send). `CIRCLE_API_KEY` also accepted. |
| `KIT_KEY` | Circle Stablecoin Kit – only needed for Swap. |

Then run the two processes in **separate terminals**:

```bash
npm run api     # Circle API proxy on http://localhost:8787
npm run dev     # Vite dev server on http://localhost:5173
```

Vite proxies `/api/*` to the local proxy, which mirrors what Cloudflare Pages
Functions do in production.

> ⚠️ **The Circle Web SDK does not run on `localhost`.** Login, PIN entry and
> swap can only be exercised on a deployed build. For local UI work use mock
> mode instead.

**Mock mode** – full UI with a fake wallet and fake balances, no Circle account
required:

```bash
npm run mock    # skips login/PIN, stubs the API and chain reads
```

Other scripts:

```bash
npm run build   # production build
npm test        # unit tests (node:test)
```

## Current limitations

- **Testnet only.** Balances have no real-world value; no mainnet yet.
- **English by default.** Vietnamese is translated and selectable, but the
  app doesn't auto-switch on it; a few strings inside Circle's iframe stay
  English regardless.
- **No Google sign-in.** Email + PIN only.
- **QR scanning is crypto-wallet QR only** – not bank or product QR codes.
- **Not audited.** See [SECURITY.md](./SECURITY.md).

## How this was built

Built end to end with AI (mostly Claude) by someone with no programming
background. Product decisions, UX, and design are human; the implementation
came out of conversation and was verified by running every flow.

If you're in the same boat: be specific about what you want, and don't accept
"it should work" as an answer.

## License

[MIT](./LICENSE)
