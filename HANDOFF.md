# HANDOFF – EZwallet

**Updated:** 2026-09-10 · **Local:** `D:\Files\Claude\ezwallet`

### ⚠️ READ THIS FIRST - REBUILDING SCREENS FROM FIGMA (23 done, 0 to go)

**Figma file: `GxgsMU6HAYqolckzvPWXp1`.** The user's position, stated directly on 2026-09-10:
*"toàn bộ thiết kế Figma đang chuẩn BRAND GUIDELINE chỉ có Claude là đang làm sai"* - the Figma file and
`BRAND-GUIDELINE.md` agree with each other. **When the code disagrees with them, the code is wrong.**
It took four rounds of user corrections to get 3 screens right. Everything below exists so the next 17
do not cost the same.

**⚠️⚠️ TWO SOURCES OF TRUTH ONLY: live Figma + `BRAND-GUIDELINE.md`. Nothing else.** Stated directly by
the user 2026-09-10 after a Send money round-trip cost three separate corrections: *"note vào handoff:
figma là nguồn sự thật, sửa thiết kế theo figma chứ không nửa figma nửa code cũ."* Concretely:
- Every measurement (position, size, gap, colour, icon) comes from a **fresh** `get_design_context` /
  `get_metadata` call on the node being built, not from memory of an earlier fetch, not from a sibling
  screen's "close enough" precedent, and not from whatever the pre-existing code already did. Re-verify
  the number, don't reuse it.
- A value **inherited from old code and never re-checked against this pull is a bug**, not a base to
  build on - even something as small as a leftover `margin` or a `flex` proportion. If you didn't
  personally verify a number against the current node, assume it's wrong.
- Borrowing a solution from a DIFFERENT screen (even one already verified correct) is still a fabrication
  if the current node's own export doesn't show it. Convenient precedent is not evidence.
- If Figma's raw export looks incomplete (no icon layer, a blank key, a missing colour) - it very often
  IS incomplete (flattened into a background image, an unexported detail) rather than "the design really
  has nothing there." When the user states directly what it should be, that instruction overrides an
  empty API response - it does not count as fabrication, the API export was the gap.
- **Two related, cautionary examples from the SAME session** (Send money, `1:88`, seventh round-trip):
  1. The "You send" card's chip/available-line/amount were positioned with flexbox
     (`justify-content:space-between`/`flex-end`) approximating the layout instead of each element's own
     measured `x/y` - it LOOKED right at a glance but landed 15-20px off Figma's real coordinates, which
     only `figma-check.mjs`'s pixel diff (not eyeballing) caught. Fixed by placing every child at its own
     absolute `%`/`dvh` coordinate, the same per-element method Confirm transaction/Receipt already used.
  2. The numpad's key height/gap and the token icon's shape were carried over from pre-Figma-rebuild code
     (a `flex:5.5` proportion, a real circular icon reused from `Swap.jsx`) instead of the current node's
     own numbers (fixed 48px keys/8px gap/27px to the CTA row; a flat 24px BLACK SQUARE, no real icon at
     all). Both looked defensible in isolation - neither was what the current Figma pull actually draws.

**Repo cleanup (2026-09-10):** `FIGMA-SCREENS-SPEC.md` and `SEND_MONEY_FIGMA_SPEC.md` are DELETED - both
were reading a *different, older* Figma file (`iQxFGA890VhyXkEKipCC9C`) than the one this whole rebuild
uses, both had already misled at least one build (Send money's now-corrected "it's a % slider" guess came
straight from the deleted spec doc), and per the two-sources rule above they were a competing, stale
third source that should never have existed alongside live Figma. `BRAND-GUIDELINE.md` stays - it is
verified byte-for-byte identical to the text literally embedded in the Figma file itself (node `1:419`),
so it counts as Figma, not a separate paper copy of it. Do not recreate a similar "spec digest" doc for
any future screen - read the live node instead, every time.

#### 1. THE GRID - this was the root cause of nearly every error

`BRAND-GUIDELINE.md` says *"Grid dọc: 10 hàng, spacing mỗi hàng 16px"* and *"Grid ngang: 12 cột, spacing
mỗi cột 8px"*. That gutter had **never been implemented**: `.screen` was `repeat(10, 1fr)` with no gap, so
rows were 844/10 = 84.4px. The real row height is **70px** (844 − 9×16 = 700, ÷10). Everything was
therefore up to ~14px out, and the fix was one line: `row-gap: 16px` on `.screen`.

| Row | y (of 844) | What lives there |
|---|---|---|
| 1 | 0–70 | the balance number |
| 2 | 86–156 | Withdraw/Deposit (Menu) |
| 2–5 | 86–414 | the token card (Send) / QR card (Receive) |
| 3–7 | 172–586 | the 5 Menu rows (centres 207/293/379/465/551) |
| 6–8 | 430–672 | the notification card |
| 9 | 688–758 | the action pill row (centre 723 = 85.66dvh) |
| 10 | 774–844 | the NavBar - exactly **70px**, not 84.4 |

Row N: `top = (N−1)×86`, `bottom = top + 70`. Horizontally: column = (390 − 11×8)/12 = **25.167px**, so
cols 2–11 = x 33.17–356.83 = the **324px white cards**, and the same span including its outer gutters =
x 25.17–364.83 = the **340px grey boxes** = an inset of **6.45%**. Convert with `x/390 → %`,
`y/844 → dvh`. **If a Figma measurement does not land on this grid, suspect your reading of the grid -
do not start nudging individual elements.**

**THE HEADER RULE (user, 2026-09-10, stated directly - applies to every screen title app-wide):** the
title sits in row 1 (its own 70px box), size **28**, horizontally **centred**, vertically anchored to the
**bottom** of that row - not centred, not a raw pixel offset guessed from a screenshot. The single shared
definition is `.screen-title` in `index.css` (`font-size:28; align-items:flex-end`, riding on `.center`
for `display:flex` + horizontal centring by CSS source order); every screen title uses
`className="row-1 center screen-title"` with NO inline `fontSize` - the class is the only place this
value lives. **Never fix a title with one-off absolute positioning per screen** (ServiceHub/Exchange did
this on the first pass and had to be converted back) - route it through this class instead.

#### 2. The five mistakes - what made each one possible

1. **Trusting the MCP node list over the rendered image.** `get_design_context` returns a structured node
   list, but anything flattened into the frame's background image is **absent from it** - the Menu divider
   lines and the navbar's white active cell were both invisible in the node list while being plainly
   visible in the render. Both were dropped, twice.
   → **The rendered PNG is ground truth. The node list only supplies coordinates.**
2. **Comparing by eye.** A balance rendering at 28px instead of 50px, a missing grey card behind the QR,
   and a 12px offset on the button row all survived several "looks right" screenshot reviews. They fell
   out in seconds under an overlay diff.
3. **Trusting stale docs in this repo.** §5/§6 below still described Barlow, gradients, `#F2F2F7`, and a
   "10 equal rows" grid. `FIGMA-SCREENS-SPEC.md` §1 asserted 84.4px rows. Those documents were written
   against older Figma files and actively misled the work.
4. **Assuming a shape from its silhouette.** "Hold to show tokens" / "Tap to copy your address" are **half
   ovals**, not pills: measuring the white run row by row gives 183px wide at y=374 growing to 258px at
   y=412, then cut dead at y=414 - the grey box's bottom edge. They are 258×40 with a 38px radius on the
   **top corners only**, sitting inside the grey box so the box clips the lower half *and the shadow*.
   That clipping is the whole effect: shadow on the grey, nothing on the white page below.
5. **A CSS grid trap.** Placing an element at `grid-row: 2` while `BalanceHeader` already spans
   `grid-row: 1/3` makes CSS Grid insert an implicit second column and split every row's width - the Menu
   rows silently shrank to 133px and wrapped. Absolute positioning sidesteps it.

#### 3. The verification workflow - not optional

```bash
npm i --no-save playwright && npx playwright install chromium   # once
npm run mock                                                    # dev server, fake balances
node tools/figma-check.mjs HomeSend ref.png --probe 195,374 48,774
```
`tools/figma-check.mjs` renders the screen at 390×844, writes a 3-panel `app | difference | figma` image,
and prints RGB at any pixels you name. Get `ref.png` from the Figma MCP `get_screenshot` on the frame's
node id, then `curl` the URL it returns. **The middle panel finds drift; the probes prove it is gone.**
Glyph-edge ghosting is expected - the app renders the system font, Figma draws Inter.

Also useful: `?screen=<Name>` on any URL forces that screen (a QA override in `App.jsx`), so a screen can
be opened without walking the flow.

⚠️ **BUT: verifying one component proves NOTHING about what the user actually sees - CHECK THE ROUTING
FIRST.** `?screen=X` and a clean pixel diff only tell you that component X is correct *if it renders*.
On 2026-09-11 a "the logo is centred" report was answered with a pixel-perfect `figma-check` of
`Splash.jsx`, a byte-check of the live bundle and a real-browser measurement reading exactly 21.28% -
and the user was told their screenshot must be wrong. They were right: `ez_pin_ok` is in sessionStorage,
so `App.jsx` boots a returning wallet **straight into `PinGate`** and `Splash` is only reached on a fresh
login - the screen being measured was one the user essentially never sees, while the one they did see
(`PinGate`, with its own hand-rolled centred lockup) was never opened. **When a user's direct observation
conflicts with your measurement, assume you are measuring the wrong thing.** Read `App.jsx`'s boot logic,
find which component actually renders in their situation, and check *that*. Note also that mock mode
auto-unlocks, so `?screen=PinGate` will NOT show PinGate - it resolves and navigates to HomeSend.

#### 4. Where the rebuild stands

**Done (23) - ALL FRAMES BUILT:** Splash `1:169` · Login `1:180` · Sign in with email `1:193` · Send
`1:328` · Receive `1:373` · Menu `1:16` · Service hub `1:43` · Exchange `1:63` (= `Swap.jsx`) · LuckyPot
`1:158` · Paste address to send `1:205` · Confirm transaction `1:215` (= `SendConfirm.jsx`) · Receipt
`1:227` (= `SendReceipt.jsx`) · Send money `1:88` (= `SendAmount.jsx`) · Language & currency `1:259`
(= `Currency.jsx`) · Security `15:190` (= `Security.jsx` - the Figma frame is literally misspelled
"Secutiry"; HANDOFF's old id `1:275` no longer exists in the file - **node ids shift, always re-check
with `get_metadata` before trusting an id written down earlier**, not just the design content) · Contacts
`1:239` · Transaction history `1:248` · About `1:286` · Create receive QR `18:82` (= `CreateQR.jsx` -
old id `1:113` no longer exists, another shifted id) · Created receive QR `1:128` (= `ShowQR.jsx`) ·
Arabica `18:296` (= `ShowQR.jsx`, `fromStorage` - old id `1:139` no longer exists) · Scan QR `1:150`
(= `QRScanner.jsx`) · QR storage `1:303` (= `SavedQRList.jsx`).

**Left: none.** Every frame in the file has been rebuilt against a fresh `get_design_context`/`get_metadata`
pull at least once. That does not mean "finished forever" - the user has repeatedly kept editing frames
mid-session (Send money's numpad gained digit labels between two fetches minutes apart; Security's whole
node id changed). Before touching ANY screen again, re-fetch its node fresh - never trust this file's
notes, or an earlier session's memory, as still current.


---

📜 **Full historical detail moved to `HANDOFF-LOG.md`** (2026-09-11) - every dated round-trip from the
Figma rebuild (screens 1-23), the LuckyPot build log, and the 2026-09-07/09-08 session snapshots. Read it
only when you need the "why" behind a specific number or a past decision's rationale; it is not required
reading to start a session. This file keeps only what still needs to be read every time: the process
rules above, the current shared values right below, then the structured reference (stack, money model,
design system, gotchas, lessons) starting at §0.

---

#### 5. Current shared values (these changed on 2026-09-10 - §5/§6 below are older)

- `--color-surface` **#E1E7ED** (was #F1F5F9) - guideline "Surface / input / card", confirmed against the
  Sign-in input and the navbar bar.
- **Buttons carry a GLOW, not a drop shadow:** `0 0 8px rgba(0,0,0,.48)` on the rebuilt screens
  (guideline: *"Chỉ phần tử bấm được. Glow đều quanh, không offset"*). The navbar active cell uses
  `0 0 15px rgba(0,0,0,.5)`, measured off the fringe.
- **NavBar:** flat `--color-surface` bar, 16px semibold labels, 24px icons, bottom-aligned with 10.5px of
  padding. The active tab is a **white cell contiguous with the white content above** - one block casting
  its shadow down onto the grey. `.navbar` is `overflow: hidden` so that glow cannot leak upwards and grey
  the seam.
- **Action pills:** side 100×56 radius 28, centre 124×64 radius 32, no border, 13px / 16px semibold labels,
  icons 19.5 / 24. Columns `1fr 1.24fr 1fr`, gap 8 (100+8+124+8+100 = 340).
- **Notification area:** 13px text throughout. The hint block is a **borderless white card, radius 16**,
  black body text with semibold keywords and a red network line - it is no longer a blue-bordered blue-text
  box. Notification rows are white pills, radius 16, tinted text - no more pale coloured fills.
- **Token rows (Send)** are individual white cards, 48px tall, radius 16, 10px apart, name and value both
  18px semibold. The verified-check badge was dropped (the design has no slot for it).
- **BalanceHeader** measures its fit box by a definite `width`; with only `max-width` the box sizes to its
  own text and `useFitFontSize` collapses to the floor. That bug rendered the balance at 28px.
- **`.btn` is FIXED 48px tall, 18px text** (was `height:6dvh`≈50.6px with `min-height:48px` only as a
  floor, and `font-size:var(--fs-body)`=19px) - see the recurring-bug note above. This is every button in
  the app, not just the ones rebuilt so far.
- **`.confirm-box` is radius 16** (was 20) - shared by `SendConfirm.jsx`/`SendReceipt.jsx`.
- **Header rule** (§1 below has the full statement): every screen title is bottom-anchored, centred, 28px,
  in row 1's 70px box, via the single shared `.screen-title` class - never position a title per screen.
- `App.jsx`'s `?screen=` QA override now also reads `?params=<URI-encoded JSON>` for screens that need nav
  params to render without crashing (SendConfirm/SendReceipt read `address`/`amount`/etc and call
  `.toFixed()` on them - undefined without this). `tools/figma-check.mjs` has a matching `--params` flag.

#### 6. Open points the user may want to settle

- **13px notification/hint text** comes from the Figma, but a 2026-07-16 decision set 17px *for older
  eyes*. The design's layout only fits at 13. Flagged, not resolved.
