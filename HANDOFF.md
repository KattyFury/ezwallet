# HANDOFF – ezwallet

**Updated:** 2026-10-03 (Deposit/Withdraw popups, audit + docs refresh) · **Repo:** `KattyFury/ezwallet` (the ONLY ezwallet repo) · **Local:** `D:\Files\Claude\Big projects\ezwallet`
**Status: ezwallet.cash SERVES MAINNET (since 2026-10-01). Owner is testing mainnet and reporting bugs one by one.
TARGET: public mainnet launch within October 2026.**

> **Start of every session:** read `CLAUDE.md`, this file (the ▶▶▶▶▶ section first), then `git pull`.
> **Before any fix:** official docs first, no blind building - the verified sources are listed in the Claude
> memory file `arc-circle-mainnet-official-docs.md` (Circle OpenAPI + `.md` pages via `developers.circle.com/llms.txt`,
> Arc docs via `docs.arc.io/llms.txt` / the arc-docs MCP). Cite the doc line or a live measurement for every change.

### Workflow until launch
1. The owner tests on https://ezwallet.cash with an email NEVER used on testnet (see Bug 1) and reports bugs.
2. For each bug: reproduce/measure (read-only first), find the rule in the official docs, then offer options -
   the owner picks before any code.
3. **⚠️ UNTIL PUBLIC LAUNCH (owner, 2026-10-03): every change goes to BOTH `test` and `main`** - commit on `test`,
   then `git checkout main && git merge --ff-only test`, push both. The flow below applies again after launch.
   **Where code goes (since 2026-10-02):** new features → branch `test` → owner tries them on
   **test.ezwallet.cash** → merge `test` into `main` → ezwallet.cash. Small bug fixes the owner asks for directly
   may still go straight to `main` (then fast-forward `test`: `git merge --ff-only main`). Keep `test` = `main` +
   whatever is being tried; never let it drift for long.
4. There is NO testnet any more (see the 2026-10-02 section below).

### Known open mainnet bugs (2026-10-01)
| # | Bug | State |
|---|---|---|
| 1 | Emails already used on testnet cannot sign in on mainnet: LIVE POST /users → 409/155101, then /users/token → 404/155102 (captured 2026-10-01 07:29 UTC, request IDs b3507b6e… / 2ef9cf2b…; `2a8fe7b` logs them on every such failure) | Circle-side; support's 1st answer was generic ("envs are separate") → follow-up with the request IDs sent; workaround = new email |
| 2 | The public Arc RPC (itself behind Cloudflare) rate-limits **Cloudflare Functions** (eth_chainId passes, the next call fails; a PC passes 30/30) → /api/health failed → sending paused | FIXED `7e5fdb4` - the chain self-check runs in the browser; /api/health only reports the network. Waiting for the owner's phone test |
| 3 | `explorer.arc.io/api` answers a Cloudflare bot challenge → history / "money received" broken | FIXED `7e5fdb4` - Circle's tx list (`/api/wallet` 'history') + each receipt read in the browser (USDC from system emitter `0xffff…fffe`). Verified on the owner's testnet wallet = same rows as the explorer. Waiting for the owner's phone test. eth_getLogs was rejected: 10k blocks per call → ~1,700 calls for a June wallet |
| 3b | Admin Lookup "Transfers" + balances still use the explorer / RPC FROM CLOUDFLARE → fail on mainnet | Open, owner-only tool - Circle tx states still show |
| 4 | Testnet RPC differed from the docs | CLOSED 2026-10-02 - testnet removed |
| 5 | CSP blocks Cloudflare's injected `static.cloudflareinsights.com` beacon (console noise, harmless) | Open, low - turn Web Analytics off or allow it |
| 6 | Circle PIN window on ezwallet.cash - is the domain needed in the Circle Console? | Unchecked |
> Specs: `MAINNET-V1-PLAN.md` (mainnet v1, owner-approved), `admin/SPEC.md` (admin). Older: `MAINNET-SPEC.md`,
> `MAINNET-AUDIT.md`. Secrets: `D:\Files\Claude\.secrets\keys.env` (never in the repo).

