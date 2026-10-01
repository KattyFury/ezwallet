# HANDOFF – ezwallet

**Updated:** 2026-10-01 · **Repo:** `KattyFury/ezwallet` (the ONLY ezwallet repo) · **Local:** `D:\Files\Claude\Big projects\ezwallet`
**Status: ezwallet.cash SERVES MAINNET (since 2026-10-01). Owner is testing mainnet and reporting bugs one by one.
TARGET: public mainnet launch within October 2026.**

> **Start of every session:** read `CLAUDE.md`, this file (the ▶▶▶▶▶ section first), then `git pull`.
> **Before any fix:** official docs first, no blind building - the verified sources are listed in the Claude
> memory file `arc-circle-mainnet-official-docs.md` (Circle OpenAPI + `.md` pages via `developers.circle.com/llms.txt`,
> Arc docs via `docs.arc.io/llms.txt` / the arc-docs MCP). Cite the doc line or a live measurement for every change.

### Workflow until launch
1. The owner tests on https://ezwallet.cash with an email NEVER used on testnet (see Bug 1) and reports bugs.
2. For each bug: reproduce/measure (read-only first), find the rule in the official docs, then offer options -
   the owner picks before any code. Fix on `main` directly (owner: no extra branch domains), push, verify the deploy.
3. Keep testnet = mainnet (differences only in `src/network.js`).

### Known open mainnet bugs (2026-10-01)
| # | Bug | State |
|---|---|---|
| 1 | Emails already used on testnet cannot sign in on mainnet (Circle userId shared across TEST/LIVE) | Circle-side; owner reports to Circle; workaround = new email |
| 2 | The public Arc RPC (itself behind Cloudflare) rate-limits **Cloudflare Functions** (eth_chainId passes, the next call fails; a PC passes 30/30) → /api/health failed → sending paused | FIXED `7e5fdb4` - the chain self-check runs in the browser; /api/health only reports the network. Waiting for the owner's phone test |
| 3 | `explorer.arc.io/api` answers a Cloudflare bot challenge → history / "money received" broken | FIXED `7e5fdb4` - Circle's tx list (`/api/wallet` 'history') + each receipt read in the browser (USDC from system emitter `0xffff…fffe`). Verified on the owner's testnet wallet = same rows as the explorer. Waiting for the owner's phone test. eth_getLogs was rejected: 10k blocks per call → ~1,700 calls for a June wallet |
| 3b | Admin Lookup "Transfers" + balances still use the explorer / RPC FROM CLOUDFLARE → fail on mainnet | Open, owner-only tool - Circle tx states still show |
| 4 | Testnet RPC `rpc.testnet.arc.network` differs from the docs' `rpc.testnet.arc.io` | Open, low |
| 5 | CSP blocks Cloudflare's injected `static.cloudflareinsights.com` beacon (console noise, harmless) | Open, low - turn Web Analytics off or allow it |
| 6 | Circle PIN window on ezwallet.cash - is the domain needed in the Circle Console? | Unchecked |
> Specs: `MAINNET-V1-PLAN.md` (mainnet v1, owner-approved), `admin/SPEC.md` (admin). Older: `MAINNET-SPEC.md`,
> `MAINNET-AUDIT.md`. Secrets: `D:\Files\Claude\.secrets\keys.env` (never in the repo).

## ▶▶▶▶▶ 2026-10-01 - ezwallet.cash MOVED to mainnet; mainnet is BROKEN - no blind fixes

- Local folder is now `D:\Files\Claude\Big projects\ezwallet`.
- Owner ordered it: ezwallet.cash + www now serve Pages `ezwallet-mainnet` (removed from the old `ezwallet`
  project, CNAMEs → `ezwallet-mainnet.pages.dev`). The rows of the map below are out of date on that point.
- **Bug 1 - login:** after the email code, "Cannot find the userId in the system" (Circle 155102 from
  POST /users/token). Live `GET /v1/w3s/users` lists only `ezwallet-probe-20260927` - the owner's user was never
  created. `ca38595` makes session.js return POST /users' own error instead of continuing; the owner reported the
  SAME message afterwards - root cause still unknown.
