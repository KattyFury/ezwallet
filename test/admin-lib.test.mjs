// Admin helpers: exact token amounts, escaped email HTML, read-only Circle whitelist.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatUnits, circleGet } from '../admin/functions/api/_lib.js'
import { renderMail } from '../admin/functions/api/mail.js'

test('formatUnits is exact', () => {
  assert.equal(formatUnits(1000000n, 6), '1')
  assert.equal(formatUnits(3006697n, 6), '3.006697')
  assert.equal(formatUnits(5n, 6), '0.000005')
  assert.equal(formatUnits(0n, 6), '0')
  assert.equal(formatUnits(123456789012345678901234567890n, 6), '123456789012345678901234.56789')
})

test('renderMail escapes input', () => {
  const m = renderMail('Hi', 'a <script>x</script> & "b"\n\nnext')
  assert.ok(!m.html.includes('<script>'))
  assert.ok(m.html.includes('&lt;script&gt;'))
  assert.equal((m.html.match(/<p /g) || []).length, 3)   // 2 paragraphs + footer
})

test('circleGet refuses anything outside the read list', async () => {
  const net = { key: 'testnet' }
  for (const p of ['/user/initialize', '/users/a/b', '/wallets/1/balances', '/transactions/transfer']) {
    await assert.rejects(circleGet({ CIRCLE_TEST_API_KEY: 'x' }, net, p), /not allowed/, p)
  }
})

import { checkText } from '../admin/functions/api/announce.js'
test('announcement text rules', () => {
  assert.equal(checkText('  Sending   is paused tonight. ').text, 'Sending is paused tonight.')
  assert.ok(checkText('').error)
  assert.ok(checkText('x'.repeat(201)).error)
  assert.equal(checkText('x'.repeat(200)).text.length, 200)
  for (const bad of ['go to https://evil.io', 'visit www.evil', 'claim at ezwallet-bonus.com now', 'see ezwallet.cash/help'])
    assert.ok(checkText(bad).error, bad)
  assert.ok(checkText('Maintenance at 10 p.m. Thanks.').text)
})