## 2026-10-03 - Contacts: name one size smaller; prices + test icon now on main too
- Contacts list name `--fs-h2` (22) → `--fs-content-1` (19) (owner request). The "Send" text pill on each row
  became a 44px round blue button with Lucide `Send` (paper plane, new `send` icon in Icon.jsx) - owner: too wide.
- **Standard button height 48 (≈ 2/3 of the 70px row) → `--btn-h` = 70 × 5/6 = 58.33px** (owner). One variable in
  `:root`; `.btn` + every inline 48px button (Home Paste/Contacts/Copy/Share, About/Security Done, Login email popup
  Back/Continue, Deposit/Withdraw, Swap) use it. Buttons centred on row 9 stay centred (top = 85.665dvh − btn-h/2).
  The 48px address FIELD in FundsPopup is an input, not a button - unchanged.
- **TYPE SCALE (owner-approved 2026-10-03), smallest allowed = 14px.** All 58 literal font sizes now use `--fs-*`
  tokens in `src/index.css` :root (52/48/40/28/26/24 title/24 num/22/19/17/15/14). Folded: 18+20→19, 16→17,
  13 (notification area)+11 (token-icon fallback)→14, the 2 popup titles 24→22 (Deposit/Withdraw, email login).
  Screen titles (.sheet-title) stay 24 (`--fs-title`). Auto-fit amounts keep their own range (44→18, balance 40→24).
  **`test/fontScale.test.mjs` fails on any literal font size or a token under 14** - add a token, never a number.
- **Same day, owner: every font size is a MULTIPLE OF 2** (layout = multiples of 8, but 8-steps make text too big →
  text uses 2). 19/17/15 rounded UP → content-1 20, content-2 18, caption 16 (+ their --is-* icon pairs). Home action
  tiles (Paste/Contacts/Copy/Share) 14 → 16. 14 = notification area + small hints only. The test also fails on an odd size.
- **Icon inside a button next to its label = 1.2 × the label size** (owner, "thử xem sao"): tokens `--ib-content-1/
  -content-2/-caption` in :root. Applied: Home tiles (Paste/Contacts/QR storage/Share 19.7→19.2, Scan QR/Create QR
  27→24), Menu Withdraw/Deposit 27→24, Menu row icons 18→24 (incl. Sign out), ShowQR Share, Swap success check.
  NOT applied to chevrons/carets (Menu ›, About ›, Security ⌄) - direction marks, not pictures.
- Menu Withdraw/Deposit icons: plain ↑/↓ (same as NavBar Send/Receive → confusing) → Lucide ArrowUpFromLine /
  ArrowDownToLine (`withdraw`/`deposit` in Icon.jsx) - owner picked option B of 5 shown.
- **USDC fee reserve 0.1 → 0.01** (`GAS_RESERVE_USDC`, src/data.js; owner). Measured on mainnet 2026-10-03: base fee
  20 Gwei (floor), send ~65k gas / memo ~110k → fee ~0.0013-0.0022, max-fee cover ~0.0026-0.0044 → 2x headroom.
  The Home "Out of USDC for transaction fees" warning now fires under GAS_RESERVE_USDC (was a hardcoded < 1). All of today's `test` work (prices,
  test-only apple icon) merged to `main` - `COINGECKO_API` secret was added by the owner to BOTH Pages projects.

## 2026-10-03 - Prices via /api/prices (option C) + test.ezwallet.cash opened to the public (on `test`)
- **Owner decision: option C** - CoinGecko primary (Demo key, env `COINGECKO_API`), Binance backup + cross-check.
  `functions/api/prices.js`: both fetched server-side, merged by `mergePrices` (agree within 2% → CoinGecko; only one
  answers → that one; >2% apart → last stored price held; none → stale stored price), cached 5 min in KV EZ_SYNC
  `prices:v1` for everyone. Binance = `data-api.binance.vision` (USDT pairs ÷ USDCUSDT). cirBTC = BTC price. ETH is
  returned too (price only, no ETH token in the wallet). The browser no longer calls CoinGecko (removed from CSP).
  Response field `up` shows which source answered; `src` per symbol shows which one was used. Tests: `test/prices.test.mjs`.
