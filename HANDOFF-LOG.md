# HANDOFF LOG – EZwallet (history)

Chronological build log, split out of `HANDOFF.md` on 2026-09-11 to keep that file short enough to read
in full every session (it had grown to 1581 lines / 213KB and was getting silently truncated on read -
the first read of it this same session only returned 27% of the file before hitting a token cap). This
file is pure history - the blow-by-blow of each dated round-trip and the "why" behind past decisions.

**For current state and active rules, read `HANDOFF.md` instead.** Nothing here is guaranteed still
true - a later entry (in this file or in `HANDOFF.md`) may have superseded it. Cross-check against the
live code before relying on a specific number or claim from here. This file is not required reading to
start a session; open it only when you need the reasoning behind something `HANDOFF.md` states as settled.

---

**Seventh round-trip (2026-09-10):** Confirm transaction/Receipt's divider line, then three more screens in
one pass - Send money, Language & currency, Security. Findings:
- **Send money is a real architecture rewrite, not a reskin, and the OLD `SEND_MONEY_FIGMA_SPEC.md` is
  WRONG** - it documents a *different, older* Figma file (`iQxFGA890VhyXkEKipCC9C`) that predicted a
  Swap-style % slider. The CURRENT file (`GxgsMU6HAYqolckzvPWXp1`, node `1:88`) keeps a numpad, just
  restyled (radius 16 + glow, was 12/flat) - fixed at the shared `.numpad-gray .numpad-key` class, so Swap
  and CreateQR's numpads picked up the same correction for free. `SendAmount.jsx` dropped its old
  "Send to: / centred amount+chip / Balance:" flow entirely for two cards ("You send" / "To") + a
  non-clickable connector circle, the same shape Confirm transaction/Receipt use - all business logic
  (VND plumbing, insufficient-balance guard, self-send guard, default-note popup) carried over unchanged,
  only the JSX layer was rebuilt. ⚠️ SUPERSEDED by the eighth round-trip below: the connector circle DOES
  carry an icon (`down`), the user said so directly after the export came back blank - see below.
- **Language & currency and Security were both sized wrong**: both used a small 1-3-row card
  (`gridRow:'2/3'` and `'2/5'`) when the current Figma draws the SAME full 340×586 (`gridRow:'2/9'`) card
  template every Menu sub-screen shares - `About.jsx` already had this part right, these two didn't.
  Content still packs at the TOP of the tall card (flex column, not `justify-content:space-evenly` -
  that would spread 2-3 rows across the whole 586px and not match Figma at all).
- **Language row is back** despite the 08-25 i18n deletion - Figma still draws it. Resolved with the user
  directly: a real popup, English locked as the only option (same disabled-button pattern
  `CURRENCY_OPTIONS` already used), never a functional switch.
- **Security's "Change PIN" became a pill button** (white, glow shadow, no caret) replacing the old
  right-chevron row-link style: Figma draws a real button. `pinStatus` states re-purpose the pill instead of
  swapping in a chevron.
- Two small colour/size drifts caught the same way as Confirm/Receipt: Security's Email/Wallet-address
  values were `--fs-item`(17)/`--color-muted` - Figma wants 16px/`--color-muted-2`, the same "Label:"-line
  token used everywhere else. Currency's dropdown chips had a grey BORDER (07-17f decision) - current
  Figma draws a borderless glow-shadow chip instead, matching the token chip everywhere else already does.
- Verified with `tools/figma-check.mjs` against fresh `get_screenshot` pulls of all three nodes - diff
  panels clean on all three, `npm run build` clean, `npm test` 16/16.

**Eighth round-trip (2026-09-10, same day): the user rejected the Send money rebuild outright** ("bạn
build sai... bớt ngu lại") over three concrete things, all fixed:
1. **The numpad's key size/spacing was fabricated** - `flex:5.5` of whatever space happened to be left,
   inherited unverified from pre-rebuild code, not Figma's own fixed 48px-tall/8px-gap keys. Fixed with an
   explicit 216px-tall numpad block (4×48 + 3×8) and 27px of panel padding-top - both numbers the user
   gave directly, matching node `18:16` etc. exactly (panel top 430 → first key 457 = 27px; last key
   672 → CTA row 699 = 27px).
2. **The token icon was a real circular icon borrowed from `Swap.jsx`'s chip**, not what node `1:95`
   actually draws (a flat 24px BLACK SQUARE, no rounding, no real icon). "Exchange does it too" is not a
   defence - each screen's own export is the source, not a sibling screen's precedent. Fixed.
3. **The connector circle needed the `down` icon (`down.svg`)** - the raw `get_design_context` export
   showed no icon layer under node `1:100` (checked 4 times, always empty), but the user confirmed
   directly this is a flattened-into-background-image miss, not an actually-blank node - the same failure
   mode §2.1 above already documents for the Menu dividers/NavBar cell. Added `Icon name="down"`, white,
   centred.
4. **Root cause, worth stating plainly**: the "You send" card's own children (chip, available line, big
   amount) were positioned with flexbox (`space-between`/`flex-end`) approximating Figma's layout rather
   than each element's own measured coordinate - visually close enough to look right, but a `figma-check`
   pixel probe on the icon (46,163) read solid white in the app against solid black in Figma, proving the
   chip was actually ~15-20px away from where Figma puts it. Rebuilt with per-element absolute `%`/`dvh`
   positions (label 13.55dvh, chip 19.4dvh, available 25.28dvh, amount 16.72dvh - all centre-anchored
   except the amount, which Figma itself top-anchors), the same method Confirm transaction/Receipt use.
   **Lesson: flexbox convenience layout is not a substitute for the node's own numbers, even when it looks
   right on screen** - only a pixel diff proves it, eyeballing doesn't.
5. Re-verified against a matching-content Figma pull (`currency:"EURC"` params, matching the static
   example) - diff panel clean, no more doubled digits, icon lands exactly on Figma's black square.
   `npm run build` clean, `npm test` 16/16.

**Ninth round-trip (2026-09-10, same day): Contacts, Transaction history, About.** All three share the
same 340×586 (radius 16, was 20 on all three) card template - Contacts/TxHistory are dynamic scrollable
lists Figma draws EMPTY (no example rows, so the internal row padding/avatar sizing has no Figma evidence
and was left as the prior user-tuned value - only the outer card radius was wrong). About is fully static
- 7 rows, RE-VERIFIED each at its own measured row-centre (14.34/24.53/34.72/44.91/55.09/65.28/75.47dvh),
filling the whole card top to bottom (unlike Security/Currency's 2-3 rows packed at the top) - the old
version used `justify-content:space-evenly` inside one flex column, which is the exact same "approximate
with flexbox instead of the node's own coordinate" mistake the eighth round-trip just called out - fixed
the same way, per-row absolute position.
⚠️ **TxHistory's 3-button filter row (Send/Receive/Back) had a REAL vertical offset**, caught only by
`figma-check.mjs`'s diff (looked fine on a smoke check): first built with `gridRow:'9/11'` (a 2-row grid
span centred ~43px below Figma's real button position), "fixed" to `gridRow:'10'` (still wrong - literal
grid row 10 is 774-844px, not row 9 at 688-758 where Figma actually puts every bottom button row), finally
fixed by copying `.row10-single`/`.row10-dual`'s own proven position verbatim (`position:absolute; top:
81.52dvh; height:8.29dvh` - NOT the CSS grid at all, per the comment already on that shared class). **Any
custom (non-`.row10-*`) bottom button row should copy this absolute positioning, not grid-row - grid-row
10 is a real, different location and looks plausible enough to ship by mistake.**
All three verified with `tools/figma-check.mjs` against fresh `get_screenshot` pulls - diff panels clean,
`npm run build` clean, `npm test` 16/16.

**Tenth round-trip (2026-09-10, same day): the SHARED `.row10-single`/`.row10-dual` class itself was wrong**
- the user stated the rule directly: 1 button = full 340px card width; 2 buttons = 166px each (340-8)÷2;
3 buttons = 108px each (340-8-8)÷3 - always the SAME 6.41% side inset, always an 8px gap. This is not a
per-screen convention, it is the ONE button-row rule the whole Figma file uses everywhere, confirmed
across every button row measured this session (Confirm/Receipt, Security, Currency, Send money, Contacts,
TxHistory, About). The shared class had THREE numbers wrong at once, silently, in every screen using it
(About/Currency/Security/Contacts/EnterEmail/CreateQR/LuckyPot/PinGate/QRScanner/SavedQRList/SendAmount/
ShowQR/Swap/TxHistory - 14 files):
- `left/right: 20px` (matching `.screen`'s own margin) instead of `6.41%` (25px, matching the 340px card
  width every button row actually fills) - a plausible-looking number that was simply the wrong reference.
- `.row10-single .btn { width: min(75vw, screen-max*0.75) }` - a **07-29 decision, never re-verified
  against this Figma file**, which draws every lone Back button at the FULL card width, not 3/4 of it.
- `.row10-dual .btn { width: 44% }` + `gap: 12px` - neither number was derived from Figma; 44%×2 + 12px
  gap does not even sum to the container's own width, so the pair was centred and narrower than Figma
  draws, not edge-to-edge.
Fixed at the shared class: `left/right:6.41%`, `gap:8px` on both variants, `.row10-single .btn{width:100%}`,
`.row10-dual .btn{flex:1}` (naturally yields 166px for 2 buttons, 108px for 3 - `.row10-dual` is a class
name, not a hard count, so TxHistory's 3-button row now just uses `className="row10-dual"` instead of
duplicating the position inline). **This is the third time in three round-trips a number got fabricated
by inheriting old code instead of re-measuring against Figma (numpad spacing, then the "You send" card
layout, now this) - when in doubt, re-derive the number from the current node, every time, even for a
class that "obviously" already looks right.**
Re-verified About/Currency/Security/Contacts/TxHistory (the ones already rebuilt against this Figma file)
with `tools/figma-check.mjs` - all clean, no regression from the wider buttons. `npm run build` clean,
`npm test` 16/16.

**Eleventh round-trip (2026-09-10, same day): the last 5 frames - Create receive QR, Created receive QR,
Arabica, Scan QR, QR storage.** Two node ids had shifted again (Create receive QR `1:113`→`18:82`, Arabica
`1:139`→`18:296` - caught by re-fetching instead of trusting HANDOFF's own earlier notes, per the lesson
above). Findings:
- **ShowQR.jsx's title logic was wrong on both branches**: a freshly created QR reads "Create**d** receive
  QR" (past tense - the code was missing the "d"), and a SAVED QR's title is the raw name with no prefix
  at all (node `18:296` literally reads "Arabica", not "QR: Arabica" as the code built).
- **ShowQR's amount is 48px SEMIBOLD**, not the app's usual hero-number Light override - this is a RESULT
  display (like Receipt's card amount, which is also semibold), not an input, so the "big numbers are
  Light" rule doesn't apply here either.
- **The caption's danger colour**: `Created receive QR`/`Arabica` are older, unedited copies still drawing
  the pre-09-08 red `#EC221F` - `BRAND-GUIDELINE.md`'s current `#FF383C` wins per the two-sources rule (an
  unedited leftover inside Figma is not a second source of truth).
- **CreateQR.jsx's "You receive" card sits at rows 3-4 (top 20.38dvh), not rows 2-3** like Send money's
  "You send" - a real, one-row difference, not assumed from the sibling screen. Its own numpad/button
  labels ("Back"/"Continue", not "Cancel"/"Create QR") and the fixed 48px-key/8px-gap/27px-offset numpad
  geometry (same fix as Send money's own round-trip) were re-verified fresh, not copied.
- **QRScanner/ShowQR's QR-or-camera square is a literal fixed 258x258** (was a responsive 82%/aspectRatio
  on QRScanner, min(30dvh,78vw) on ShowQR) - the real camera feed and dynamic scan hint are kept (working
  functionality with no Figma equivalent), only the static caption below was rewritten to match Figma's
  exact wording/styling (16px semibold, second line in `--color-error`).