- **Bug 1 ROOT CAUSE (owner-confirmed 2026-10-01, NOT in Circle docs):** on one Circle account, POST /users
  checks userId uniqueness across testnet AND mainnet, while GET /users/{id} and POST /users/token only look in
  the key's own network. Any email that already has a testnet user gets 155101 "already exists" on mainnet, then
  155102 on the token → stuck. An email never used on testnet signs in to mainnet fine (owner tested). The
  API_KEY on Pages was re-written with the console key `LIVE_API_KEY:18394…` (same as keys.env) - not the cause.
  Owner decision 2026-10-01: use a NEW email (never used on testnet) on mainnet for now and report to Circle
  (draft at the owner's Desktop `CIRCLE-SUPPORT-REPORT.md`). No code change for this bug until Circle answers.
- **Bug 2 - RPC:** `rpc.mainnet.arc.io` answers "rate limit exceeded" to Cloudflare Functions every time (fine from
  a home PC) → /api/health fails → sending paused. docs.arc.io lists Blockdaemon / dRPC / QuickNode / Alchemy.
- **Bug 3 (likely):** `explorer.arc.io/api` returns a Cloudflare challenge page instead of JSON → history and
  "money received" may not work on mainnet. Not covered by any Arc doc.
- **Owner rule: no blind building.** Read the official sources first (Circle OpenAPI
  `developers.circle.com/openapi/user-controlled-wallets.yaml`, `.md` pages via `/llms.txt`, Arc docs MCP) and cite
  them for every change.

## Map (one repo, three Cloudflare Pages projects, all build from `main`)

| Site | Pages project | Network / notes |
|---|---|---|
| testnet.ezwallet.cash | `ezwallet-test` | testnet - rehearses EXACTLY what mainnet ships (owner rule: testnet = mainnet); branch previews on `<branch>.ezwallet-test.pages.dev` |
| ezwallet.cash + www + ezwallet-mainnet.pages.dev | `ezwallet-mainnet` | mainnet, LIVE Circle key (`LIVE_API_KEY:18394…`), KV `EZ_SYNC_MAINNET`, previews off |
| admin.ezwallet.cash | `ezwallet-admin` (root dir `admin/`) | behind Cloudflare Access (owner email only) + own JWT check |
| (no domain any more) | `ezwallet` (OLD) | old testnet build - domains removed 2026-10-01, project can be deleted by the owner |

## Open items (owner)

1. Test mainnet on ezwallet.cash with a new email and report bugs (target: launch within October 2026).
2. ~~Move ezwallet.cash + www to `ezwallet-mainnet`~~ DONE 2026-10-01. Old Pages project `ezwallet` can be deleted.
2b. Send `CIRCLE-SUPPORT-REPORT.md` (Desktop) to Circle support (Bug 1).
3. Delete the old Cloudflare token (id 7d9d445c…) - the master token (151b0875…) replaces it.
4. Delete the old Pages project `ezwallet-testnet` (no domains) in the dashboard.
5. Branches `admin`, `mainnet-v1`, `merge-testnet` are fully merged into `main` - safe to delete when the owner agrees.

## ▶▶▶▶ 2026-09-29 (end) - MAINNET V1 BUILT, deployed on ezwallet-mainnet.pages.dev, awaiting the owner's real-money test

- Branch `mainnet-v1` merged into `main` (owner-tested on the preview): testnet = mainnet (swap off, no cirBTC,
  Exchange "Coming soon"), CSP + no CORS + no raw Circle payloads, README limits, QR >$100 extra confirm (the
  on-screen "requested by this QR" label was REMOVED by the owner), unknown QR currency drops the amount, temp-mail
  block for NEW accounts (CC0 list, `tools/update-disposable-domains.mjs`), security mails (created / PIN change
  requested / PIN reset started), fee = eth_estimateGas of the exact call shown to 3 decimals ($0.002), home lists
  only held tokens, Exit on ShowQR, in-app announcements.
- **Two Circle doc lies found live (both fixed):** the transactions LIST omits `refId` (only GET /transactions/{id}
  has it) - the send tracker never confirmed anything since 09-27 (hotfixed to testnet same day); GET /v1/w3s/user
  returns the user at `data.id`, not `data.user.id`.
- **Pages `ezwallet-mainnet`** (repo main, previews off): NETWORK/VITE_NETWORK=mainnet, API_KEY=LIVE key,
  AUTH_SECRET=EZWALLET_MAINNET_AUTH_SECRET, KIT_KEY live, RESEND. KV `EZ_SYNC_MAINNET` (d591e211…) bound as EZ_SYNC;
  also bound to the admin as EZ_SYNC_MAINNET. /api/health mainnet OK.
- ⚠️ The public mainnet RPC rate-limits: the first /api/health failed ("rate limit exceeded", then 3/3 OK). Health
  fails closed → a user may see "Sending is paused" and succeed on retry. Watch it; a paid RPC may be needed.
- Next: owner tests with ≤ $1 on ezwallet-mainnet.pages.dev (create wallet + mail, receive, send, PIN change + mail,
  forgot PIN + mail) → only then, with the owner's explicit OK, move ezwallet.cash + www from the old Pages project
  `ezwallet` (old testnet build + redirect script) to `ezwallet-mainnet`.

## ▶▶▶ 2026-09-29 - ADMIN FIRST, then mainnet v1

- **Owner decisions:** plan A (finish ALL of phase 2 before ezwallet.cash moves; it still serves the old testnet build
  from Pages project `ezwallet` + a redirect script to testnet). **Testnet must be IDENTICAL to mainnet** - never add
  testnet-only features/labels; differences live only in `src/network.js` (chain, App ID, addresses, faucet). So:
  plan item #8 (TESTNET label) is DROPPED; testnet gets swap OFF and no cirBTC like mainnet (not done yet - after
  admin). Temp-mail block (#6) = a free, bundled open-source domain list. Plan item #5 was already done (`send.js`
  rejects bad/non-checksummed addresses).
