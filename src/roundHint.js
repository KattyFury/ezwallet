// ROUND-NUMBER SUGGESTIONS for the % slider (Swap screen).
//
// The problem: dragging a % of the balance produces odd numbers. A 735 EURC wallet → 1% = 7.35 EURC.
// The fix: offer a few ROUND numbers nearby to TAP - "for people who like round numbers" (the user).
//
// ⚠️ COMPUTED IN THE TOKEN BEING PAID, not in USD (user decision 07-17c: "it has to be a % of the Pay unit").
// Converting to USD and rounding gives a number that is round in USD but ODD in the token - exactly what the user
// did not want.
//
// NEW SPEC (user decision 07-17e - "be GENEROUS with hints, hint both ends and the 0.5 in the middle too"):
// always offer the FULL TRIO around the dragged number: floor · floor+0.5 · ceil.
//   24.40 → [24, 24.5, 25]        23.3 → [23, 23.5, 24]        7.35 → [7, 7.5, 8]
// The old version filtered by a "nearby" threshold (1 slider step / 25% of the dragged value), so 24.40 only gave
// [24, 25] with no 24.5, sometimes missing an end entirely - the user called it "a bit thin". Do NOT reintroduce a
// filter threshold: floor/ceil are by definition less than 1 unit away, so they can never "jump too far" as once feared.
// Still filtered: > 0, never above the balance, and never re-suggesting the number already selected.

// Clean up floating-point noise from multiplying/dividing (0.1*3 = 0.30000000000000004 → an ugly number on the chip).
const clean = (v, dec) => Math.round(v * 10 ** dec) / 10 ** dec

// amount, avail: SAME UNIT. dec = decimals (2 for USDC/EURC, 6 for cirBTC, 0 for VND).
// Returns an ARRAY of round numbers (ascending, at most 3) for the user to tap. Nothing useful → [].
//
// ══ ROUNDING STEP - user decision 2026-08-13 (third revision, read it all before changing anything) ══
//
//   value ≥ 30    → step 1     (round to WHOLE UNITS)        101 → 100 · 101 · 102
//   3 ≤ value < 30 → step 0.5                                17.3 → 17 · 17.5 · 18
//   value < 3     → shrink further with the magnitude        0.0083 → 0.008 · 0.0085 · 0.009
//
// Then take the NEAREST multiple of the step as the centre, plus one step on each side.
// ⚠️ NEAREST, not FLOOR (user decision "Rule A" 08-13): 9.15 → 8.5 · 9 · 9.5.
// Flooring turns 9.15 into "9 · 9.5 · 10", which the user rejected.
//
// ⚠️ TWO BROKEN ATTEMPTS IN THE HISTORY - DO NOT GO BACK:
//  · 07-17e: pinned the step at 0.5 for EVERY value → sliding up to 39,000 suggested "39,000.5" (user caught it).
//  · 08-04: switched to u = 0.5 × 10^floor(log10(value)) → the step JUMPED 10x right at the value 10:
//    9.99 stepped by 0.5 while 10.0 stepped by 5 ⇒ dragging to 14.55 suggested "10 · 15 · 20" (reported 08-13).
//    Lesson: a rounding step tied to POWERS OF 10 gives one tier per decade - far too coarse.
// This version has exactly ONE jump (0.5 → 1 at the value 30), and it doubles rather than multiplying by ten, so
// nudging by a cent no longer changes the whole order of magnitude of the suggestions.
//
// ⚠️ The "< 3" branch MUST STAY: cirBTC amounts are thousandths, and a pinned 0.5 step rounds the centre to 0 →
// every suggestion is filtered out (v > 0) → an EMPTY chip row.
export function roundHints(amount, avail, dec = 2) {
  if (!(amount > 0) || !(avail > 0)) return []
  const eps = 10 ** -dec / 2

  const u = amount >= 30 ? 1
    : amount >= 3 ? 0.5
    : 0.5 * 10 ** Math.floor(Math.log10(amount / 3))
  // The NEAREST multiple of u (not the floor) → the trio is centred as close as possible to the dragged value.
  const mid = clean(Math.round(amount / u) * u, dec)

  return [clean(mid - u, dec), mid, clean(mid + u, dec)].filter(v =>
    v > 0 &&
    v <= avail + 1e-12 &&                 // NEVER suggest more than the balance
    Math.abs(v - amount) >= eps           // already sitting on that exact number → no point suggesting it
  )
}

// Round number → compact string: 7 → "7", 7.5 → "7.5", 0.0154 → "0.0154" (no trailing ".00")
export function fmtHint(v, dec = 2) {
  return String(clean(v, dec))
}