- Measured from Cloudflare 2026-10-03: CoinGecko keyless → 403 "add a descriptive User-Agent" (fixed: UA header);
  Binance `data-api.binance.vision` → 403 nginx, so the function falls through api.binance.com / api-gcp / api1 / api4.
  After the fixes test.ezwallet.cash/api/prices = `up: {coingecko: true, binance: true}`, all 3 prices within 0.5%.
- **TODO (owner):** add `COINGECKO_API` (secret) to Pages `ezwallet-test` and, before merging to main, `ezwallet-mainnet`
  - Claude's auto mode refused to write secrets to Cloudflare. Without it CoinGecko is called keyless (shared IP limit).
- **test.ezwallet.cash is PUBLIC since 2026-10-03** (owner: "ai truy cập cũng được"): the Access policy "invited
  testers" on app e2094640… was changed to Bypass / Everyone (not deleted - change it back to Allow + email to re-lock).
  It is still MAINNET with real money.

## 2026-10-03 - test.ezwallet.cash has its own apple-touch-icon (owner request)
- Builds with `CF_PAGES_BRANCH=test` (Pages `ezwallet-test`) swap the apple-touch-icon to `public/icon-test.png`
  (blue tile, white mark; source `design/logo-pfp-test.svg` = `logo-pfp.svg` with colours inverted). Done in a small
  plugin in `vite.config.js`, so `main` builds keep `icon.png` even after `test` is merged. Favicon/manifest unchanged.
  iOS caches home-screen icons: remove the old shortcut and add it again to see the new one.

## ▶▶▶▶▶▶▶▶ 2026-10-03 - Deposit / Withdraw, link preview, audit + docs (LIVE on main + test since 2026-10-03)

- **Fiat on/off-ramp DROPPED (owner 2026-10-03):** Arc's Onramp Kit (`@circle-fin/onramp-kit`, Transak behind it)
  only enables card / Apple Pay / Google Pay after a business KYB in Circle Console - the owner has no company.
  Circle has no consumer off-ramp at all (Mint / CPN / DAA are B2B). `MAINNET-SPEC.md` "on/off-ramp out of scope" stands.
- **Menu → Withdraw / Deposit are enabled** and open `src/components/FundsPopup.jsx` over the Menu (Menu blurs, like
  Login + LoginEmailPopup). Card = same top edge / left / width as the login email card (10.19dvh, 6.41%, 87.18%),
  height follows the content. X top-right or a tap outside closes it.
  - Deposit: the full wallet address + copy, note "Send USDC on the Arc network... another network will not arrive".
  - Withdraw: address + Paste, amount (left half) + token button (right half, tap = next held token), "Current
    balance", validation (EIP-55 address, not own wallet, decimals, <= balance), Continue → the existing
    `SendConfirm` (fee, PIN, tracker, receipt) with `memo: ''`. SendConfirm's Back goes to SendAmount (its usual target).
- **AddToHome:** "Skip →" 16→18px, semibold, `nowrap` (the bigger text wrapped the arrow onto a second line).
- **Link preview:** `public/og.png` now uses the app's brand gradient (`src/brandBg.js`, white → `#0B53BF`) instead of
  solid blue (owner: "solid xấu"); text black/brand like the Login screen. Rebuilt by **`tools/build-og.mjs`** (needs
  `npm run mock`), `og.png?v=6`. Telegram refresh: send the link to @WebpageBot.
- **Audit (2026-10-03):** tests 40/40, build OK. Cleaned: `arcTestnet` → `arc` (internal to `src/chain.js`), stale
  "testnet" comments. Deliberately NOT removed (see §11): VND helpers, `sound.js`, Google-login plumbing, Swap.
- **Docs refreshed:** README (mainnet badges, Deposit/Withdraw, env table, new `docs/app-*.png`, `app-swap.png`
  deleted), SECURITY.md (mainnet, email-code sign-in), `.env.example` (AUTH_SECRET, RESEND_API_KEY, EZ_SYNC).
  Old dated sections of this file (09-27 → 09-29) moved to `HANDOFF-LOG.md`.