- **Admin `admin.ezwallet.cash`** - spec `admin/SPEC.md` (owner-approved v2). Code in `admin/` on branch `admin`.
  - Pages project `ezwallet-admin`, root dir `admin`, production branch `main` (merged 2026-09-29), previews off. Env: CIRCLE_TEST_API_KEY, CIRCLE_LIVE_API_KEY, RESEND_API_KEY (secrets), ADMIN_EMAIL,
    ACCESS_TEAM_DOMAIN `plain-fog-e653.cloudflareaccess.com`, ACCESS_AUD. KV `EZ_ADMIN` (audit log).
  - Cloudflare Access app `ezwallet admin` (id 5f4f6774-…), one-time PIN only, policy = kattyfury1403@gmail.com.
    Code re-verifies the Access JWT on every request (`admin/functions/_access.js`) → `*.pages.dev` answers 403.
  - Done: health, stats, lookup (read-only), email ONE user (preview + confirm, logged). Verified 2026-09-29 on the
    owner's account: Circle returns wallets/transactions/balances by userId with the API key alone; transactions
    carry no amounts (amounts come from ArcScan); address → email reverse lookup is NOT possible.
  - Tabs: Health, Stats, Users (every email, owner request), Lookup, Announce, Mail, Log.
  - **In-app announcements DONE + owner-tested on a phone (2026-09-29), merged to `main` → live on testnet.**
    Broadcast only, ≤ 200 chars, no links. Admin writes KV `inbox:all` in the APP's KV (admin binding
    `EZ_SYNC_TESTNET` = testnet EZ_SYNC; `EZ_SYNC_MAINNET` to add at mainnet launch). App: `functions/api/inbox.js`
    + `src/inbox.js` (poll on open, then ≤ 1 per 5 min; each id shown once per account). Spec admin/SPEC.md §5.5.
  - Next: back to mainnet v1 - first "testnet = mainnet" (swap OFF + no cirBTC on testnet), then plan items.
  - Mainnet ArcScan API answers with a Cloudflare challenge page to curl - lookup on mainnet may show no transfers.
- Cloudflare: ONE master token now (`CF_API_TOKEN` in the central secrets file, id 151b0875…) with Pages, Workers,
  KV, Access, DNS, Single Redirect. The old token (7d9d445c…) is to be deleted by the owner.

