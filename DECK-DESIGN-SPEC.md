# EZwallet Pitch Deck — Design Spec

**For:** Claude Design (design handoff)
**Companion:** `ezwallet-deck-content-spec.md` defines the COPY (what each of the 9 pages says). THIS file defines the DESIGN: the visual system, the art direction, and the standard of excellence to hit.

**How to read this:** Sections 0–1 are the non-negotiable brand system (exact color + type). Sections 2–6 are the craft. Section 7 is per-slide art direction. Sections 8–10 are the guardrails and the bar for "done." Layout and composition are yours to invent within this system.

---

## 0. Design North Star

> **The deck should feel like the product: calm, confident, and effortless — proof, not hype.**

EZwallet's entire thesis is *"simple enough for your grandma."* The deck must earn that claim visually. If a slide feels busy, clever, or crowded, it's wrong. The most impressive thing about this deck should be how *quiet* and *sure of itself* it is. Big type, few words, deep whitespace, one idea per slide. Think Apple keynote restraint on a Coinbase-Wallet palette.

Every slide answers one question in one breath. If a viewer has to hunt for the point, redesign.

---

## 1. Design Principles (apply to every slide)

1. **One idea per slide.** A single headline thought, supported — never competing bullet clusters.
2. **Big, light, generous.** Oversized type, Light-weight hero numbers, and whitespace as a design element, not leftover space.
3. **Two moods, hard cut.** Blue-gradient slides are emotional beats (open, problem, close); white slides are calm product truth. Never blend them.
4. **Color is meaning, not decoration.** Blue = brand/action, green = receive/success, orange = the *one* thing to look at. Nothing is colored "to look nice."
5. **Honesty is the aesthetic.** Restraint reads as credibility. No fake dashboards, no invented metrics, no stock-photo hype. Real screenshots or nothing.

---

## 2. Brand Foundations — exact values, use verbatim

All tokens are the REAL product design tokens (`src/index.css`), so the deck and the live app at `ezwallet.pages.dev` read as one brand. Do not approximate.

### 2.1 Color palette

**Primary / brand**
| Token | Hex | Use |
|---|---|---|
| Brand blue | `#0B53BF` | Headers on light slides, key UI, solid brand fills, glyph circles |
| Brand blue (bright) | `#0088FF` | Top of the gradient; bright brand accent |
| Brand soft | `#E2EAF7` | Pale brand tint for cards/chips on light slides |

**Accent — the single spotlight color (use once per slide, max)**
| Token | Hex | Use |
|---|---|---|
| Accent orange | `#FF5F1F` | The one thing the eye should land on first: a hero number, one keyword, an underline, the CTA. **Never** body/caption text. |

**Semantic — carry the product's meaning**
| Token | Hex | Soft tint | Meaning |
|---|---|---|---|
| Green | `#16A34A` | `#DCFCE7` | Receive / success / positive |
| Red | `#DC2626` | `#FEE2E2` | Error / loss (rare in deck) |
| Yellow | `#F59E0B` | `#FEF3C7` | Warning (rare; text on it is always BLACK) |

**Neutrals**
| Token | Hex | Use |
|---|---|---|
| Black | `#000000` | Primary text on light slides |
| Muted | `#636366` | Secondary text on light (AA, 6:1) |
| Muted-2 | `#8E8E93` | Captions, footer, de-emphasized labels |
| Divider | `#E5E5EA` | Hairlines only — never text, never a large fill |
| Surface | `#F2F2F7` | Neutral card/tile fill on light slides |
| White | `#FFFFFF` | Light-slide background; all text on gradient slides |

