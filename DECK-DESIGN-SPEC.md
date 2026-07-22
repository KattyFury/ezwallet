# EZwallet Pitch Deck — Design Spec

**For:** Claude Design (design handoff)
**Companion doc:** `ezwallet-deck-content-spec.md` — that file defines the COPY/WHAT on each of the 9 pages. THIS file defines the VISUAL SYSTEM: exact colors, exact fonts, layout system, component patterns, and per-slide art direction.

**Division of labor (same as content spec):** the content is locked — do not add, remove, or reword claims/features. Exact spacing, composition, and micro-layout are your call. This spec locks the **brand system** (color + type + motif) so every slide reads as one product; within that system you have creative latitude on layout.

**Source of truth:** all colors/fonts below are the REAL EZwallet product design tokens (from `src/index.css`), so the deck matches the live app at `ezwallet.pages.dev`. Use these values verbatim — do not substitute approximate colors or a different font.

---

## 0. Deliverable

- **9 slides**, 16:9 landscape (design at 1920×1080).
- One consistent master template across all 9 (shared margins, header position, footer, page number).
- Export: presentation-ready (PDF + editable source). Keep text as live text, not rasterized, wherever possible.

---

## 1. Brand Foundations

### 1.1 Color palette — use these exact hex values

**Primary / brand**
| Token | Hex | Use |
|---|---|---|
| Brand blue | `#0B53BF` | Primary brand color: headers on light slides, key UI, solid brand fills, glyph circles |
| Brand blue (light stop) | `#0088FF` | Top of the brand gradient; bright brand accent |
| Brand soft | `#E2EAF7` | Pale brand tint — card backgrounds / chips on light slides |

**Accent (use sparingly — see 1.2 rules)**
| Token | Hex | Use |
|---|---|---|
| Accent orange | `#FF5F1F` | THE single emphasis color: one hero number, one keyword underline, active glyph, or CTA highlight per slide. Never body text. |