- **SavedQRList's tiles were a `minHeight:190` approximation**, not Figma's fixed 242px, with a stale
  1.5px grey border + old straight drop-shadow instead of the glow-only-on-clickable rule, and the name
  label was brand-blue (should be black - blue is the amount's colour only).
All five verified with `tools/figma-check.mjs` against fresh `get_screenshot` pulls - diff panels clean
(ShowQR checked against BOTH its Figma frames, `amount`/`fromStorage` params matching each), `npm run
build` clean, `npm test` 16/16. **Every frame in the file has now been rebuilt at least once** - see the
"Left: none" note in §4 above for what that does and does not mean going forward.

**Twelfth round-trip (2026-09-10, same day): the text scale itself, app-wide.** With every screen rebuilt,
the user defined an official 5-tier TEXT hierarchy (not hero numbers - see BRAND-GUIDELINE.md's Typography
section, rewritten to match) - Header 1/Header 2/Nội dung 1/Nội dung 2/Chú thích = 28/22/19/17/15px,
REPLACING the old --fs-label/-item/-body/-md-lg/-title/-tiny/-content scale entirely (those CSS var names
no longer exist - do not resurrect them). Two of the five are a **deliberate round-number consolidation,
not a fresh Figma reading**: the user was told outright that the raw measured values for "Nội dung 1" and
"Nội dung 2" were 18px and 16px (buttons/card-labels; meta "Label:" values) across every screen rebuilt
today, and chose 19/17 anyway for a cleaner, evenly-stepped scale - a real, deliberate design decision,
not a fabrication, and the one place today where "match Figma's raw pixel exactly" was knowingly overridden
on the user's own instruction. Header 1 (28) and Header 2 (22) already matched the raw Figma reading
exactly, no consolidation needed there.
Applied via `--fs-h1/-h2/-content-1/-content-2/-caption` (+ paired `--is-*` icon sizes) in `index.css`,
then bulk-renamed across every screen/component (`var(--fs-old-name)` → the matching new token) and every
literal `fontSize: 18/19/16/20/22/24` in the screens rebuilt this session → the corresponding token.
**Explicit exceptions, not oversights:**
- `NotifArea.jsx`'s `NOTIF_FS` (13px) was NOT bumped to Chú thích (15) - its own comment documents a real,
  previously-hit overflow bug ("at 17 the hint block's 4 lines wrap and overflow the card") at just 4px
  more; 15 was never tested against that same 4-line hint block, so this was left alone rather than risk
  reintroducing a fixed bug. Worth a deliberate look later, not a blind bump.
- Hero number displays (balance, amount-entry, receipt/QR amount: 44/48/52px + `--fw-light`) are a
  SEPARATE system, out of scope for this 5-tier TEXT scale - not touched.
Re-verified Confirm transaction/Security/About with `tools/figma-check.mjs` after the change (1-2px text
size shifts, nothing overflows or misaligns) - diff panels clean. `npm run build` clean, `npm test` 16/16.

**LuckyPot was explicitly PULLED IN too, same round-trip - the standing "keeps its own local size scale"
exception is GONE for size.** First pass left it alone (per that old exception); the user immediately said
otherwise ("LuckyPot theo hệ quy chiếu mới luôn đi") and separately flagged its old 13px text as genuinely
hard to read ("13px khó đọc lắm") - a real usability complaint, not just a consistency nit, so no half
measure was applied. All of `LuckyPot.jsx`'s own literal 13/16/18px text now uses
`--fs-caption`/`--fs-content-2`/`--fs-content-1` like every other screen. What DID survive as a real,
narrower exception: the Space Grotesk FONT-FAMILY + mixed-case header treatment (still LuckyPot's own
brand identity, per the 2026-09-08 decision - only the SIZE mapping changed), and the two true hero-number
displays (the deposit/withdraw amount input, the "you won $X" amount - 28/32px + `--fw-light`, the same
separate system every other screen's hero numbers use, never part of the 5-tier text scale). Verified with
a live Playwright screenshot in mock mode (not `figma-check` - this screen has no single static Figma
frame to diff against) - the denser stat boxes do NOT overflow at the larger sizes, confirming the
original "app-wide sizes read as oversized here" concern that justified the old exception no longer holds
now that the app-wide scale itself changed. `npm run build` clean, `npm test` 16/16.

**Thirteenth round-trip (2026-09-10, same day): the FRAME/SPACING rules distilled into BRAND-GUIDELINE.md**,
consolidating everything measured across all 13 round-trips today (THE GRID's exact row math, the 6.41%
card inset vs the unrelated 20px `.screen` margin, the 8px content inset, the 0.5px `#94A3B8` divider, the
340x586 full list-card template, the row-9 button-row geometry with its 1/2/3-button width formulas, the
27px numpad offsets, the icon-text size pairing rule) - see BRAND-GUIDELINE.md directly for the actual
numbers, not repeated here. Also fixed a real, previously-unnoticed drift found while writing it: the
shared `.popup-card` class used `width:88%; max-width:340px` (effectively always 340px, the standard card
width) - the user confirmed the GENERAL rule is actually 5/6 of the screen (325px), which LuckyPot's own
popups already used - `.popup-card` was the outdated one, not LuckyPot's exception. Fixed at the shared
class (`width: min(calc(100vw*5/6), calc(var(--screen-max)*5/6))`, the same idiom LuckyPot's popup and
`.row10-single .btn` already use), so every popup app-wide picks up the correction at once.

**Fourteenth round-trip (2026-09-10, same day): the SHARED `.btn-primary`/`.btn-secondary`/`.btn-success`/
`.btn-error` classes still carried the pre-redesign straight-down drop shadow** (`0 4px 6px rgba(...)`,
a 07-22d decision), caught by the user asking outright why a button still cast a downward shadow instead
of the centred glow BRAND-GUIDELINE.md's Shadow rule already states. Root cause: dozens of buttons got an
INLINE `boxShadow:'0 0 8px rgba(0,0,0,.48)'` override during today's screen-by-screen rebuilds, but the
shared class itself - the actual DEFAULT every untouched button falls back to - was never fixed, so any
button without its own override (most buttons on screens not touched today, and even some inline-styled
ones on screens that were) still rendered the old shadow. Fixed once at the shared class, closing it for
every `.btn` app-wide. Same sweep also caught and fixed: `.action-card`'s own literal 13/16px font sizes
(missed by the earlier typography sweep, which only scoped screen files, not index.css's own component
classes) → `--fs-caption`/`--fs-content-2`; `ErrorToast.jsx`'s old drop shadow removed entirely (it isn't
itself clickable, matching `NotifArea`'s notification cards, which carry no shadow either); `PctSlider.jsx`'s
draggable thumb and `LuckyPot.jsx`'s token-dropdown panel both converted from offset drop shadows to a
centred glow (both ARE interactive, so they keep a shadow - just the right kind). Re-verified About with
`tools/figma-check.mjs` - clean. `npm run build` clean, `npm test` 16/16.

**Fifteenth round-trip (2026-09-10, same day): NavBar spacing (user decision, not a Figma correction) +
four real LuckyPot bugs, one of them verified directly on-chain.**
- NavBar: `.navbar-btn` was bottom-anchored (`justify-content:flex-end; padding-bottom:10.5px`, matching a
  2026-09-10 Figma reading of icon-top-785/label-bottom-833.5) - the user asked directly for the icon+label
  block CENTRED in the 70px row instead, with less air between them. This is a stated design decision
  overriding the earlier Figma reading, not a "the code was wrong" correction - noted here so a future pass
  doesn't "fix" it back to bottom-anchored. Also dropped a redundant 2px inline `marginBottom` stacked on
  top of the 3px CSS `gap` (5px combined) down to a single 2px gap.
- **LuckyPot "N winners out of M players" used the wrong M** - `participantCount()` (18, a lifetime
  counter that never decreases) instead of who is actually ELIGIBLE for the current draw. The user compared
  against the real luckypot.cc site directly and found it disagreed (14) - **verified by calling the live
  contract directly** (a one-off script, not guessed): of the 18 lifetime addresses, exactly 14 have
  `eligibleBalance()>0` right now, matching the real site's number exactly. Neither number was fake - they
  measure different things - but the sentence needs the eligible count, not the lifetime one. Fixed by
  counting non-zero entries in the SAME `eligibleBalance` array `usePoolData.ts`'s pool-total sum already
  computes (`lib/luckyPot.js`'s new `eligibleParticipantCount` field) instead of summing them.
- **"Total tickets / Pool" and "My tickets / My deposit" were BOTH prefixed "$"** on both halves - the
  first half is a TICKET COUNT (no currency symbol at all), the second is a real USDC amount (reads
  "USDC", never "$" - this pool has no dollar display-currency, only the on-chain token). Fixed in
  `SplitAmount`; the small half's existing 15px/grey styling (Chú thích/`--color-muted-2`) already matched
  what was asked, no change needed there.
- USDC/ARC control changed from a dropdown (revealing ARC/ETH, both disabled) to a 2-segment TOGGLE - USDC
  filled/selected, ARC greyed out and unclickable right beside it, same underlying "only USDC works, no
  token yet" reason as before, per direct user request (no popup needed for a 2-way choice).
Verified with a live Playwright screenshot in mock mode (LuckyPot has no single static Figma frame to
diff against) - all four changes render correctly, nothing overflows. `npm run build` clean, `npm test`
16/16.

**Sixteenth round-trip (2026-09-10, same day): the same icon/label tightening applied to `.action-card`**
(Paste/Scan QR/Contacts on Send, QR storage/Custom QR/Share on Receive) - user decision, same pattern as
NavBar: `gap:6px` → `2px`. `align-items:center`/`justify-content:center` were already there (these were
never off-centre), only the icon-to-label gap needed closing. Verified with live Playwright screenshots
of HomeSend/HomeReceive in mock mode. `npm run build` clean, `npm test` 16/16.

**Seventeenth round-trip (2026-09-10, same day): two LuckyPot bugs, unrelated to each other.** (1) The
user felt Deposit/Withdraw/Result button text sat below-centre, not on it. A standard 4x-zoomed Playwright
screenshot confirmed real asymmetric spacing (more room above the text than below) - root cause was
`line-height: normal`'s default asymmetric leading, invisible on the app's usual 48px-tall buttons but
visible on LuckyPot's short 34px ones. Fixed with `line-height: 1` on the shared `.btn` class (`index.css`)
- one-line fix, no screen-specific override needed since every button inherits it. (2) The user reported
the balance "trơ ra" (stays stuck) right after a real deposit. `LuckyPot.jsx`'s `loadInfo()` was called
exactly ONCE, synchronously, right after `executeChallenge` resolves - **zero seconds of polling, no
retry**. That resolve only confirms the PIN signature was accepted and the tx was broadcast, not that it
is mined/indexed by the RPC yet, so the immediate read can and does land before the chain has caught up.
Added `reloadInfoAfterTx()` (immediate read + 2 delayed re-reads at 3s and 8s, same backoff shape
`multicallWithRetry` already uses inside one RPC call, just applied here at the UI layer across multiple
reads) and swapped all 3 tx handlers (`handleDeposit`/`handleWithdraw`/`handleClaim`) from bare `loadInfo()`
to it. `npm run build` clean, `npm test` 16/16.

**Eighteenth round-trip (2026-09-11): 4 real bugs the user found on a real iPhone/live app.**
1. **The iOS status bar area rendered pale blue instead of white.** `body`'s background was left at
   `#D6EAFB` - a value the file's own comment already flagged as "TEMPORARY for filming a clip... CHANGE
   BACK to `var(--color-white)` once filming is done" (index.css:114 explains standalone-PWA status bars
   take the body background colour). Filming was over; the temporary value never got reverted. Fixed by
   restoring `background: var(--color-white)`.
2. **Send screen's white token cards (USDC/EURC/...) had an 8px gap from the grey box on the left but sat
   flush (0px) on the right.** Root cause: the inner scroll container used `.scroll-thin`, whose
   `margin-right:-20px`/`padding-right:12px` trick pushes content 8px past the box's own 8px right
   padding - which then gets clipped by the box's `overflow:hidden`, gluing the cards to the right edge.
   This is the EXACT bug class `SavedQRList.jsx` already documents avoiding ("Do NOT use `.scroll-thin`
   INSIDE a grey box... iOS does NOT support `scrollbar-gutter` to compensate") - `HomeSend.jsx` just
   hadn't been switched over. Fixed by using `.scroll-hidden` instead (same fix SavedQRList already uses),
   verified visually - both sides now show the same gap. ⚠️ `Contacts.jsx` and `TxHistory.jsx` also use
   `.scroll-thin` inside an `overflow:hidden` grey box - same latent bug, smaller effect there (their boxes'
   own padding is 16px/14px, so the -8px push shrinks the right inset rather than zeroing it) - not touched
   this round since the user didn't flag them, but worth the same swap if noticed later.
3. **Scan QR showed "Point the camera at a QR code"** - a string invented on an earlier pass, never
   requested and with no Figma equivalent (the dynamic hint line itself is real, working functionality;
   this particular default text was not). Fixed by starting `hint` as `''` instead of that sentence -
   the line now only ever shows a REAL scan result (wrong network / own QR / invalid QR).
4. **Service hub's two cards were resized in Figma to a fixed 112px tall** (was 156px = a full
   double-row). Re-pulled `get_design_context` on node `1:43`: card 1 stays at top 86px (10.19dvh,
   unchanged), card 2 moves to 214px (25.36dvh) = card 1's new bottom (86+112=198) + the standard 16px
   gutter - re-derived from the fresh node, not assumed. Icon size/position, text gap, and padding were
   all re-checked against the same pull and are UNCHANGED (still land on the same numbers as the existing
   code). Verified with `tools/figma-check.mjs` against a fresh `get_screenshot` of `1:43` - card
   position/size match exactly (only difference is the app's real icons vs. Figma's black placeholder
   squares, expected). `npm run build` clean, `npm test` 26/26.

**Same day, a 5th bug: the Apple home-screen icon "didn't feel like the new logo (solid colour)".**
Diagnosed by rendering `design/new-brand/icon.svg` (the 2026-09-07 source for `public/icon.svg`/
`icon.png`/`fav_icon.png`) at its native size: the artwork was already the correct solid-blue "EZ" mark
(no gradient), but inset ~24% from the canvas edge on all sides - fine as a favicon on a white browser
tab, but on an iOS home-screen tile (which iOS masks/rounds at the OUTER square, not around the artwork)
it read as a mostly-white tile with a small logo floating in the middle, not a solid brand tile. Per the
standing rule that these brand files are the user's own, not to be redrawn by AI, this was reported back
rather than cropped/rescaled unilaterally - the user supplied a corrected full-bleed version
(`apple.svg`, same artwork, ~5% inset instead of ~24%). Replaced `public/icon.svg` + `design/new-brand/
icon.svg` with it, re-rasterised `icon.png`/`fav_icon.png` at 512×512 from the new SVG (Playwright
screenshot render, same approach as `tools/figma-check.mjs` - the old `C:\tmp\ezw-verify\render-icons.mjs`
no longer exists), and bumped the cache-busting query from `?v=2` to `?v=3` in `index.html` (favicons/
touch icons are cached hard - HANDOFF's own 09-07 note already flagged this same cache risk for the prior
icon swap). `npm run build` clean.

⚠️ **CORRECTED same day: `design/logo.svg` IS already the Inter wordmark - the user confirmed this
directly ("LOGO.SVG CHÍNH LÀ BẢN INTER") after an earlier note here wrongly flagged it as still
Barlow.** That earlier note was a misread of vectorized path outlines by eye (a text logotype is
flattened to paths, not live text, so it can't be checked by inspecting a `font-family` - the guess was
wrong). No file replacement needed here; `design/logo.svg` stays as-is.

**Same day, 3 more real bugs, one of them a repeat of a bug class already fixed once before:**
1. **The out-of-USDC faucet warning only fired at <=1 USDC and used the wrong colours** (pale-yellow card
   + BLACK body text, only the "Faucet" word itself coloured). User decisions: (a) threshold raised to
   <=20 - "under 20 USDC" now covers the old "freshly created empty wallet" case too, so it's one rule,
   not two; disappears only once balance is OVER 20. (b) Card must be WHITE with the icon AND all its text
   in `--color-warning` together - the same "white card, one solid type colour for icon+text" rule the
   real notification rows already use (`STYLE.received/sent/error` in NotifArea.jsx), not HintBlock's
   black-body/coloured-keyword pattern. Fixed in `HomeSend.jsx`; already non-dismissible (NotifArea's
   `warning` branch never renders an X button - same standing-hint treatment as the network/QR Storage/
   Create QR/Share hints).
2. **Notifications leaked across accounts on the same device - a REPEAT of a bug class `store.js` already
   fixed once for contacts/QR storage** (its own top comment: "It used to use shared keys... signing in
   with another account still showed the previous account's contacts"). `notif.js`'s `ez_notifs` and
   `NotifArea.jsx`'s `ez_notified_hashes`/`ez_last_recv_ts` were never migrated to that same per-account
   pattern - they were still one GLOBAL key each, so signing into an old, long-unused account on a device
   that had recently used a different account showed that OTHER account's still-under-24h notifications.
   Exported `acct()` from `store.js` (was private) and namespaced all 3 keys by wallet address exactly
   like `loadContacts()`/`loadSavedQRs()` already are - no sign-out cleanup needed, each account now just
   has its own separate storage the way contacts/QR already do.
3. **`TxHistory.jsx` could show a false "No transactions yet" on a real fetch failure** - `.catch(() => {})`
   + `setLoading(false)` on error looks IDENTICAL to a genuinely empty wallet, and the user could not tell
   which one an old account's blank history actually was. This is the exact "never fall back to a fake
   empty/0 state" lesson `HomeSend`'s balance fetch already learned (section 10) but `TxHistory` never
   applied - fixed the same way: on failure, keep loading and retry every 3s until a REAL answer (success
   or a genuinely empty `result: []`) arrives.
`npm run build` clean, `npm test` 16/16.

**⚠️⚠️ THE LOGO SCREEN BUG - and a process failure worth more than the bug itself (2026-09-11).**
The user reported, repeatedly and on BOTH iPhone and desktop, that the logo screen shown on entering the
site draws the logo DEAD CENTRE instead of row 3. I measured `Splash.jsx`, found it pixel-perfect against
Figma node 1:169 (`figma-check` diff clean, live bundle byte-checked, a real browser at 1440x900 reading
191.5/900 = exactly 21.28%) and told the user their screenshot must be wrong. **I was measuring a screen
the user almost never sees.**
- `ez_pin_ok` lives in **sessionStorage**, so it is gone every time the browser is reopened. `App.jsx`
  (lines ~66-69) then boots a returning user with a saved wallet **straight into `PinGate`** - `Splash`
  is never rendered on that path at all. Splash is only reachable on a fresh login.
- `PinGate.jsx`'s busy state (the default on mount, shown while Circle's PIN iframe loads) drew its own
  lockup: `row-1-9 center col` + `width:56%` → rows 1-9 = y 0-758, centred = **379/844 = 44.9%**, and 6%
  too wide. That is exactly the "logo in the centre" in the user's screenshots. `ForgotPin.jsx` had an
  identical copy. So 2 of the 4 screens that draw the wordmark were correct (Splash, Login) and the 2 that
  users actually hit every visit were not.
- **The lesson (bigger than the fix): when a user's direct observation conflicts with my measurement, the
  default assumption must be that I am measuring the wrong thing - not that the user is wrong.** Verifying
  one component in isolation proves nothing about what the app actually renders; check the ROUTING
  (`App.jsx`) first to find out which component the user is really looking at.
- **THE FIX - one shared definition, per the same rule `.screen-title` already follows:** the lockup now
  lives ONLY in `.logo-lockup` (`index.css`, see THE LOGO RULE written there with the measured numbers).
  Splash/Login/PinGate(both states)/ForgotPin(both states) all render `<img className="logo-lockup">` with
  NO inline positioning. Do not re-add a per-screen variant. Verified: all four measure top 179.59px /
  21.28dvh / width 195px at 390x844.
- PinGate/ForgotPin's error text moved out of the old flex block to its own absolute line at 34.72dvh -
  the same slot Login's slogan occupies, i.e. directly under the lockup.
⚠️ NOTE FOR TESTING: `?screen=PinGate` in mock mode does NOT show this screen - mock auto-unlocks, so
`unlock()` resolves instantly and navigates to HomeSend. Verify the class through Splash/Login (same
class) or on a real deploy.

**Faucet hint, corrected twice in one session (2026-09-11) - final state:** shows when USDC is **strictly
under 20** (at exactly 20.00 it is already gone - the user caught a `<= 20` version still showing on a
$20.00 balance), and is drawn as a WHITE card with **no icon** and **semibold** `--color-warning` text,
padding 6px/10px + radius 16, i.e. structurally identical to the hint card above it. Two rules came out
of this, both app-wide: **(1) COLOURED TEXT IS ALWAYS SEMIBOLD** - at 13px on white, neither the red
network line nor yellow warning text carries enough contrast at regular weight (the user: "đỏ và vàng
phải bold cho dễ đọc"); **(2) blocks in the notification area are TEXT-ONLY** - the warning's icon made it
the odd one out next to the icon-less hint card.

**⛔ CIRCLE'S PIN SCREEN - 2 real complaints that CANNOT be fixed from this codebase (checked 2026-09-11,
do not re-investigate without new information):** (a) entering a wrong PIN does not auto-clear the dots,
(b) on mobile the keyboard does not open until the field is tapped. Both are behaviours INSIDE Circle's
PIN UI, which is an iframe served from **`https://pw-auth.circle.com`** - a DIFFERENT ORIGIN from
ezwallet.cash, so the browser blocks all DOM access: we cannot read or clear its inputs, and we cannot
call `.focus()` on them (which is what would raise the mobile keyboard; on iOS even a same-origin
`.focus()` needs a real user gesture, so this would likely fail anyway). The SDK's iframe field is
`private readonly` and its **entire public API is 14 methods** - `setAppSettings`, `setAuthentication`,
`updateConfigs`, `getDeviceId`, `performLogin`, `verifyOtp`, `execute`, `setCustomSecurityQuestions`,
`setLocalizations`, `setResources`, `setThemeColor`, `setCustomLinks`, `setOnForgotPin`,
`setOnResendOtpEmail` (read from `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts`, v1.1.11).
The PIN screen is reachable through **text only** (`Localizations.enterPincode.headline/headline2/subhead/
forgotPin`, `Common.retry`) and **colours only** (`ThemeColor.pinDotBase/pinDotActivated/pinDotBaseBorder`,
`inputBorderFocused*`). There is NO hook for clearing the dots, focusing the input, or any other
behaviour. → The only route to a fix is **Circle themselves**; add these two to the same report channel
that `common.showPin` was already raised on (see the Current limitations list in README).

**LuckyPot note (2026-09-10):** the user redrew this frame's own Figma to bring it closer to the real
luckypot.cc frontend, then added a "My history" box to row 9 (next to "Draw history") - the handler
(`openMyHistory`) and its popup already existed in the code, only wired into the hamburger menu; row 9
now calls it directly. Two more real mismatches came out of this rebuild specifically: `TokenDropdown`
was a solid-blue pill with white text (Figma: white pill, black text, glow shadow) and every stat-box
label had `textTransform: uppercase` left over from a 2026-08-09 decision that this newer Figma pull no
longer follows (only "EPOCH #3" is capitalised, and that is literally typed that way in the string, not
a CSS transform) - both were caught by the diff tool, not by eye.

**Exchange note:** rebuilt `Swap.jsx` in place (same screen id, Figma just relabels the tile "Exchange" -
see ServiceHub). The user's instruction *"vùng từ hàng 8 trở lên là vùng dành cho slider"* is now literal:
the round-number chips + `PctSlider` sit in an absolutely-positioned block at rows 7-8 (top 61.14dvh,
height 18.48dvh), matching the blank space in the Figma mockup (which does not render the slider's own
UI, being a static frame). The CTA button lost its old "3/4 of the screen width" rule - node 1:85 is
340px wide, the same edge-to-edge width as the cards above it, with a larger one-off glow
(`0 0 20px rgba(0,0,0,.32)`) that is NOT the shared button shadow. The button copy stays "Slide or tap
here to **enter**" (not "input") - a standing, deliberate override recorded in `FIGMA-SCREENS-SPEC.md`
§9, not a miss.

⚠️ **On the Exchange round-trip (same day, later):** the reverse button and the CTA both had REAL bugs
the user caught by looking at the app, not by diffing. (1) The reverse button used the raw Figma pixel
(26.71dvh), which sits mostly INSIDE the "You pay" card rather than bridging the gap between the two
cards - moved to the literal midpoint of the gutter (29.62dvh) per the user's explicit "phải nằm chính
giữa 2 box". (2) The CTA had `height:'100%'` on its 70px row-9 slot, making it 70px tall ("mập") instead
of the 48.66≈48px Figma draws right there in the design context - the data was available the whole time,
the code just filled the row instead of reading it. Also: the round-number hint chips still carried the
pre-rebuild `--fs-item` (17px); verified live against Figma that "Available: 20.00 EURC" and "Hold to
show tokens" both read 16px on this same screen pull and fixed the chips to match - EnterEmail's
suggestion/domain chips were ALSO re-verified live (not from memory) and turned out to be 16px too, not
the 17 the code had.

**Third round-trip:** the user redrew Service hub's and Exchange's headers in Figma (they had been wrong)
and asked for a check. Both now match `.screen-title`'s bottom-anchored/28px/centred rule exactly -
**zero changes needed**, because both titles were already routed through the shared class rather than a
one-off position, so the correction landed automatically. This is the payoff of "one shared definition":
fix the rule once, every conforming screen inherits the fix for free.

**THE RECURRING BUG CLASS, stated plainly:** a fixed pixel value (a button height, an icon size) sits
right there in the Figma design context, and the code uses a relative/generic value instead
(`height:'100%'` of a row slot, a shared token that was never re-measured) - not because the value was
hard to find, but because nobody read the number that was already in hand. This happened on the CTA
button THREE separate times across two different screens (Exchange's CTA, then the discovery that the
SAME bug lived in the shared `.btn` class - see §5) before it was fixed at the class level. **When
sizing anything, check the design context response for that exact node's own height/width before writing
a percentage, a `dvh`, or a `100%` - do not default to "fill the container".**

**Fourth + fifth round-trip, same day:** the user is actively iterating on the Figma file WHILE this
rebuild is in progress, not just fixing typos - `Confirm transaction` (`1:215`) and LuckyPot's 3-button
row were both **structurally redrawn** between one `get_design_context` call and the next, not just
nudged: the confirm card went from 328px/4 rows to 242px/3 rows and the warning line changed from loose
text into a real positioned 340×70 box with its own literal `rgba()` fill; LuckyPot's Deposit/Withdraw/
Result went from a 92:91:125 proportion to exactly equal (102.66px each). Neither was an error in the
earlier read - the frame itself changed. **⚠️ Do not trust a design-context response as still current
just because it was fetched earlier today.** If the user says a rebuilt screen still isn't right, RE-FETCH
`get_design_context` for that node before touching any code - diff the fresh response against what the
component currently does, rather than re-guessing at spacing/font tweaks. Both fixes are recorded in
commit `9dc9fa8`.

**Sixth round-trip, same day:** the user asked to rebuild Confirm transaction/Receipt again, calling the
"cannot be undone" warning box invented drama for a wallet with no bank-style reversal to warn about -
a RE-FETCH of node 1:215 confirmed the Figma frame agrees: the warning node is gone entirely now, not
just redrawn, so `SendConfirm.jsx` dropped it outright (no replacement). The same fetch caught two more
real drifts nobody had asked about: (1) the card's own text inset measures **8px from the card edge, not
18px** - `.confirm-row` padding was quietly stale from an earlier pull; (2) the fetch now draws a real 1px
divider under every row but the last (`.confirm-row:not(:last-child)::after`), reversing the 09-10 "no
grey rule, spacing from padding alone" decision recorded lower in this file - that decision was for a
frame that no longer exists. Also caught: Receipt's own "Amount" row inside the card had **no styling at
all** where Figma draws it 22px semibold brand-blue (SendConfirm's had this; Receipt's copy of the same
card never got it). Verified with `tools/figma-check.mjs` against a fresh `get_screenshot` of both nodes -
diff panels clean, `npm run build` clean, `npm test` 16/16.

---

### ⚠️ READ THIS FIRST - LuckyPot Deposit/Withdraw/Claim/History is LIVE AND VERIFIED ON-CHAIN

`functions/api/luckypot.js` encodes deposit/withdraw/claim/sweep calldata and calls Circle's real
`contractExecution` (same pattern as `swap.js`); `src/circle.js` has the matching
`executeLuckyPot{Deposit,Withdraw,Claim}` wrappers. **The user tested a real $10 Deposit on a deploy
2026-09-07 and it worked** - independently confirmed on-chain (not just "the UI said success"): the
wallet `0x29Eb3eC21a556dF96384A01E44E28B1F9488d03D` shows up as a brand-new `participants()` entry with
`balances()=10 USDC`, and the pool's `balancesTotal()` rose by exactly $10 in the same block range
(tx `0xff96d0...` → `Multicall3From.aggregate3`, status ok). Withdraw/Claim use the same signing path
and are built but not yet individually confirmed on-chain the same way.

**Layout went through several rounds of user corrections on 2026-09-08** (`Desktop/LUCKYPOT-LAYOUT-SPEC.md`
is the base; trust the chat corrections below over that file where they differ):
- Row 1: menu icon (1/3 of the row's height) + "LuckyPot.cc" wordmark, BOTH in Space Grotesk (the drawn
  logo SVG was dropped entirely) - this also freed the row's right side for the app-wide `BugButton`
  (renders absolute at right:20/top:5dvh on every screen).
- Row 2: one hint strip, ALWAYS solid `var(--color-warning)` + black text - faucet suggestion (direct
  copy-address-and-open-faucet action, no popup) OR a "you won" prompt (icon becomes `check`).
- Epoch box + Tickets box: `var(--color-surface)` (light blue), fixed height (243.2/844 → `28.82dvh`),
  4 equal sub-rows via flex (the last spans 2), a divider line under sub-rows 1 and 2 (without it the box
  read as one undifferentiated block - user fix). Amounts render as "$black-17 / $grey-14"
  (`SplitAmount`). The USDC/ARC toggle became a `USDC ▾` dropdown revealing ARC/ETH, both disabled (no
  token yet) - 2 plain pills made ARC look like a live option.
- **TYPOGRAPHY (final, revised twice)**: headers/titles (the wordmark, EPOCH #, TOTAL TICKETS/POOL, My
  tickets/deposit, Draw history, EVERY popup title) use **Space Grotesk** (luckypot.cc's own brand font),
  all-caps. Everything else uses the app's normal system-font stack - NOT Inter (tried once, reverted:
  ezwallet dropped webfonts app-wide on 08-25 for first-paint speed, so only Space Grotesk is loaded, and
  only on this one screen, injected on mount via `useLuckyPotFonts()` - not in `index.html`). One local
  size scale for the whole screen (17 for header/emphasis, 14 for body) - NOT the app-wide 15/19/25/52
  tokens, which read as inconsistent/oversized here (this applies inside every popup too now).
- **Fixed a real bug**: "0 winners out of 0 players" - `numWinners`/`eligibleParticipants` on
  `getEpoch()` only get written when an epoch COMMITS near draw time, reading 0 the rest of the week.
  Switched to the off-chain estimate the real luckypot.cc frontend uses (`frontend/src/lib/prize.ts`:
  `projectedWeeklyYield` + `estimateNumWinners`, sqrt-based) fed by live `eligiblePoolTotal` +
  `currentAprBps`, and live `participantCount()` instead of the frozen field. Verified against live RPC
  (eligible pool ≈5732 → estimate = 2 winners, matching the real site).
- **Result button**: only enabled during the live self-claim window (`prevEpochDrawnAt..+SWEEP_DELAY`),
  dimmed otherwise - browsing OLDER results is Draw History's job now, not this button's.
- **Draw History AND My History both built for real** (both used to be disabled placeholders):
  - `getEpochHistory()` multicalls `getEpoch()` over past ids for Draw History.
  - `getMyHistory()` reads `Deposited`/`Withdrawn`/`Claimed` EVENT LOGS via ArcScan's Etherscan-compatible
    `getLogs` endpoint, filtered by the wallet's address as the indexed topic - a raw `eth_getLogs`
    against the public RPC over the whole history since deploy hits `"requested range too large"`
    (verified against the live RPC), ArcScan's own indexer has no such cap.
  - **Fixed a real bug here too**: ArcScan answers BOTH "genuinely no logs" and a rate-limit/error with
    the same `status:"0"` - only `message` differs (`"No logs found"` vs anything else). The first version
    treated both as empty, which would tell a rate-limited user "No activity yet." when they actually have
    history. Now only `message === "No logs found"` returns `[]`; anything else throws.
- Popup shell: **5/6** of the MOBILE frame width (not the browser viewport - `.popup-overlay` is
  `position:fixed` to the whole window, so a naive `width:75%`/`83%` balloons past the phone frame on
  desktop; use `min(calc(100vw*5/6), calc(var(--screen-max)*5/6))`, same idiom `.row10-single .btn`
  already needed). Closes ONLY via the X top-right or a click outside - no bottom Close button.
- Referral stays OUT of scope (the only thing still deliberately unbuilt on this screen).

**Verified:** `npm run build` clean, `npm test` 16/16, every popup/state screenshotted with Playwright in
mock mode (390px AND a wide 1280px viewport to catch popup-width regressions) - copied to Desktop each
round. `getMyHistory`'s ArcScan query pattern (topic0 hashes, address-topic padding, ABI decode) was
verified against the real deposit tx (`0xff96d0...`) before being trusted, not guessed.

### 🔗 THE 4 OFFICIAL LINKS - use this set when introducing the project (user decision 08-04)
| | |
|---|---|
| **Demo** | https://ezwallet.cash (domain bought on Cloudflare 07-29; `ezwallet.pages.dev` runs alongside it, auto-deployed from `main`) |
| **GitHub** | https://github.com/KattyFury/ezwallet |
| **Video** | https://youtu.be/UIR4Ee3Wp_Y |
| **Deck** | https://canva.link/zr3ik84radd39vc |

### 📍 WHERE THINGS STAND (end of session 2026-09-08, part 2 - the Figma re-sync)

⚠️ **The 09-07 brand redesign bullet below is PARTLY STALE as of 09-08 - read this first, not that.**
Same day, later: the user re-drew several screens in Figma (file `iQxFGA890VhyXkEKipCC9C`, now 9 frames,
up from 8) and declared **that file's palette the new canonical source, reversing the 09-07 colour
decision one day after it shipped**. What actually changed 09-08:

- **`--color-surface`/`-2` is back to light GREY `#F1F5F9`** (NOT the light blue `#E3F1FF` from 09-07 -
  that lasted exactly one day). `--color-muted` split into TWO tones (`#94A3B8` general secondary/nav-
  inactive/placeholders, `#667085` specifically the "Label:" prefix word in meta lines like "Available:"/
  "Fee:"). `--color-error` is now `#FF383C` (was `#EC221F`). Full rationale + the reversed-premise banner:
  `BRAND-GUIDELINE.md` (rewritten) and `FIGMA-SCREENS-SPEC.md` (rewritten for all 9 frames - the old
  8-frame version was reading a Send-money design that no longer exists).
- **NEW rule: shadows only on CLICKABLE elements**, a centred glow (no x/y offset) instead of the old
  straight-down `0 4px 6px`. **NOT YET applied to the actual CSS/JSX** (`.btn-primary` etc. still use the
  old shadow) - apply it screen-by-screen when each one is rebuilt, not as one big sweep.
- **Button text sizes went DOWN app-wide** (safe - shrinking can't overflow a button that already fit):
  `.btn` 21px Medium → **19px Semibold**; `.action-card` (Paste/Contacts-style) 17px Medium → **15px
  Semibold**; `.action-card.primary` (the emphasised middle one, e.g. Scan QR) → **17px Semibold**.
- **Every screen title's weight fixed app-wide**: the repeated `row-1 center screen-title` inline style
  (16 screens) was rendering at Medium(500); the real rule (confirmed identically across 4 separate Figma
  frames) is **Semibold(600)**. Fixed in all 15 titled screens (Contacts.jsx's OTHER title, "Adjust
  photo", was left alone - different row, not this pattern).
- **`BalanceHeader.jsx` (the big balance on Home send/Home receive/Menu)**: capped at **50px** (was 76),
  now occupies row 1 + HALF of row 2 (was 2 full rows), hard-capped at **≤75vw** so a long decimal amount
  never overflows - this was the exact bug the user hit ("$10,000.00" pushing past 3/4 width).
- **`HomeSend.jsx` fixes**: token name went Semibold→**Regular**, the amount is now **brand-blue** (was
  black, matching the label-black/value-blue pattern used everywhere else), added the thin divider lines
  between token rows that Figma has and the app was missing.
- **`LuckyPot.jsx`**: buttons (Deposit/Withdraw/Result) are now a fixed **2/3 of a 10dvh row** with
  `flexShrink:0` - the stat box's tight flex layout was squeezing them shorter than every other button in
  the app. ⚠️ **Its Space-Grotesk-ALL-CAPS typography is UNCHANGED and must STAY that way** - a first pass
  this session wrongly "normalised" it to the app-wide font/casing, which the user explicitly reverted:
  that treatment is a deliberate, already-decided per-screen exception (see the file's own header
  comment), not a lint error. **Lesson for next time: a screen with its own dated "user decision" comment
  block is not fair game for a blanket guideline sweep - only apply the parts that have no stated
  exception (this session, that meant spacing/button-sizing only, not typography).**
- **NEW:** `SEND_MONEY_FIGMA_SPEC.md` (repo root) - the Send money screen's build spec. Its big finding:
  the redesigned Send money screen copies `Swap.jsx`'s architecture (% slider + round-number hints +
  numpad bottom-sheet) instead of `SendAmount.jsx`'s always-on numpad - a real architecture change, not a
  reskin. All open questions for it are resolved (see the file) - **not built yet**, next in line.
- **NOT YET DONE (still pending, in priority order): Send money + Exchange screens (spec-ready, 0 code
  written) · `NavBar.jsx` rebuild (raised-white-cell-bleeding-into-content mechanism, §5 of
  FIGMA-SCREENS-SPEC.md - direction confirmed, not built) · the shadow-glow migration across
  `index.css`/JSX · Home receive (needs a fresh `get_design_context` read, not done this session) ·
  Menu/Service Hub restyle to the new grey surface + button sizes (PigSave should be REMOVED, not just
  disabled, per a 09-08 decision) · Splash/Login screens re-verified against Figma (only checked via
  metadata, not a full design-context read, this session).**

### 📍 WHERE THINGS STOOD (end of session 2026-09-07, mostly still true - see the 09-08 box above for what changed since)

- **One branch only: `main`** (a parallel `privy` branch exists from an earlier, since-abandoned attempt
  at a different PIN mechanism - **do not check it out or merge it without an explicit go-ahead**, user
  instruction 2026-09-07). Latest commit on `main`: `7b7d268`.
- **Forgot PIN is now real**: Circle's own "Forgot PIN" button inside the PIN-entry iframe used to do
  nothing (no callback registered anywhere) - now wired to a new `ForgotPin.jsx` screen through
  `POST /user/pin/restore` (security-questions recovery). See section 9's session table for detail.
- **Brand redesign applied from 2 user-written spec files** (`BRAND-GUIDELINE.md` +
  `FIGMA-SCREENS-SPEC.md`, both in the repo root): solid brand blue everywhere (no more gradients),
  system font (Barlow is gone), new NavBar (raised white active cell on a flat grey bar, ⚠️ NOT actually
  built yet as of 09-08 either), recessed boxes/inputs were light blue `#E3F1FF` for exactly one day
  (⚠️ SUPERSEDED 09-08, now grey `#F1F5F9` - see the box above), Service Hub rebuilt to full-width cards.
  The new brand icon/logo assets (`public/icon.svg`, `design/logo.svg`) are the user's own official
  files, not redrawn.
- **LuckyPot integration - Deposit/Withdraw/Claim BUILT (M1-M4), untested on a real deploy.**
  `src/lib/luckyPot.js` (M1, reads) was already verified against LIVE Arc Testnet RPC in the prior pass.
  This pass added the writes: `LuckyPot.jsx` now matches `Desktop/LUCKYPOT-LAYOUT-SPEC.md` row-by-row
  (logo + hamburger menu popup with Deposit/Withdraw/Draw history[disabled]/My history[disabled]/Exit;
  row 2 dynamic banner - gold "claim your prize" when `owedTo(prevEpoch)>0 && !hasClaimed`, else a
  faucet-copy-address banner; epoch box; tickets/deposit box with Deposit/Withdraw/Latest-result
  buttons; row 9 Draw history dimmed/disabled; row 10 Exit). Referral stays OUT of scope (spec §0) -
  intentionally no `?ref=` capture, no `setReferrer` call anywhere in this pass.
### 📒 WHAT SESSION 2026-09-07 DID (long session, several unrelated threads - see the honest note at the top of this file)

| # | Work | Commit |
|---|---|---|
| 1 | **Forgot PIN wired up for real** - Circle's own "Forgot PIN" button inside the PIN-entry iframe existed but did nothing (no `setOnForgotPin` callback registered anywhere in the app). Added `functions/api/luckypot.js`-style backend action `restorePin` (`POST /user/pin/restore`), `src/circle.js` `restorePinChallenge()`, and a new `ForgotPin.jsx` screen (same shape as `PinGate.jsx`) | `b7bea59` |
| 2 | **Full brand redesign** from the user's own `BRAND-GUIDELINE.md` + `FIGMA-SCREENS-SPEC.md` (both written this session, both in repo root - read them before touching colours/fonts/layout again): the old multi-tier iOS grey system collapsed onto the guideline's 7 colours, all gradients → solid, Barlow → system font, NavBar rebuilt (raised white active cell), Service Hub rebuilt from a 2-column tile grid to full-width cards, new brand icon/logo applied (user-supplied files, not redrawn) | `914980c` |
| 3 | **LuckyPot draft frame** added (placeholder, not the final design) so there was something to build the real integration on | `8295dc9` |
| 4 | **LuckyPot M1 (read-only)** - `src/lib/luckyPot.js` reads real balances/epoch/referral data via `publicClient.multicall`, same discipline as `chain.js`'s battle-tested balance reads (batch, retry, never fabricate a 0 on failure). **Caught a real bug**: `getEpoch()` returns 10 flat values, not one tuple - found by testing against LIVE Arc Testnet RPC (mock never exercises the real decode path), fixed before it shipped | `eeed013` |
| 5 | **Tried, then reverted, a LI.FI icon** on the Exchange card - the swap backend actually calls Circle's Stablecoin Kit, not LI.FI directly (verified: no LI.FI reference anywhere in `functions/api/swap.js`/`_swapCore.js`, and Circle's own docs describe StableFX routing through Talos + market makers). Card now correctly credits "Stablecoin Kit" | `c30ffdc` |
| 6 | **Real LuckyPot brand icon** applied (was a placeholder 4-leaf-clover ezwallet drew before real assets existed) - pulled from the user's own `KattyFury/LuckyPot` repo, not redrawn. **Picked the wrong file on the first try** (`brand-assets/pfp.svg`, missing the black outline) and had to fix it to `src/assets/logo.svg` (the real 3-path version) after the user caught it from a screenshot | `4af6677`, `7b7d268` |
| 7 | **Recessed-box colour**: `#E3F1FF` (light blue) replaces grey for input fields and sunken content boxes - `--color-gray` (borders/dividers/NavBar) stays grey, only `--color-surface`/`-2` changed | `878aabe` |

**Decisions the user settled this session (do NOT ask again):**
- LuckyPot theme inside ezwallet: **light/blue, matching ezwallet's own tokens** - NOT the dark/green
  theme a separate AI-generated draft proposed (that draft is not in this repo; its write-flow logic was
  reused, its theme/layout/architecture were not - see the "real next step" note at the top of this file).
- LuckyPot screen row 1: **the LuckyPot logo + a hamburger menu icon** (not a plain centred title).
- Referral: **link-based** (`?ref=0x...` → localStorage → bundled into the first Deposit), reusing
  luckypot.cc's own already-proven mechanism verbatim - not a manual input field.
- Referral IS in scope for this integration (not deferred to later).
- Piggy Bank's Service Hub card: removed from the UI (not deleted from code, see `ServiceHub.jsx`'s
  comment) because the new Figma frame only shows 2 cards (Exchange, LuckyPot) - whether it comes back
  is still open (`FIGMA-SCREENS-SPEC.md` §8.3).

**Read before continuing LuckyPot work:** `Desktop/LUCKYPOT-INTEGRATION-SPEC.md` (contract ABI, addresses,
the `contractExecution`/Multicall3 pattern - all verified against the live contract) and
`Desktop/LUCKYPOT-OPEN-QUESTIONS.md` (product-intent questions, now mostly answered - see the decisions
list above). The actual `KattyFury/LuckyPot` repo (local clone: `D:\Files\Claude\Build on Arc\luckypot`)
has real, working reference code for all of this (`frontend/src/hooks/usePoolData.ts`,
`frontend/src/pages/Deposit.tsx`, `frontend/src/lib/referralState.ts`) - read it again rather than
reconstructing from memory.

**Verification:** `npm run build` clean and `npm test` 16/16 after every commit above · the LuckyPot M1
read path was tested against the LIVE Arc Testnet contract with a standalone script (not just mock) ·
every UI change was screenshotted with Playwright AND copied to the user's Desktop (they cannot run the
dev server themselves - always do this for UI work, not just describe it).