**Contrast (accessibility is the product's thesis — the deck must pass it):**
- Body text hits **WCAG AA 4.5:1**: `#000000`/`#636366` on white; `#FFFFFF` on the gradient.
- **Orange fails AA for small text on white (~2.9:1)** — use it only for large display type (≥ ~40px), numerals, underlines, or graphical accents.
- Never white text on yellow.

### 2.2 Backgrounds — two modes, hard cut

**A. Gradient mode — emotional beats.**
Fill: linear gradient **180° top→bottom, `#0088FF` 0% → `#0B53BF` 100%** (both stops fully saturated; %s are positions). All text `#FFFFFF`; secondary text white 70–80%. Orange sings here — this is where the one accent lives. **Use for P1, P2, P9.**

**B. Light mode — product truth.**
Background `#FFFFFF`. Text `#000000` + `#636366`. Cards = `#F2F2F7` (or `#E2EAF7` for brand-flavored) with rounded corners and **no hard 1px borders** — separate blocks with soft fills, not outlines. Header/keyword emphasis in brand blue; one orange accent allowed. **Use for P3–P8.**

> **Rhythm:** gradient (P1) → gradient (P2) → light (P3–P8) → gradient (P9). Two gradient bookends plus the dark Problem beat frame the bright product middle. The mode switch itself tells the story: tension (blue) → relief (white) → invitation (blue).

### 2.3 Typography — Barlow only

**One typeface, Barlow, everywhere.** Weights 300 / 400 / 500 / 600 — **never 700+** (Barlow bold is heavy; 600 is the ceiling).

| Weight | Role |
|---|---|
| **300 Light** | Large hero numerals ONLY (stat callouts, big numbers). Never below ~40px. |
| **400 Regular** | Body, descriptions, taglines |
| **500 Medium** | Labels, card titles, buttons, list items |
| **600 SemiBold** | Slide titles, section headers, emphasis |

**Deck type scale (16:9 @1920×1080 — guidance):**
| Role | Weight | Size |
|---|---|---|
| Slide title (H1) | 600 | 72–88 |
| Section subhead | 400 | 28–34 |
| Hero number / big stat | 300 | 120–170 |
| Card / feature title | 600 | 26–32 |
| Body / description | 400 | 20–24 |
| Label / eyebrow / caption | 500 | 16–20 |
| Footer / page number | 400 | 14–16 |

Tracking normal (titles may go −1 to −2%). Line-height ~1.05–1.15 titles, ~1.35–1.5 body.

### 2.4 Iconography motif — colored circle + glyph

A solid colored circle holding a short glyph, Barlow 600, glyph in white.
- Default fill brand blue `#0B53BF` (or the gradient for richness).
- **Echo the product's semantics:** Send → blue (up), Receive → green (down), Swap → blue (⇅), Contacts → blue.
- Reserve orange for at most ONE circle per slide — the first thing to notice.
- Flat color + white glyph; if depth, a tight vertical drop shadow (dark, not diffuse) matching the app's buttons.
- Consistent stroke weight and size rhythm across all 9 slides.

### 2.5 Logo & product imagery

- Real **EZwallet logo** (`design/logo.svg`, wordmark) on P1 and footer/CTA — white/knockout on gradient, full-color on light.
- **Real app screenshots/GIFs** for P4 (and optionally P3) once available; icons are placeholders until then. The app is already Barlow + brand-blue on white, so screenshots are on-brand — frame in a simple rounded device/card, never recolor.

---

## 3. Copy & Language — READ THIS

**The app and this demo are in ENGLISH. Every visible string in the deck is English** — headers, labels, and especially any *example* or *mockup* text.

- **On-chain message example (P6 "Messages on-chain"):** show it as **English**, e.g. **"Mommy, I sent you money"** (or "Happy birthday, Grandpa 💙"). Do **not** print a Vietnamese phrase on the slide. The *concept* — attaching a warm personal note to a transfer, the way people write a memo on a bank transfer — stays; the shown text is English. (This overrides the Vietnamese example string in the content doc, which was only a placeholder for the idea.)
- Any placeholder amounts, names, or notes in a mockup are English and realistic (e.g. contact "Grandma", note "Mommy, I sent you money", amount "$20.00").
- Keep microcopy tight and warm, matching the product's voice: plain, kind, no jargon.

---

## 4. Global Layout System

- **One master template.** Same outer margin every slide (~96px), same title baseline, same footer zone. Consistency is what makes 9 slides feel like one deck.
- **Title pattern.** H1 top-left (top-center on P1/P9), optionally a small brand-blue eyebrow above or a short orange underline below — same treatment on all 9.
- **Footer (content slides).** Small and muted: `EZwallet` wordmark left, page number right, in `#8E8E93` (light) / white-70% (gradient). Optional persistent **"Arc Testnet"** micro-badge.
- **Multi-card slides (P3–P6).** One grid; equal card sizes; identical padding and gaps; identical card style across every slide. 2×2 suits the four-item slides.
- **Whitespace is the signature.** Calm, uncluttered, Coinbase-Wallet breathing room. When in doubt, remove an element and enlarge the rest.

---

## 5. Component Patterns (define once, reuse everywhere)

- **Feature / flow card:** rounded rect, `#F2F2F7` or `#E2EAF7` fill, no border. Glyph circle → Barlow 600 title → Barlow 400 description in `#636366`. Uniform across the slide.
- **Pain-point item (P2, gradient):** glyph circle (neutral or red-tinted), white 600 title, white-80% one-liner.
- **Stat callout (P7):** huge Barlow **300** number — the visual peak of the deck. One of the three in orange (the most impressive), the rest brand blue; small 500 label beneath.
- **Differentiator row (P6):** compact title + one-liner, small brand-blue glyph/check, scannable.
- **CTA:** pill, brand-gradient fill, white 500 text, tight vertical drop shadow (like the real app buttons). Secondary links = plain text (brand blue on light / white on gradient) with the URL shown verbatim.
- **Badge:** small rounded chip, brand-soft fill + brand-blue text (light) or white outline (gradient).

---

## 6. Motion (only if the deck is presented as a build/animated file)

Keep it invisible-good: content **fades and rises ~12px** on entrance, 200–300ms, gentle ease-out; stagger cards ~60ms. The ⇅ swap glyph may do a single 180° flip on the Swap beat. No spins, bounces, or flashy transitions — motion should feel like the product's, calm and purposeful. If static, ignore this section.

---

## 7. Per-Slide Art Direction

Content is fixed by the content spec; below is visual intent + a rough composition sketch.

**P1 — Title · GRADIENT.** The hero. Centered EZwallet logo (white), tagline *"A stablecoin wallet simple enough for your grandma to use."* in Barlow 400. Small badge "DeFi Track — Build on Arc, 4-Week Hackathon." Credit line small at the bottom. One orange accent (a dot, or the tagline's key word). Vast space around the logo — confidence through emptiness.

**P2 — The Problem · GRADIENT (heaviest slide).** "The Problem" + subhead. Three pain points (12-Word Seed Phrase / Long 0x Addresses / Gas Tokens & Fees) as glyph-circle + title + one-liner, evenly spaced. The bottom callout ("Most people abandon wallet setup at step one." / "…never get past account creation.") sits apart and slightly larger — the emotional gut-punch. This is the darkest, tensest beat.

**P3 — Meet EZwallet · LIGHT (the exhale).** "Meet EZwallet" in brand blue, subhead *"could my mom use this?"*. 2×2 grid of the four feature cards (Email + PIN / Gas in USDC / Familiar Amounts / Accessible by Design), each a glyph circle + title + one-liner. Bright, warm, immediate relief after P2.

**P4 — Core Flows · LIGHT (the proof).** Header + subhead. Four flow cards (Send / Receive / Swap / Contacts) with product-semantic icon colors (Send blue, Receive green, Swap blue, Contacts blue). **Reserve a large, clean area for a real device-framed screenshot or GIF** — this is the "it actually works" slide; screenshots beat icons the moment they exist. If showing a Send mockup, the note reads "Mommy, I sent you money."

**P5 — Built on Arc + Circle · LIGHT.** Header + subhead ("not a wrapper"). Four stack items (Circle User-Controlled Wallets / Arc / Stablecoin Kit + LiFi / Cloudflare). Small official logos if available, else glyph circles. Clean and technical without feeling dense — communicate "real end-to-end integration," not a logo salad.

**P6 — What Makes It Different · LIGHT.** Five title + one-liner rows, scannable. Spotlight the two strongest — **"Swap without typing"** and **"Messages on-chain"** — with the one orange accent. For "Messages on-chain," if you show the message, it's English: **"Mommy, I sent you money."**

**P7 — Where We Are · LIGHT (the peak).** "Where We Are." Three giant Barlow-300 stats (100% / 4/4 / 1) — the biggest type in the whole deck. Orange on the single most impressive stat. Live-demo + source links beneath, URLs verbatim. This slide should feel like a mic-drop of quiet facts.

**P8 — Builder · LIGHT.** "Builder." Hieu Nguyen (0xhieu), Hanoi. Three credibility facts as a clean list; optional avatar in a brand-blue ring. Human, understated, real.

**P9 — What's Next / CTA · GRADIENT (the close, mirrors P1).** "What's Next." Roadmap items (Mainnet launch · iOS & Android app · More languages in-app) clearly marked FUTURE — no dates, not "done." Big CTA **"Try EZwallet now → ezwallet.pages.dev"** as a gradient/orange pill. Secondary links (github · x · telegram) verbatim. Warm, open, inviting — the bookend to P1.

---

## 8. Accessibility (embody the thesis)

- Large text, high contrast, few elements per slide.
- Every text/background pair meets AA (see 2.1) — verify orange and yellow.
- Never rely on color alone; pair with glyph/label.

---

## 9. Hard Guardrails (never violate)

- **Arc Testnet only** — never imply mainnet or real money. Any status/badge says **"Arc Testnet."**
- **Roadmap (P9) reads as FUTURE** — no dates, no "launched," visually separate from the present-tense status on P7.
- **Never** a bank; no "deposit insurance," "guaranteed," "yield," or "interest."
- **Real UI only** — no invented screens, features, or numbers; screenshots are of the real app.
- **No new claims/features/logos** beyond the content spec. Empty space > filler.
- **All visible text is English** (see Section 3).

---

## 10. The Bar — "excellent" means

Before calling a slide done, check:
- [ ] One idea, graspable in under 3 seconds.
- [ ] Exactly one orange accent (or none) — nothing else competes for first attention.
- [ ] Correct mode (gradient beat vs light product) with correct text colors.
- [ ] Barlow only; hero numbers are Light 300; no weight above 600.
- [ ] All colors are the exact hex tokens; no approximations.
- [ ] Generous margins; the slide could lose an element and improve.
- [ ] Every string English; example note = "Mommy, I sent you money."
- [ ] Footer, title position, and card style identical to the other 8.
- [ ] Nothing implies mainnet, a bank, or a promise.

**Assets to gather:** EZwallet logo (white + full-color), real app screenshots/GIFs (P4, maybe P3), Arc/Circle/Cloudflare/LiFi marks (P5, optional), builder avatar (P8, optional), Barlow webfont (300/400/500/600), and this palette + type scale saved as reusable master styles.