- **Fixed 258px pill width** comes from the Figma; a 2026-08-13 decision said those two buttons should hug
  their text and be deliberately unequal. Figma now draws both identical.
- **Receive labels** are verbatim Figma: the button says **"Custom QR"** while the hint above it says
  "Create QR" - the inconsistency is in the design itself.
- **The balance stays `--fw-light`** even though Figma draws Regular, per the standing "big numbers are
  always Light" rule. Say so if that should change.
- **The bug-report feature was removed entirely** this session (component, `functions/api/bug.js`, the
  Telegram integration, the icon, `__APP_VERSION__`). §7d below is obsolete. **Still to do by hand:**
  delete `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from Cloudflare Pages → ezwallet → Settings → Variables,
  and revoke the bot via @BotFather if it should stop working immediately.
- **SendConfirm's secondary button is now "Back"** (was "Edit") - the exact Figma text, onClick unchanged
  (still re-opens SendAmount with the existing params, i.e. still functions as "edit"). Not flagged by the
  user, just a literal-text-match call - say so if "Edit" was the better word for what it does.


---


#### OPEN ITEMS carried out of the 2026-09-11 session

| Item | State | Who / what unblocks it |
|---|---|---|
| `design/pfp.png` | ✅ Added (dropped via Desktop, same day) | done |
| README screenshots | ✅ Rebuilt (4-image grid, Playwright/mock, see the Brand assets section) | done |
| `public/og.png` | ✅ Rebuilt - solid `#0B53BF`, no gradient, new screenshot | done |
| Circle PIN: no auto-clear on wrong PIN · mobile keyboard needs a tap | **Cannot be fixed here** - see the ⛔ CIRCLE'S PIN SCREEN note in `HANDOFF-LOG.md` for the full API evidence | Only Circle can fix it; report alongside the `common.showPin` issue already raised |
| `.scroll-thin` inside a grey box | ✅ Fixed everywhere - `HomeSend`, `Contacts.jsx`, `TxHistory.jsx` all switched to `.scroll-hidden` | done |
| `HANDOFF.md` was 1581 lines/213KB, getting silently truncated on read | ✅ Split - chronological history moved to `HANDOFF-LOG.md`, this file now 745 lines | done |
| Code cleanup (unused files/exports, duplicated logic) | ✅ See "CODE CLEANUP" note right below - some flagged-as-dead code turned out to be deliberate, NOT deleted | done |
| Everything below in this section | Unchanged from the previous session | - |

**⚠️ CODE CLEANUP 2026-09-11 - read before deleting anything that "looks unused":** an audit found several
candidates for dead code; cross-checking against this file's own history caught 2 FALSE POSITIVES before
they were deleted - **"looks unused" is not the same as "safe to delete" on this project, check history
first.**
- **`src/sound.js` is UNWIRED but NOT dead** - it's a real, still-open TODO with a 7-step wiring plan (see
  `### 🟠 UNFINISHED` right below, item A). Deleting it would have destroyed planned work, not cleaned up
  junk.
- **`data.js`'s `fmtVND`/`symbolAfter` are UNCALLED but NOT dead** - they're part of the VND plumbing a
  prior session *deliberately* left in place (unreachable since the 08-25 i18n removal) in case VND
  support returns - see `## 2. Money & display model` below. Not this session's call to remove.
- **Actually deleted (genuinely orphaned, verified with grep, no history note protecting them):**
  `public/logo.png` (leftover from before the SVG-based logo) - that's it, everything else the audit
  flagged turned out to be either already-fine or protected by a standing decision.
- **Actually fixed:** the `shortenAddr`/`shortAddr` address-truncation helper was copy-pasted into 6
  places (`SendAmount`/`SendConfirm`/`SendReceipt`/`TxHistory`/`NotifArea`/`Contacts`), with `TxHistory`'s
  copy silently using `'...'` instead of the real ellipsis `'…'` the other 5 used - consolidated into one
  `shortenAddr()` export in `data.js`.

#### The real next step (do this FIRST, before anything else)

Test on a real deploy, in this order (Circle's SDK cannot run on localhost, so none of this is
testable in mock mode or on `npm run dev`):
1. Push a preview deploy, faucet the wallet some testnet USDC, do a small real Deposit - confirm the
   PIN screen opens, the tx lands on Arc Testnet (check `testnet.arcscan.app`), and `src/lib/luckyPot.js`'s
   read picks up the new `deposited`/`eligible` numbers afterward.
2. Withdraw a small amount the same way - confirm the wallet's USDC balance actually rises (same
   "never trust tx status=1 alone" discipline as Swap's `verify-swap.mjs`).
3. Claim needs a wallet that actually won an epoch to test for real - if none exists yet, at minimum
   confirm the "Latest result" popup's tap-to-reveal renders correctly for a wallet that has a
   `prevEpochId` but did NOT win (the "Good luck next epoch" branch - already screenshotted in mock,
   but mock never exercises the real `owedTo`/`hasClaimed` reads).

#### Older standing state (still true, kept for context)

- **Production runs:** **ENGLISH + USD/EUR ONLY.** Vietnamese and Chinese were **REMOVED FROM THE PROJECT ENTIRELY on 08-25** - the i18n layer is gone, not merely switched off (see section 2). The whole repo, comments and documents included, is English now; the only file still holding Vietnamese is `.env.txt`, which is gitignored.
- **🟢 SWAP IS BACK UP** - the user tested it live on a deploy 08-25 and it went through with no `331001`. See section 4 for the outage history (kept in case it returns).
- **New in session 08-25 (part 1):** the LuckyPot tile · the i18n layer removed · the whole codebase translated · 2 notification bugs fixed (dust amounts showing 0.00, long text cut off) · `Available Network: Arc Testnet` in the hint block · a `Balance:` line on the Send screen. Details in `HANDOFF-LOG.md`'s 08-25 session tables.
- **New in session 08-25 (part 2, UI polish batch):** a 24h price-change triangle (▲/▼, tap for a popup) next to each token's amount on the Send tab · the network line reworded to `Current Available Network: Arc Testnet` · the Paste/Scan QR/Contacts hint titles are no longer tap-navigable (they were sending people to random screens) · the Scan QR caption now says "Scan Arc Testnet QRs only" · Security's icon is a new hexagon shield (`icon/shield.svg` replaced, same filename) · Menu's Currency entry + its screen title are now "Language & Currency" · the Send screen's `Balance:` line moved from beside "Send to" down to the blank space below the note field. Details in `HANDOFF-LOG.md`'s 08-25 session tables.
- **CI is live** (`.github/workflows/ci.yml`): every push to `main` runs `npm test` + `npm run build` on Node 22. All 3 runs on 08-25 were green.
- **In progress:** the success sound (`src/sound.js` is written but **not wired into the app**) - sections 7c + `HANDOFF-LOG.md`'s 08-25 session table. This is the first thing to pick up.
- **Who does what:**
  - **LongDC** → the multi-language work is on hold: the i18n layer was removed 08-25, so adding a language now means designing it again from scratch (see section 2).
  - **User + Claude** → refining the UX/UI.
- **Still pending, needs a human:** the message to Circle support was sent 08-25 (swap recovered on its own before a reply came back, so no answer is being chased any more) · **nothing from session 08-25 has been touched on a real device yet** - the deploy checklist for it is in `HANDOFF-LOG.md`'s 07-31 entry.

> ⚠️ **`DECK-DESIGN-SPEC.md` and `PITCH.md` were DELETED 2026-09-11** (user instruction, repo cleanup) - both
> described the pre-redesign brand (Barlow, `#F2F2F7`/`#E2EAF7`, flat drop-shadows, a stale "20 screens"
> count) and no longer matched `BRAND-GUIDELINE.md`/the live app after the Sep 2026 rebuild. The stale
> `docs/*.jpg`/`docs/*.gif` screenshots those two files embedded were deleted too - the user wants new ones
> re-captured later, once today's remaining UI bugs are fixed (do not re-take screenshots before that).
> If a pitch deck or messaging kit is needed again, write it fresh from the current `BRAND-GUIDELINE.md` +
> `README.md`, not by resurrecting these.

> **A stablecoin wallet for everyday people and older users.** Simple UX, mobile-first. **The user-satisfaction milestone was reached (07-18): the whole flow - login, PIN, sending, swapping real money - was tested by the user on a deploy and ran smoothly.**
> AT THE START OF EVERY SESSION read BOTH `HANDOFF.md` (this file) and `CLAUDE.md` (how to work with the user).
> The principle: **follow Circle/Arc properly, read the docs and verify with real API/eth_call responses before building, NEVER guess.**
> Detailed per-session history: `git log` (the commit messages carry the detail) - this file holds only the LATEST STATE + the rules + the lessons.

**EXTERNAL documents (do not put marketing content in this file):** `README.md` = the technical introduction for GitHub. `PITCH.md` (messaging kit) and `DECK-DESIGN-SPEC.md` (deck design system) were DELETED 2026-09-11 - see the note above.