## ▶▶ LATEST (2026-09-27, later session) - supersedes the section below where they disagree

- **B1 RESOLVED - Circle PIN wallets work on Arc mainnet.** Circle's live supported-blockchains page now lists
  `Arc (ARC / ARC-TESTNET)`, user-controlled EOA + SCA (the Circle docs MCP index was stale - always fetch the live
  page). Confirmed with the owner's LIVE key: `POST /v1/w3s/user/initialize` `blockchains:["ARC"]` → 201 + challengeId
  (control: a made-up chain → 400 code 156027). A probe user `ezwallet-probe-20260927` exists on the live account.
- **Mainnet App ID:** `5ffb6dbb-ea01-5758-8780-2eb6b8cb2996` (testnet: `518fec6a-4680-5175-9de6-0810fb3dfd04`,
  still hard-coded in `circle.js`, `Login.jsx`, `LoginEmailPopup.jsx` - must move into `src/network.js`).
- **Kit key is one key for testnet AND mainnet** (developers.circle.com/w3s/keys). Still open for swap later:
  `@circle-fin/adapter-circle-wallets@1.8.0` maps only `'ARC-TESTNET'`.
- **Secrets now live in ONE file outside every repo:** `D:\Files\Claude\.secrets\keys.env`
  (`CIRCLE_LIVE_API_KEY`, `CIRCLE_LIVE_APP_ID`, `CIRCLE_TEST_API_KEY`, `CIRCLE_KIT_KEY`, `CF_*`, `RESEND_API_KEY`,
  `EZWALLET_TESTNET_AUTH_SECRET`, `EZWALLET_MAINNET_AUTH_SECRET`). The old per-repo `.env.txt` are kept as backup.
- **Owner decisions:**
  1. **Mainnet v1 = Send/Receive only.** Swap stays OFF on mainnet (C5/H2, paid RPC and the adapter question are
     deferred to v1.1). "Build slowly."
  2. **ONE repo:** this repo (`KattyFury/ezwallet`) serves both networks via `VITE_NETWORK`/`NETWORK`;
     `KattyFury/ezwallet-testnet` will be ARCHIVED (not deleted) once testnet.ezwallet.cash deploys from here.
- **Testnet `main` now has the email sign-in code (C1)** - merged + live 2026-09-27 (commit `f60b1b9` in the testnet
  repo; `/api/session` without an auth token → `AUTH_REQUIRED`). Port it FROM the testnet repo `main`, not `wip/otp`.
