# HANDOFF – ezwallet-testnet

**Updated:** 2026-09-27 · **Repo:** `KattyFury/ezwallet-testnet` · **Local:** `D:\Files\Claude\Build on Arc\ezwallet-testnet`
**Live:** https://testnet.ezwallet.cash (Cloudflare Pages project `ezwallet`, auto-deploys from `main`)

> **Start of every session:** read `CLAUDE.md` (how to work with the user) and this file, then `git pull`.
> Full history - every dated decision, round-trip and the pre-2026-09-27 version of this file - lives in
> `HANDOFF-LOG.md`. Read it only when you need the "why" behind something here.

---

## 0. What this repo is (after the 2026-09-27 fork)

- **This is the Arc TESTNET build** of ezwallet - a stablecoin wallet for everyday people and older users
  (email + 6-digit PIN, no seed phrase, gas paid in USDC). Feature-complete and polished; testers use it.
- **The Arc MAINNET product lives in a separate repo: `KattyFury/ezwallet`** (local
  `D:\Files\Claude\Build on Arc\ezwallet`), started 2026-09-27 as a copy of this code with fresh history.
  Its spec is `MAINNET-SPEC.md`. **Do mainnet work there, not here.**
- Sibling folders under `Build on Arc\` (`build-on-arc`, `luckypot`, `taptip`, `ezwallet`) are separate,
  unrelated repos - never let one end up nested inside another.

**Core belief (every decision answers to it):** people shouldn't have to adapt to crypto; crypto should
adapt to people. Ask of every change: *does this make sending/receiving simpler for an everyday user?*
If something drifts from that, stop and ask the user.

---

## 1. Open items (not built - ask before starting any of them)

| Item | State |
|---|---|
| **Success sound** | `src/sound.js` is written but NOT wired. Decisions already made (do not re-ask): play after a send (SendReceipt) and after a swap; Web Audio C6→E6 ~0.3s; ON by default (`ez_sound`); needs an off switch in Security & Region; `unlockOnFirstTouch()` once in `App.jsx` (iOS needs a gesture); `playSuccess()` must fail silently. Test the iOS silent switch on a real device. |
| **Received-money notifications only poll on Send/Receive** | Moving polling into `App.jsx` would announce money on every screen - touches architecture, needs the user's OK. |
| **Network label on the Receive screen** | Shared QR images already say "Only Arc Testnet"; the screen itself does not. Where it goes is the user's layout call. |
| **Auto-convert when USDC is short** | User idea (2026-09-08), notes only: swap the highest-balance token into USDC after a confirmation. Open questions (fee, trigger, copy, cirBTC) in `HANDOFF-LOG.md` §7f. |
| **Circle SDK prefetch** | ~1MB SDK is prefetched at idle on boot. Offered: load only when a PIN is needed. User has not decided. |
| **Manual clean-up in Cloudflare** | Delete `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from Pages → ezwallet → Settings → Variables (the bug-report feature was removed 2026-09-10) and revoke the bot via @BotFather. |
| **Circle PIN screen limits** | No auto-clear on wrong PIN, keyboard needs a tap - Circle's iframe, cannot be fixed here. |

---

## 2. Visual rules (user-settled 2026-09-27 – apply to every screen)

- **Figma is the source of truth** (file `GxgsMU6HAYqolckzvPWXp1`). When code disagrees with Figma, code is
  wrong - except where the user explicitly overrode a Figma number (row 10 below). Re-fetch the node
  (`get_design_context`/`get_metadata`) before touching a screen; node ids shift. The rendered PNG beats the
  node list (flattened details are missing from the list).
- **The user draws, Claude builds.** Do not redesign or "improve" screens on your own; build the drawing,
  screenshot it to the Desktop, get it approved.
- **Exactly 3 greys:** box/background `#D2DCE6` (`--color-card`; `--color-surface`/`--color-gray`/
  `--color-faint` are aliases) · disabled/placeholder text + hairlines `#94A3B8` (`--color-muted`) ·
  secondary text `#667085` (`--color-muted-2`). Never add a fourth.
- **Radius: 16px on every box and button**, or fully round (pills, circles, avatar). No 8px anywhere.
- **Thin lines: 0.5px `#94A3B8`**.
- **Everything scales with the viewport.** `--u` (index.css) = one design pixel =
  `min(1px, 100dvh/844, 100vw/390)`. Write every size as `calc(N * var(--u))` - fonts, heights, icons,
  paddings, gaps. Radii, borders, shadows and hairlines stay fixed. Gaps that must stay readable:
  `max(8px, calc(16 * var(--u)))`. `useFitFontSize` scales its max/min by the same factor. At ≥844×390 the
  app is pixel-identical to the unscaled design (verified on 25 screens).
