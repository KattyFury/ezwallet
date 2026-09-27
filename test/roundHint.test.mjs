// Tests for the Swap slider's round-number suggestions: node test/roundHint.test.mjs
//
// ⚠️ THE CURRENT SPEC - user decision 2026-08-13 (third revision):
//   value ≥ 30 → step 1 (whole units) · 3 ≤ value < 30 → step 0.5 · value < 3 → shrink with the magnitude.
// Take the NEAREST multiple of the step as the centre, plus one step each side. Full details at the top of src/roundHint.js.
// The 08-04 version (u = 0.5 × 10^floor(log10(value))) WAS DROPPED: its step jumped 10x right at the value 10, so dragging to
// 14.55 suggested "10 · 15 · 20" - reported by the user 08-13.
//
// 📌 THIS FILE WAS ONCE FORGOTTEN: commit 08-04 (ae8979e) changed roundHint.js but NOT the test →
// the 5 cases below stayed on the 07-17e spec, and `npm test` was red from then until 08-13 even though the app was correct.
// Next time roundHint.js changes, CHANGE THIS FILE TOO in the SAME commit.
//
// ⚠️ Every number here is in TOKEN UNITS (not USD) - see the top of roundHint.js.
import { roundHints, fmtHint } from '../src/roundHint.js'

let pass = 0, fail = 0
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g === w) { pass++; return }
  fail++
  console.log(`  ✗ ${label}\n      want: ${w}\n      got:  ${g}`)
}

// ── The 0.5 step holds across 3-30 (this is exactly the case the user reported 08-13)
eq(roundHints(24.40, 1000), [24, 24.5, 25], '24.40 → [24, 24.5, 25]')
eq(roundHints(23.3, 1000), [23, 23.5, 24], '23.3 → [23, 23.5, 24]')
eq(roundHints(14.55, 1000), [14, 14.5, 15], '14.55 → [14, 14.5, 15] (the reported case)')
eq(roundHints(17.3, 1000), [17, 17.5, 18], '17.3 → [17, 17.5, 18] (the reported case)')
eq(roundHints(9.15, 1000), [8.5, 9, 9.5], '9.15 → [8.5, 9, 9.5] - the NEAREST multiple, not the floor')
// ── From 30 up: step 1, rounding to WHOLE UNITS
eq(roundHints(101.3, 1000), [100, 101, 102], '101.3 → [100, 101, 102] (whole units)')
// Landing exactly on 101 means 101 is dropped by the "do not suggest the current value" filter - 2 chips left, as intended
eq(roundHints(101, 1000), [100, 102], 'sitting exactly on 101 → [100, 102] (101 not repeated)')
eq(roundHints(30.1, 1000), [29, 30, 31], '30.1 → [29, 30, 31] (just past 30)')
eq(roundHints(29.9, 1000), [29.5, 30, 30.5], '29.9 → [29.5, 30, 30.5] (still under 30)')
eq(roundHints(39000, 200000), [38999, 39001], '39,000 → [38999, 39001] (itself dropped from the middle)')

// ── The old 07-17c example must still make sense: 735 EURC at 1% = 7.35 → a 0.5 step at unit scale
eq(roundHints(7.35, 735), [7, 7.5, 8], '7.35 → [7, 7.5, 8]')

// ── Suggestions must be ASCENDING
const asc = roundHints(24.40, 1000)
eq(asc.every((v, i) => i === 0 || v > asc[i - 1]), true, 'suggestions are sorted ascending')

// ── NEVER above the balance: anything over it is dropped, even if almost all of them go
eq(roundHints(24.40, 24.6), [24, 24.5], 'balance 24.6: 25 is dropped → [24, 24.5]')
let over = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).some(v => v > avail + 1e-9)) over++
  }
}
eq(over, 0, 'sweeping 1-100% × 5 wallets: no suggestion exceeds the balance')

// ── Sitting exactly on a round number → do not suggest it again (the other 2 still show)
eq(roundHints(150, 750, 2), [149, 151], 'sitting exactly on 150 → [149, 151] (150 not repeated)')
eq(roundHints(25, 1000), [24.5, 25.5], 'sitting exactly on 25 → [24.5, 25.5] (25 not repeated)')
eq(roundHints(24.5, 1000), [24, 25], 'sitting exactly on 24.5 → [24, 25] (24.5 not repeated)')

// ── cirBTC (very small numbers, 6 decimals) - the unit shrinks with the magnitude, never empty, never over the balance
eq(roundHints(0.008327, 0.01542, 6), [0.008, 0.0085, 0.009], 'cirBTC 0.008327 → [0.008, 0.0085, 0.009]')

// ── Edges: 0 / negative / NaN / a zero balance → an empty array, no crash
eq(roundHints(0, 100, 2), [], 'amount 0 → empty')
eq(roundHints(5, 0, 2), [], 'balance 0 → empty')
eq(roundHints(-5, 100, 2), [], 'negative amount → empty')
eq(roundHints(NaN, 100, 2), [], 'NaN → empty')

// ── At most 3 suggestions (row 7 is tight)
let tooMany = 0
for (let pct = 1; pct <= 100; pct++) {
  for (const avail of [12, 84.2, 735, 1234.56, 50000]) {
    if (roundHints(avail * pct / 100, avail, 2).length > 3) tooMany++
  }
}
eq(tooMany, 0, 'at most 3 suggestions')

// ── fmtHint: no trailing ".00"
eq(fmtHint(7, 2), '7', 'fmtHint 7 → "7"')
eq(fmtHint(7.5, 2), '7.5', 'fmtHint 7.5 → "7.5"')
eq(fmtHint(0.30000000000000004, 6), '0.3', 'fmtHint cleans up floating-point noise')

console.log(`\n${fail === 0 ? '✓ ALL PASSED' : '✗ FAILURES'} - passed ${pass}, failed ${fail}`)
process.exit(fail === 0 ? 0 : 1)