**Semantic (match the product's meaning — reuse for the Send/Receive story)**
| Token | Hex | Soft tint | Meaning in product |
|---|---|---|---|
| Green | `#16A34A` | `#DCFCE7` | Receive / positive / success |
| Red | `#DC2626` | `#FEE2E2` | Error / loss (use rarely in deck) |
| Yellow | `#F59E0B` | `#FEF3C7` | Warning/attention (rare in deck; if used, text on it must be BLACK) |

**Neutrals**
| Token | Hex | Use |
|---|---|---|
| Black / content | `#000000` | Primary text on light backgrounds |
| Muted | `#636366` | Secondary text on light backgrounds (AA-compliant, 6:1) |
| Muted-2 | `#8E8E93` | Tertiary / captions / de-emphasized labels |
| Divider gray | `#E5E5EA` | Hairline dividers, borders — never as a text color, never as a large fill |
| Surface | `#F2F2F7` | Neutral card/tile background on light slides |
| White | `#FFFFFF` | Light-slide background; all text on gradient/dark slides |

**Contrast rules (this product's ethos is accessibility — honor it):**
- Body text must hit **WCAG AA (4.5:1)**. On white use `#000000` or `#636366`. On the blue gradient use `#FFFFFF`.
- **Orange `#FF5F1F` fails AA for small text on white (~2.9:1).** Only use orange for LARGE display type (≥ ~40px), numerals, underlines, or graphical accents — never paragraph/caption text.
- Never put white text on the yellow `#F59E0B`; if yellow appears, text on it is black.

### 1.2 Backgrounds — two slide modes

Design each slide in ONE of two modes; don't mix backgrounds mid-slide.

**A. Gradient mode (key/emotional slides).**
- Fill: linear gradient **180° (top → bottom), `#0088FF` at 0% → `#0B53BF` at 100%`** (both stops fully saturated; 0%/100% are positions, not opacities).
- All text = `#FFFFFF`. Secondary text = white at ~70–80% opacity.
- Accent orange `#FF5F1F` pops beautifully on this blue — this is the best place for the one orange accent.
- Use for: **P1 Title, P2 The Problem, P9 What's Next / CTA.** (P2 as a darker, heavier "pain" moment.)

**B. Light mode (content slides).**
- Background: `#FFFFFF`.
- Text: `#000000` (primary) + `#636366` (secondary).
- Cards/tiles: `#F2F2F7` surface, or `#E2EAF7` brand-soft for brand-flavored cards — rounded corners, NO hard 1px gray borders on white (borders read as flat; use soft fills to separate).
- Header/keyword emphasis: brand blue `#0B53BF`; one orange accent allowed per slide for the single most important word/number.
- Use for: **P3, P4, P5, P6, P7, P8.**

> Rhythm across the deck: gradient (P1) → gradient (P2) → light (P3–P8) → gradient (P9). The two gradient bookends + the dark Problem slide frame the light "product" middle.

### 1.3 Typography — Barlow only

**Font family: Barlow for everything (headers + body).** No second typeface. Load weights 300, 400, 500, 600.

**Weight discipline (from the product — keep it):**
- **300 Light** → large HERO numerals only (stat callouts, big balance-style numbers). Light at large size = elegant; never use Light below ~40px.
- **400 Regular** → body copy, descriptions.
- **500 Medium** → labels, card titles, buttons, list items, important values.
- **600 SemiBold** → slide titles (H1), section headers, active/emphasis.
- **Never 700+** (Barlow bold is heavy/ugly — 600 is the ceiling).

**Deck type scale (16:9 @1920×1080 — guidance, adjust within reason):**
| Role | Barlow weight | Size (px) |
|---|---|---|
| Slide title (H1) | 600 | 72–88 |
| Section subhead | 400 | 28–34 |
| Hero number / big stat | 300 | 120–170 |
| Card / feature title | 600 | 26–32 |
| Body / card description | 400 | 20–24 |
| Label / eyebrow / caption | 500 | 16–20 |
| Footer / page number | 400 | 14–16 |
| Glyph inside circle | 600 | scale to circle |

- Tracking: default/normal. Titles may go slightly tight (−1 to −2%). Body stays normal.
- Line-height: titles ~1.05–1.15; body ~1.35–1.5.

### 1.4 Iconography motif — colored circle + glyph

Keep the established motif: **a solid colored circle containing a short 2–3 character glyph/label**, Barlow 600, glyph in white.

- Default circle fill = brand blue `#0B53BF` (or the `#0088FF→#0B53BF` gradient for a richer look).
- **Reuse product semantics** where the content maps to them, so the deck echoes the app:
  - Send → brand blue, up motif
  - Receive → green `#16A34A`, down motif
  - Swap → brand blue, swap/⇅ motif
  - Contacts → brand blue
- Reserve orange `#FF5F1F` for at most ONE highlighted circle per slide (the item you want the eye to land on first).
- Circles are flat color + white glyph; if you add depth, use a subtle vertical drop shadow (dark, tight, not diffuse) consistent with the app's button shadows.
- Keep glyph set consistent in stroke weight and size rhythm across all slides.

### 1.5 Logo & product imagery

- Use the real **EZwallet logo** (`design/logo.svg`, wordmark, viewBox 1160×380) on P1 and in the footer/CTA. On gradient slides use the white/knockout version; on light slides use the full-color/dark version.
- **Product screenshots (P4 especially):** use REAL screenshots/GIFs from the live app once available (placeholders/icons until then, per content spec). The app UI is Barlow + brand blue on white — screenshots will already be on-brand. Frame them in a simple rounded device/card; do not recolor or restyle the UI.

---

## 2. Global Layout System

- **Consistent master:** same outer margin on every slide (suggest ~96px), same title baseline position, same footer zone.
- **Title pattern:** H1 top-left (or top-center on P1/P9), optionally with a short orange underline or a small brand-blue eyebrow label above it. Keep the SAME treatment on all 9.
- **Footer (every content slide):** small, muted — e.g. `EZwallet` wordmark left, page number right, in `#8E8E93` (light slides) or white-70% (gradient slides). Optional persistent micro-badge "Arc Testnet" (see guardrails).
- **Multi-card slides (P3, P4, P5, P6):** align cards to one grid; equal card sizes; consistent internal padding; consistent gap. A 2×2 grid suits the 4-item slides; P6 (5 items) can be a row/stack — your call, but keep card style identical across slides.
- **Whitespace:** generous. This is an accessibility-first product; the deck should feel calm and uncluttered, not dense. Coinbase-Wallet-level breathing room is the aesthetic target.

---

## 3. Component Patterns (define once, reuse everywhere)

- **Feature/flow card (P3, P4, P5):** rounded rectangle, `#F2F2F7` or `#E2EAF7` fill, no hard border. Top: glyph circle. Then Barlow 600 title. Then Barlow 400 description in `#636366`. Uniform size across the slide.
- **Pain-point item (P2, on gradient):** glyph circle (consider muted/neutral or red-tinted for "pain"), white 600 title, white-80% one-liner. Three in a row or stack.
- **Stat callout (P7):** huge Barlow **300** number (the "100%", "4/4", "1") — this is where the orange accent shines (make ONE of the three orange, or all three brand-blue with orange reserved for the single most impressive). Small 500 label beneath in muted/white.
- **"What makes it different" row (P6):** compact title + one-liner per item; a small brand-blue glyph or check per item; keep it scannable.
- **Links / CTA:** primary CTA = pill button, brand gradient fill, white 500 text, tight vertical drop shadow (matches the app's real buttons). Secondary links = plain text, brand blue on light / white on gradient, with the URL shown verbatim.
- **Badge (track / status):** small rounded chip, brand-soft `#E2EAF7` fill + brand-blue text on light, or white-outline on gradient.

---

## 4. Accessibility (this is the product's whole thesis — the deck must embody it)

- Large text, high contrast, few elements per slide.
- Every text/background pair meets AA (see 1.1). Verify orange and yellow especially.
- Don't rely on color alone to carry meaning (pair with glyph/label).

---

## 5. Per-Slide Art Direction

Content is fixed by the content spec; below is only the visual intent.

**P1 — Title · GRADIENT.** Hero moment. Centered EZwallet logo (white), tagline "A stablecoin wallet simple enough for your grandma to use." in Barlow 400 white. Small "DeFi Track — Build on Arc, 4-Week Hackathon" badge. Credit line small at bottom. One orange accent max (e.g., a dot or underline). Calm, confident, lots of space.

**P2 — The Problem · GRADIENT (heavier/darker feel).** Header "The Problem" + subhead. Three pain points as a row/stack of glyph-circle + title + one-liner (12-Word Seed Phrase / Long 0x Addresses / Gas Tokens & Fees). Bottom callout ("Most people abandon wallet setup at step one." / "Ordinary users… never get past account creation.") set apart, slightly emphasized — this is the emotional gut-punch.

**P3 — Meet EZwallet · LIGHT.** Header "Meet EZwallet" (brand blue), subhead "could my mom use this?". 2×2 grid of the four feature cards (Email + PIN, Gas in USDC, Familiar Amounts, Accessible by Design), each with a glyph circle. This is the "relief after the problem" slide — bright, friendly.

**P4 — Core Flows · LIGHT.** Header + subhead. Four flow cards (Send / Receive / Swap / Contacts) using the product-semantic icon colors (Send blue, Receive green, Swap blue, Contacts blue). Leave clear space for REAL screenshots/GIF (device-framed) — this is the demo slide; screenshots > icons once available.

**P5 — Built on Arc + Circle · LIGHT.** Header + subhead ("not a wrapper"). Four stack items (Circle User-Controlled Wallets / Arc / Stablecoin Kit + LiFi / Cloudflare). More technical but keep it clean and readable; small logos of Arc/Circle/Cloudflare if available, otherwise glyph circles. Convey "real, end-to-end integration."

**P6 — What Makes It Different · LIGHT.** Header. Five short title + one-liner items, scannable stack/rows. Highlight the one or two most distinctive ("Swap without typing", "Messages on-chain") — orange accent on the single strongest differentiator.

**P7 — Where We Are · LIGHT.** Header "Where We Are". Three big stat callouts (100% / 4/4 / 1) in Barlow 300 Light at large size — the visual peak of the deck. Orange on the hero stat. Live-demo + source links beneath, URLs verbatim.

**P8 — Builder · LIGHT.** Header "Builder". Hieu Nguyen (0xhieu), Hanoi. Three credibility facts as clean list. Optional avatar/photo in a brand-blue ring. Human, credible, understated.

**P9 — What's Next / CTA · GRADIENT.** Header "What's Next". Roadmap items (Mainnet launch · iOS & Android app · More languages in-app) shown as clearly FUTURE/aspirational (see guardrails — no dates, not "done"). Big CTA "Try EZwallet now → ezwallet.pages.dev" as a gradient/orange pill. Secondary links (github · x · telegram) verbatim. Strong closing, mirrors P1.

---

## 6. Hard Guardrails (design rules from the content spec — do not violate)

- **Arc Testnet only.** Nowhere imply mainnet, "real money," or production launch as current. If a status/badge appears, it says **"Arc Testnet."**
- **Roadmap items (P9) must read as FUTURE/aspirational** — no dates, no "launched," no promise. Visually separate them from the "Where We Are" status (P7), which is present-tense fact.
- **Never** present it as a bank; never use "deposit insurance," "guaranteed," "yield," or "interest."
- **No invented UI:** don't mock up screens, features, or numbers that aren't in the content spec. Product screenshots must be of the REAL app.
- **No new claims/features/logos** beyond the content spec. If a slide feels empty, use whitespace — don't add content.
- Keep it honest and calm: this deck's credibility comes from restraint, not hype.

---

## 7. Asset Checklist (gather before/while designing)

- EZwallet logo: white/knockout + full-color (`design/logo.svg`).
- Real app screenshots/GIFs for P4 (Send, Receive, Swap, Contacts flows) and optionally P3.
- Arc / Circle / Cloudflare / LiFi logos for P5 (if used, official marks only).
- Builder avatar for P8 (optional).
- Barlow webfont (300/400/500/600).
- This palette + type scale, applied as reusable styles/master so all 9 slides stay in sync.