- **Grid:** 10 rows of 70/844 with a 16px gutter; row N top = (N−1)×86. Convert `x/390 → %`, `y/844 → dvh`.
  **Row 10 = row 1 = 70px**: `ScreenSheet` ends at y=774 (NOT Figma's 782.3); NavBar buttons are `8.29dvh`.
- **Big cards must be `position: absolute`** (left 6.41%, top 10.19dvh, 87.18% × 69.43dvh). A plain grid
  item (`gridRow`, `.row-2-8`) paints UNDER the absolute `ScreenSheet` and vanishes (this hid QR storage,
  History and the whole Contacts list until 2026-09-27).
- Home action row: the big pill sits exactly one gap below the notification card and one gap above row 10.
- Titles: centred, bottom of row 1, via the shared classes - never positioned per screen.
- NavBar is icon-only (30 design px). Boot is gradient all the way (index.html paints the Splash, App falls
  back to `<Splash/>` while booting, PinGate/ForgotPin use `GRADIENT`).
- **Verify UI with pixels, not eyes:** `npm run mock` + Playwright at 390×844 AND a short/narrow size
  (375×667, 360×780). `tools/figma-check.mjs <Screen> ref.png` gives an app|diff|figma image;
  `?screen=<Name>&params=<json>` opens any screen. **Check routing first** - a returning user boots into
  `PinGate`, not `Splash`; when the user's observation conflicts with your measurement, you are measuring
  the wrong thing. Send screenshots to the user's Desktop.

---

## 3. Stack & infrastructure

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Pages Functions `functions/api/*.js` proxy the
  Circle API (keys server-side).
- **Wallet:** Circle **User-Controlled Wallet** (MPC EOA, PIN signing via `@circle-fin/w3s-pw-web-sdk`,
  lazy-loaded - `await getSDK()` everywhere).
- **Chain:** Arc Testnet · chainId `5042002` (`ARC_CHAIN_ID` in `src/qr.js`) · RPC
  `https://rpc.testnet.arc.network` · Explorer **`explorer.testnet.arc.io`** (`EXPLORER` in `src/chain.js`;
  the old `testnet.arcscan.app` 301s WITHOUT CORS - browser fetches to it fail).
- **Reads:** viem + Multicall3 (1 request for all balances) · CoinGecko prices (60s cache). **Swap:** Circle
  Stablecoin Kit REST (§6). **QR:** `qrcode.react` + `jsqr`.
- **Domain:** `testnet.ezwallet.cash` → Pages project `ezwallet` (`ezwallet.pages.dev` also works). The apex
  `ezwallet.cash` is reserved for the mainnet app. The code hardcodes no domain except `index.html`'s
  canonical/og tags. **localStorage is per origin** - moving domain signs users out and empties contacts/QR
  library locally; the wallet itself is safe (email + PIN), and contacts/QRs come back from the KV backup
  after the PIN.
- **Cloudflare access for Claude:** API token `CF_API_TOKEN` + `CF_ACCOUNT_ID` in `.env.txt` (gitignored,
  NEVER print or commit it) - has Pages + DNS edit. Use the REST API with `Authorization: Bearer`. The old
  wrangler OAuth token is expired. Secret env vars read back without a `value` - that is encryption, not empty.
- **Secrets** (`.env.txt`, `.dev.vars`, Pages dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit).
  Not secret: APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`.
- **Local dev (Windows):** `node dev-server.js` (API on 8787) + `npm run dev` (5173). Not `wrangler pages dev`.
  The Circle SDK does not run on localhost → PIN/login/swap only testable on a deploy.
- **Mock mode:** `npm run mock` - fake wallet/balances/history, skips Login/PIN, never reaches production.
  Playwright: `npm i --no-save playwright && npx playwright install chromium`.
- **CI:** `.github/workflows/ci.yml` runs `npm test` + `npm run build` on every push to `main`.
- **KV backup of contacts + QR library:** `functions/api/sync.js` + `src/sync.js`, binding `EZ_SYNC`.
  localStorage is the source of truth; newest edit wins (`ez_sync_at_<addr>`); auth = a PIN signature over a
  nonce (session token in `sessionStorage.ez_sync_token`); avatars never leave the device. Tests:
  `test/sync.test.mjs`.

**Tokens (Arc Testnet):** USDC `0x3600000000000000000000000000000000000000` (6) · EURC
`0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6) · cirBTC `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` (8).
**Contracts:** Memo `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` · Multicall3From
`0x522fAf9A91c41c443c66765030741e4AaCe147D0` · Swap Adapter `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b` ·
Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`.

---

## 4. Money & display model

- Tokens always show their real name (USDC/EURC/cirBTC). The display currency (`ez_currency` ∈ USDC/EURC →
  `$`/`€`) is a conversion layer over USD rates, USDC pinned to $1. Send takes input in "USD" = USDC 1:1.
- One string, one style: `fmtMoney()` → `$2` / `€2` / `2 USDC`.
- Gas reserve: 1 USDC is always held back from "available".
- **English + USD/EUR only.** The i18n layer was deleted 2026-08-25. The VND plumbing in `chain.js`/`qr.js`/
  `amountHint.js`/`data.js` is deliberately left in place but unreachable - leave it.

## 5. Features (working, verified on a deploy)

Email login → wallet (PIN + security questions) · PinGate unlock on reopen · send USDC/EURC/cirBTC (Memo
contract when there is a note) · receive (QR + address) · QR create/scan/library · contacts (per account,
avatar cropper) · history (grouped by day, swaps as 2 rows, self-sends labelled) · swap (Service hub →
Exchange) · in-app notifications · receipts (canvas → Photos via Web Share) · change PIN · KV backup.
Google login and Email OTP are hidden: Circle only allows a PIN with the plain `userId=email` flow, so OTP
would mean losing the PIN - **never propose turning Email OTP on**. Sending to your own wallet is blocked in
PasteAddress, QRScanner and SendAmount (`isOwnAddress()`).

## 6. Swap (⚠️ real money)

1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → a **signed intent**. `amount` is an
   INTEGER in base units.
2. Batch `[approve(tokenIn→adapter), adapter.execute(executionParams, tokenInputs, signature)]` through
   **Multicall3From = one PIN**. ABI copied from the SDK, encoded with viem.
3. The adapter runs the route (LI.FI underneath) and settles the output to the wallet.

**Never unpack `instructions[]` and run them by hand** - that skips settlement and strands the money in the
adapter while the tx still says status=1. Verify every swap change with `node verify-swap.mjs <wallet> EURC
USDC 2` (eth_simulateV1, free). App fee: `customFee.percentageBps = 10` (0.1%) to
`0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6`, taken from the input token; the estimate is already net.
Error `331001` = no route (LI.FI side, happened 08-13→08-25 and recovered on its own) - re-measure before
touching code.

## 7. Circle / Arc gotchas (keep forever)

- The PIN screen is a cross-origin iframe: its keyboard cannot be auto-opened and it cannot be closed early
  (closing before the challenge settles loses the signature).
- `setCustomSecurityQuestions(questions, requiredCount, securityConfirmItems)` takes POSITIONAL args - an
  object blanks the screen. When an SDK misbehaves, read its `.d.ts` in `node_modules` first.
- `getSDK()` is async - `grep -rn "getSDK()" src/ | grep -v await` must be empty. A userToken lives 60' →
  `refreshSession()` before any PIN action. A wrong PIN does not settle the promise; `155701` = user cancel.
- chainId formats: W3S `ARC-TESTNET`, Stablecoin Kit `Arc_Testnet`.
- The Arc RPC is rate limited (429): fold reads into Multicall3, back off ≥600ms, **show `…` on a failed read,
  never 0**. A cold call takes ~3s → seed every balance screen from the module cache.
- The explorer API ignores `limit` - use `page` + `offset`. Do not merge `txlist` into history (double counts).
- RPC CORS fails on localhost only (normal in mock mode).
- iOS: `body` background must stay white (it paints the PWA status bar); manifest/meta changes need the app
  re-added to the home screen; no `navigator.vibrate`; `clipboard.readText()` only in PasteAddress (the iOS
  Paste confirmation cannot be removed).
- Web Share: `{files, text}` makes iOS hide some target apps. The Receive screen sends image + address text
  anyway (user accepted); ShowQR/receipt send the image only. Shared QR images come from
  `saveImage.brandedQrCanvas()` - the address is never drawn on the image.
- Pages applies new environment variables only to NEW deployments.

## 8. QR format – locked to Arc

`src/qr.js` is the single source: `ezwallet:0xABC…@5042002[?amount=25&cur=USD]`. EIP-681 is deliberately not
used (wallets ignore its chainId). `parseQR` accepts the standard form, the old form without `@chain`, and a
bare `0x…` (to pay outsiders); another chain returns `{ wrongChain }` (no `.address` - catch it first). The
address as TEXT (copy/share) stays bare on purpose.

## 9. Notifications

`NotifArea` polls the explorer: every 5s on Receive (someone is waiting), 15s on Send; skips while the tab is
hidden and polls immediately on return; `page=1&offset=20`. Silence on a money screen is a serious bug for
this audience - never optimise the polling away.

## 10. localStorage keys

Session: `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email`, `ez_notifs`,
`ez_last_recv_ts_<addr>`, `ez_notified_hashes_<addr>`, `ez_faucet_pending`; `sessionStorage.ez_pin_ok`,
`sessionStorage.ez_sync_token`. Persistent: `ez_contacts_<addr>`, `ez_saved_qrs_<addr>`, `ez_currency`,
`ez_default_note`, `ez_sync_at_<addr>`, `ez_a2hs_done`. Sign-out clears only the session keys.

## 11. Lessons

- Measure before blaming, and build an isolated measurement before fixing. Three "our bugs" in one session
  were Windows curl encoding, Circle's router, and a pre-existing overflow.
- Unverified "improvements" (aggressive retries, catch-and-return-0) caused worse regressions than the
  original bugs. Verify UI with the Playwright mock, swaps with eth_simulateV1.
- Change code and its test in the same commit (`roundHint.js` left `npm test` red for 9 days).
- A function named `poll…` with no interval is a lethal silence.
- A grid with undeclared columns, or a flex item without `minWidth:0`, lets one long string wreck a screen.
- "Looks unused" is not "safe to delete" here: `src/sound.js`, the VND helpers, the Google-login plumbing,
  `icon/` (the user's own drawings) and `public/tokens/*.png` (loaded dynamically) are all deliberate.
