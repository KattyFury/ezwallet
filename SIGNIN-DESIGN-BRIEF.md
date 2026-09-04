# Sign-in screen – design brief (for Claude Desktop + Figma)

> Written 2026-09-04, on the `privy` branch, mid-migration. Purpose: hand off to a design pass
> before more code changes. Do not treat anything below as decided – the two flagged questions
> block a correct layout.

---

## 1. What this screen actually is

Not a generic "Log in or sign up". It is the **first-time entry point**: create a wallet with
email, or connect an existing MetaMask wallet. Whatever copy/labels the design uses should say
that, not borrow web2 login language.

**Open question A – what happens on return visits?**
`MIGRATION-PRIVY.md` section 1c (2026-08-30, a security decision, not a style choice) replaced PIN
with Passkey (fingerprint/Face ID) for embedded wallets, because Privy has no real PIN – a
hand-built one would only be a string compare, bypassable via devtools. The current code on this
branch implements Passkey, not PIN.
The user just described the flow as "sau này dùng PIN" (subsequent times use PIN). **This
contradicts the recorded decision.** Before Figma work starts on a "returning user" screen, confirm
which one it actually is:
- (a) Still Passkey, and "PIN" was just the word used out of habit, or
- (b) A deliberate reversal back to PIN – if so, the reasoning in MIGRATION-PRIVY.md 1c needs a
  documented answer to why the earlier security concern no longer applies.

MetaMask users are out of scope for either: Passkey/PIN only ever applied to the embedded
(email-created) wallet. A MetaMask user is guarded by MetaMask's own unlock, not this app's.

---

## 2. What is technically fixed vs. changeable

The sign-in UI is **Privy's own hosted modal** (`usePrivy().login()`), not custom-built screens.
Confirmed by reading `node_modules/@privy-io/react-auth/dist/dts/types-Ck8tvlPZ.d.ts`
(`PrivyClientConfig.appearance`) and by rendering it and inspecting the live DOM.

**Changeable via config** (`src/privy.js` → `privyConfig.appearance`):
- `logo` – image/element or `''` for none
- `landingHeader` – the modal's title line
- `loginMessage` – one line under the header/logo, hard-capped at 100 characters by the SDK
- `accentColor`, `theme` (light/dark)
- Which login options show and their order (`loginMethods`, `walletList`, `showWalletLoginFirst`)

**NOT changeable via config – confirmed by reading the type definitions, no such field exists:**
- The email field's placeholder text (currently Privy's own `your@email.com`)
- The submit button's label (currently Privy's own `Submit`)
- Any other in-modal microcopy (error text, the "Protected by Privy" footer, etc.)

**Open question B – given that constraint, which direction:**
- (i) Keep Privy's hosted modal, accept its fixed placeholder/button wording, only customize what
  `appearance` exposes (header, one message line, colors, logo on/off), or