- Merged `test` → `main` 2026-10-03 (owner: "merge"), og.png?v=6 verified live on ezwallet.cash.

## ▶▶▶▶▶▶▶ 2026-10-02 - TESTNET REMOVED; test.ezwallet.cash = mainnet staging (owner decision)

Owner: "ezwallet.cash là mainnet, test.ezwallet.cash là mainnet nhưng dùng để test tính năng trước khi public,
không muốn repo riêng hay testnet riêng nữa". Picked: separate data, invite-only, testnet domain OFF, testnet code deleted.

| | ezwallet.cash | test.ezwallet.cash |
|---|---|---|
| Pages project | `ezwallet-mainnet` (branch `main`) | `ezwallet-test` (production branch **`test`**, previews off) |
| Network / Circle | mainnet, LIVE key | mainnet, LIVE key - **same Circle users, same wallets, REAL money** |
| KV `EZ_SYNC` | `EZ_SYNC_MAINNET` d591e211… | **`EZ_SYNC_STAGING` ca7c7eb8…** (contacts/QR start empty) |
| AUTH_SECRET | its own | its own (`EZWALLET_STAGING_AUTH_SECRET` in keys.env) - sessions do not cross |
| Access | public | PUBLIC since 2026-10-03 (policy switched to Bypass/Everyone). Was: Cloudflare Access app `ezwallet test (mainnet staging)` e2094640… - policy "invited testers" = owner email only; covers test.ezwallet.cash + ezwallet-test.pages.dev + *.ezwallet-test.pages.dev. Add testers = add emails to that policy. `/api/health` has a Bypass app so the admin Health page can read it |

- **testnet.ezwallet.cash is GONE** (DNS + Pages domain removed). Old testnet KV `EZ_SYNC` 5aec627d… was kept, unbound.
  Old Pages projects `ezwallet` / `ezwallet-testnet` (if still there) are unused.
- **Code `10062ce`:** testnet block out of `src/network.js` (values recoverable from git history), faucet list /
  "Faucet successful" / faucet link removed, Deposit stays in place disabled, CSP mainnet-only, local dev + mock =
  mainnet. **Admin:** the switch is now `test | mainnet` (both mainnet + LIVE key; `test` only changes the health
  site and the announcement KV `EZ_SYNC_TEST`). Admin env: `CIRCLE_TEST_API_KEY` + `EZ_SYNC_TESTNET` removed.
- Cloudflare still creates a queued "preview" on `ezwallet-mainnet`/`ezwallet-admin` for every push to `test` (and on
  `ezwallet-test` for pushes to `main`) even with previews off - they never build; cancel them if they bother you.
  Watch PRODUCTION deployments only (`per_page=1` can show one of these instead).
- **Not checked yet:** Circle PIN window on test.ezwallet.cash (open bug 6 - allowed domains in Circle Console?),
  and the PWA install on test (the manifest request goes through Access).
- `MAINNET-V1-PLAN.md` and the older sections below still talk about testnet - historical. (README fixed 2026-10-03.)

## ▶▶▶▶▶▶ 2026-10-02 - small owner requests (both live on ezwallet.cash + testnet)

- **Add to Home Screen: Skip now snoozes for 2 days** (owner: "ấn skip chỉ ẩn 2 ngày thôi"; was permanent).
  `ez_a2hs_done` now stores the Skip time (ms); `A2HS_SNOOZE_MS` in `src/boot.js`. Old value `'1'` counts as
  expired, so everyone who skipped before sees the screen once more. Commit `14df158`.
