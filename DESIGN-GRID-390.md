# DESIGN GRID – 390×844

**Re-derived 2026-09-07** from the redrawn Figma file `l26UsgoqIDfvLkrozVLPTq`, page `0:1`.
Every number below is a MEASURED node coordinate, not an estimate.

> ⚠️ **This file replaced an earlier version dated 09-05, and almost every number in it moved.**
> The user redrew the frames, renamed them, and dropped the gradient from the brand. Anything you
> remember from the previous revision – the 20px side margin, the 94.31/127.7 action row, "frame 8
> does not exist", "frame 1 is logo + tagline only" – is now WRONG. Read this, do not recall.

## 0. The frames, by their current names

The frames are no longer numbered `Frame 1…10`. The user renamed them so the mapping to code is
unambiguous:

| Figma frame | Node | Screen in code | State |
|---|---|---|---|
| `Splash` | `32:141` | – **not built yet** | logo + tagline, nothing else |
| `Login-signup` | `3:22` | `Login.jsx` | logo + tagline + a **"Log in or sign up" button** |
| `Login-Privy` | `3:195` | Privy's own modal | the sign-in card |
| `Login-PIN1` | `5:310` | `PinGateHost.jsx` | "Set up your PIN", 6 boxes |
| `Login-PIN2` | `6:430` | `PinGateHost.jsx` | "Re-enter your PIN", 6 boxes |
| `Login-PIN3` | `7:499` | `PinGateHost.jsx` | "Enter PIN", 6 boxes + the red error line |
| `Home-Send` | `11:536` | `HomeSend.jsx` | |
| `Home-Receive` | `32:171` | `HomeReceive.jsx` | |
| `Home-Menu` | `14:746` | `MenuScreen.jsx` | |
| `Home-Services` | `14:864` | `ServiceHub.jsx` | |
| `Frame 10` | `32:49` | `SendAmount.jsx` | **"Send money" – NEW, not applied to code yet** |

Everything else on the canvas (`04-Swap`, `07-PasteAddress` … `20-About`) is still a bare 390×844
placeholder rectangle: a name reserving a slot, with nothing drawn inside it.

### ⚠️ THE POPUP RULE (user instruction 2026-09-07, verbatim)

> "từ frame 1 tới frame 6, mọi thứ diễn ra dưới dạng pop up. đầu tiên là popup Privy, nếu có báo lỗi
> cũng là báo trên popup Privy, set up PIN cũng là popup giống Privy, re-enter PIN cũng là popup,
> pop up là cánh cổng ngăn người khác vào thẳng màn 06"

Between `Login-signup` and `Home-Send` there are **no screens, only popups**. Errors are reported
**on the popup**, never on a screen behind it. Nothing may be drawn outside a popup in that stretch.

### ⚠️ EVERY KEYBOARD IS THE SYSTEM KEYBOARD (user instruction 2026-09-07)

> "tôi không cần tự vẽ ra bàn phím số, bàn phím chữ, passkey, toàn bộ bàn phím từ giờ là hệ thống"

No hand-drawn numeric pad, no hand-drawn alphabetic pad, no hand-drawn passkey UI. The PIN frames
draw no keypad at all, and `Frame 10` leaves its whole bottom half empty for exactly this reason.
`src/components/Numpad.jsx` is therefore **on its way out** – see §7.

---

## 1. The canvas

| | |
|---|---|
| Artboard | **390 × 844** |
| Columns | **12 × 32.5px**, zero gutter (32.5 = 390/12) |
| Rows | **10 × 84.4px** (84.4 = 844/10) – the app's existing `.screen` 10-row grid |

### ⚠️ 390 IS THE DRAWING FRAME, NOT A LOCK (user decision 2026-09-05, still in force)

`--screen-max` **stays 430px** – the app keeps flexing. Therefore:

- **Horizontal measurements are PROPORTIONAL.** 1 column = **8.3333%**. Never hardcode 32.5.
- **Vertical measurements are `dvh`.** 1 row = **10dvh**. Keep using `grid-row`.

Conversion used throughout: `x_px / 390 → %` and `y_px / 844 → dvh`.

## 2. The side margin changed: 20 → 23.69

Every card, divider and button pair in the redrawn frames starts at `x=23.69` and ends at `366.69`:
a **343-wide** content strip, not the 350 the old 20px padding produced.