- (ii) Drop the hosted modal for the email step and hand-build the email + OTP UI on top of Privy's
  headless hook (`useLoginWithEmail`), which gets full control of every string and pixel.
  This is the exact rebuild that was rejected on 2026-08-30 ("use Privy's popups, don't
  re-implement what Privy ships") – reopening it is fine if that is really what's wanted now, but
  it should be a conscious choice, not a side effect of wanting different placeholder text.

MetaMask ("Continue with a wallet") is a Privy-hosted flow either way; it is not affected by this
choice.

**Confirmed behavior (measured, not assumed):** the modal renders as a fixed element
(`#privy-dialog-backdrop`) pinned to the full viewport, blurring whatever is behind it. On a
390×844 phone frame it visually sits low enough to read as a bottom sheet, but it is centered
full-viewport, not anchored to the bottom – worth knowing if Figma wants a true bottom-sheet look,
because that would fall under question B (custom-built), not something `appearance` can do.

**Font – confirmed, not a blocker either way.** Checked Privy's own shipped CSS
(`node_modules/@privy-io/react-auth/dist/esm/ui.mjs` and the `*Screen-*.mjs` files): every text
element inside the modal is `font-family: inherit` – Privy ships no webfont of its own, it just
takes whatever font-family is active on the page. The one exception is wallet-address/key display,
hardcoded to a monospace stack regardless of app font. Practical effect:
- Keeping Privy's hosted modal (option B-i): the modal automatically matches whatever the app sets
  as `--font-base` in `index.css` (currently the system-ui stack) – nothing to hunt down or sync.
- Going custom-built (option B-ii): no Privy modal left to inherit from, so font is 100% the
  design's own choice regardless.

---

## 3. Current draft state on this screen (uncommitted, not pushed)

For reference only – this is what exists in the working tree right now, described so Figma work
isn't starting from a blank assumption of the old screen:

- `src/screens/Login.jsx`: the modal now opens automatically on arrival (no button press needed),
  and reopens itself if closed (via `useModalStatus().isOpen`) – closing it has nowhere to go, so
  the X / backdrop-click / Escape are all made into no-ops this way. The old "Sign in with Email"
  button was removed since it had nothing left to do.
- `src/privy.js`: `appearance.logo` set to `''` (no logo inside the modal – the app's own logo
  above it already carries that). `landingHeader`/`loginMessage` were touched then reverted mid-edit;
  **do not assume any particular header/message text is currently set** – check the file before
  building on it.
- The app's own logo + slogan (rows 1–5, above the modal) are unchanged from before this session.

---

## 3b. NEW BRAND SYSTEM (decided 2026-09-04, NOT YET APPLIED TO CODE)

Recorded here for reference only, per user's explicit choice to hold off implementing it until the
sign-in screen itself is settled – avoids touching brand color/logo twice. Nothing in `src/` reflects
this yet; `--color-brand` is still the old solid `#0B53BF`, and `logo.svg`/`design/logo.svg`/favicon
files are still the old set.

- **Color: the gradient is decorative only, scoped to the logo/icon artwork.** User confirmed
  2026-09-04: `--color-brand` stays solid `#0B53BF` everywhere it's used today (buttons, nav active
  state, filters, borders) – NOT replaced app-wide. The vertical gradient `#00C0E8` (top) →
  `#0B53BF` (bottom) applies only to the logo mark itself (already baked into `logo.svg`/`full.svg`/
  `icon.svg` as a `linearGradient` fill), not to any UI chrome. No `--color-brand` change needed when
  this work resumes.
- **Primary font:** SF Pro (not SF Pro Rounded – that was for the logo specifically, see below).
  Note from the font discussion earlier: SF Pro is what Apple/Figma now call the unified family
  (the old separate "SF Pro Display"/"SF Pro Text" naming is gone). This is a system font already
  covered by the existing `--font-base` stack (`-apple-system` resolves to it on Apple devices) – no
  webfont download needed for this part.
- **Logo font:** SF Pro Bold.

### The new logo set – 4 files on the user's Desktop (`C:\Users\Dell\Desktop\`)

| File | Purpose | Checked, 2026-09-04 |
|---|---|---|
| `logo.svg` | Mark only, no wordmark | OK – 512×406, gradient top `#00C0E8` → bottom `#0B53BF`, matches spec |
| `full.svg` | Mark + "wallet" wordmark | OK, but the wordmark is solid black (`fill="black"`), not on the gradient – only the mark itself carries it. Confirm this is intentional before use. |
| `icon.svg` | Favicon / app icon | OK – 512×512, same mark, same gradient |
| `pfp.svg` | Future app PFP | **EMPTY – just a white 512×512 rectangle, no artwork.** Needs re-export before this is usable for anything. |

---

## 4. Layout constants (for matching the app's existing grid, if the new design reuses it)

- Screen frame: `max-width: 430px` (`--screen-max`), a 10-row CSS grid (`.screen`,
  `grid-template-rows: repeat(10, 1fr)`).
- Brand color: `#0B53BF` (`--color-brand`) – unchanged, stays solid app-wide (see section 3b: the
  gradient is logo-only, not a replacement for this).
- Button/slogan text size: 21px (`--fs-md-lg`).
- Existing rule (CLAUDE.md): English only, en dash `–` only (never em dash `—`), no
  "grandma"/"stablecoin wallet" phrasing – the settled line is *"A crypto wallet simple enough for
  my mom to use."*

---

## 5. What to bring back from the design pass

1. A decision on question A (Passkey vs PIN for returning users) and question B (accept Privy's
   modal wording vs. hand-build the email step).
2. If (B-ii): a full mock of the email + OTP screen(s), matching the app's own visual language
   instead of Privy's default modal chrome.
3. If (B-i): just the header/message copy and logo choice to feed into `appearance` – no new
   screens needed, this is a small config change.
4. Confirmation of whether the "cannot be dismissed" behavior (section 3) is still wanted once the
   actual content is decided.