- **Link preview (X/Telegram) refreshed for mainnet v1** - commits `7b3e169`, `55ecfc7`:
  - `public/og.png` rebuilt: same template as 2026-09-11 (solid `#0B53BF`, white `design/logo.svg`, slogan),
    pills "Live on Arc Mainnet" + "Open source · MIT", phone = a fresh HomeSend screenshot from
    `VITE_NETWORK=mainnet npm run mock` at 390x844 @3x (USDC + EURC only).
  - ⚠️ The phone frame MUST have the screenshot's exact ratio (270 x 584.3 for 390x844) and NO border - the
    first rebuild had a 6px white border + wrong ratio and the owner saw white bands top/bottom.
  - `og:description` / `twitter:description` / `description` / manifest: Send/Receive USDC + EURC, email +
    6-digit PIN, fees in USDC, Arc Mainnet. NO swap, NO testnet, NO cirBTC in the copy until they ship.
  - `og:image` is now `og.png?v=5` - bump it on the next image change (X/Telegram cache by URL).
    Telegram refresh: send the link to @WebpageBot. X: no manual refresh tool; post `?v=N` on the page URL.
- ~~README stale~~ - refreshed 2026-10-03 (mainnet badges, new screenshots).

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

## Map (one repo, three Cloudflare Pages projects)

| Site | Pages project | Branch | Notes |
|---|---|---|---|
| ezwallet.cash + www + ezwallet-mainnet.pages.dev | `ezwallet-mainnet` | `main` | mainnet, LIVE Circle key (`LIVE_API_KEY:18394…`), KV `EZ_SYNC_MAINNET`, previews off |
| test.ezwallet.cash | `ezwallet-test` | `test` | SAME mainnet + LIVE key (real money), KV `EZ_SYNC_STAGING`, behind Cloudflare Access (invited emails) |
| admin.ezwallet.cash | `ezwallet-admin` (root dir `admin/`) | `main` | behind Cloudflare Access (owner email only) + own JWT check |
| (no domain) | `ezwallet`, `ezwallet-testnet` (OLD) | - | old testnet builds - the owner can delete them |

## Open items (owner)

1. Test mainnet on ezwallet.cash with a new email and report bugs (target: launch within October 2026).
2. ~~Move ezwallet.cash + www to `ezwallet-mainnet`~~ DONE 2026-10-01. Old Pages project `ezwallet` can be deleted.
2b. Send `CIRCLE-SUPPORT-REPORT.md` (Desktop) to Circle support (Bug 1).
3. Delete the old Cloudflare token (id 7d9d445c…) - the master token (151b0875…) replaces it.
4. Delete the old Pages project `ezwallet-testnet` (no domains) in the dashboard.
5. Branches `admin`, `mainnet-v1`, `merge-testnet` are fully merged into `main` - safe to delete when the owner agrees.

> Older dated sections (2026-09-27 → 2026-09-29: the fork, audit progress, mainnet v1 build) are in
> `HANDOFF-LOG.md` → "MOVED 2026-10-03".

---

## 1. Open items (not built - ask before starting any of them)

| Item | State |
|---|---|
| **Success sound** | `src/sound.js` is written but NOT wired. Decisions already made (do not re-ask): play after a send (SendReceipt) and after a swap; Web Audio C6→E6 ~0.3s; ON by default (`ez_sound`); needs an off switch in Security & Region; `unlockOnFirstTouch()` once in `App.jsx` (iOS needs a gesture); `playSuccess()` must fail silently. Test the iOS silent switch on a real device. |
| **Received-money notifications only poll on Send/Receive** | Moving polling into `App.jsx` would announce money on every screen - touches architecture, needs the user's OK. |
| **Network label on the Receive screen** | Shared QR images already say "Only Arc"; the screen itself does not. Where it goes is the user's layout call. |
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
  lazy-loaded - `await getSDK()` everywhere). Sign-in = OUR 6-digit email code (`/api/auth`) → `/api/session`.
- **Chain:** Arc **Mainnet** only. Everything network-specific lives in **`src/network.js`** (chainId `5042`,
  RPC `https://rpc.mainnet.arc.io`, explorer `explorer.arc.io`, Circle App ID `5ffb6dbb…`, token + contract
  addresses). Nothing else may hardcode a chain value. Official sources: Claude memory `arc-circle-mainnet-official-docs.md`.
- **Reads:** viem + Multicall3 (1 request for all balances) · CoinGecko prices (60s cache). The RPC is called
  from the BROWSER only - it rate-limits Cloudflare Functions (Bug 2). History = Circle's tx list + receipts (Bug 3).
  **Swap:** off on mainnet (`NET.swap`), code kept (§6). **QR:** `qrcode.react` + `jsqr`.
