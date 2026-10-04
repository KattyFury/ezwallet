// Locks the owner's 2026-10-04 rule: no guessed prices. Without a LIVE rate a value shows "…", never a number.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displayNum, fmtDisplay, fmtFee } from '../src/data.js'

test('USDC is the dollar - always shown', () => {
  assert.equal(fmtDisplay(5, 'USDC', null), '$5.00')
  assert.equal(fmtDisplay(5, 'USDC', {}), '$5.00')
})

test('no live rate for the display currency → "…" (was a silent 1:1)', () => {
  assert.equal(displayNum(5, 'EURC', { USDC: 1 }), '…')
  assert.equal(fmtDisplay(5, 'EURC', { USDC: 1, EURC: null }), '…')
  assert.equal(fmtDisplay(5.6, 'EURC', { USDC: 1, EURC: 1.12 }), '€5.00')
})

test('no value (no live token price) → "…", never $0.00', () => {
  assert.equal(fmtDisplay(null, 'USDC', { USDC: 1 }), '…')
  assert.equal(fmtDisplay(NaN, 'USDC', { USDC: 1 }), '…')
})

test('a fee (paid in USDC) without a live display rate is shown in $', () => {
  assert.equal(fmtFee(0.0043, { USDC: 1 }, 'EURC'), '$0.004')
  assert.equal(fmtFee(0.0043, { USDC: 1 }, 'USDC'), '$0.004')
})