⇒ `--pad: calc(min(100vw, var(--screen-max)) * 0.060744)` in `src/index.css` (23.69 at 390,
26.12 at 430). `.screen`'s padding, `.full-bleed` and `.navbar` all derive from it.

**Anything punching through that padding must write `calc(-1 * var(--pad))`, never `-20px`.**

The login/PIN family keeps its own, different inset: **32.5 = exactly 1 column**, card 325 wide.

## 3. Component metrics (exact, as redrawn)

**Login family** (`Splash`, `Login-signup`, `Login-Privy`, `Login-PIN1/2/3`)
- Logo `w=195` = **6 columns**, centred (`x=97.5`), `y=180.91 h=55.44`.
- Tagline `y=257.69 h=46`, `w=259.8` (on `Login-signup`/`Splash` the box is `w=264.59 h=69`).
- **"Log in or sign up" button** (`Login-signup` only): `x=69 y=613.76 w=254 h=48.66`.
  ⇒ 65.13% of the screen, top **72.72dvh**, the app-wide pill height.
- Card `x=32.5 y=253.2 w=325 h=337.6` → rows 4–7 exactly.
- Card title `x=32.5 y=308.59 w=325 h=46`.
- PIN boxes **38.94 × 51.85**, pitch 45.01 (**gap 6.07**), **6 boxes** (the 5 drawn on `Login-PIN3`
  before 09-07 were a drawing slip, confirmed by the user – it is 6 everywhere).
- Error line `y=514 h=46`; the frame's own note: **red, size 17**.

**Bottom NavBar** (identical on all four Home frames)
- Bar `y=758 h=86`, full bleed → **10.19dvh, bottom-aligned** (it was `y=760.86 h=83.14`).
- 4 tabs × **97.42 wide** (= 389.69/4).
- Icons **25.58** at `y=774.85`; labels at `y=804.9`.
- ⚠️ Each frame also draws a **97.42 × 86 block on its own active tab**. See §6 – open question.