- **Cloudflare access for Claude:** `CF_API_TOKEN` in `D:\Files\Claude\.secrets\keys.env` (NEVER print or commit).
  Pages + DNS + Access via the REST API (`Authorization: Bearer`). Secret env vars read back without a `value` -
  that is encryption, not empty. Pages applies new env vars only to NEW deployments.
- **Secrets** (Pages dashboard, `.env.txt` locally): `API_KEY` (LIVE), `AUTH_SECRET`, `RESEND_API_KEY`, `KIT_KEY`.
  KV binding `EZ_SYNC`. See `.env.example`.
- **Local dev (Windows):** `node dev-server.js` (API on 8787) + `npm run dev` (5173). Not `wrangler pages dev`.
  The Circle SDK does not run on localhost → PIN/login only testable on a deploy (test.ezwallet.cash).
- **Mock mode:** `npm run mock` - fake wallet/balances/history, skips Login/PIN, never reaches production.
  Playwright (not in package.json): `npm i --no-save playwright && npx playwright install chromium`.
  `tools/build-og.mjs` (link preview) and `tools/figma-check.mjs` use it.
- **CI:** `.github/workflows/ci.yml` runs `npm test` + `npm run build` on pushes to `main` and on PRs.
- **KV backup of contacts + QR library:** `functions/api/sync.js` + `src/sync.js`, binding `EZ_SYNC`.
  localStorage is the source of truth; newest edit wins (`ez_sync_at_<addr>`); auth = a PIN signature over a
  nonce (session token in `sessionStorage.ez_sync_token`); avatars never leave the device. Tests:
  `test/sync.test.mjs`.

---

## 4. Money & display model

- Tokens always show their real name (USDC/EURC/cirBTC). The display currency (`ez_currency` ∈ USDC/EURC →
  `$`/`€`) is a conversion layer over USD rates, USDC pinned to $1. Send takes input in "USD" = USDC 1:1.
- One string, one style: `fmtMoney()` → `$2` / `€2` / `2 USDC`.
- Gas reserve: 1 USDC is always held back from "available".
- **English + USD/EUR only.** The i18n layer was deleted 2026-08-25. The VND plumbing in `chain.js`/`qr.js`/
  `amountHint.js`/`data.js` is deliberately left in place but unreachable - leave it.

## 5. Features (working, verified on a deploy)

Email login (6-digit code) → wallet (PIN + security questions) · PinGate unlock on reopen · send USDC/EURC (Memo
contract when there is a note) · Menu Deposit (address) / Withdraw (send to an Arc address) · receive (QR + address) · QR create/scan/library · contacts (per account,
avatar cropper) · history (grouped by day, swaps as 2 rows, self-sends labelled) · swap (OFF on mainnet; Exchange shows "Coming soon") · in-app notifications · receipts (canvas → Photos via Web Share) · change PIN · KV backup.
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
- chainId formats: W3S `ARC` (mainnet), Stablecoin Kit `Arc`.
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

`src/qr.js` is the single source: `ezwallet:0xABC…@5042[?amount=25&cur=USD]` (chain = `NET.chainId`). EIP-681 is deliberately not
used (wallets ignore its chainId). `parseQR` accepts the standard form, the old form without `@chain`, and a
bare `0x…` (to pay outsiders); another chain returns `{ wrongChain }` (no `.address` - catch it first). The
address as TEXT (copy/share) stays bare on purpose.

## 9. Notifications

`NotifArea` polls Circle's tx list + receipts (`/api/wallet` history, NOT the explorer API): every 5s on Receive (someone is waiting), 15s on Send; skips while the tab is
hidden and polls immediately on return; `page=1&offset=20`. Silence on a money screen is a serious bug for
this audience - never optimise the polling away.

## 10. localStorage keys

Session: `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email`, `ez_notifs`,
`ez_last_recv_ts_<addr>`, `ez_notified_hashes_<addr>`; `sessionStorage.ez_pin_ok`,
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