AI resources: Circle [skills](https://developers.circle.com/ai/skills) · [mcp](https://developers.circle.com/ai/mcp) - Arc [skills](https://docs.arc.io/ai/skills) · [mcp](https://docs.arc.io/ai/mcp). Already installed locally: the Circle Skill (`circle:*`), Circle MCP (`mcp__circle__*`), Arc MCP (`mcp__arc-docs__*`).

---

## 0. Core value - EVERY decision in this project revolves around it

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

**How to apply it:** every feature, UX decision and architectural choice in this file must be able to
answer the question "does this make crypto simpler for an everyday user,
or is it making them adapt to crypto?". Anything that drifts from that: stop and ask the user.

---

## 1. Stack & infrastructure

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Wallet:** a Circle **User-Controlled Wallet** (MPC EOA, signing with a **PIN** through `@circle-fin/w3s-pw-web-sdk`, lazy-loaded - see the gotcha in section 7).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balances/prices:** on-chain through viem (`src/chain.js`, Multicall3 in 1 request) + CoinGecko prices (60s cache). **Swap:** the Circle Stablecoin Kit REST API (section 4). **QR:** `qrcode.react` (drawing) + `jsqr` (scanning).
- **CLAUDE'S CLOUDFLARE ACCESS (set up 08-01 - the user: "find a way to do this work for me"):** `npx wrangler login` has been run (the user clicked Allow once), and the OAuth token is stored at `C:\Users\Dell\AppData\Roaming\xdg.config\.wrangler\config\default.toml` (key `oauth_token`). Account `f9df99b7751b7dc3c80a22b6911c6f2b`. It works for the REST API with the header `Authorization: Bearer <oauth_token>` - the `wrangler` CLI is missing many commands (e.g. there is NO `pages domain`), so REST is the complete option.
  **✅ WHAT WORKS:** add/remove/list Pages custom domains · view + PATCH the project config (env vars, **KV bindings**) · create/write/read KV namespaces · view deployments and roll back.
  **✅ THERE IS ALSO A DEDICATED API TOKEN (created by the user 08-01, named `claude-code`)** - kept in **`.env.txt`**: `CF_API_TOKEN=` + `CF_ACCOUNT_ID=f9df99b7751b7dc3c80a22b6911c6f2b`. That token **HAS DNS Edit permission** (which the `wrangler login` token lacks) → Claude can create/edit DNS records. Usage: read those 2 lines from `.env.txt` and call REST with `Authorization: Bearer <token>`. **NEVER print the token into chat/logs, NEVER commit it** (`.env.txt` is on line 5 of `.gitignore` - verified with `git check-ignore`, and it has never been committed). If the token breaks or leaks, the user can kill it instantly at My Profile → API Tokens → Roll/Delete.
  **Worth remembering when reading the Pages config through the API:** environment variables returned as `type=secret_text` **have no `value`** - that is Cloudflare encrypting and hiding them, **NOT an empty variable**. `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` are all in that state (verified 08-01), so do not panic and re-set them.
- **Domain (07-29):** `ezwallet.cash` (bought on Cloudflare → the zone is already in the same account) attached to the Pages project `ezwallet` through **Workers & Pages → ezwallet → Custom domains**. The apex is the main link; `ezwallet.pages.dev` is NOT lost (Pages always keeps its original subdomain) so old links still work. **The code hardcodes no domain** - Login/Circle use `window.location.origin` and `manifest.json` uses `start_url: "/"` → changing domain needs no code change. ⚠️ **When Google login comes back (roadmap section 4): the origin `https://ezwallet.cash` MUST be added to the redirect-URI allowlist in Circle Console + Authorized origins in Google Cloud Console**, or error 155140 follows (per the Circle docs: `redirectUri` only exists in the SOCIAL login flow; the email+PIN flow in use needs no domain declaration - checked in the docs 07-29).
- **Secrets** (`.env.txt` + `.dev.vars`, both gitignored, set in the Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit). **Hardcoded IDs** (not secrets): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com`.
- **Local dev (Windows - do NOT use `wrangler pages dev`, it fails with "write EOF"):** Terminal 1 `node dev-server.js` (proxy on 8787, importing `functions/api/*` directly) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **The Circle SDK does NOT run on localhost** → the PIN/login/swap flows can only be tested on a deploy.
- **MOCK MODE - `npm run mock` (for checking UI/flow locally, with NO Circle):** `src/mock.js` + the `VITE_MOCK=1` flag. Skips Login/PIN → straight into HomeSend with a fake wallet and fake balances (`MOCK_AMOUNTS`); intercepts `/api/*` + ArcScan with fake data; Send/Swap pretend to succeed. It NEVER reaches production. **Verify the UI with Playwright at 390×844 AND 375×812 on the mock** (lesson 07-23: measuring only 390 misses overflow bugs). ⚠️ Playwright is NOT in the repo (do not add it to `package.json`) - the harness lives outside at `C:\tmp\ezw-verify` (`npm i playwright` + `npx playwright install chromium`, script `verify.mjs`); after a Windows reinstall, rebuild that folder, ~2 minutes.

**Tokens on Arc Testnet:**
| Token | Address | Dec | CoinGecko |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | `usd-coin` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | `euro-coin` |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | `bitcoin` |

**Arc contracts (predeployed, the precompile preserves msg.sender):**
| Contract | Address | Used for |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | sending money with a note (the Memo event) |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batching approve+swap into 1 tx / 1 PIN (from an EOA, allowFailure=false, NO value) |
| Swap Adapter | `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b` | Circle's swap settlement (section 4) |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | batched balance reads (declared in `defineChain`) |

---

## 2. Money & display model (user decisions - do not misread them again)

- **Tokens ALWAYS show their REAL NAME** (USDC/EURC/cirBTC) in the token list, in history (the secondary line) and on receipts.
- **"Display money"** = a conversion layer over fetched rates (NOT a real swap): `ez_currency` ∈ {USDC, EURC}, defaulting to USDC. Symbols USDC→`$`, EURC→`€`. **The conversion base is USD, with USDC pinned to $1** (`getDisplayRates()` returns USD per unit; `displayNum(usd,cur,rates)=usd/rate[cur]`).
- **The Send screen takes input in "USD"** (the friendly label) = sending USDC 1:1; the real token is chosen through the chip.
- **Money is formatted as ONE STRING IN ONE STYLE:** `fmtMoney()` → `$2` / `€2` / `2 USDC`. A bold number with a regular symbol is FORBIDDEN.
- **Fee reserve:** `GAS_RESERVE_USDC = 1` - the available USDC always has 1 subtracted (Arc gas is paid in USDC).
- **The app is English + USD/EUR ONLY. Vietnamese and Chinese were REMOVED ENTIRELY on 08-25 (user decision):** `src/i18n.js` and `src/circleLocalizations.js` are deleted, all 219 `t('...')` calls became plain English strings, `npm run check-lang` and `scripts/check-lang.cjs` are gone, and the Language screen became `screens/Currency.jsx` with only the currency picker (the CNY + VND options, both already locked, were dropped with it). `SUPPORTED_CURRENCIES = ['USDC','EURC']` in `data.js` is unchanged. The VND rate/format plumbing in `chain.js` + `qr.js` + `amountHint.js` is **deliberately left in place** but is now unreachable (nothing can select VND) - see the dead-code note in `HANDOFF-LOG.md`'s 08-25 session table.
  - **Why VND was switched off first (a real bug, 08-12):** `QRScanner.parseQR()` defaulted to `currency: 'VND'` for a QR with no currency (a bare `0x` address / a link missing `&cur`). While VND was locked, `SendAmount` treated `'VND'` as "unknown" → it fell back to USD, so it was harmless. Enabling VND on 08-04 made that string valid → **scanning a QR in an English/USD app opened the amount screen in VND**. The default is now `'USD'`, and that is still the case after the i18n removal.

---

## 3. Features (final state - ✅ genuinely working / verified on-chain or on a deploy)

- **Email login → wallet creation** (userId=email, authMode PIN) + security questions. **Wallet unlock:** reopening the app → `PinGate` opens the Circle PIN automatically (signing an empty message, no gas). Google login is **hidden from the UI** (the plumbing is kept, including the `cookies-next` dependency + `refreshSocialToken`). Email OTP is built but **PERMANENTLY OFF because of a Circle constraint (user decision 07-29): Circle only allows a PIN with the plain `userId=email` flow; Email-OTP/SSO users have NO PIN** (see section 7) → enabling OTP means losing the PIN, which means losing the core UX. **Do NOT propose "turn on Email OTP" as the answer to anything again** (`EMAIL_OTP_ENABLED=false`).
- **BACKUP of contacts + the QR library to Cloudflare KV (07-29):** `functions/api/sync.js` + `src/sync.js`. localStorage is STILL the source of truth; KV is only a copy against losing data on a new machine / cleared cache / a domain change. Pulled once at app start (`App.jsx`), pushed after each edit (1.5s debounce). **Merging = THE MOST RECENT EDIT WINS** by the `ez_sync_at_<addr>` stamp (union is not used, because union means a DELETE never sticks). **The KV key is the WALLET ADDRESS, which the server obtains itself by asking Circle `GET /wallets` with the userToken - the client's claim is NOT trusted**. **AVATARS NEVER REACH THE SERVER** (the server whitelists fields: contacts carry only `id/name/address`); on pull, the pictures already on the device are kept by `id`. With no KV binding → the API returns 503 `sync-disabled`, the client silently skips, and the app behaves as before. It needs a binding named **`EZ_SYNC`** (Workers & Pages → ezwallet → Settings → Bindings → KV namespace). Locally, `dev-server.js` has an in-RAM fake KV. Tests: `test/sync.test.mjs` (9/9, locking the invariants above).
  ✅ **THE 07-29 TECHNICAL DEBT IS PAID (08-06) - AUTH = PIN SIGNATURE.** The door is no longer a `userToken` (which anyone knowing the email could obtain). The new flow: `/api/sync` action `nonce` issues a single-use nonce (TTL 5') → `PinGate` has Circle sign the sentence `Unlock EZwallet. Nonce: <uuid>` using **the PIN entry that already happens** (NO extra step for the user) → action `session` recovers the address from the signature with **viem's `recoverMessageAddress`** (stronger than `verifyMessage`, because the client never declares an address) → a session token with TTL 24h is issued and kept in `sessionStorage.ez_sync_token`. `pull`/`push` carry that token. **The server no longer calls Circle on the sync path** (there is a test locking that). The KV key is still `bak:<addr>` ⇒ data backed up by the old version reads back intact. **SAFETY CHECK:** `session` also returns `address`, and the client compares it with `ez_wallet_addr`; a mismatch → throw the token away and disable backup for that session (better OFF than writing to the wrong key). Tests: `test/sync.test.mjs` 15/15.
- **Sending** USDC/EURC/cirBTC (`send.js`): a plain transfer, or through the Memo contract when there is a note (UTF-8 fine). `idempotencyKey` prevents duplicate sends.
- **Swap** USDC↔EURC↔cirBTC - ENABLED, eth_simulateV1 verification passed + **the user tested it with REAL MONEY on a deploy (07-18)**. The Swap screen = a % slider (5 marks 0/25/50/75/100, magnet ±2%) + round-number chips (`roundHint.js`, tests `node test/roundHint.test.mjs` **26/26**). **The suggestion rule - user decision 08-13 (third revision, do not revert):** `value ≥ 30` → step **1 (whole units)** · `3 ≤ value < 30` → step **0.5** · `value < 3` → shrink with the magnitude. Take the **NEAREST** multiple as the centre + one step each side.
  ⇒ 9,15 → 8,5·9·9,5 · 17,3 → 17·17,5·18 · 101,3 → 100·101·102 · 0,0083 → 0,008·0,0085·0,009
  **Both earlier versions were WRONG, do not go back:** 07-17e pinned a 0.5 step for every value → 39,000 suggested "39,000.5". 08-04 used `u = 0.5 × 10^floor(log10(value))` → the step **jumped 10x right at the value 10** (9.99 stepped by 0.5 while 10.0 stepped by 5) ⇒ dragging to 14.55 suggested "10·15·20", reported by the user 08-13. **Lesson: a step tied to powers of 10 gives one tier per decade - far too coarse.** This version has exactly ONE jump (0.5 → 1 at 30) and it doubles rather than multiplying by ten.
  ⚠️ The `< 3` branch MUST STAY: cirBTC amounts are thousandths, and a pinned 0.5 step rounds the centre to 0 → everything is filtered out (`v > 0`) → an EMPTY chip row.
  ⚠️ **Lesson 08-13:** the 08-04 commit changed `roundHint.js` but **forgot `test/roundHint.test.mjs`** → 5 cases stayed on the old spec and `npm test` was red for 9 days while the app was correct; once you are used to red, the test stops warning you. Re-synced on 08-13. **Next time `roundHint.js` changes, change the test IN THE SAME COMMIT.**
- **SERVICE HUB (08-12)** - `src/screens/ServiceHub.jsx`, **NavBar tab 1** (icon `hub`, label "Services"), replacing the old Swap tab. A 2-column grid of raised SQUARE tiles in a grey box, geometry copied from the QR Storage screen. The service list is the `SERVICES` array in that file; adding a service = adding one line:
  - **Swap** → opens the `Swap` screen (that screen's content is unchanged).
  - **Piggy Bank** · **LuckyPot** (renamed from "Dollar-Cost Averaging" on 08-25, icon `icon/luckypot.svg`) → `screen: null` ⇒ the tile dims itself to 0.4 and is `disabled`. Not built yet.
  - ⚠️ **The Swap screen has no tab of its own any more** ⇒ its row 10 is **the word "Exit" in red, bold and centred** (NOT a pill button - user fix 08-13: the first version used a huge red `.btn-error` gradient that looked heavy and fought with the blue gradient Swap button above it). The touch area covers the whole row so older users can hit it. **Do NOT use the `.row10-single` class**: that class is `position:absolute; top:85dvh` = centred at **90dvh (the row 9 position)**, and Swap's row 9 already holds the "Swap" button → they would end up stuck together. It must be `gridRow 10` (centre 95dvh = exactly the band the NavBar vacated).
  - **Text/icon sizes in the hub - SETTLED AFTER 2 MISSES (user 08-13), do not push back to either extreme:** `icon 48 + text --fs-item 17` = the user called it **"too small"** → `icon 64 + text --fs-title 30` = **"too big"** → **SETTLED IN BETWEEN: `icon 56` + text `--fs-md-lg` 21** (= exactly the app's button text size, and these tiles are buttons). At that size "Piggy Bank" fits 2 lines and "LuckyPot" 1.
  - **Tiles are NOT forced square** (`aspectRatio:1`) - a tile comes out ~160×150 (near-square on a phone), but on the narrowest column (Android 360 → 145px) 150px of content is still taller than the column; forcing a square overflows the text, and `aspectRatio` does NOT grow with content. Use **`gridAutoRows:'1fr'`** so rows are equal height (left alone, the 3 tiles came out 147/180/213, badly uneven); leave `alignItems` at its default `stretch`, do not set `'start'`. The grey box has **`marginBottom:'2dvh'`** = the gap before the NavBar (the user reported it touching the navbar), matching the bottom-gap rule on every other screen. Measured with Playwright at 4 screen sizes: 3 tiles of equal height, no overflow of the tile, the box or the screen.
  - The **Service Hub entry in MenuScreen**: unlocked 08-12 → **REMOVED ENTIRELY 08-13** (user decision). It is already navbar tab 1, and a second door in the Menu means two ways into one place - redundant for everyday users. The Menu is back to **4 entries in rows 4-7 + Sign out in row 8** (exactly the pre-07-31 layout), with row 9 left empty as the gap before the NavBar.
- **On-chain balances + live rates** are cached (`_balCache`/`_ratesCache`) - switching screens shows the previous number immediately while a background fetch updates it.
- **TxHistory** (ArcScan + the memo event, a grey box, grouped by day), **Contacts** (per account, avatar cropper, a grey box), **QR** (create/scan/library), **in-app notifications** (NotifArea), **receipts** (canvas → Photos through Web Share), a per-account store (`store.js`).
- **Change PIN** (email users): `PUT /v1/w3s/user/pin` ✅. **`refreshSession()`** is called BEFORE any PIN action (a userToken lives 60').
- **DELETED 07-18 (dead code cleanup):** the `Onboarding` + `ComingSoon` screens (nothing had navigated to them for a long time - retrieve them from git history if needed), ~30 orphaned CSS classes (modal-*, pin-dot*, text-*, token-item…), and the `ez_onboarded` key.
- **AUDIT + CLEANUP ROUND 2 - 07-29** (audit scripts outside the repo: `C:\tmp\ezw-verify\audit*.mjs` - the import graph, orphaned exports, orphaned CSS classes/variables, icons, i18n, localStorage, dependencies). **Deleted:** 3 span classes `.row-2-3/.row-3-4/.row-3-6` · 4 CSS variables `--font-title/--fs-huge/--fs-sub/--is-title` · a redundant `import React` (Login.jsx - the automatic JSX transform makes it unnecessary) · the `shortenAddr` function (HomeReceive, dead since 07-19) · `fmtAmount` (chain.js) · **37 dead EN i18n keys** (the deleted ComingSoon screen, the "Swap coming soon" string, old hints, a duplicate key with a trailing space). **Icons:** 7 icons that no screen renders had their **import removed from `Icon.jsx`** (~2.9KB of raw SVG left the bundle) - `back · facebook · google · hint · left · right · swap` - **the .svg FILES ARE KEPT in `icon/`** (the user's drawings); to use one again, add an import line + a name to `ICONS`. (`dca` joined that list on 08-25 when the tile became LuckyPot.)
  **Icons added 08-12:** `exchange · pig · dca` (from the library at `D:\Files\Claude\Icons`) for the Service Hub, plus `luckypot` on 08-25. ⚠️ Those files use a **200×200 viewBox** while every other icon is 100×100 - **DELIBERATE, the user drew them at double size because they render LARGE** (so relatively thinner strokes are the intent). **Do NOT "normalise" them to 100×100 or double the `stroke-width`.** Normalising on import into the repo means only: `width/height` → `100%`, `stroke/fill="black"` → `currentColor`. ⚠️ `luckypot` is the exception: it is a FULL-COLOUR drawing (yellow #FFCC00 + green #16A34A + black outline) kept as drawn, so the `color` prop has no effect on it. The `trade` icon is STILL used (the reverse button on the Swap screen) even though the navbar dropped it.
  **DELIBERATELY KEPT (do not "clean" these, they are NOT junk):** the Google login plumbing (`refreshSocialToken`, `cookies-next`, the `ez_login_method` key, the `googleErr` state) - roadmap section 4 will bring it back · `design/logo-icon.svg` (held in reserve) · `public/tokens/*.png` (loaded DYNAMICALLY through `/tokens/${sym}.png` - a static scanner reporting them as "unused" is WRONG) · `.row-4`…`.row-7` (MenuScreen builds `` `row-${i+4}` `` at runtime) · internal-use exports in `_swapCore.js`/`chain.js`/`data.js` (do not touch the money path for cosmetic reasons). (The i18n entries that used to be listed here - `getLang/setLang`, the ZH map - no longer exist: the whole layer was removed 08-25.)
  **Verification after the cleanup:** `npm test` 17/17 · `npm run build` OK · a Playwright mock run through ALL 14 screens, counting the `<svg>` elements per screen to catch missing icons, with **0 console errors**.

---

## 4. Swap - how it works (⚠️ real money, read carefully)

> 🟢 **STATUS 2026-08-25: SWAP IS BACK UP** - the user tested it live on a deploy ("test swap rồi, êm" = tested, smooth) and it went through with no `331001`. The Circle/LI.FI-side routing outage described below (2026-08-13 → 2026-08-25) resolved itself; nobody touched `swap.js`/`_swapCore.js`/`circle.js` to fix it. The user had already drafted questions for Circle support and sent them during the outage - no reply needed any more, the issue is moot.
> **History, kept for the next outage (the same 331001 error may return):**
> 🔴 STATUS 2026-08-13: SWAP WAS DOWN - `No route available` (331001), AN ERROR ON THE CIRCLE/LI.FI SIDE, NOT IN OUR CODE.
> Measured on production: **every pair, every amount returned 331001** - 0.01 / 0.1 / 0.5 / 1 / 10 EURC→USDC · 10 USDC→EURC · 10 USDC→cirBTC.
> **The reasoning (reusable next time):** if it were about *amounts being too small*, large amounts would work → it is not that. If it were *our code*, the real-money swap on 07-18 would not have worked → not that either. `331001` is LI.FI's **ROUTING** code (LI.FI being the router underneath the Circle Stablecoin Kit), meaning **it cannot find a swap route on Arc Testnet** - most likely the testnet pools were drained of liquidity, and they were refilled/re-routed by 08-25.
> The 3 core swap files (`swap.js` · `_swapCore.js` · `circle.js`) **have not been touched since 05-08**. The 08-12/08-13 changes in `Swap.jsx` only replaced the NavBar with the Exit text - no logic was touched.
> **If `331001` returns:** re-measure the 3 pairs above first with `verify-swap.mjs` (eth_simulateV1, costs nothing) before touching any code - all 3 failing again means it is on Circle's side, same as before.


**The flow (`functions/api/_swapCore.js` - the core shared by swap.js + dev-server):**
1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → returns **a SIGNED INTENT**. ⚠️ `amount` = **AN INTEGER IN BASE UNITS** (a decimal → 400; too small → 422 `331001` "No route").
2. Submit the intent to the **Swap Adapter**: `execute(executionParams, tokenInputs, signature)` with `approve(tokenIn→adapter)` first, batching `[approve, execute]` through **Multicall3From = 1 PIN**. The ABI is copied verbatim from the SDK source; encoding uses **viem** (nested tuples with dynamic bytes - hand-rolling offsets is easy to get wrong, and wrong means lost money).
3. The adapter pulls the tokens in, runs the route (a third-party provider - measured as `lifi`), and **COLLECTS the output, crediting the wallet** (settlement).

**⚠️ DO NOT REPEAT THE OLD MISTAKE:** do NOT unpack `instructions[]` and run them by hand - that skips settlement → the output is **STRANDED IN THE ADAPTER, MONEY LOST** (while the tx still reports status=1). Every swap change MUST be verified with `node verify-swap.mjs <wallet> EURC USDC 2` (eth_simulateV1, costs nothing) - ship only when the tokenOut balance rises correctly. Tip: the simulation needs a wallet with a balance → take any holder from the ArcScan API `/api/v2/tokens/<addr>/holders` (simulation needs no key).

**THE 0.1% APP FEE (user decision 07-23):** `_swapCore.js` sends `config.customFee = { percentageBps: FEE_BPS=10, recipientAddress: FEE_RECIPIENT=0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6 }` in the `/v1/stablecoinKits/swap` body (the official field - dissected from the source of `@circle-fin/provider-stablecoin-service-swap`, whose schema accepts `percentageBps` 1..10000 OR `amount` in base units, plus `recipientAddress`; the receiving address is public, not a secret). How it works: the fee is taken from the **INPUT TOKEN** and Circle's adapter contract forwards it to the recipient inside the swap tx (NO contract of ours is deployed); the returned `estimatedAmount` is **ALREADY NET OF THE FEE** → the "You receive" UI needed no change. Verified by simulation 07-23: swapping 2 EURC→USDC, the fee wallet gained +0.002 EURC (exactly 0.1%) and the user received what the estimate promised. `simulateSwap` now measures the FEE_RECIPIENT balances too (calls[1,2,5,6]), and verify-swap.mjs prints an "App fee" line. ⚠️ Per Circle's docs, Circle keeps 10% of a custom fee (90% to the wallet) - the testnet simulation showed 100% arriving, so MEASURE AGAIN ON MAINNET.

---

## 5. Design System (`src/index.css` :root) - ⚠️ PARTLY SUPERSEDED

> ⚠️ **Written before the 2026-09-10 Figma rebuild.** Barlow, the gradients, `#F2F2F7`/`#636366`, the
> straight-down drop shadow, the blue-bordered hint block and the "white + grey border = tappable" rule
> have all since changed. Where this section and **READ FIRST §5** disagree, READ FIRST wins - and where
> both are silent, the Figma render decides. Kept for the reasoning behind each older decision.

**Font: ONE FONT ONLY = BARLOW** across the app (all 4 `--font-*` variables point at Barlow, keeping the old names so the JSX needs no edits). Weights loaded: `300;400;500;600`.
**Weights:** `--fw-light 300` = large HERO NUMBERS (balances, amounts - user decision 07-17f: KEEP Light, do not bold them) · `400` body · `500` buttons/items/labels/important values · `600` titles + active. **NEVER 700** (`--fw-bold` is locked at 600).
**Font sizes + THE NAMES THE USER USES:** amount 52 · huge 38 ("extra large", the number on the Swap screen) · title 30 ("large") · num 24 · md-lg 21 ("medium-large" = BUTTONS + the slogan + typed text) · body 19 ("medium" = content + the NAVBAR) · item 17 ("medium-small") · label 15 ("small") · tiny 13 ("mini"). When the user names a size, look it up here.
**Icons:** the `--is-*` scale pairs 1-to-1 with `--fs-*` - an icon beside text uses that text's size. Only icons STANDING ALONE use hardcoded numbers (the SendReceipt check at 76, the Contacts avatar, the QR delete button, the Swap reverse button, the numpad erase key). New icons MUST use `width/height="100%"` + `stroke="currentColor"`.

**Gradients (user decision 07-17d, vertical, lighter on top → darker at the bottom, both ends fully opaque - 0%/100% are STOP POSITIONS, do not describe them as "0% at the top", it implies a pale colour):**
- Brand: `#0088FF → #0B53BF` (the background of `.btn-primary` + `.action-card.primary`)
- Green `#34C759 → #16A34A` (`.btn-success`) · Red `#FF4D51 → #DC2626` (`.btn-error`) · Yellow `#FFCC00 → #F59E0B` (the token is kept, the btn-warning class was dropped as unused - if it returns, BLACK TEXT)
- **THE DROP SHADOW ON TAPPABLE BUTTONS (user decision 07-22d - final):** a **STRAIGHT-DOWN** shadow (offset-x 0, cast vertically) `box-shadow: 0 4px 6px rgba(0,0,0,ALPHA)` - **MEDIUM, NO SPREAD** (a small 6px blur), and BLACK (do not tint it to the button colour). **The ALPHA differs so they LOOK EQUAL (user decision 07-22g): GRADIENT buttons `.35`, WHITE buttons/chips `.25`** - a gradient button's dark fill "swallows" a black shadow, so it has to be deeper to look like the white one. Applied to: `.btn-primary/.btn-success/.btn-error/.btn-secondary` + `.action-card` + `.action-card.primary` (classes), AND **every inline tappable pill button/chip** (user decision 07-22f "every button gets a shadow so an older person understands"): the Swap token chips (`TokenRow`), "Hold to show tokens" (HomeSend), the copy-address button (HomeReceive), the currency chip (Currency screen). Do not tint it, do not increase the blur. **The white pill buttons "Hold to show tokens" + copy address use BLACK text (07-22f, previously muted).**
- **A BUTTON STANDING ALONE = 3/4 OF THE SCREEN WIDTH (user decision 07-29 - "make every lone button the same size for consistency"):** `width: min(75vw, calc(var(--screen-max) * 0.75))` (anchored to .screen, NOT a % - the parent frame is inset 20px, so a % gives a different number on every screen). Applied to: "Hold to show tokens" (HomeSend), "Tap to copy your wallet address" (HomeReceive), **the Swap button** (previously 66.67%). **Plus `.row10-single .btn` (index.css) changed from 66.67% → 3/4** (user decision 07-29, covering About/Currency/Security) **plus the Reload button on the ErrorBoundary screen**. Measured with Playwright 07-29: EVERY lone button = **293px @390 · 281px @375**, all equal; the `.row10-single` centre is still exactly 90dvh. The `.row10-dual` button pairs (44% each) are UNCHANGED - this rule is only for buttons standing ALONE. **A DELIBERATE exception: the "Sign in with Email" button on Login stays at 80%** - it matches the width of the slogan line above it (also 80%), and dropping it to 75% breaks that pairing; do not "harmonise" it by mistake.
  - ⛔ **REVERSED ON 08-13 FOR EXACTLY 2 WHITE PILL BUTTONS** (the user: *"I slightly regret making it this big"*): **"Hold to show tokens"** (HomeSend) and **"Tap to copy your wallet address"** (HomeReceive) **dropped the 3/4 width and now HUG THEIR TEXT** - `padding: '0 18px'` + `maxWidth` + `overflow/textOverflow` as the safety net. Measured button/text ratios of **1.26×** and **1.16×** (matching the user's "if the text is 50, the button is 60"). ⚠️ Those 2 buttons USED TO be deliberately equal ("a PAIR" at the same 55% coordinate on the two tabs) - **they are now DELIBERATELY unequal because the two sentences differ in length, so do not "even them up"**. ⚠️ Safe against the old 07-29 bug (text wrapping on older iPhones once the width was fluid) because both already carry `whiteSpace:'nowrap'`. The 3/4 rule STILL HOLDS for the remaining lone buttons (the Swap button, `.row10-single`, Reload).
- **Buttons in a `.row10-dual` pair are PLAIN TEXT, NO icon** (user decision 07-29: the "Add" button on Contacts used to carry the `add` icon → out of step with every other Back/<action> pair in the app).
- **The `down2` dropdown arrow uses `--color-brand`** (user decision 07-22c, previously muted): the Swap token chip (`TokenRow`) + the currency chip on Send (`SendAmount`) + the currency chip on the Currency screen (07-22f).

**Semantic colours:**
| Meaning | Token | Hex |
|---|---|---|
| Brand (CTAs, active nav, action/leading icons, SENDING) | `--color-brand`/`--color-info` | `#0B53BF` (+soft `#E2EAF7`) |
| Received/PNL/success | `--color-primary` | `#16A34A` (+soft `#DCFCE7`) |
| Money lost/errors | `--color-error` | `#DC2626` (+soft `#FEE2E2`) |
| Warning/hint | `--color-warning` | `#F59E0B` (+soft `#FEF3C7`) |
| Secondary text (DARK GREY, 6.0:1, passes AA) | `--color-muted` | `#636366` |
| Borders/dividers (NEVER a fill, NEVER a text colour) | `--color-gray` | `#E5E5EA` |
| **BOX/CARD FILL** | `--color-surface` | `#F2F2F7` |

**THE BOX RULES (the soul of the design - the standard comes from the Swap screen):**
- **Separate blocks with a surface FILL + border:none + radius 20 (large cards) / 8-12 (chips, input fields)** - never a grey border on white.
- **A TAPPABLE element INSIDE a grey box → WHITE + a 1.5px GREY BORDER** (the Swap token chips, the Hold button, the currency chip, the Contacts avatar placeholder...). The text inside still follows its role (Hold = muted).
- Grey boxes currently cover: the 2 cards on Swap (Fee/Rate has been bare text with NO box since 07-20) · the token area on HomeSend (rows 3→5.5, `height calc(100%+5dvh)`) · the Contacts/TxHistory lists (rows 2-8) · **SavedQRList (rows 2-8, 07-23): a 2-COLUMN grid (3 columns made the QRs too small), each QR a WHITE box with a 1.5 grey border, radius 16, a .25 drop shadow and a delete X top-right; the grey box has padding 10 + gap 10 (white boxes exactly 10px from the grey edge), and the QR SCALES with the box (svg width 100%, height AUTO - the viewBox keeps it square; forcing height 100%/aspectRatio was 3px off, and a hardcoded 104 frame distorted it) + the name at fs-item 17 + the amount at fs-label 15. ⚠️ 3 LESSONS: (1) do NOT use .scroll-thin INSIDE a grey box (its margin-right -20 overflows to the right - desktop compensates with scrollbar-gutter so it looks fine, iOS does NOT → broken; use .scroll-hidden); (2) layout verification must ALSO measure 375px, not only 390; (3) grid columns MUST be `minmax(0,1fr)` and the "+" tile must NOT use aspectRatio (bug 07-23c: 3 QRs → row 2 = [QR | +], and the + button's aspectRatio was stretched to the QR box height → INFLATED SIDEWAYS → the 2 columns went badly uneven; grid tests must test an ODD number of items).** · Currency (2-3) · Security (2-4) · About (2-8) · every input field (`.address-input`, `.memo-row`; errors = a red inset shadow).
- **Real NOTIFICATIONS** (received/sent/error) = **a pale coloured fill with NO border and BLACK text** (received green, sent blue, error red). **HINTS ARE COMPLETELY DIFFERENT (user decision 07-22d - THE APP-WIDE HINT STANDARD):** a **WHITE background + a 1.5px brand BLUE border + brand BLUE text/icons** (matching the amount chips on Swap). It applies to EVERY hint: the `HintBlock` (NotifArea on Home), the email + domain chips on EnterEmail, and the round-number chips + the "Slide to adjust…" hint on Swap. **NO yellow background, NO lightbulb icon** (user decision 07-22e: `hint.svg` was dropped so hints all look alike - border + text only). The Home hint block format: each line is `Label: desc`, the label is medium weight and TAPPABLE (going to the button of the same name in row 9), and long sentences wrap. **HINT FONT SIZE = `--fs-item` 17 FIXED across the app (user decision 07-22e: the sign-in chip was 21px and came down to 17 to match the Home/Swap hints) - never let a hint be bigger. CORNER RADIUS: hint chips are PILLS `borderRadius 999` (Swap/EnterEmail); the multi-line Home hint block is `12` (user decision 07-22g: the sign-in chip at radius 10 looked square and was changed to a pill).**
- **THE "TAPPABLE" SIGNAL = A WHITE FILL + A 1.5px GREY BORDER** (user decision 07-21 - a `--color-surface` grey fill reads as "recessed / not tappable"). Applied to: the secondary `.action-card`s (Contacts/Paste/QR Storage/Share; the `.primary` cards Scan QR/Create QR stay gradient with `border:none`) · the AMOUNT field on the "You pay" card on Swap (the "You receive" card stays bare - an output is not an input) · the email + domain chips on EnterEmail. Text input fields (`.address-input`) keep the surface fill - they are real inputs with a caret/placeholder, so there is no confusion.
- An ACTIVE toggle/filter = a white fill + a brand border + brand text. Primary buttons take 2/3 of the width, secondary 1/2.
- NO em dashes (use `–`), NO emoji. Scrollbars: `.scroll-thin`/`.scroll-hidden`.

**LINK PREVIEW CARDS (07-29):** `public/og.png` at **1200×630** + the full set of `og:*` / `twitter:*` / `description` / `canonical` tags in `index.html`. Before that the page had no meta tags at all → pasting the link into X/Telegram/Facebook produced **an empty box**. The image is a brand gradient background (#0088FF→#0B53BF) with a white knockout logo and a REAL app screenshot (`docs/app-home.jpg`) - built by screenshotting an HTML file with Playwright (the template lives at `C:\tmp\ezw-verify\og-card.html` + `make-og.mjs`). **This is a DRAFT and the user can replace it with their own design at any time** - it only has to stay **1200×630** and keep the name `og.png`. ⚠️ `og:image` MUST be an absolute URL; X/Facebook **cache the card** → after changing the image, use their debug tools to force a re-scan, or rename the file.

**THE SLOGAN CHANGE (08-02):** the settled slogan is now **"A crypto wallet simple enough for my mom to use."** ("your grandma" / "stablecoin wallet" are gone from brand sentences - the word "stablecoin" is still used where it states a product fact). Synced across: `<title>` + `og:title` + `twitter:title` + `og:image:alt` (`index.html`) · a rebuilt `public/og.png` · `package.json` · `README.md` · `PITCH.md` (sections 1 + 8) · `DECK-DESIGN-SPEC.md` (thesis + P1 + section 3). The voice rules are settled in the **Brand Voice** section of `CLAUDE.md`. **Every em dash `—` was also changed to an en dash `–`** in everything a reader sees (html, md, package.json, .env.example); since 08-25 the code comments in `src/` and `functions/` are English too, so the same rule is easy to keep there. `og:image` was bumped to `og.png?v=2` to force X/Facebook to re-scan (they cache by URL); **when the image changes again, bump it to `?v=3`**.

**Brand assets - `design/` HOLDS EXACTLY 3 FILES, NO OTHER VERSIONS (user rule, 2026-09-11: "còn lại xóa
hết các phiên bản vớ vẩn trong repo đi"). ⚠️ The user replaced all 3 again later the same day with cleaner
re-exports of the IDENTICAL artwork (dropped via Desktop, same convention as `apple.svg` before it) - if a
future session finds different viewBox numbers than the ones below, check `git log` before assuming
drift; the user's own re-exports are expected to change these over time.**
| File | What it is | Used by |
|---|---|---|
| `design/logo.svg` | THE FULL LOGO (wordmark, viewBox **1425×406** as of the 2nd revision, Inter letterforms - confirmed by the user, do NOT re-flag it as Barlow) | Splash · Login · PinGate · ForgotPin · SendReceipt, all through `.logo-lockup` |
| `design/new-brand/icon.svg` | THE APP/FAVICON ICON, viewBox **512×512** as of the 2nd revision - fully transparent background (no `<rect>` at all, dropped even the white square the 1st revision had) - copied to `public/icon.svg`, rasterised to `public/icon.png` + `public/fav_icon.png` at 512×512 **with a white background painted in during rasterisation** (iOS handles transparent apple-touch-icons poorly - fix the PNG step, not the SVG) | `index.html` favicon + apple-touch-icon (`?v=4`), `manifest.json` |
| `design/pfp.png` | Added 2026-09-11 (dropped via Desktop) - the EZ mark alone, for social profile pictures (X etc.) | nothing (storage only, not referenced by the app) |
DELETED 2026-09-11 as stale duplicates: `design/logo-icon.svg` (the pre-redesign GRADIENT icon - the brand
is solid-colour only now) and `design/luckypot/logo-full.svg` (never imported anywhere; `LuckyPot.jsx`
renders its name as text in Space Grotesk, it has no logo file). Do not recreate either.

**README screenshots REBUILT 2026-09-11** (the user: "UI đã ổn rồi đẹp rồi, dựng lại hình ảnh... phải trực
quan và ngắn gọn") - captured fresh via Playwright in mock mode (`?screen=<Name>`), replacing the deleted
pre-redesign set. Deliberately CONCISE per that instruction: ONE 4-image grid (`docs/app-send.png` ·
`app-receive.png` · `app-swap.png` · `app-luckypot.png`), not the old 2-section layout (4 GIFs + 6 stills).
No GIFs this round - stills only, faster to keep in sync with a UI that is still actively changing.
**`public/og.png` REBUILT 2026-09-11 (user confirmed: "nền đặc" = solid background, not the old gradient).**
New template (rendered with Playwright from an inline HTML string, no more `C:\tmp\ezw-verify\...` - that
path is gone): solid `#0B53BF` fill (no gradient - matches the redesign's "no more gradients" rule),
`design/logo.svg` forced white via CSS `filter: brightness(0) invert(1)` (no separate white-logo file
exists, so every future og-card rebuild should do the same rather than hand-drawing a white variant), the
same tagline/pills/URL copy as before, and a REAL screenshot (`docs/app-send.png`, the new one) in a
rounded phone frame on the right. Bumped `og.png?v=2` → `?v=3`.

> 🎨 **Design: the user does the UI themselves, and draws the icons themselves (viewBox 100, stroke 10).** Do not redesign on your own; wait for the user's direction and then port it. The aesthetic reference: Coinbase Wallet - big light numbers, pale tiles, plenty of breathing room.

---

## 6. Layout Rules

> ⚠️ **Positions in this section predate the 2026-09-10 grid fix** (they assume 84.4px rows and the old
> 90dvh button centre). The structural reasoning still holds; the numbers do not. See **READ FIRST §1**.

- **A 10-row grid WITH A 16px GUTTER** (`.screen` grid 10×1fr + `row-gap:16px`, 100dvh, padding `0 20px`, `position:relative`) → rows are **70px**, not 84.4. Sub-screens: the title in row 1, buttons in `.row10-single`/`.row10-dual` (absolute, now row 9 = top 81.52dvh / height 8.29dvh → centre 85.66dvh, forcing `grid-row:auto`). The 4 main screens: a full-bleed NavBar in row 10, text+icons at `--fs/is-body 19`. **An UNSELECTED tab = `--color-muted-2` #8E8E93 (MID grey, user decision 07-22d - the dark grey #636366 looked dull); the SELECTED tab = black + a brand bar above it.**
- **⚠️ `.screen` MUST have `grid-template-columns: minmax(0,1fr)`** - without it a single long `nowrap` string inflates the column and skews the whole screen. **A flex item holding nowrap text MUST have `minWidth:0`.**
- **THE APP-WIDE KEYBOARD RULE (user decision 07-23, "option A" - ending the two-keyboard conflict for good):** **ENTERING MONEY = the app numpad** (large, with a dot, independent of locale) · **ENTERING TEXT = the iPhone keyboard** · **NEVER both at once.** Concretely: SendAmount + CreateQR - focusing a text field (note/QR name/note popup) → `typingText` HIDES the numpad panel, and blur brings it back. The Add QR popup (SavedQRList) - the Amount field is no longer an `<input>` (the iPhone decimal keyboard on some locales shows a `,` that the regex swallows, and it breaks the app standard) but a div that opens the app numpad SHEET (geometry identical to the Swap sheet, rendered AFTER the popup so it floats above it, and the popup is anchored to the top half so they do not overlap; tapping the field blurs the Name field first so the iPhone keyboard drops). Do not add another screen that takes money input through the system keyboard.
- **The APP-WIDE numpad is the "MID GREY" style (user decision 07-22g: `--color-surface-2` #D1D1D6, no longer the pale surface #F2F2F7 - so the white keys pop):** the panel/sheet has a `--color-surface-2` background, full-bleed from HALF OF ROW 6 → the bottom of the screen, top corners at radius 20, with WHITE key tiles at radius 12 and an 8px gap - the shared class is `.numpad-gray` (index.css). SendAmount + CreateQR: `gridRow 6/11, margin 5dvh -20px 0, padding 24px 20px 0`, numpad flex 5.5 + the button/padding area flex 3.5, with the `.row10-dual` buttons floating on the grey. Swap: a sheet overlay with the same geometry (see the Swap section), flex 5.5/0.5/2/1. **24px of grey padding on top + SHORTER keys (numpad 5.5 parts, NOT 6)** - user decision 07-20c: if the keys are too big, reduce the key height; Back/Done ALWAYS stay anchored to the row 9-10 edge, do not move them.
- **The number-field caret is a blinking BLACK `_`** (class `.caret`, colour `--color-content`, user decision 07-22c: a grey caret clashed with the black text; it covers Swap/SendAmount/CreateQR). When EMPTY = the caret ONLY, with no faint 0 drawn (user decision 07-20b on Swap): do not draw a faint 0 beside the caret ("0 is 0, _ is _"). **"You receive" with NO amount entered = COMPLETELY EMPTY (the `idle` prop, user decision 07-23)** - "…" is ONLY for "an amount was entered and the estimate is loading" (it used to show "…" while idle too, which looked like a load that never finished). **The Swap screen - AREA LAYOUT (user decision 07-20e, FINAL):** the rows 2→9 area is one flex column with `justify-content: space-between` (paddingBottom 2dvh) split into **3 BLOCKS**, with the 2 gaps AUTOMATICALLY EQUAL (the user: "the You pay/receive group is as far from the hint+slider group as that group is from the Swap button", no lopsided space): (1) You pay + ⇅ + You receive + Fee/Rate; (2) the suggestion chips + PctSlider - **the chip row MUST have a FIXED `height: 40`** (bug 07-21: an empty `hints.map` → a 0-height row → space-between dragged the whole slider group down every time a hint appeared/disappeared; reserving the space keeps the slider still while the chips merely fade). **07-23 (reversing 07-22e): the "Slide to adjust…" hint pill was REMOVED - with NO amount chosen the row stays EMPTY (still height 40) and the instruction moved ONTO THE SWAP BUTTON: it reads "Slide or tap here to enter" (text at fs-item 17 - the default 21 gets ellipsised, verified with Playwright scrollW≤clientW) and tapping it opens the numpad (openPad); with an amount, the button returns to "Swap" and the round-number chips come back.** Verify by measuring `getBoundingClientRect().top` of the track + the Swap button at pct=0 and pct=50 - they must MATCH; (3) **the Swap button = the default `.btn` PILL** (radius 50, height 6dvh - user decision 07-21, REVERSING the 07-20e "square 8dvh" because it did not match the buttons on other screens) **CONCENTRIC with the Scan QR/Create QR action-cards**: its wrapper copies the `.action-grid` geometry exactly = `height 8dvh` + `marginBottom 2dvh`, last in the `2/10` flex space-between → a band of 80→88dvh with the button centred ⇒ **its centre at 84dvh** matches the action-card. **WIDTH = 3/4 OF THE SCREEN (07-29, previously 66.67%)** - see the "lone button" rule in section 5; the vertical centre is UNCHANGED (re-measured 07-29: the Swap button cy=709 = Create QR cy=709 @390). ⚠️ Do NOT add `paddingBottom` to the parent area (the block's marginBottom already reserves 2dvh) and do not change the height/radius back. Verify: measure the `centerY` of Scan QR (Send), Create QR (Receive) and Swap - they must be EQUAL (measured at 783px for all 3). The button is still the ONLY place the Preparing/Enter PIN/Submitted/error status appears. The You pay/receive cards are flex columns with **height `calc(20dvh - 5px)` + justify-content CENTER + gap 10** (user decision 07-22f: each card 20dvh-5px, plus the 10px ⇅ gap = exactly 40dvh → the 2 cards FIT rows 2-5 precisely and Rate/Fee lands in the top half of row 6; measured with Playwright at 390×844: You pay 10→29.4dvh, You receive 30.6→50dvh, Rate/Fee 51.2→53.6dvh - do NOT exceed 40dvh or Rate/Fee is pushed out of place). Center+gap pulls the label CLOSE to the token chip. **The balance line: You pay = "Available: <amount> <token>" (balLabel="Available"), You receive = "Balance: <amount> <token>" (balLabel="Balance") - on 07-22g the user asked to KEEP Available on You pay (do not remove it). The [SYM] token chip carries the black drop shadow like every button.** The ⇅ button uses margin **-17/-17** on a 44px button → a net 10px in flow = a 10px GAP between the cards (user decision 07-22b: touching looked bad; You receive moved to 31.2→51.2dvh and Rate/Fee to 52.4→54.7dvh, still in the top half of row 6). The button bridges the gap; **the ⇅ button (user decision 07-29 - REVERSING the 07-22h pale-blue-background/dark-blue-icon version): a `--grad-brand` GRADIENT circle + a WHITE `trade` icon + a .35 drop shadow (the gradient-button standard)** - the same family as `.btn-primary`/`.action-card.primary`; the button stays 44px and the 10px gap is unchanged. *(The icon here is `trade.svg`, NOT `swap.svg` - the user calls it "the swap icon", do not edit the wrong file.)* **Fee/Rate**: one fs-item 17 line, `Rate:` aligned LEFT · `Fee:` aligned RIGHT, grey labels with BLACK figures. Card content: the label · [token chip ▼ left | THE BIG NUMBER right, with no repeated token name] · [Available left | ~$ right]; **the You pay/receive labels are `--fs-body` 19 and the secondary Available + ~$ line is `--fs-item` 17** (07-21: making them equal DESTROYED the heavy/light hierarchy), the chip logo is 32 with 19 text, and the number is base 52 shrinking to fit. **The Swap numpad:** tapping the You pay AMOUNT → a sheet slides up covering **half of row 6 → row 10** (55→100dvh): a GREY surface background + WHITE key tiles at radius 12 with an 8px gap (raised buttons), NO wasted white space on top, and a TRANSPARENT overlay (user decision: a numpad rising while the main screen dims is WRONG); inside the sheet, the numpad takes 30dvh + the Back/Done pills at 44% sit at 85-95dvh (aligned with .row10-dual) + 5dvh of padding. Typing updates the amount + pct + estimate live; Back discards what was typed, Done/tapping outside keeps it; the slider and suggestion chips are unaffected.
- **SENDING TO YOURSELF IS FORBIDDEN (user decision 07-31 - "you must not let me send money to my own wallet"):** blocked in **3 places**, because there are 3 ways into the Send screen - `PasteAddress` (a well-formed address that is your own wallet → the button does not proceed + a red message, and the clipboard is NOT read over the top of it), `QRScanner` (scanning your own receive QR → say so and keep scanning, for both the camera and picked images), and `SendAmount` (**the final guard** for the Contacts route - the user can save their own wallet as a contact; it uses `walletAddr` fetched from Circle and NOT localStorage, because a PWA may be missing the key). The shared helper is `isOwnAddress()` in `data.js`.
- **A SELF-SEND IS NOT A SWAP (bug 07-31):** a self-send transaction has `from == to` on **ONE SINGLE ROW**, and `swapHashes` only required "an out and an in" → it was labelled **"Swapped 5.00 USDC to USDC"**, so the user searching for "Sent" found nothing and thought the transaction had VANISHED. The fix: any row that is both out and in is SKIPPED (a real swap always has 2 SEPARATE ROWS), and TxRow shows **"Sent to yourself"**. The mock includes this case (`0xmockself1`) so it can be retested.
- **TxHistory MUST SORT ITSELF + DateHeader keys need an index (bug 07-31):** the list renders straight from the array, and a repeated date label meant 2 `DateHeader`s with the **same key** → React warned *"children to be duplicated and/or omitted"* = **transaction rows can be dropped**. Fixed by sorting `timeStamp` descending on the client + `key={h-<date>-<i>}`.
- **TxHistory ALWAYS shows the FULL history** (user decision 07-20, correcting the 07-19 misunderstanding: it was once cut to 24h with a usage hint → WRONG). Only NOTIFICATIONS (NotifArea) are "today's" things; history is the reconciliation ledger - never truncated, and NO hints inside it.
- **TxHistory: a swap is 2 SEPARATE ROWS, never merged** (user decision 07-20d, reversing the 07-19 merge decision - merging into "Swapped X → Y" LOST both the -X / +Y figures on the right). Each leg is a TxRow: the out leg "-$X / X EURC" (red), the in leg "+$Y / Y USDC" (green). **Both rows are titled "Swapped <outAmt> <outSym> to <inSym>"** (e.g. "Swapped 20.00 USDC to EURC" - user decision 07-20d, a bare "Swapped" told you nothing) + **the subtitle "Swap completed · At <time>"**. It needs `swapPairs` (a map hash→{outAmt,outSym,inSym}, derived from `txs` so the Sent/Received tabs still have both directions) passing `swapInfo` into TxRow. `SwapRow` + `buildDisplayList` were deleted. TxRow fonts were REDUCED to fit the screen: icon 40→34, the money on the right fs-num 24→fs-md-lg 21, token/time/note at fs-tiny 13, vertical padding 11, gap 10.
- **MERGING applies to the 2 swap NOTIFICATIONS (NotifArea), NOT to history** (the user's reminder 07-20d): one notification, `Swapped X EURC to ~Y USDC (complete)` (or `(failed)`), fired from `Swap.jsx handleSwap`; `NotifArea.pollIncoming` has its `outHashes` branch DISABLED (no separate "Swap complete·received" any more).
- **The % slider (PctSlider):** magnet snapping depends on the GESTURE (user decision 07-20d) - CLICK/TAP `SNAP_TAP = ±9%` (easy to hit a mark), DRAGGING `SNAP_DRAG = ±2%` (does not fight the drag). `pctFromEvent(e, snapZone)`: down()→SNAP_TAP, move()→SNAP_DRAG. Verified with Playwright: click@47%→50, drag→47% stays put. Mark dots are 14px, the % labels are fs-item 17 and TAPPABLE (tapping a label jumps to that mark). Markers at 0/25/50/75/100.
- **ShowQR (viewing/creating a receive QR):** the big QR = `min(30dvh,78vw)` (the same size as on the Receive screen), 3 rows tall (2-4); rows 5→8 hold the big amount at `fs-amount` light + a `fs-md-lg` caption; the Share/Back buttons are in `.row10-dual` (9-10). The title is DYNAMIC based on the `fromStorage` flag (07-20d, NOT based on whether there is a name): opening a SAVED QR from the library → `QR Storage: <name>` (unnamed → `QR Storage: Item`); a newly created QR (Receive/custom) → `Create receive QR`. SavedQRList's onClick MUST pass `name: q.name` + `fromStorage: true`. **Add-to-QR-Storage (the SavedQRList popup, retitled from "Add to library" on 07-23):** the Amount field is a div that opens the app numpad sheet (see THE KEYBOARD RULE), with a placeholder carrying the default currency symbol - `Amount (${displaySymbol(getDisplayCurrency())})` (USDC→$, EURC→€).
- **A HINT (NotifArea) is `Label: description`, with the label BOLD (medium), NO underline, and TAPPABLE** (user decision 07-21, final - underlining was tried and dropped, the bold stayed): each line is `{label, desc, onClick}`, and tapping the label goes exactly where the button of the same name in row 9 goes; long sentences MAY WRAP (no nowrap/ellipsis - only REAL notifications keep to one line with "…"). **A hint's label MUST MATCH the row 9 button's label.**
  **The settled text (do not edit it yourself):** Send - `Paste: Paste a wallet address` → PasteAddress · `Scan QR: Scan a QR code to send` → QRScanner · `Contacts: Save people you send to often` → Contacts (the hint order matches the row 9 button order left→right, user decision 07-23: Contacts is used most → it sits on the RIGHT). Receive - `QR Storage: Save your favorite QR codes` → SavedQRList · `Create QR: Create a QR to receive money` → CreateQR · `Share: Share your wallet address` → handleShare.
  ⚠️ When a real notification arrives, the hint is pushed up and fades at the top edge (by design: the hint has the lowest priority). The token box on Send STILL scrolls with many tokens (do not remove the overflow).
- **SendAmount - THE DEFAULT NOTE** (user decision 07-20e): the Send-to/amount/note group is one flex column at `gridRow 2/6` with **gap 4dvh** (07-22c: 2dvh felt cramped → opened up while staying one centred group). The note field has an **`option` icon on the RIGHT** (a 52×52 button with a surface background) → a "Set your default note" popup (an input reading "Type here", Back/Save), stored in `localStorage ez_default_note`. The memo initialises to the default note → shown as a real VALUE (not a faded placeholder); **tapping the note field for the first time (onFocus) while it holds the default note CLEARS it for fresh typing** (`noteTouched` prevents it being cleared again). Every send then carries the default note in its memo.
- **CreateQR MATCHES SendAmount's GEOMETRY (user decision 07-23 "two screens with the same job must look the same"):** the same gridRow 2/6 flex column with gap 4dvh - line 1 "Amount to receive" (where "Send to: X" sits, BLACK medium text at fs-md-lg) · line 2 the amount + the [USD] chip copied verbatim from Send (chip fs-md-lg + a brand arrow) · line 3 the QR name field (fromLibrary) or **a placeholder of height 52** - without that third row, justify-center drags the whole group 43px down and the two screens no longer line up. Verify: measure the top of the label/caret/chip on both screens. ⚠️ UPDATED 08-25: they no longer match EXACTLY. The Send screen gained a `Balance:` line above `Send to:` (user request), which makes its centred block taller, so its amount/caret now sits **~15px higher** than CreateQR's (measured 229 vs 214 @390×844; the same ~15-16px at 375 and 360). The structure, the gaps and the 3-row rule are unchanged - only that one offset. Do NOT "fix" it by padding CreateQR: the two screens legitimately carry a different number of lines now.
- **The BIG balance in BalanceHeader** (user decision 07-20e, filling the empty space): `amountFontSize(str, 76, 7, 40)` - base 76px (previously fs-amount 52), shrinking with length (7 characters fit exactly, longer shrinks, floor 40), plus `whiteSpace nowrap` + padding 12 so a large number still fits the width. Shared by HomeSend/HomeReceive/MenuScreen.
- **The ShowQR title = `QR: <name>`** (user decision 07-20e, dropping the word "Storage" for compactness - long names need the room); an unnamed QR → `QR: Item`; a new one → `Create receive QR`.
- **SavedQRList row 9 = `.row10-dual`: [Back WHITE] + [Add BLUE]** (user decision 07-29, replacing the old `.row10-single` blue Back). Add opens the exact "Add to QR Storage" popup that the "+" tile in the grid opens (`setAdding(true)`) - adding a QR is the screen's main action, so the user should not have to scroll to find the "+".
- **Deleting a QR in SavedQRList uses a CONFIRM POPUP** (user decision 07-20e, guarding against mis-taps): tapping × → a `Delete QR: <name>` popup (unnamed → the amount) + [Back][Confirm in red], never an instant delete. The standard popup, centred over rows 1-6.
- **The `right2` chevron (a row that goes somewhere) uses `--color-brand`** (07-20, previously `--color-faint`, which read as disabled); `--color-faint` is now only for placeholders/hidden icons. The standard text field is height 52 + `--fs-md-lg` (email/memo/paste address are all aligned).
- **Text inputs live in rows 1-4, or in a popup anchored to the top half** (`.popup-card` centred at 30dvh) - the iPhone keyboard covers the bottom half. No autoFocus inside a popup. **Page scrolling is pinned** (an `App.jsx` listener) - DO NOT remove it.
- **The 55dvh position = "the secondary line in the middle of the screen"**, shared: the Hold-to-show button (Send) and the address+copy line (Receive) are absolutely positioned at top 55% → switching tabs, nothing jumps. The QR on Receive = `min(30dvh, 78vw)`, occupying rows 3-6.
- **HomeSend:** rows 1-2 the balance · 3-5.5 the token box · 7-8 NotifArea · 9 the 3 action-cards (left→right **Paste · Scan QR · Contacts**, user decision 07-23) · 10 the NavBar. **QRScanner (07-29):** row 1 = the TITLE "Scan QR" (consistent with every sub-screen - this screen used to have no title and the scan box took row 1 as well); the scan box + 2 caption lines moved down to be centred on **rows 2-7**; the right (blue) button is **"Done" and NOT "Back"** (user decision 07-29: a blue button is the primary/finishing action, and "Back" on a blue button reads as the wrong role - Back is always the secondary WHITE button).
- **SendReceipt (07-23):** the confirm box + the receipt canvas carry an **Address row with the SHORTENED address `0x1234…5678`** (user decision: NOT the full one - long and ugly), and it is **shown ONLY when Send to is a contact NAME** (without a name, Send to is already the shortened address, so repeating it is redundant). The canvas is `H = 590 + 60·(has Address) + 60·(has Note)` - the bottom of the last row + **50px of breathing space + the logo + a 22 margin** (the logo used to touch the last row's divider - do not let that return).
- **A TxHistory row:** on the left `[icon] Sent/Received` + the time + [Add to Contacts] + the Note; on the right `±$` (red/green) + the real token in grey. **NO grey separator lines** in lists/boxes (except the NavBar + the Rate/Fee row).
- **`<button>/<input>` must inherit the font** - there is a global `font-family: inherit` rule, do not remove it.

---

## 7. Circle/Arc gotchas (hard-won - keep forever)

**Circle W3S:**
- **The PIN screen is a `pw-auth.circle.com` iframe (cross-origin):** its UI structure cannot be changed, and **the numeric keyboard CANNOT be opened automatically** (browsers forbid cross-origin focus, and iOS requires a direct tap - the user already asked, do NOT dig it up again). **The iframe also CANNOT be closed sooner after the PIN is entered** (the user asked 07-20): the SDK already removes the iframe IMMEDIATELY on the `onComplete` message (read the `messageHandler` source); the 1-3s "pause" after typing is Circle's spinner processing the challenge inside the iframe. Removing the iframe before the challenge settles loses the signature (the root cause of the old PIN bug) - DO NOT do it.
- **⚠️ HISTORICAL (08-04, no longer in the code): Vietnamese was once enabled for the PIN/security screens through `setLocalizations`** (the translations lived in `src/circleLocalizations.js`, called from `circle.js:getSDK()` + the 2 SDK constructions in `Login.jsx`). That reversed the earlier "pure English because Circle only half-localises" decision (07-01), which was WRONG: reading the docs carefully (customization.md + web-sdk-ui-customizations, checked 08-04) showed the Recovery Method + security questions ARE localisable, not hardcoded as previously assumed. **The part that was right:** there is no field for runtime ERROR text (wrong/locked PIN...) → that stays English, which is acceptable because it rarely appears. **Never localised:** `transactionRequest`/`contractInteraction`/`signatureRequest`/`emailOtp` (the SDK supports them, but those fields mix static labels with dynamic values and need careful testing). **All of this was removed on 08-25 together with the i18n layer** - the app is English-only and English is Circle's own default, so nothing is called. If multi-language ever returns, the file and the correct call are in git history.
- **2 bugs found while testing the Vietnamese Circle screens (08-04), both fixed at the time (kept as SDK lessons):**
  1. `requiredMark` (the "Required" word beside Question/Answer) was concatenated by the SDK DIRECTLY onto the preceding label with no space inserted ("QuestionRequired") → fixed with `requiredMark: ' (required)'` (padding the space + brackets yourself).
  2. The 3 risk-warning lines on the "Security confirmation" screen stayed English despite `setLocalizations` - because they belong to the `securityConfirmItems` field of a **DIFFERENT** method (`setCustomSecurityQuestions`), not to the `Localizations` object. That method had to be called as well (in 3 places, like `setLocalizations`).
- **✅ 08-04c - CONFIRMED FOR REAL: `inputMatch` (the "Security confirmation" screen) DOES change the phrase the SDK validates against.** Setting a custom `inputMatch` and typing that exact phrase on a deploy genuinely enabled the Continue button. It is not merely displayed text, as first feared.
- **🔴🔴 08-04 - THE ROOT CAUSE of the "EMPTY security questions screen": CALLING `setCustomSecurityQuestions` WITH THE WRONG SIGNATURE. Our mistake, NOT Circle's.** That method takes **POSITIONAL ARGUMENTS**, not an object:
  ```js
  setCustomSecurityQuestions(questions?: SecurityQuestion[] | null, requiredCount = 2, securityConfirmItems?: string[])
  ```
  (verify: `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts:91`; the body at `index.js:254` assigns `this.securityQuestions = questions` directly, with NO destructuring.) Calling it object-style as `setCustomSecurityQuestions({ questions, securityConfirmItems })` → the SDK received the whole **object** where an **array** of `questions` was expected → a broken question list → **an empty screen that blocked the entire wallet-creation flow**; and at the same time `securityConfirmItems` (the THIRD argument) never arrived → the 3 warning lines stayed English. **One bug explaining both symptoms.** Fixed by passing positionally in all 3 places. Check: `grep -rn "setCustomSecurityQuestions({" src/` must be EMPTY.
  **The lesson:** the 3 attempts before that all changed the WRONG variable (removing `questions`, then disabling the method, then disabling `Localizations.securityQuestions`) because they reasoned from symptoms instead of READING THE FUNCTION SIGNATURE in `node_modules` - which was there from the start and takes 30 seconds to read. When an SDK behaves strangely: read the `.d.ts` + the function body FIRST, do not guess and trial-and-error on production.
- **`Localizations.securityQuestions` WAS INNOCENT** - it was fully re-enabled. The user's screenshot at `f02cd86` (when only `setLocalizations` was called, before `setCustomSecurityQuestions`) showed the screen rendering the full dropdown + input → that block never emptied the screen.
- **✅ 08-04e - the same `securityIntros` concatenation bug fixed too:** two headline strings running together, the same disease as `requiredMark` (the SDK joins `headline`+`headline2` without inserting a space) → pad a leading space onto `headline2`.
- **`getSDK()` is ASYNC (lazily loading 740KB of SDK+polyfill)** - every call site MUST `await getSDK()`. Forgetting the await kills the PIN silently. Check: `grep -rn "getSDK()" src/ | grep -v await` must be EMPTY.
- **A userToken lives 60'** → call `refreshSession()` before ANY PIN action.
- **A wrong PIN does NOT close the iframe** - `executeChallenge` IGNORES `RETRYABLE_CODES` (155112/155703/155704/155115/155705) and only settles on success or a terminal error. `155701` = the user cancelled → stay silent.
- The 3 PIN endpoints: `POST /user/pin` to set · `PUT` to change · `POST /user/pin/restore` for a forgotten PIN. SSO/OTP users have no PIN → 403.
- `contractExecution`: flat fields with `feeLevel:'MEDIUM'`, accepting `abiFunctionSignature`+`abiParameters` or `callData`. Circle errors: return them verbatim as `message (HTTP status, code)`; read `e?.message || e?.error?.message`.
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.

**Arc / Stablecoin Kit:**
- **The public RPC is STRICTLY RATE LIMITED (HTTP 429):** reading several things MUST be folded into Multicall3 (`publicClient.multicall()` does it for you); retries spaced ≥600ms; frequent retries walk into a permanent 429 (lesson 07-17b). **A failed read shows `…`, it NEVER draws 0.**
- Gas is paid in USDC (18 decimals internally) and is very cheap - show `< $0.01` rather than `$0.00`.
- **ArcScan (Blockscout) IGNORES `limit` - use `page` + `offset`** (measured for real 07-31 on a busy wallet): `&limit=50` → returns **10,000 rows / 11.7s**; `&page=1&offset=50` → 50 rows / **0.4s**; `offset=1000` → 1.7s. TxHistory used to pass `limit=50` and was therefore **silently downloading the wallet's ENTIRE history** on every open. ArcScan DOES honour `sort=desc` - but the list still **sorts on the client**, because the API order must not be trusted.
- **Do NOT merge `txlist` (native transfers) into history** (tried and REJECTED 07-31): Arc uses USDC as its native token, so it seemed `tokentx` might be missing native transfers → measurement showed **0 missing transactions** over the same window (Blockscout always indexes native transfers as token transfers). Adding `txlist` would **DOUBLE-COUNT 70 of 75 transactions**.
- **A COLD Arc RPC call takes ~3.3s** (subsequent ones 130-360ms; measured 07-31). So EVERY screen that reads balances MUST seed from the module-level cache (`cachedBalances`) and fetch in the background - HomeSend/HomeReceive/Swap all do. A screen that starts from `{}` leaves the user staring at `…` for seconds.
- **RPC CORS: fine on production, NOT on localhost.** `rpc.testnet.arc.network` echoes `access-control-allow-origin` for the real Origin (verified from a browser running INSIDE the `ezwallet.cash` origin: 200, 535ms) but blocks `http://localhost:5173`. → red CORS logs from the RPC during `npm run mock` are **NORMAL**, not a production bug, so do not go fixing them.
- The Kit's `amount` is in base units (section 4).

**PWA (added to the iOS home screen):**
- **The grey band at the top of the status bar is the `body` background.** An iOS standalone PWA without `viewport-fit=cover` (index.html) keeps content inside the safe area; the status bar region (outside the viewport) is filled by iOS with the **`body` background colour**. It used to be `--color-gray` → a visible grey band. Fixed 07-19: `body background = --color-white` (index.css) → it blends with `.screen`. **Do NOT set the default body background back to grey.** ⚠️ Updated 07-22: the area OUTSIDE the app frame on desktop/tablet is a SOFT PASTEL BLUE through `@media (min-width: 481px) { body { background: #D6EAFB } }` (user decision 07-22c - from #0B53BF→#0088FF→#D6EAFB, paler each time to stop it glaring; reversing the 07-21 grey) - safe because phones are always ≤430px and never reach the threshold; `.screen` has its own white background so the app frame is not tinted. For a native-style full-bleed look, add `viewport-fit=cover` + `env(safe-area-inset-*)` padding to `.screen` (which touches the 10-row grid - the user chose NOT to, keeping the white background). ⚠️ NOTE 08-25: `body` is currently set to `#D6EAFB` at the default (non-media-query) level too - a TEMPORARY change for filming a clip, marked in index.css:114. Change it back to `var(--color-white)` once filming is done.
- iOS caches the meta/manifest at "Add to Home Screen" → manifest/meta changes do not take effect until the app is **deleted and re-added** (CSS changes like the above take effect on the next open).

**Other:**
- iOS Safari: no BarcodeDetector → jsQR; the Web Share API saves to Photos; do not use `clipboard.readText()` (an annoying dialog). **The single exception: the Paste button in PasteAddress** - and it only reads when the field is empty (07-23): the "Paste|Speak" popup is an iOS 16+ CONFIRMATION (clipboard security, the web cannot disable it, and it cannot be replaced with our own popup either - ours would come BEFORE the iOS one, making it two taps; "Speak" appears because Spoken Content is enabled on the device); if the field already holds a valid EVM address → **the button label flips "Paste"→"Confirm"** and it proceeds directly without touching the clipboard → no popup. The user has asked twice; stop looking for a way to "disable/replace the popup".
- Screens without a NotifArea show errors through `ErrorToast` (passing `sendError` through navigate).
- Sign-out only clears the session keys, KEEPING `ez_contacts/ez_saved_qrs/ez_currency`.
- **localStorage IS TIED TO THE ORIGIN → changing domain "loses" local data (07-29, not a bug):** anyone who used the app on `ezwallet.pages.dev` will arrive at `ezwallet.cash` **signed out, with empty contacts / QR library / notifications** - because the `ez_*` keys live on the old origin. **THE WALLET AND THE MONEY ARE NOT LOST** (the wallet is tied to the email at Circle: sign in with the same email + PIN and it is back). Only `ez_contacts`/`ez_saved_qrs` have to be re-entered by hand, or viewed by opening the old link. Do not promise the user that everything carries over.

---

## 7b. QR - LOCKED TO THE ARC NETWORK (user decision 2026-08-13)

**`src/qr.js` IS THE SINGLE SOURCE OF TRUTH for the QR format.** Every drawing site (HomeReceive · ShowQR · SavedQRList) calls `buildQR()`, and the reading site (QRScanner) calls `parseQR()`. **Do NOT hand-build `ezwallet:...` strings in any screen** - before 08-13 it lived in 3 places, and fixing one left the others wrong.

```
ezwallet:0xABC…@5042002                      ← the default QR on the Receive screen
ezwallet:0xABC…@5042002?amount=25&cur=USD    ← a QR with a preset amount
```

**Why it is locked:** the default QR USED TO draw a **bare `0x…` address**. EVM addresses are identical on EVERY chain ⇒ any wallet sitting on Ethereum/Base/BSC can scan it and send, and money that lands on another chain is **gone for good**. The app's audience is older people with no way of noticing the wrong chain. The user's position: **"for now we use one network only"**; CCTP Unified Balance may come later, possibly under the model *"a different chain is a different bank"*.

**The asymmetry is DELIBERATE (do not "make it consistent"):**
- **The QR is LOCKED** to Arc. It is the one-tap-and-it-sends path, so it must be blocked.
- **The address as text (the copy button / Share) is LEFT BARE**, with no chain attached. That is the escape hatch for topping up from an exchange or another wallet. The user's ruling: *"the wallet address itself is fine".*

**⚠️ EIP-681 (`ethereum:0x…@5042002`) IS DELIBERATELY NOT USED:** that standard does have a chainId field, but plenty of wallets implement it sloppily - they read the address and **ignore `@chainId`**, sending on whatever chain is open ⇒ more dangerous than a bare address, because we would believe it was locked. Faced with the unknown `ezwallet:` scheme, other wallets have only one option: **refuse**.

**parseQR accepts 3 shapes** (round-trip tested): the standard `ezwallet:…@5042002` · `ezwallet:…` **with no @chain** (OLD QRs printed/shared/saved as images before 08-13 - treated as Arc, they must keep working) · **a bare `0x…`** (a QR from an outside wallet that we scan IN ORDER TO SEND - locking this would leave the user unable to send to outsiders). An EZwallet QR from another chain → returns `{ wrongChain }` → the scan screen says *"QR from another network – this wallet currently only works on Arc"*. **`{ wrongChain }` has NO `.address`** - catch it before the valid branch, or you land on the amount screen with `undefined`.

**Changing chain (mainnet / adding a chain) → edit `ARC_CHAIN_ID` in `src/qr.js`** (`chain.js` imports that constant for `defineChain`, so it is not declared twice).

---

## 7e. MONEY-RECEIVED NOTIFICATIONS - the polling interval (bug reported 2026-08-13)

**The symptom:** *"the money-received notification takes forever to appear"*, while **sending shows instantly**.

**The root cause:** `NotifArea.pollIncoming` - named *poll* (ask repeatedly) but called **EXACTLY ONCE** on mount (`useEffect(..., [])`), with **no `setInterval` anywhere in the app**. Sitting still on Send/Receive, money could arrive with nobody asking again → the notification only appeared when the user happened to switch tabs (a component remount). **SENDING** appeared instantly because `SendReceipt` calls `addNotif` itself with no network involved - so only RECEIVING was slow.

**⚠️ WHY THIS IS NOT A SMALL BUG:** this app is for older people. Being told *"I sent you the money"* and opening the app to nothing makes them **WORRY**, then call to ask, then tap randomly. Silence on a money screen is a serious bug. Do not "optimise" the repeated polling away.

**THE INTERVAL FOLLOWS WHAT THE USER IS DOING (user decision):**

| Screen | Interval | Why |
|---|---|---|
| **Receive** | **5s** (`pollMs={5000}`) | The QR has just been held out to someone; they are **standing there waiting** for the money |
| **Send** | **15s** (default) | Nobody is waiting for incoming money on this screen |

- **Skip the tick while the tab is hidden** (it costs battery/data and nobody is looking) + **ask IMMEDIATELY on returning to the app** (`visibilitychange`) - the most common scenario is: told the money was sent → open the app → it must be there.
- A module-level `polling` flag prevents overlapping requests on a slow network.
- ⚠️ **If one screen needs to be faster, pass `pollMs` to THAT screen only**, do NOT lower the default: each tick is a request multiplied by every device with the app open.
- ⚠️ The effect's deps are `[pollMs]`, not `[]`.

**Measured with Playwright:** over the same 22s → the Receive screen polled **4 times, evenly spaced 5.0s apart**; the Send screen **once**. Hiding/showing the tab triggered an immediate poll.

**STILL MISSING:** the polling only runs on the **Send or Receive screens** (the only 2 that render `NotifArea`). Money arriving while the user is in History/Menu/Swap goes unannounced until they return Home. Announcing it on every screen means moving the polling up into `App.jsx` - **not done, it needs the user's approval because it touches the architecture**.

---

## 7f. AUTO-CONVERT ON INSUFFICIENT USDC (user idea, raised 2026-09-08) - ⚠️ NOT BUILT, NOTES ONLY

**The scenario:** the Send screen defaults to "USD" = sending USDC 1:1 (section 2). Today, if the wallet shows e.g. $20 total but that $20 is actually EURC (0 USDC), `SendAmount` checks the balance of the EXACT selected token → the send is blocked with "Insufficient balance", even though the wallet is not really empty. The user finds this confusing: the top-line balance says $20, but sending fails.

**The user's proposed fix (idea only, exact wording given 09-08 - do not rephrase the confirmation copy without asking):**
1. When the user tries to send USD/USDC and the USDC balance is insufficient, **auto-convert (swap) the token with the HIGHEST balance into USDC** rather than just blocking.
2. Before doing it, **show a confirmation** with a message along the lines of: *"Hết USDC nên auto convert token có số dư cao nhất thành USDC"* (out of USDC, so auto-converting your highest-balance token into USDC) - the user must confirm before it runs.
3. If the user instead **manually picks EURC** (the currency chip) as the send currency, show the balance as **"Available: 20.00 EURC"** (i.e. label the balance line with the real token, not converted to $).

**Open questions - NOT settled, ask the user before building:**
- Which existing plumbing performs the conversion - the real Swap flow (`_swapCore.js`, 0.1% fee, section 4) or something else? If it's the real Swap, the 0.1% app fee would apply here too - does the user want that?
- Exact trigger point: only when USDC is fully 0, or also when USDC is nonzero but not enough to cover the typed amount (partial top-up vs. full conversion of the whole balance)?
- Exact button/copy for the confirmation dialog (Confirm/Cancel wording, where it appears - a popup like the note popup, or inline like the `overBalance` error text).
- What happens with cirBTC in the "highest balance" comparison - does it get force-converted too, or is auto-convert EURC→USDC only?

**Already true today (no change needed):** part 3 above (manual EURC selection showing the real-token balance) is effectively already the case - `SendAmount.jsx`'s "Balance:" line already uses `fmtMoney(availableAmt, cur)`, which renders EURC as `"20.00 EURC"` (not converted to `$`), and the "Insufficient balance" message already quotes the balance in the selected token. Only the label differs ("Balance:" vs the user's wording "Available:") - a possible one-word tweak, not a new feature.

---

## 7d. ⛔ REMOVED 2026-09-10 - THE BUG-REPORT BUTTON → TELEGRAM (2026-08-13)

> The whole feature was deleted at the user's request: `BugButton.jsx`, `functions/api/bug.js`, the bug
> icon, the `/api/bug` dev route and `__APP_VERSION__` are gone (commit `dd13c26`). **Still to do by hand:**
> remove `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from Cloudflare Pages → ezwallet → Settings → Variables,
> and revoke the bot via @BotFather. The rest of this section is kept only as a record of how it worked.

A **grey** 🐛 icon (`--color-muted-2`) flush right, centred on **row 1**, present on **EVERY screen including Login/PinGate** (errors are most likely exactly when you cannot get into the app). Rendered once in `App.jsx` inside an anchor frame of `maxWidth: var(--screen-max)` → it hugs the right edge **of the app**, not the desktop screen edge.

⚠️ **COLOUR: do not change it to blue/red** (the user weighed all 3): brand blue = the "tap this" colour → it would compete with the main content on every screen; red = the error/danger colour → a red dot next to the balance makes older users think **their money** is in trouble. Grey = "a tool sitting there, not needed yet" (= an unselected navbar icon).

**`functions/api/bug.js` - the bot IS ONLY A TOKEN, it does NOT run in the background and needs NO VPS.** It does not listen, poll or use a webhook: each button press is one `fetch` to `api.telegram.org` and then it ends. (Completely unlike the TemBro bots on the VPS that must run 24/7.)

- ⚠️ **Do NOT use `parse_mode`** - the user types freely, and turning on Markdown/HTML breaks the message (`*_\`<>`) or allows tag injection. Plain text needs no escaping.
- ⚠️ **Whitelist exactly 5 fields** (`message/screen/wallet/device/version`). The client must **NOT collect localStorage** and send it. `ez_user_token` / `ez_encryption_key` / `ez_refresh_token` / `ez_sync_token` getting out means **LOSING THE WALLET**. The wallet address is sent (it is public, and without it a failed transaction cannot be looked up).
- Flood protection of **5 per hour per IP** through the `EZ_SYNC` KV. **With no KV, SKIP the guard rather than blocking everything**: better to take spam than to lock out someone genuinely calling for help.
- Telegram returns **200 with `ok:false`** for a wrong chat_id / a blocked bot ⇒ you must read `ok`, never trust the HTTP status alone.
- With the variables unset → **503 `bug-report-disabled`** and the app runs normally (the same pattern `sync.js` uses without a KV binding).

**Environment variables (ALREADY SET on Cloudflare Pages production, encrypted):** `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID`. The bot is `@ezwallet_report_bot` ("EZwallet Bug Report"). The values are also in the local `.env.txt` (gitignored) so `dev-server.js` works.
⚠️ **Pages only applies new variables to NEW deployments** - after setting them, create a new deployment (`POST …/pages/projects/ezwallet/deployments -F branch=main`); the running build will **not** pick them up.
⚠️ Telegram **blocks a bot from messaging anyone who has not pressed Start with it** - if the recipient changes, that person must press Start first.

**The version in a bug report** = 7 characters of the commit, embedded at build time (`vite.config.js` → `__APP_VERSION__`): Cloudflare provides `CF_PAGES_COMMIT_SHA`, locally it asks `git`, and if both fail → `'dev'` (never let the build die over it).

**Verified on production:** a real POST → `{"ok":true}` + the message arriving in Telegram. An empty message → 400 `empty-message`. *(The 5-per-hour limit has only been read in the code, not fired for real, because testing it means spamming the user's Telegram.)*

---

## 7bb. Web Share on iOS - `files` + `text` REMOVES SOME TARGET APPS (bug reported 2026-08-13)

**The symptom:** tapping Share on the Receive screen → the iOS share sheet **appears normally** but **Messages/Zalo are MISSING** from the list of target apps.

**How it was narrowed down (reusable for future share bugs):** ask the user 2 questions - *does the sheet appear at all* (it does ⇒ `navigator.share()` is NOT blocked, ruling out "share called outside a gesture") and *do the other 2 share buttons still work* (they do ⇒ the fault is only here, not in `saveImage.js`). Then `grep saveImageToPhotos(` → **the Receive screen is the ONLY caller passing a `text` argument**; ShowQR and SendReceipt send only the image and work fine. ⇒ `text` is the culprit.

**The rule learned:** `navigator.share({ files, text })` makes iOS **filter the target apps**. Sending only `{ files }` brings Messages back.

**⚠️ THE FIRST FIX WAS REJECTED BY THE USER - read carefully so you do not loop back to it.** That version dropped `text` and **drew the address onto the image**; the user disliked it (*"putting the address on the QR looks awful"*) and ruled: ***"as long as it shares 2 things, not 1"***.

**FINAL STATE (user decision 08-13):**

| Share site | What is sent | Note |
|---|---|---|
| **Receive screen** | **THE IMAGE + the wallet address as TEXT** | ⚠️ Including text ⇒ iOS filters the target apps (Messages can disappear). **The user KNOWS and ACCEPTS this.** Do NOT drop `text` to "fix" it again. |
| **ShowQR / QR library** | **IMAGE ONLY** | Here the amount inside the QR is what matters; scanning yields the address, so attaching it is both redundant and costs target apps. |
| **Receipt** | IMAGE ONLY | unchanged |

**The QR image comes from the shared `saveImage.brandedQrCanvas()`** - the QR + the words **"Only Arc Testnet"** + the EZwallet logo. **The address is NEVER drawn onto the image.** Both the Receive screen and ShowQR go through that function, so do not hand-draw it anywhere.
**This also closed pending item B in section 9:** shared images now carry the network label. The screen itself still does not (the user still has to choose where to put it).

---

## 7c. THE SUCCESS SOUND (user decision 2026-08-13) - ⚠️ STILL UNFINISHED

**Status:** `src/sound.js` is written. **NOT wired into any screen, NO off switch yet, NOT tested, NOT committed.** The remaining work is in section 9.

**The user's 4 decisions (alternatives were weighed before deciding - do not propose them again):**

| | Decision | REJECTED, and why |
|---|---|---|
| Where it plays | **After sending money** (SendReceipt) · **after a swap** | ❌ *Money received*: it arrives on its own with NO user gesture ⇒ iOS blocks playback, requiring an AudioContext kept alive for the whole session. ❌ *Copy/save QR/small actions*: too many chimes and the sound **loses its meaning**, so the moment money leaves the wallet no longer stands out |
| Where the sound comes from | **Generated with Web Audio** (2 rising sine notes C6→E6, ~0.3s) | ❌ *An mp3 file*: it has to be sourced, it adds weight, it carries licensing questions, and the first play can lag |
| An off switch | **YES** - add a row to the `Currency` screen (formerly Language & Currency) | ❌ *No off switch*: if iOS plays sound even on a silenced phone, the user would have no way out |
| Default | **ON** (`localStorage.ez_sound`, only written as `'off'` when muted) | — |

**⚠️ THE iOS RULE - why `unlockOnFirstTouch()` exists:** an `AudioContext` is born `suspended` and **can only be `resume()`d INSIDE a user gesture**. By the time a send completes, several `await`s have passed (PIN signing inside the Circle iframe, waiting on-chain) ⇒ **the gesture chain is BROKEN** and calling `resume()` there is too late. So it must be unlocked on the **FIRST touch anywhere in the app** (App.jsx calls it once). Touching Circle's PIN iframe does **not** count for our page.

**⚠️ UNKNOWN, must be tested on the user's real device:** whether iOS honours the **silent switch** for Web Audio - it varies by iOS version. That is exactly why an in-app off switch is mandatory.

**⚠️ Vibration (`navigator.vibrate`) IS NOT POSSIBLE on iPhone** - Safari iOS does not support it, only Android does. Do not promise "vibrate + chime".

**The golden rule:** `playSuccess()` must **fail silently** (everything wrapped in try/catch, returning when there is no `AudioContext`) - **a chime must NEVER break the money flow**.

---

## 8. localStorage keys

**Session:** `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (email login), `ez_refresh_token`/`ez_google_email`/`ez_google_deviceId`/`ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`, `ez_notified_hashes`, `ez_faucet_pending`. `sessionStorage.ez_pin_ok` = the session unlock flag; **`sessionStorage.ez_sync_token`** = the contacts-backup token, traded for a PIN signature in `PinGate` (08-06) - **deliberately in sessionStorage** so it dies with the app session and reopening the app signs again.
**Persistent:** `ez_contacts_<addr>`, `ez_saved_qrs_<addr>` (per account, see `store.js`), `ez_currency`, `ez_default_note`, **`ez_sync_at_<addr>`** (the last-edit stamp - the arbiter of the "newest wins" rule for KV backups). (`ez_lang` no longer exists: the i18n layer was removed 08-25.)

---

## 9. What comes next


*(Per-session change-log tables for 2026-09-07, 2026-08-25 (both parts), and 2026-08-13 moved to
`HANDOFF-LOG.md` - read them there if you need the detail behind an item below.)*

### 🟠 UNFINISHED - session 2026-08-13 (do this FIRST)

**A. The success sound** (the full decisions are in section 7c, do not ask the user again):
1. `App.jsx` → call `unlockOnFirstTouch()` once in a `useEffect` at startup.
2. `SendReceipt.jsx` → `playSuccess()` on entering the screen (next to the `addNotif('Sent…')` call).
3. `Swap.jsx` → `playSuccess()` right after `setSuccess(true)` (the "submitted" step, where the user sees the button turn green).
4. `Currency.jsx` → add a second row **"Sound: On/Off"**, reusing the existing `Picker` component + `CHIP` style (do not invent a new toggle). The grey box must grow from `gridRow: '2 / 3'` → `'2 / 4'` for 2 equal rows.
5. **Rename the screen** `Currency` → **"Settings"**: the label in `MenuScreen` ITEMS + the screen title. Reason: it would no longer hold only the currency. ⚠️ Splitting this screen off from Security (08-04) still stands, do not merge them back.
6. (The old step 6 - adding i18n keys - no longer applies: the i18n layer was removed 08-25, so the new strings are written directly in English.)
7. **Test on the user's real device** (headless Playwright cannot HEAR anything; it can only verify that nothing throws and that the off switch writes localStorage correctly): check whether iOS honours the **silent switch**.

**B. The network label ON SCREEN on the Receive screen - WAITING FOR THE USER TO CHOOSE WHERE IT GOES.** *(Shared images have carried "Only Arc Testnet" since 08-13 - see 7bb. Only the on-screen part is missing.)* The QR is locked to Arc at the data level (section 7b), but **nothing on screen says which network this is** - a machine can read `@5042002`, a person only sees a black-and-white square. It fits the model the user is considering: *"a different chain is a different bank"*. The obstacle: the Receive screen is already full (row 6 the copy button, 7-8 the hint area, 9 the three buttons) → **where it goes is the user's layout decision, do not insert it yourself**.

**C. Money-received notifications only run on the Send/Receive screens - WAITING FOR THE USER'S APPROVAL (it touches the architecture).** Those two are the only screens rendering `NotifArea` (section 7e). Money arriving while the user is in History / Menu / Swap goes unannounced until they return Home. Announcing it everywhere means moving the polling up into `App.jsx` - ~20 minutes, but it relocates the logic, so the user has to agree.

**D. Swap `No route available` - NOT OUR PROBLEM, WAIT FOR CIRCLE.** See the red block at the top of section 4. Do not edit the code; re-measure the 3 pairs periodically and stop when it works again.

*(The 2026-07-31 deploy-click checklist and the since-removed multi-language ownership notes moved to
`HANDOFF-LOG.md`.)*

---

### Roadmap / future direction (brainstormed 07-24 - ⚠️ NOT settled, NOT started, notes only)

> The user raised the 4 directions below as a VISION, not a commitment. Do not build them on your own. The COMMON blocker for most of them: **how far Circle User-Controlled Wallets support native/biometric/EIP-712 - read the Circle docs and verify BEFORE building.**

1. **More Languages & Currencies (global users).** ⚠️ Updated 08-25: the i18n infrastructure NO LONGER EXISTS (it was removed with Vietnamese/Chinese - see section 2). Bringing this back means designing it again from scratch, plus real translations and rates for the new currencies (the base is USD).
2. **Privacy features (protecting the balance).** The idea: hide the balance (tap to reveal), a privacy mode. NEW, not designed.
3. **A native mobile app.** FaceID/fingerprint (instead of the PIN), real push notifications, Keychain/Keystore (safer token storage than localStorage), the App Store/Play Store. The approach that avoids a rewrite: wrap the existing React app with **Capacitor** + native plugins → reuse the code. ⚠️ Verify: (a) whether Circle's PIN iframe runs inside a Capacitor webview, (b) how Circle's native SDKs (iOS/Android) bind biometrics to a User-Controlled Wallet.
4. **In-app selective services (offering services to customers).** NOT a dApp browser open to every dApp (that contradicts "safe for older people" and is full of approvals and scams). Instead: wrap 1-2 SELECTED reputable DeFi/services into EZwallet's simple UI, hiding the complexity behind it. ⚠️ Verify: whether Circle can sign **EIP-712** + arbitrary transactions (only contractExecution + message signing are used today); it also needs mainnet + more chains (this is Arc Testnet). *(Promise no interest rates or specific products - design that separately when it is actually built.)*

> Considered and SET ASIDE: **a browser extension** - feasible, but desktop-only (against the mobile-first positioning for older users), plus the risk of the Circle SDK/PIN iframe clashing with Manifest V3's CSP, and the `chrome-extension://` origin possibly not being whitelisted by Circle. The PWA (already shipped) fits the target better.

---

## 10. Key lessons (distilled - the details are in git log)

- **A swap must go through `adapter.execute` with a signed intent** - unpacking the instructions and running them by hand LOSES MONEY (it happened).
- **Aggressive retries against a rate-limited RPC are self-destructive** - batch with Multicall + back off generously; when a number is not certain, show `…` and never draw 0.
- **Circle's iframe keeps the modal open when the user gets it wrong** - rejecting the promise early means the user enters it correctly and the result falls into the void.
- **A grid with no declared columns / a flex item without minWidth:0** = one long string wrecks the whole screen's layout.
- **A function named `poll…` with no `setInterval` is a lethal silence** (08-13): the money-received notification ran once on mount for weeks. Sending appeared instantly (it calls `addNotif` itself), so the bug hid well. **For an audience of older people, an app that goes silent on a money screen is a SERIOUS bug, not a small one.**
- **A rounding step tied to powers of 10 gives one tier per decade - far too coarse** (08-13): 9.99 stepped by 0.5 while 10.0 stepped by 5 → nudging by a cent changed the whole order of magnitude of the suggestions. It took 3 attempts to get right; see the `roundHint` part of section 3.
- **Changing code and forgetting the test disarms the test** (08-13): the 08-04 commit left `npm test` red for 9 days, and once you are used to red you stop seeing it. **Changing `roundHint.js` means changing its test IN THE SAME COMMIT.**
- **Measure before assigning blame** (08-13): three times in one session something looked like our bug and was not - (a) Vietnamese text losing its diacritics in Telegram = `curl` on Windows encoding it wrongly, while the server-generated labels were fine; (b) the Swap `No route` = Circle's side, with the 3 core files untouched for 8 days; (c) the hint block overflowing on a 360px Android = **it had already been overflowing before the change**, proven with `git stash`. **Always build an isolated measurement before fixing anything.**
- **Cloudflare Pages only applies environment variables to NEW deployments** (08-13) - after setting a variable, create a new deployment; the running build will not pick it up.
- **"Improvements" that are not verified step by step** (retries, catch-and-return-0) have caused regressions worse than the original bug - verify every UI change with the Playwright mock, and every swap change with eth_simulateV1.