**Home – Send**
- Hero balance `x=32.5 y=46.88 w=325 h=72` (the 1-column inset).
- Token card `x=23.69 y=118.88 w=343 h=303.78` → **top 14.084dvh, height 35.99dvh**.
- Token rows `y=138.46 / 198.46 / 258.46` → 60px pitch.
- "Hold to show tokens" pill `y=402.27 h=39.46 w=257`, centred → its **centre sits on the card's own
  bottom edge** (402.27 + 39.46/2 = 422 ≈ the card's 422.66). ⇒ `top: 50%`.
- Announcement card `x=23.69 y=462.03 w=343 h=188.97` → **top 54.74dvh, height 22.39dvh**.
  Crosses the row 6/7 boundary, so it is absolutely positioned, not a row span.
- Action row: sides **100 × 56.73** at `y=676.00`; centre **125.54 × 66.73** at `y=671`.
  Gaps `(343 - 325.54)/2 = 8.73` ⇒ `1fr 1.2554fr 1fr` with `gap: 2.545%`.
  Both centre lines are **704.37 = 83.45dvh** – identical, which is the invariant to preserve.
- Labels left→right: **Paste · Scan QR · Contacts**.

**Home – Receive**
- Same balance, same card box, same announcement card, same action row.
- QR **266 × 266** at `x=62 y=128.05` → 31.52dvh / 68.21vw. (Was 283.45; it shrank with the card.)
- Tap-to-copy line `x=33.69 y=402.27 w=323 h=39.46` – same y as Send's pill, different width, which
  is intended (user decision 08-13: the two hug their own text, do not even them up).
- Labels left→right: **QR Storage · Custom QR · Share**.

**Home – Menu**
- Balance full width `y=46.88 h=72`.
- **WITHDRAW LEFT, DEPOSIT RIGHT** – reversing the 09-05 reading. On the old frame both labels were
  centred text boxes whose x meant nothing; now each label box lies exactly over its own button:
  `Withdraw x=22.92 w=166.77` over `Rectangle 48`, `Deposit x=199.69 w=167` over `Rectangle 53`.
- Both `h=48.66` at `y=181.46`.
- List rows: Transaction history `y=282.28` · Security `y=369.49` · Language & Currency `y=453.20` ·
  About `y=539.42` · Sign out `y=626.63`; text `h=46`.
- Dividers `y=335.55 / 422 / 508.03 / 596.21`, spanning `x=23.69 w=343` – still the row 4/5/6/7
  bottom edges to within 5px, so `borderBottom` on each row still lands on them.
- Chevrons at `x=366.69`; **none on Sign out**.

**Home – Services**
- Title `y=36.45 h=55.86`, full width, centred.
- **3 full-width horizontal cards** `x=23.69 w=343 h=153` at `y=86 / 259 / 432`
  → **pitch 173 = card 153 + gap 20**.
- Icon **100.39** at `x=40.59`, 26.31 of clearance top and bottom → dead centre.
- Card title `x=156.04 h=55.86`; description `x=154.97 w=202.53 h=46`.

**Send money** (`Frame 10`) – **NOT YET IN CODE**
- Title "Send money" `y=36.45 h=55.86`, full width, centred (same as Service Hub's).
- "to: <name>" `y=106.01 h=46.99`, full width, centred.
- Amount `y=168.02 h=72`, full width, centred.
- Currency chip `x=288.23 y=171.64 w=79.13 h=36.14` + chevron at `x=359.09 y=196.57`.
- "Max: $1,234.56" `y=222.78 h=18`, centred.
- Note field `x=22.98 y=274.22 w=299.54 h=36.56`, plus a `34.16 × 36.56` square at `x=333.02`.
- **Back** `x=23.12 y=354.27 w=166.77 h=48.66` · **Continue** `x=199.88 w=167 h=48.66`.
- ⚠️ **Everything ends at y=403.** The entire lower half is empty – that is where the SYSTEM
  keyboard goes. No numpad is drawn because there is not meant to be one.

## 4. The pill height is one number

`48.66` on an 844 board = **5.765dvh**, and it is the same everywhere: Withdraw/Deposit,
Back/Continue, "Log in or sign up". `.btn` carries it, with `min-height: 48px` as the touch floor on
short viewports.

## 5. Colour: solid, no gradients (user decision 2026-09-07)

The brand identity dropped its gradient – `design/new-brand/{icon,full}.svg` are a flat **#0B53BF**.
The four `--grad-*` tokens now hold the **dark end** of each old ramp:

| token | value | role |
|---|---|---|
| `--grad-brand` | `#0B53BF` | CTA buttons, the primary action card |
| `--grad-primary` | `#16A34A` | success / received |
| `--grad-warning` | `#F59E0B` | warning (**black** text) |
| `--grad-error` | `#DC2626` | error / delete |

The names are historical – read `--grad-*` as "the button fill".

## 6. What these frames still do NOT specify

The frames remain **wireframes**: white ground, grey rounded boxes, black text. They carry **no
fills, no radii, no font sizes** (the only type instruction anywhere is the PIN frames' "make it red,
size 17"). Text-box heights (46 / 55.86 / 72) are line boxes, not font sizes.

⇒ **Geometry comes from Figma; colour and type keep the locked system in `src/index.css`.**

**Open questions – ASK, do not guess:**
1. The **active NavBar tab** is now drawn as a full `97.42 × 86` block on every Home frame. The app
   currently marks it with a 5px brand bar at the top of the tab. Is the block a filled highlight,
   and in what colour?
2. `Home-Receive` puts the QR at `y=128.05` inside a card starting at `118.88` – 9.17 above, 28.6
   below, i.e. **not** vertically centred, which contradicts the explicit user decision of 07-19.
   Drawing imprecision, or intended?
3. `Home-Receive`'s line reads **"Click to copy your Account Number"**; the app says "Tap to copy
   your wallet address". Adopt the new wording (and is "Click" right on a phone)?

## 7. Rules to carry to the un-designed screens

1. Sub-screen title in row 1; buttons in `.row10-single` / `.row10-dual` (unchanged).
2. A card that holds CONTENT sits at `--pad` (343 wide). A card that holds a FORM/DIALOG sits at the
   32.5 = 1-column inset (325 wide).
3. A card's height is a whole number of 84.4 rows unless the frame says otherwise.
4. A row of 3 actions = `1fr 1.2554fr 1fr`, gap 2.545%, centre one primary (bigger, 5px higher),
   all three sharing one centre line.
5. A list row is one 84.4 row tall, divider on the row boundary, chevron at `x=366.69`.
6. A repeated-item card (Service Hub) is full-width horizontal: icon left 100.39, title + one
   description line right.
7. **Any screen that takes typed input leaves the bottom half of the screen empty** for the system
   keyboard, as `Frame 10` does. Do not draw a keypad.