- **DONE later the same day (phase 1 of the owner-approved plan, spec = `MAINNET-V1-PLAN.md`, owner-approved with Claude Chat):**
  - C1 email code brought over (`bc80527`); `src/`, `functions/`, `test/` were then byte-identical to the testnet repo.
  - `src/network.js`: `circleAppId` per network, mainnet `circleBlockchain: 'ARC'`, `swap` flag (mainnet false →
    `/api/swap` 503). App ID no longer hard-coded (`23c5ee4`).
  - **New Pages project `ezwallet-test`** (repo `KattyFury/ezwallet`, branch `main`, NETWORK/VITE_NETWORK=testnet,
    SAME testnet API key / KIT_KEY / AUTH_SECRET / RESEND key / KV `EZ_SYNC` as the old project, so testers stay
    signed in). **testnet.ezwallet.cash now serves from it** (domain moved + CNAME → `ezwallet-test.pages.dev`,
    owner-approved and owner-verified on a phone: same wallet, balance, history).
  - Full testnet-repo history kept HERE as tags: `archive/testnet-main` (558 commits since 2026-06-16),
    `archive/testnet-privy`, `archive/testnet-feature-otp`, `archive/feature-*`. Its `.env.txt` keys are in the
    central secrets file (`EZWALLET_TELEGRAM_*`, `EZWALLET_PRIVY_*`).
  - **`KattyFury/ezwallet-testnet` repo and its local folder DELETED by the owner (2026-09-27). THIS is the only
    ezwallet repo now.** (One public fork of the old repo exists on someone else's account - not ours to delete.)
    The old Pages project `ezwallet-testnet` (no domains any more) is left for the owner to delete in the dashboard
    - never touch `ezwallet-test`, it serves testnet.ezwallet.cash.
  - Next: phase 2 (mainnet v1 work, `MAINNET-V1-PLAN.md`) - ask the owner before starting.
- **Plan, in order (ask the owner before each step):**
  1. Bring the testnet repo's post-fork code (C1 email code) into this repo; per-network flags in `src/network.js`
     (App ID, swap on/off, cirBTC, faucet); set mainnet `circleBlockchain: 'ARC'`.
  2. New Pages project for TESTNET built from this repo (`NETWORK`/`VITE_NETWORK=testnet`), move
     testnet.ezwallet.cash to it, verify testers see the same wallets; then archive the testnet repo.
  3. Mainnet v1 work (spec: `MAINNET-V1-PLAN.md`) → Pages project for mainnet →
     tiny-amount tests (≤ $1) → ezwallet.cash.

## ▶ WHERE WE ARE (end of session 2026-09-27) - read this first

- ~~**Mainnet is BLOCKED by Circle (MAINNET-AUDIT.md B1)**~~ - resolved, see LATEST above.
- `main` here has the audit fixes C2, H1/H6, C3/C4 (the same code now runs on testnet). Branch `wip/otp` holds an
  EARLY server-only copy of the email-code work (C1); the finished, tested version lives on the testnet repo's
  `feature/otp` branch (it adds a KV-read fix, the client popup step and the pasted-code fix) - port FROM there.
- Fee wallet confirmed by the owner: `0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6` (unchanged; no multisig needed -
  ezwallet deploys no contracts and holds no customer money).
- ~~Owner still to do for mainnet: Circle "Upgrade to Prod" (paid plan)~~ - WRONG (checked 2026-09-29): Circle
  Wallets is pay-as-you-go per Monthly Active Wallet, the first 1,000 MAW/month are free, billed in arrears - nothing
  to prepay. Gas is not billed by Circle either (EOA wallets, users pay their own gas; only Gas Station is invoiced).
  The LIVE key already works. Still open for swap (v1.1): a paid RPC with eth_simulateV1 for C5.
- No Pages project exists for this repo yet (`wrangler.toml` name `ezwallet-mainnet`).

## M0. READ `MAINNET-AUDIT.md` FIRST (2026-09-27)

Money-loss audit of this code against Arc Mainnet: 5 critical items (no email verification, testnet addresses
that silently "succeed" on mainnet, double payment after a network drop, receipts without on-chain checks, the
swap server trusting the intent blindly) plus high/hardening items, with verified mainnet addresses and the
proposed order of work. Nothing in it is fixed yet.

## M0b. Progress on the audit (2026-09-27)

- ✅ **C2 done - one network config.** `src/network.js` holds every chain id/RPC/explorer/token/contract per
  network (values verified live). Client picks it with `VITE_NETWORK` (`.env.development`/`.env.mock` = testnet,
  `.env.production` = mainnet), functions with the runtime env `NETWORK` (no default → 503). `/api/health`
  checks chainId + contract code at every address; `SendConfirm`/`Swap` call `assertNetworkReady()` and refuse
  to create a challenge if it fails or the two sides disagree. Mainnet build: USDC+EURC only, label "Arc", no
  faucet (Deposit disabled), `circleBlockchain: null` → `/api/wallet` answers 503 until B1 is resolved.
- ✅ **H1/H6 done** - `src/money.js`: amounts are decimal strings end to end, `parseUnits` on the server, anything
  unclean is rejected (never rounded); keypad capped at token decimals; EIP-55 checksum on every address path.
  Tests: `test/money.test.mjs`.
- ✅ **C3/C4 done** - `src/txTracker.js`: every Send/Swap carries a `refId` (a UUID the server passes to Circle's
  contractExecution); after the PIN - and after any doubtful error - `/api/wallet` `txByRef` lists the wallet's
  recent transactions and the app waits for the REAL state. Receipt / "Swapped … (complete)" only on `COMPLETE`;
  `FAILED/DENIED/CANCELLED` → "nothing left your wallet", retry allowed; not final / could not ask → blocked
  ("Check again"), persisted per account (`ez_pending_tx_<addr>`) so no new payment starts until it resolves.
  Mock rehearsal: `localStorage.ez_mock_tx_state = COMPLETE | FAILED | SENT`. Verified: each scenario issues exactly
  one send. Open UI point: Swap shows its long "still being confirmed" warning inside the button (existing pattern).
- ⏳ Next (needs owner input): C1 (6-digit email code - needs a mail provider + sender domain), C5/H2 (swap intent
  validation + simulation via a paid RPC + quote/slippage), H3 (QR amount/token UX), H4 (testnet labelling), H5
  (new fee wallet address). Circle API facts for C3 are verified: contractExecution accepts `refId`;
  `GET /v1/w3s/transactions` (X-User-Token, filters walletIds/from/operation) returns refId/state/txHash.
- "Email OTP" wording: Circle's Email-OTP **auth mode** removes the PIN (never use it). C1's fix is different -
  OUR server emails a 6-digit code before asking Circle for a token; Circle still sees `userId=email` + PIN.

## M1. Before building anything (from MAINNET-SPEC "Việc cần xác nhận")

1. Does LI.FI (under Circle's Stablecoin Kit) support Arc Mainnet yet? If not, find another swap route.
2. Arc Mainnet addresses (Swap Adapter, TokenMessenger, Memo, Multicall3From, USDC/EURC) - from docs.arc.io,
   never copied from testnet (except USDC per the spec).
3. Does the Circle Wallets adapter / W3S fully support the Arc mainnet chain code?
Then plan the port with the user (spec rules: multi-sig deploys, ERC-20 6-decimals everywhere, no cirBTC /
sub-apps / CCTP / Gateway in v1, 24h lock after PIN reset, gas shown in USDC before confirming, a
"checking" state instead of "failed" when the network drops mid-send).

## M2. Deployment - nothing exists yet

- **No Cloudflare Pages project for mainnet yet.** Create `ezwallet-mainnet` (GitHub source = this repo) when
  there is something to deploy. ⚠️ The existing project `ezwallet` belongs to the TESTNET repo (it tracks
  it by repo id; the dashboard still shows the old name `KattyFury/ezwallet` - do not reconnect it here).
- **Domain:** `ezwallet.cash` + `www` are still attached to the testnet project, and the testnet build's
  `index.html` redirects them to `testnet.ezwallet.cash`. To give the apex to mainnet: detach both from
  project `ezwallet`, attach them to `ezwallet-mainnet`, then delete the redirect script in the TESTNET repo.
- Secrets: `.env.txt` was copied locally from the testnet folder (gitignored, never commit it). It holds the
  Cloudflare API token plus the TESTNET Circle keys - mainnet needs its own Circle app/keys.
- `src/chain.js`, `src/qr.js` (`ARC_CHAIN_ID`), token/contract tables below are all still TESTNET values.

---

## Inherited from ezwallet-testnet (describes this code as it is today)


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
- **Pages ↔ GitHub link - ⚠️ CORRECTED 2026-09-27:** the project is triggered by repo **id** (`1271272056` =
  `ezwallet-testnet`) but CLONES by the stored **name** `KattyFury/ezwallet` - which became the new MAINNET repo.
  Since then every testnet deploy fails at `clone_repo` (the commits are not in that repo); the live site kept
  serving the last good build (`00885e8`). The earlier note "do not reconnect" was WRONG. Fix = in the Cloudflare
  dashboard, Workers & Pages → ezwallet → Settings → Build → Git repository → reconnect to
  `KattyFury/ezwallet-testnet` (the API ignores `repo_name` changes).
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
Google login and Circle's Email-OTP auth mode are hidden: Circle only allows a PIN with the plain `userId=email`
flow, so CIRCLE's OTP would mean losing the PIN - **never turn Circle's Email OTP on**. (A verification code sent by
OUR server before asking Circle for a token is a different thing and keeps the PIN - see MAINNET-AUDIT C1.) Sending to your own wallet is blocked in
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
