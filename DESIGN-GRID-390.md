# DESIGN GRID – 390×844 (derived 2026-09-05)

Rules read straight out of the Figma file `l26UsgoqIDfvLkrozVLPTq`, page `0:1`, frames 1–10
(**Frame 8 does not exist** – the file jumps 7 → 9). Every number below is a MEASURED node
coordinate, not an estimate.

The remaining screens (`04-Swap`, `07-PasteAddress` … `20-About`) are still bare 390×844
placeholder rectangles in Figma – they are meant to be built in code FROM these rules.

---

## 1. The canvas

| | |
|---|---|
| Artboard | **390 × 844** |
| Columns | **12 × 32.5px**, zero gutter, zero outer margin (32.5 = 390/12) |
| Rows | **10 × 84.4px** (84.4 = 844/10) – identical to the app's existing `.screen` 10-row grid |

The row grid is not new. The **12-column grid is new**, and it is what the green guides in every
frame are.

### ⚠️ 390 IS THE DRAWING FRAME, NOT A LOCK (user decision 2026-09-05)

`--screen-max` **stays 430px** – the app keeps flexing. 390×844 is only the viewport the frames were
drawn at. Therefore:

- **Every column measurement below is PROPORTIONAL, not absolute.** 1 column = `100/12`% =
  **8.3333%**, so it is 32.5px at 390 wide and 35.83px at 430 wide. Never hardcode 32.5.
- **Every row measurement is `dvh`.** 1 row = 84.4px at 844 tall = **10dvh**. The existing
  `.screen` grid (`repeat(10, 1fr)` over `100dvh`) already is this grid – keep using `grid-row`.
- The **20px inset is absolute** (it is the existing `.screen` padding, not a grid column), so a
  content card is 350 wide at 390 and 390 wide at 430. That is intended.

Conversion used throughout: `x_px / 390 → %` and `y_px / 844 → dvh`.

## 2. Two horizontal insets, used deliberately

| Inset | Width | Where |
|---|---|---|
| **20px** | 350 | Cards on Home / Receive / Menu / Service Hub (`x=19.97 w=350.06`, `x=20.97 w=348.05`) |
| **32.5px = exactly 1 column** | 325 = 10 cols | The sign-in / PIN card, its title, and the hero balance figure |

So: **content cards keep the app's existing 20px `.screen` padding; the login family and the hero
balance are inset one full column instead.**

## 3. Vertical placement snaps to the 84.4 row grid

- Sign-in / PIN card: `y=253.2` = 84.4×3 → **starts at row 4**; `h=337.6` = 84.4×4 → **rows 4–7**.
- Menu list dividers: `y=337.6 / 422 / 506.4 / 590.8` = the row 5 / 6 / 7 / 8 boundaries exactly.
- Menu list rows are one full row tall (84.4).
- NavBar: `y=760.86 h=83.14` → the bottom row (row 10 starts at 759.6).

## 4. Component metrics (exact)

**Login family (frames 1–5)**
- Logo: `w=195` = **6 columns**, centred (`x=97.5` = col 4), `y=180.91`, `h=55.44`.
- Tagline: `y=257.69`, `h=46`, `w=259.8`.
- Card: `x=32.5 y=253.2 w=325 h=337.6`.
- Card title ("Log in or sign up" / "Set up your PIN" / "Re-enter your PIN" / "Enter PIN"):
  `x=32.5 y=308.59 w=325 h=46` – i.e. full card width, centred.
- PIN boxes: **38.94 × 51.85**, pitch 45.01 (**gap 6.07**), 6 boxes, total 264, centred at `x=63`,
  `y=396.08`.
- Error line (frame 5): `y=514 h=46`, and the frame's own note says **red, size 17**.

**Bottom NavBar (frames 6, 7, 9, 10 – identical every time)**
- Bar `y=760.86 h=83.14`, full bleed.
- 4 tabs × **97.5 wide = 3 columns each**.
- Icons **25.58 × 25.58** at `y=774.85`; labels at `y=804.9`.

**Home – Send (frame 6)**
- Hero balance `x=32.5 y=52.88 w=325 h=72` (the 1-column inset).
- Token card `x=19.97 y=131.87 w=350.06 h=318.18`; token rows at `y=150.46 / 210.46 / 270.46`
  → **60px pitch** (USDC, EURC, cirBTC).
- "Hold to show tokens" pill `w=194.25 h=39.46`, centred, `y=429.47`.
- Announcement card `x=19.97 y=485.08 w=350.06 h=169.2`.
- Action row: side buttons **94.31 × 60.77** at `y=676.3`; centre button **127.7 × 66.73** at
  `y=674.3` – **the centre is bigger AND 2px higher = the primary action.**
  Icons: side **15.06**, centre **18.43**.
  Labels left→right: **Paste · Scan QR · Contacts**.

**Home – Receive (frame 7)**
- Same balance, same announcement card, same action row geometry.
- QR card `x=19.97 y=131.87 w=350.06 h=337.05`, QR itself **283.45 × 283.45** at `x=53.27 y=158.67`
  (so the QR is inset 33.3 inside its card).
- Labels left→right: **QR Storage · Custom QR · Share**.

**Menu (frame 9)**
- Balance full width at `y=52.88 h=72`.
- Deposit / Withdraw pair: `h=56.12` at `y=182.94`; Deposit `x=16.63 w=170.84`,
  Withdraw `x=203.34 w=169.66` → ~16.5 gap, ~16.6 outer margin.
- List rows, one 84.4 row each: Transaction history `y=282.28` · Security `y=365.49` ·
  Language & Currency `y=446.2` · About `y=535.42` · Sign out `y=618.63`; text `h=46`.
- Chevron at `x=369`, size ~28.5 × 24.1. Dividers span `x=20.97 → 369.03`.

**Service Hub (frame 10)**
- Title `y=28.54 h=55.86`, full width, centred.
- **3 FULL-WIDTH HORIZONTAL CARDS** `w=348.05 h=145.3` at `x=20.97`,
  `y=96.03 / 264.95 / 432.40` → **pitch 168.42 = card 145.3 + gap 23.1**.
- Icon **100.39 × 100.39** at `x=40.59` (left side of the card).
- Card title `x=156.04 h=55.86`; description `x=154.97 w=202.53 h=46`.
- Content: **Exchange** – "Swap USDC to EURC or cirBTC with LI.FI" · **PigSave** – "Buy a piggy bank
  and start saving" · **LuckyPot** – "Your idle USDC can earn you $$$$".

## 5. What these frames do NOT specify

The frames are **wireframes**: white ground, grey rounded boxes, black text, the real logo. They
carry **no fills, no radii, no font sizes** (the only type instruction anywhere is frame 5's
"make it red, size 17"). Text-box heights (46 / 55.86 / 72) are line boxes, not font sizes.

⇒ **Geometry comes from Figma; colour and type keep the existing locked system in `src/index.css`.**
Do not back-derive font sizes from the 46/55.86/72 box heights.

## 6. Rules to carry to the un-designed screens

1. Sub-screen title in row 1; buttons in `.row10-single` / `.row10-dual` (unchanged).
2. Any card that holds CONTENT sits at the 20px inset (350 wide). Any card that holds a
   FORM/DIALOG sits at the 32.5px inset (325 wide).
3. A card's height is a whole number of 84.4 rows.
4. A row of 3 actions = 94.3 / 127.7 / 94.3 with the centre one primary (bigger, 2px higher).
5. A list row is one 84.4 row tall with a divider on the row boundary and a chevron at x=369.
6. A repeated-item card (Service Hub) is full-width horizontal: icon left ~100, title + one
   description line right.
