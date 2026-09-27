// Locks MAINNET-AUDIT.md H1/H6: amounts are rejected, never rounded; addresses are checksum-checked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amountProblem, toBaseUnits, toAmountString, normalizeTyped, isValidAddress } from '../src/money.js'

test('exact base units, no float drift', () => {
  assert.equal(toBaseUnits('0.1', 6), 100000n)
  assert.equal(toBaseUnits('12.345', 6), 12345000n)
  assert.equal(toBaseUnits('0.000001', 6), 1n)
  assert.equal(toBaseUnits('123456789.123456', 6), 123456789123456n)
  assert.equal(toBaseUnits('1', 8), 100000000n)
})

test('the amounts the old toFixed(2) path corrupted are now sent exactly', () => {
  assert.equal(toBaseUnits('0.004', 6), 4000n)    // was sent as 0
  assert.equal(toBaseUnits('0.009', 6), 9000n)    // was sent as 0.01
})

test('rejects instead of rounding', () => {
  assert.equal(amountProblem('0.0000001', 6), 'At most 6 decimal places')
  assert.equal(amountProblem('0', 6), 'Amount must be greater than 0')
  assert.equal(amountProblem('0.000', 6), 'Amount must be greater than 0')
  for (const bad of ['-1', '1e3', '1,5', '', ' ', '.5', '5.', '01', 'abc', '1.2.3', null, undefined]) {
    assert.ok(amountProblem(bad, 6), `should reject ${JSON.stringify(bad)}`)
  }
  assert.throws(() => toBaseUnits('-1', 6))
})

test('UI numbers become strings rounded DOWN to the token decimals', () => {
  assert.equal(toAmountString(12.5, 6), '12.5')
  assert.equal(toAmountString(100, 6), '100')
  assert.equal(toAmountString(0.1 + 0.2, 6), '0.3')
  assert.equal(toAmountString(1.9999999, 6), '1.999999')
  assert.equal(toAmountString(0, 6), '0')
  assert.equal(amountProblem(toAmountString(33.333333333, 6), 6), null)
})

test('keypad tidy-up', () => {
  assert.equal(normalizeTyped('5.'), '5')
  assert.equal(normalizeTyped('5.25'), '5.25')
})

test('addresses: format + EIP-55 checksum', () => {
  const good = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'   // EIP-55 reference vector
  assert.ok(isValidAddress(good))
  assert.ok(isValidAddress(good.toLowerCase()))
  assert.ok(isValidAddress('  ' + good + ' '))
  assert.ok(!isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD'))   // one char's case flipped → typo caught
  assert.ok(!isValidAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beae'))    // 39 hex
  assert.ok(!isValidAddress('0xZaaeb6053f3e94c9b9a09f33669435e7ef1beaed'))
  assert.ok(!isValidAddress(''))
})
