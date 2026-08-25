// AMOUNT SUGGESTIONS while TYPING BY HAND on the Send screen (user decision 2026-08-04).
//
// The problem: some currencies deal in large numbers - sending five hundred thousand means tapping "500000",
// six touches, and it is very easy to add or drop a zero. Older users then cannot tell 50,000 from 500,000.
// The fix: type the first few digits then TAP the level you meant - "50" → [5,000] [50,000] [500,000].
//
// ⚠️ COMPLETELY DIFFERENT from roundHint.js (the Swap slider): that one rounds the ODD number a drag produces
// (7.35 → 7 / 7.5 / 8). This one ADDS ZEROES to what the user just typed. Do not merge the two.
//
// ONLY for large-number currencies with no decimals (VND). In USD/EUR, typing "50" already means 50 dollars, and
// suggesting 100x more (5,000 dollars) is both silly and DANGEROUS (one wrong tap = sending a hundred times too much).

// Multiplier steps: typing "50" → 5,000 · 50,000 · 500,000 (the exact example the user gave).
const MULTIPLIERS = [100, 1000, 10000]

// digits: the string being typed (digits only, e.g. '50'). avail: the available balance IN THE SAME CURRENCY.
// Returns an array of numbers (ascending, at most 3) to render as tappable chips. Nothing worth suggesting → [].
export function amountHints(digits, avail) {
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return []

  // Already typed something big enough (≥ 6 digits = 100,000 and up) → stop, the user knows what they are doing -
  // more suggestions would only cover the keyboard.
  if (digits.replace(/^0+/, '').length >= 6) return []

  return MULTIPLIERS
    .map(m => n * m)
    .filter(v =>
      v > 0 &&
      // NEVER suggest an amount above the balance - tapping it walks straight into "insufficient balance".
      // avail unknown (null/undefined, balance still loading) → show it anyway, the screen blocks at Continue.
      (avail == null || v <= avail) &&
      v !== n            // exactly the number being typed - no point suggesting it
    )
}

// Number → grouped string: 500000 → "500.000" (DOT as the thousands separator).
export function fmtAmountHint(v) {
  return v.toLocaleString('vi-VN')
}