### 📒 WHAT SESSION 2026-08-25 (PART 2, UI POLISH BATCH) DID

| # | Work | Written up in |
|---|---|---|
| 1 | **Swap confirmed working again** - the user tested a real swap on a deploy, no `331001`. The Circle support questions were sent (no reply needed any more, the outage resolved itself) | 4 |
| 2 | **24h price-change indicator**: a small green/red triangle after each token's amount on the Send tab, tap → a popup with the exact % and "Value changed from X to Y". Backed by CoinGecko's `usd_24h_change` (added to the existing `simple/price` call in `chain.js:fetchPrices` - no extra request) · `TOKENS`/`getTokenBalances` now also return `change24h` per token · hidden when the move is under 0.005%. **VOLATILE TOKENS ONLY (user correction, first pass showed it on USDC/EURC too - "stablecoin thì đâu có biến động")**: `STABLECOINS = ['USDC','EURC']` in `HomeSend.jsx` gates it, so today only cirBTC gets the arrow. **Gap is EXACTLY 15px** (user correction - the first pass's flex-gap + button padding stacked to more than that): the button's own `margin: '-6px -6px -6px 9px'` cancels its 6px touch-padding on 3 sides and leaves precisely 9+6=15px on the left; no arrow for a token → no gap at all, the amount sits flush at the row edge exactly as before the feature | HomeSend.jsx, chain.js |
| 3 | **Home hint block reworded**: `Available Network: Arc Testnet` → `Current Available Network: Arc Testnet` (user request) | NotifArea.jsx |
| 4 | **The Paste / Scan QR / Contacts hint titles on the Send tab are no longer tappable** - the user reported they navigated to "random" places; the row-9 buttons below already do the same job, so the `onClick` on the hint labels was simply dropped | HomeSend.jsx |
| 5 | **Scan QR caption reworded**: "Scan crypto wallet QRs only" → "Scan Arc Testnet QRs only" (matches the network-lock wording used elsewhere) | QRScanner.jsx |
| 6 | **Security's icon replaced** with a new hexagon shield drawing from `D:\Files\Claude\Icons\shield.svg`, normalised on import (stroke `black`→`currentColor`, as the header comment in `Icon.jsx` prescribes) - same filename `icon/shield.svg`, so no code change needed elsewhere | icon/shield.svg |
| 7 | **Menu's "Currency" entry + the screen's own title became "Language & Currency"** (user request - the name should say what the screen still half-implies even though the language picker itself is gone) | MenuScreen.jsx, Currency.jsx |
| 8 | **Send screen: the `Balance:` line moved** from beside "Send to" (added just last session, 9A above) down into the blank space right below the note field - the user found the original grouping "hơi xấu" (a bit ugly). "Send to" now stands alone where the pair used to be | SendAmount.jsx |
| 9 | **The USDC gas reserve lowered 1 → 0.1** (user decision) - `GAS_RESERVE_USDC` in `data.js` is the single source of truth (`spendableOf()` uses it everywhere "available to send/swap" is computed), so this one constant change updates Send, Swap and the Balance line together. The `<=1` low-balance warning threshold on HomeSend (separate hardcoded number, "out of USDC for fees") was deliberately left at 1 - it is an early warning, not the reserve itself | data.js |

**Decisions the user settled this session (do NOT ask again):**
- `- 08-25: hint-block titles (Paste/Scan QR/Contacts) are plain text, not links` - reason: they duplicated the row-9 buttons and just added a second, confusing way to navigate.
- `- 08-25: Currency screen is named "Language & Currency"` - reason: kept as the umbrella name even with only a currency picker inside, in case language ever returns there.
- `- 08-25: the 24h change arrow hides below a 0.005% move, AND only shows for non-stablecoins` - reason: USDC/EURC are pegged 1:1 and barely move day to day; an arrow "moving" on peg noise would mislead rather than inform. Today this means cirBTC only.
- `- 08-25: GAS_RESERVE_USDC = 0.1 (was 1)` - reason: 1 USDC held back was far more than real gas costs on Arc, over-reserving on a small balance.

**Verification:** `npm run build` OK · `npm test` 16/16 · a Playwright pass on the mock at 390×844 and 375×812 (HomeSend token list + the price-change popup, Menu, Language & Currency, Send money with the relocated Balance line) - no console errors on any screen. The Scan QR camera cannot be exercised headless (`getUserMedia` fails in that environment, an existing limitation, not a regression), so its 3-line caption was verified by reading the source instead of a screenshot.

---

### 📒 WHAT SESSION 2026-08-25 DID (8 commits, `f467b6d` → `dbce9bd`)

| # | Work | Written up in |
|---|---|---|
| 1 | **Service Hub: the DCA tile became LuckyPot** (still hidden/`screen: null`), using the user's own `icon/luckypot.svg` - the first FULL-COLOUR icon in the set | 3 · `Icon.jsx` |
| 2 | **Vietnamese and Chinese removed from the project entirely.** The i18n layer is gone, not merely switched off: `src/i18n.js` + `src/circleLocalizations.js` deleted, 219 `t('...')` calls replaced by plain English, `check-lang` deleted, `Language.jsx` → `Currency.jsx` (currency only, CNY/VND options dropped) | 2 |
| 3 | **Every comment and document translated to English** - all 46 files under `src/`, `functions/`, `test/`, the CI workflow, the root scripts, `README.md`, `PITCH.md`, `CLAUDE.md` and this file. `.env.txt` was deliberately left alone (gitignored, holds secrets) | - |
| 4 | **2 notification bugs fixed** (reported by the user): a faucet payout showing "received 0.00 cirBTC" (a hardcoded `toFixed(2)` against cirBTC dust → the new shared `data.js:fmtTokenAmount`), and long notifications being cut off with "…" (the row was pinned to one line → it now wraps) | 7e |
| 5 | **The network line in the hint block became `Available Network: Arc Testnet`** - two passes: the user first asked for "currently" so the sentence would leave room for more networks, then cut it to this label form because the longer sentence wrapped onto 2 lines. It now matches the `Label: value` shape of the 3 hint lines under it and fits one line down to 360px. The QRScanner wrong-network message keeps the sentence form ("this wallet currently only works on Arc") | 7b |
| 6 | **The CI workflow finally landed** (`.github/workflows/ci.yml`) after switching the git identity to the `KattyFury` account, whose token carries the `workflow` scope | 9 · item 2b |
| 7 | **The Send screen shows the balance**: a `Balance: $126.66` line directly above `Send to:` (user request - "the Send screen is missing Balance"). It shows the SPENDABLE amount (the same number the "Insufficient balance" message quotes, i.e. minus the 1 USDC gas reserve), formatted with `fmtMoney` so it follows the selected currency: `$126.66` / `84.20 EURC` / `0.01542000 cirBTC`. Loading → `…`, never a drawn 0 | 6 |

**Decisions the user settled this session (do NOT ask again):**
- `- 08-25: remove Vietnamese and Chinese from the project` - reason: the app has been English-only in production since 08-13, and keeping an i18n layer whose keys are Vietnamese strings meant carrying a whole translation system for one language.
- `- 08-25: translate every comment and document, this file included` - reason: if the project is English, it is English everywhere, the same all-or-nothing rule that governed the languages.
- `- 08-25: keep LuckyPot hidden` - the tile is renamed, but the service is still not built.
- `- 08-25: notifications may grow taller rather than lose words` - reason: a truncated notification hid the token being received.

**Known consequences to keep in mind:**
- The VND plumbing (`chain.js` rates, `qr.js` parsing, `amountHint.js`) is still in the code but is now UNREACHABLE - nothing can select VND. It was left in place deliberately rather than ripped out on the same day as everything else; delete it in its own session if it is ever confirmed unwanted.
- `Swap.jsx` and `SendAmount.jsx` still carry their own local `decimalsFor()` alongside the new shared `fmtTokenAmount` - out of scope for the bug fix, worth unifying later.
- The `Balance:` line makes the Send screen's amount row sit ~15px higher than CreateQR's, breaking the pixel alignment those 2 screens had (section 6). Deliberate.
- The hint block is back to 4 single lines (115px at ≥375px, 138px at 360px) after the network line was shortened, so nothing has to be scrolled to be read. Keep that line SHORT if it is ever reworded - the block shares a fixed-height area with the notifications.

**Decisions the user settled this session (continued):**
- `- 08-25: the Send screen shows the SPENDABLE balance, not the raw one` - reason: the raw balance would promise money that Continue then refuses. Consequence accepted: Send can read $126.66 while Home reads $127.66.
- `- 08-25: the network line is a label, not a sentence` - `Available Network: Arc Testnet`, one line at every width.

**🧪 DEPLOY CHECKLIST FOR THIS SESSION (nothing below has been touched on a real device yet).**
Everything was verified with Playwright on the mock at 390/375/360px, `npm test` 16/16 and a production build - but the mock cannot exercise Circle, the faucet or a real share sheet:
- [ ] Open `https://ezwallet.cash` on the phone → login + PIN still work (the Circle localisation calls were removed; the PIN screen must come up in Circle's own English, not blank or broken).
- [ ] Tap the faucet on HomeSend → wait for the payout → the notification must read **`Faucet successful · received 0.000549 cirBTC`** style, NOT `0.00 cirBTC`. This is the exact bug reported; it can only be confirmed with a real faucet payout.
- [ ] The same notification must show its FULL text over 2 lines with no `…`.
- [ ] Send screen: the `Balance:` line shows a real number (not a stuck `…`), and it matches what the Continue button accepts - type the exact balance shown and Continue must stay enabled.
- [ ] Switch the currency chip through USD / USDC / EURC / cirBTC - the Balance line must follow it and never overflow.
- [ ] Menu → the entry now reads **Currency** (not "Language & Currency") and the screen has one row, with no leftover language picker.
- [ ] Home hint block: `Available Network: Arc Testnet` on one line, red, above the 3 hint lines.
- [ ] Nothing anywhere in the app renders Vietnamese or Chinese any more.


### 📒 WHAT SESSION 2026-08-13 DID (9 commits, `c80db30` → `1c348a2`)

| # | Work | Written up in |
|---|---|---|
| 1 | **Turned Vietnamese + VND off.** The root bug: `QRScanner` defaulted the currency to `'VND'` for a QR with no unit → an English/USD app scanning a QR produced VND | 2 |
| 2 | **Service Hub** became navbar tab 1, with Swap a service inside it; the Swap screen's row 10 became the red Exit text | 3 |
| 3 | **Locked QRs to the Arc network** (`src/qr.js` = the single source of truth) | 7b |
| 4 | **QR sharing**: the Receive screen sends the image + the address as text; ShowQR sends the image only; both carry the logo + "Only Arc Testnet" | 7bb |
| 5 | **The bug-report button → Telegram**, live in production | 7d |
| 6 | **Fixed the very slow money-received notification** + a per-screen polling interval (Receive 5s / Send 15s) | 7e |
| 7 | **Fixed the round-number suggestion bug** where the step jumped 10x at the value 10 | 3 · `roundHint` |
| 8 | The 2 white pill buttons now hug their text; Service Hub removed from the Menu | 6 · 3 |
| 9 | `src/sound.js` written **but not wired into the app** | 7c |

**Decisions the user settled during that session (do NOT ask again, do NOT change them):**
- `- 08-13: turn 'vi' + VND off` - reason: both machines run English/USD, and leaving them on caused currency confusion. **(Superseded 08-25: Vietnamese and Chinese were removed from the project entirely.)**
- `- 08-13: lock the QR to Arc but leave the address as plain text` - reason: a QR is the one-tap-and-it-sends path and must be blocked; the plain address is the escape hatch for topping up from an exchange.
- `- 08-13: the Receive screen shares the IMAGE + TEXT even though iOS filters target apps` - reason: *"as long as it shares 2 things, not 1"*.
- `- 08-13: the bug icon is GREY` - reason: blue would compete with the main content, red would make older users think their money is in trouble.
- `- 08-13: round-number suggestions - ≥30 step 1, 3-30 step 0.5, <3 shrinks; take the NEAREST multiple` - reason: the old version jumped 10x at the value 10.
- `- 08-13: Service Hub icon 56 + text 21px` - reason: 48+17 was "too small", 64+30 "too big".

**TRIED AND FAILED, do not repeat:**
- `- 08-13: drop text from the share payload + DRAW the address onto the QR image` → the user disliked it (*"putting the address on the QR looks awful"*) → back to including text, accepting that iOS filters the target apps.
- `- 08-13: make the Swap Exit button a .btn-error (a big red gradient block)` → the user found it heavy and clashing with the blue Swap button → changed to centred red TEXT.
- `- 08-13: use .row10-single for the Exit button` → that class centres at 90dvh = the row 9 position, colliding with the Swap button → it must be `gridRow 10`.
- `- 08-13: list what a bug report sends as one long sentence` → the user: *"reporting a bug and it is this demanding?"* → cut to one line → the user then wanted a numbered list → the third version was settled.
- `- 08-13: force Service Hub tiles square (aspectRatio 1)` → 30px text overflowed → aspectRatio dropped in favour of `gridAutoRows: '1fr'`.

---


### 🔴 WAITING FOR THE USER TO CLICK - settled in session 2026-07-31 (read this section FIRST)

> The code is all written and pushed. **2 things can only be done in the Cloudflare Dashboard** (Claude cannot log in: `wrangler login` needs OAuth through a browser, and **wrangler v4 has NO command for attaching a custom domain to Pages** - checked `wrangler pages --help`, it only has project/deployment/deploy/secret/download).

**0. `www.ezwallet.cash`** - ✅ **DONE 08-01, by Claude** (added the custom domain to Pages through REST + created a proxied `CNAME www → ezwallet.pages.dev` with the `claude-code` token). Measured afterwards: www came up in **15 seconds**, both domains HTTP **200**, valid SSL (`ssl_verify_result=0`), serving the same app. **No www → apex redirect is needed**: `index.html` already has `<link rel="canonical">` pointing at `https://ezwallet.cash/`, so SEO sees no duplicate content.

**1. Attaching the domain `ezwallet.cash`** - ✅ **DONE** (measured the evening of 07-29: A `172.67.168.76`/`104.21.94.133` + AAAA, HTTPS **200**, valid SSL, Cloudflare serving it). ⚠️ **`www.ezwallet.cash` was NOT attached at the time** (it did not resolve) - to make www work, go to Custom domains → add `www.ezwallet.cash`.

**2. Creating the KV binding for the contacts backup** - ✅ **DONE 08-06, by Claude** (no Dashboard needed: `wrangler` was already signed in through OAuth with the scopes `workers_kv (write)` + `pages (write)`).
  - Namespace `EZ_SYNC` id `5aec627d80c74c3981944dc070b3bbf0` (`wrangler kv namespace create EZ_SYNC`).
  - Attached to the Pages project through REST `PATCH /accounts/{acct}/pages/projects/ezwallet` with `deployment_configs.production.kv_namespaces` (+ `preview`). **PATCH merges** - the 3 env vars `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` were re-checked after the PATCH: intact.
  - Redeployed through REST `POST .../deployments` (branch `main`) → deployment `7dd93cfe`, commit `d01f7b6`.
  - **⚠️ Do NOT use `wrangler pages deploy` or add `pages_build_output_dir` to `wrangler.toml`** for this project: it is connected to GitHub (`source: github/ezwallet`, prod branch `main`). Deploying directly creates a direct-upload deployment outside the Git flow; switching to a `wrangler.toml` configuration can make the Dashboard env vars be ignored → breaking `API_KEY` = breaking login/swap. The REST route above is the safe one, reuse it.
  - **Verified on production (08-06):** `POST https://ezwallet.cash/api/sync {"action":"nonce"}` → **200** (previously 503). The whole flow was exercised with a viem test key: nonce → sign → session (the recovered `address` matched the signing wallet) → push → pull (the avatar was correctly stripped) → replaying the nonce **401 bad-nonce** → a made-up token **401 bad-token**. **All 3 test keys were deleted from KV afterwards** (`wrangler kv key list` returns `[]`).
  - **WHAT REMAINS = one single thing a machine cannot verify:** whether Circle's REAL signature follows EIP-191 as the server assumes (the Circle SDK does not run on localhost, and a test key cannot stand in for MPC). → the 🔴 checklist in section 3.

**2b. CI** - `.github/workflows/ci.yml` was written and sat LOCAL and uncommitted for a while: GitHub refused the push because the `gh` token lacked the `workflow` scope. ✅ **Committed and pushed 08-25** after switching to the `KattyFury` account (`gh auth switch --user KattyFury` + `gh auth setup-git`), whose token has that scope. The CI badge can go back into the README now that the workflow exists.

*(To let Claude do the two items above: create a Cloudflare API token with **Account → Cloudflare Pages → Edit**, write it into `.env.txt` as `CF_API_TOKEN=` + `CF_ACCOUNT_ID=` - the file is gitignored, so the token never has to be pasted into chat - then ask Claude to call the REST API.)*

**3. The ON-DEPLOY test checklist** (things localhost cannot test, because the Circle SDK does not run there):
- [ ] Open `https://ezwallet.cash` → email login + **PIN** work normally on the new domain
- [ ] Send once + swap once (making sure the domain change did not break the money path)
- [ ] **Fix 07-31 - history:** a transaction the user accidentally sent to themselves must read **"Sent to yourself"** (NOT "Swapped … USDC to USDC"), the newest-to-oldest order is right, and it opens noticeably faster
- [ ] **Fix 07-31 - self-send guard:** pasting your own address → a red message and no way forward · scanning your own receive QR → a message and no way forward
- [ ] **Fix 07-31 - smoothness:** opening the Swap screen shows the balance **immediately** (no frozen `…`) · opening History a second time is instant (the memos are remembered)
- [ ] The link preview card: paste `ezwallet.cash` into Telegram to yourself → an image + a title must appear (X/Facebook cache the card, see section 5)
- [ ] The 6 UI fixes of 07-29: 3/4-width buttons (Swap · Tap-to-copy · Hold-to-show · Back on About/Currency/Security) · the ⇅ gradient button with a white icon · Scan QR has a row 1 title + a **Done** button · the Contacts Add button has no icon · QR Storage has the **Back | Add** pair
- [ ] ⚠️ A reminder: existing users on `ezwallet.pages.dev` arriving at the new domain will be **signed out with empty contacts** (localStorage is per origin). The wallet and the money are not lost. See the gotcha in section 7.
- [ ] ~~08-04 - the localised PIN screens~~ **NO LONGER APPLIES:** the Circle localisation was removed on 08-25 along with the i18n layer, and the PIN screens are back to Circle's English default.
- [ ] **🔴 08-06 - CONTACTS BACKUP AUTH.** The KV binding + the deploy + the server side are verified with a test key (section 9 item 2). What follows can **only be measured on a real device**, because it needs a PIN + Circle MPC signing:
  - [ ] Open the app → through PinGate → **the console must NOT contain `[sync] address recovered from signature does NOT match the open wallet`**. That line means Circle does NOT sign per EIP-191 as assumed → backup disables itself (the app still works, nothing breaks) but **report it immediately**, because the verification in `functions/api/sync.js` would have to change.
  - [ ] Device A adds a contact → device B (same email + PIN) opens the app → the contact appears, **with NO picture** (by design, avatars never reach the server).
  - [ ] Delete that contact on device B → reopen device A → it must **be gone there too** (last-write-wins; it coming back means the merge rule is broken).
  - [ ] Enter the WRONG PIN once then the right one → you still get into the app **and** backup still works (the nonce is not spent by a failed signature).
  - [ ] Sign out → `sessionStorage.ez_sync_token` must be gone; sign in with a different email → the previous account's contacts must **not** appear.
- [ ] ~~08-04b - the security question screens in Vietnamese~~ **NO LONGER APPLIES** (removed 08-25 with the i18n layer). The SDK lessons behind those fixes are kept in section 7.

**Completed in session 08-04:** Vietnamese `setLocalizations` was enabled for Circle's PIN/security screens (a new `src/circleLocalizations.js` wired into `circle.js`/`Login.jsx`) - reversing the 07-01 English-only decision after the docs confirmed the localisable scope was wider than believed (see the gotcha in section 7). The production build passed. **(All of this was removed on 08-25 - kept here as the record of why the decision flipped twice.)**
After testing for real, the user reported 2 bugs (with screenshots): the "Required" word running into the label, and the Security confirmation screen still showing 3 English lines. Both were fixed (see the gotcha in section 7) + `setCustomSecurityQuestions` had to be called as well (a separate method, not part of `setLocalizations`).
8 Vietnamese security questions were then written (`CIRCLE_SECURITY_QUESTIONS`) and wired through `setCustomSecurityQuestions({ questions })`. On retesting: `inputMatch` GENUINELY WORKED (the button lit up) ✅ - but `questions` EMPTIED the entire security-questions screen ❌ (blocking wallet creation) and dragged `securityConfirmItems` back to English. Removing `questions` while keeping `securityConfirmItems` and fixing the `securityIntros` concatenation, then redeploying → **STILL EXACTLY AS EMPTY** (the user: "still no security questions to fill in"). The conclusion at the time: it was not `questions` but the very act of calling `setCustomSecurityQuestions()` (see the gotcha in section 7). The method was **DISABLED in all 3 call sites** - the security-questions screen went back to Circle's English default.

Then the REAL root cause was found: **calling `setCustomSecurityQuestions` with the WRONG SIGNATURE** (positional arguments, not an object) - see the gotcha in section 7. With that fixed, both the question set and the 3 warning lines worked. That unlocked the multi-language work that followed - all of which was removed on 08-25.

---

### 👤 OWNERSHIP: ADDING LANGUAGES was assigned to **LongDC** (user decision 08-04) - ⚠️ ON HOLD SINCE 08-25

> 🔴 **SUPERSEDED 08-25:** the whole i18n layer was removed from the project (see section 2), so the process below no longer matches the code - `src/i18n.js`, `src/circleLocalizations.js`, `READY_LANGS` and `npm run check-lang` no longer exist. It is kept as the record of how it worked, and of the traps found along the way. Anyone bringing multi-language back should design it fresh and read this first.
>
> **What existed then:** `vi` (Vietnamese, the source language) and `en` were 100% complete and enabled. `zh` covered **35%** of the dictionary and had **no** Circle translation → it stayed locked.
>
> **The mandatory rules (settled by the user, non-negotiable):**
> - **"If it is Vietnamese, it is Vietnamese everywhere; if English, English everywhere"** - never let a user see a screen half in one language and half in another.
> - **"One language = one thorough build"** - finish the translation completely before enabling it, never enable it half-done.
>
> **The process for adding a language (e.g. `zh`):**
> 1. Extend the dictionary in `src/i18n.js` (`const ZH = {...}`). The keys were the original Vietnamese strings.
> 2. Add the Circle translation in `src/circleLocalizations.js`: all 3 constants `CIRCLE_LOCALIZATIONS`, `CIRCLE_SECURITY_QUESTIONS`, `CIRCLE_SECURITY_CONFIRM_ITEMS`. Skipping this leaves the app translated but the PIN screen English = a breach of the rule above.
> 3. Run **`npm run check-lang zh`** until it reported "ELIGIBLE".
> 4. ONLY THEN add `'zh'` to `READY_LANGS` (`src/i18n.js`). **Do not edit the `locked` flag in the Language screen** - it was derived from `READY_LANGS`.
> 5. Test on a **real deploy**, not localhost (the Circle SDK does not run on localhost).
>
> **4 traps that were hit, do not hit them again** (details in section 7) - these are CIRCLE SDK lessons and remain valid:
> - `setCustomSecurityQuestions` takes **positional arguments** `(questions, requiredCount, securityConfirmItems)` - calling it object-style leaves the security-questions screen COMPLETELY EMPTY, blocking wallet creation, **with no error reported**.
> - The SDK **concatenates directly**: `questionHeader` + `requiredMark` and `headline` + `headline2`, WITHOUT inserting a space → pad the space yourself (Chinese does not need it, as Han characters take no inter-word spaces).
> - `common.showPin`/`hidePin` are ignored by Circle (their bug, reported) - translating them has no effect, do not waste time digging.
> - Runtime error text inside the iframe **cannot be localised** (16 fields, none for errors). That is a real limitation.
>
> **Which branch:** everything was merged into `main` (08-04) and the `wip/circle-vi-localization` branch was deleted.
>
> **Rough edges in the Vietnamese:** the user reviewed the Vietnamese build and reported "plenty of rough edges" while accepting the merge. That cleanup was LongDC's - and it is moot now that Vietnamese is gone.

### 🌏 MULTI-LANGUAGE + VND CURRENCY - session 08-04 (⚠️ TURNED OFF 08-13, REMOVED 08-25, read section 2 first)

> 🔴 **WARNING: this section describes the state as of 08-04 and is NO LONGER TRUE.** On 08-13 the user turned Vietnamese and VND off, and on 08-25 the i18n layer was removed from the project altogether - see section 2. The section is kept as documentation for anyone rebuilding it.


> **MERGED into `main` 08-04** (commit `1c3a6c0`), the WIP branch deleted, running on `ezwallet.cash`.
> **The default was ENGLISH** - `detect()` no longer guessed from `navigator.language`, so a Vietnamese-configured device still opened in English. Vietnamese + VND sat in the Language & Currency screen for anyone who CHOSE them. The reason: the demo video + the intro deck are both in English, and the app had to match what people watch.
> ⚠️ **The Vietnamese + VND paths were never exercised on a real device** (the Circle SDK does not run on localhost). The risk was low because the default path was unchanged, but anyone enabling Vietnamese and hitting an error would have hit it on PRODUCTION.
> 💡 The env vars for preview deployments (any branch) already have `API_KEY`/`KIT_KEY` set through the Cloudflare API - a newly pushed branch gets a working preview with no extra configuration.

**THE RULES THE USER SETTLED 08-04 - permanent:**
> **"IF IT IS VIETNAMESE, IT IS VIETNAMESE EVERYWHERE; IF ENGLISH, ENGLISH EVERYWHERE"** - never let a user see a screen half in one language and half in another.
> **"ONE LANGUAGE = ONE THOROUGH BUILD"** - finish a language completely before enabling it, never half-done.

- **`READY_LANGS` (`src/i18n.js`) was the SINGLE source of truth** for both `detect()` and the locked/unlocked options on the Language screen. It held `['vi','en']`; `zh` was outside it because the dictionary covered 35% and there was no Circle translation. **The `locked` flag was never edited by hand** - it was derived from `READY_LANGS`.
- **The gatekeeper: `npm run check-lang`** (`scripts/check-lang.cjs`). It measured dictionary coverage + checked whether a Circle translation existed. **It had to reach 100% before a code could be added to `READY_LANGS`.** `en` was exempt from the Circle requirement (English is Circle's own default). Reading by eye MISSED things twice (the action cards on the 2 home screens, the "You pay/You receive" labels) → use a script, do not trust your eyes.
- **Circle errors come in 2 kinds** (documented in `circle.js`): errors drawn INSIDE the iframe (wrong PIN…) are English and CANNOT be changed; terminal errors that surface outside can be worded through `circleErrorMessage()`, mapped by NUMERIC CODE (never match English text - if Circle rewords it, matching goes silent).
- **An unfixed Circle bug:** `common.showPin`/`hidePin` are ignored by the iframe even though `common.continue` works (SDK 1.1.11, the latest). Reported to support.

**VND AS A CURRENCY (the user's decision: type VND directly and let the app convert to USDC):**
- Rates: `vnd` was added to the EXISTING CoinGecko call (`chain.js fetchPrices`) with **no extra request** - the free tier is strictly rate limited. A `VND_PER_USD_FALLBACK` covered a dead API. Stored as **"USD per 1 VND"** to match every other rate.
- **`CURRENCY_CFG` (`data.js`) is the single source of truth** for the symbol / its position / decimals / separators. **₫ goes AFTER the number** (`1.250.000 ₫`) while $ goes before → that is why `fmtDisplay()` exists and why `${symbol}${number}` must never be concatenated by hand (it is what forced 4 screens to be fixed).
- **⚠️ NEVER convert the rate A SECOND TIME:** `SendAmount` settles `tokenAmount` and passes it through `SendConfirm` → `SendReceipt`. Recomputing on a later screen means the number the user confirmed ≠ the number that actually leaves the wallet (rates refresh every 60s).
- Changing currency mid-entry on the Send screen **CLEARS what was typed** ("50" as dollars versus as dong differ by a factor of twenty thousand).
- The "fee too small" threshold must follow **each currency's decimals** (`decimalsOfCurrency`), never a hardcoded `0.01`: a 13 ₫ fee would print as "13,00 ₫", and Vietnamese money has no decimals.
- **2 DIFFERENT suggestion systems, do not merge them** (the user stressed this 08-04):
  - **Typing by hand** (`amountHint.js`, the Send screen): adds zeroes to what was typed - "50" → `5,000 · 50,000 · 500,000`. VND ONLY (typing "50" in USD already means 50 dollars, and suggesting ×100 would be a deadly trap).
  - **The slider** (`roundHint.js`, the Swap screen): rounds around the dragged value - 39,000 → `35,000 · 40,000 · 45,000`. The rounding unit **scales with the magnitude** (the old version pinned u=1, so dragging to 39,000 suggested "39,000.5" - broken). The trade-off the user accepted (option A): 24.4 now gives `20 · 25 · 30` instead of the 07-17e spec's `24 · 24.5 · 25`.
- **Auto font sizing:** `BalanceHeader` + `SendAmount` moved from `amountFontSize` (counting characters) to **`useFitFontSize`** (measuring real width on canvas) - VND numbers are twice as long as USD ones, so counting characters overflowed the layout.

**NEVER TESTED ON A REAL DEVICE** (the Circle SDK does not run on localhost): it would have needed a preview link - switch language, choose VND, type an amount on Send, and check the "Actually sent … USDC" line on Confirm + the Receipt.

**Left pending at the time:** (1) the message to Circle support, drafted but not sent; (2) merging that branch into `main` after testing; (3) Chinese - run `npm run check-lang zh` to 100% + add the Circle translation before adding `'zh'` to `READY_LANGS`. **(2) and (3) are moot since 08-25.**

**⚠️ THE MERGE CHECKLIST for that branch** - README/PITCH described `main` correctly at the time (English-only) but would have become wrong the moment it merged. It had to be updated AT THE SAME TIME as the merge, not before (a public README would otherwise advertise something not yet live). **The whole checklist is moot since 08-25: the app is English-only again, permanently, so the README statements below are true as written.**
- `README.md:183-184` - *"**English-only UI.** The Circle PIN screen is a cross-origin iframe that only renders in English, so the rest of the app is kept in English to match."* → it was to be DELETED on merge. **Since 08-25 the sentence is accurate again**, although the reasoning is now different: the app is English-only by decision, not because Circle forced it (Circle can be localised - see section 7).
- `README.md:101` - "Show balances in USDC or EURC" → VND was to be added. Moot.
- A "Full Vietnamese + VND display/entry" row was to be added to the README feature table. Moot.
- **PITCH.md was to be SKIPPED** (it also carried 4-5 "English-only" sentences): it was considered out of date, with the real introduction living in the video + the Canva deck. **Updated 08-25:** PITCH.md was rewritten in English and its facts refreshed, so it is usable again - but **the VIDEO and the DECK are still the things people actually watch**.

---

**Completed in session 08-03:** `6f6b2cb` **core value** - added the "0. Core value" section to this file plus its own section in `CLAUDE.md`/`README.md`/`PITCH.md` (the 3 English paragraphs the user settled), so that from then on every feature/decision has to answer "does this make crypto simpler for an everyday user?". It also caught and fixed the **GitHub repo description** accidentally using "your grandma" (breaking the Brand Voice rule locked in `CLAUDE.md`) → changed to the correct "my mom" slogan matching the core value. A grep confirmed the short slogan was already consistent in `package.json`/`index.html`/`SECURITY.md`/`DECK-DESIGN-SPEC.md`, so nothing else needed changing.

**Completed in sessions 07-29 → 07-31** (`git log` describes each one in full):
`81ee602` the 6 UI fixes the user reported · `c240911` `.row10-single` = 3/4 · `b181309` **PITCH.md** (the spec + messaging kit) · `9b183b2` audit + dead-code cleanup round 2 · `7f61888` the `ezwallet.cash` domain · `16dd010` the KV backup (OFF on production at the time) · `039faea` **professionalising the repo**: meta/OG + `public/og.png` + `SECURITY.md` + `package.json` metadata + the GitHub homepage · `ef7f7cc` **4 real bugs**: a self-send labelled as a Swap · wrong ArcScan pagination (10,000 rows/11.7s) · no sorting + duplicate React keys (rows could be dropped) · Swap not using the balance cache; **+ blocking self-sends** on all 3 entry paths · `b9a645e` memos: remembered permanently + at most 3 requests in flight (replacing the 30-at-once burst on every open). (From the other machine: `b8d5978` fixing QRs losing their decimals.)

---


> ✅ **07-18 the user CONFIRMED ON A DEPLOY: everything runs smoothly - the PIN (after making `getSDK` async) + a real-money swap both fine.** Nothing is blocked.

1. **The warning `!` icon looks smaller than other icons in the same slot** - the cause: the `!` glyph only occupies ~45/100 of the viewBox inside its circle. WAITING FOR THE USER TO CHOOSE: (a) scale it individually, (b) the user redraws it. The icons are the user's own set - ask first.
2. **A new QR Library icon** - the user will draw it (suggested: 2 stacked cards + a QR corner, viewBox 100, stroke 10). Once drawn, replace it in `HomeReceive`.
3. **Real transaction status** - poll the txHash after sending → "it is on the blockchain" (Swap already has the submitted/successful pair).
4. **Rebuild Google login** through Google Identity Services → routing into the email flow (an architecture change, its own session).
5. Batch sending to several people (Multicall3From, the encoder already exists).
7. ~~**REAL AUTH FOR THE KV BACKUP - THROUGH A PIN SIGNATURE**~~ ✅ **DONE 08-06** - details in section 3. The blocking question back then ("does `executeChallenge` return the signature?") was answered by reading the SDK types: **YES** - `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/types.d.ts:242` `SignMessageResult.data.signature`, with no extra endpoint needed. One difference from the old plan: `recoverMessageAddress` is used instead of `verifyMessage`, so the client never declares its own address. **WHAT REMAINS = testing on a deploy** (the section 3 checklist), because the Circle SDK does not run on localhost.
6. **Bundle optimisation:** the ~1MB SDK chunk is mostly crypto-browserify (the `crypto` polyfill in `vite.config.js`) - try removing `'crypto'` and see whether the SDK still runs, BUT it can only be tested on a deploy → give it its own session, do not bundle it with other work.
   - **DONE 07-22g (the user: "the app is not smooth yet"):** `App.jsx` PREFETCHES during `requestIdleCallback` - loading the frequently used screens in the background (HomeSend/Receive/Swap/Menu/SendAmount/Contacts/TxHistory) + the 1MB Circle SDK (skipped under MOCK) → switching tabs no longer flashes white, and the PIN step does not stall on a cold download. No logic changed (it only warms the cache; the dynamic import() still runs on real navigation). Measured bundles: `index`(SDK) 1026KB/gz281 · `chain`(viem) 270KB/gz83 · `QRScanner`(jsqr) 134KB - the latter two are correctly lazy. The smoothness has not been verified on a deploy (the mock does not load the SDK) - it needs measuring on a real device.

