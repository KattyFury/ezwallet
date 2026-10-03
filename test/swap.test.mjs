// Locks MAINNET-AUDIT C5: a swap intent is only signed when it is exactly what the user asked for.
// The fixture's shape is a real Arc mainnet /v1/stablecoinKits/swap response (2026-10-03), long hex trimmed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getNetwork } from '../src/network.js'
import { validateIntent, SLIPPAGE_BPS } from '../functions/api/_swapCore.js'

const net = getNetwork('mainnet')
const W = '0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6'
const USDC = net.tokens.USDC.address, EURC = net.tokens.EURC.address
const NOW = 1791031000 * 1000

const intent = () => ({
  tokenInChain: 'Arc', tokenOutChain: 'Arc', amount: '1000000', stopLimit: '884547',
  tokenInAddress: USDC, tokenOutAddress: EURC, fromAddress: W, toAddress: W, estimatedAmount: '888992',
  transaction: {
    signature: '0x48e3',
    executionParams: {
      execId: '0x01', deadline: '1791031512', metadata: '0x',
      tokens: [{ token: USDC, beneficiary: W }, { token: EURC, beneficiary: W }],
      instructions: [
        { target: '0xf992EFCB5FA2eD7cB48310D9dd8Cb4ce5FB7DdC9', data: '0x7e', value: '0', tokenIn: USDC, amountToApprove: '200', tokenOut: '0x0000000000000000000000000000000000000000', minTokenOut: '0' },
        { target: '0xA4072583658Fae592A3506A42431cb6316a8d40b', data: '0x46', value: '0x0', tokenIn: USDC, amountToApprove: '999800', tokenOut: EURC, minTokenOut: '884547' },
      ],
    },
  },
})
const ask = { fromAddr: USDC, toAddr: EURC, walletAddress: W.toLowerCase(), amountBase: 1000000n, minOutBase: 884000n, now: NOW }

test('slippage is 50 bps (H2)', () => assert.equal(SLIPPAGE_BPS, 50))

test('the real intent passes', () => assert.equal(validateIntent(net, intent(), ask), null))

test('rejects an intent that pays someone else', () => {
  const i = intent(); i.transaction.executionParams.tokens[1].beneficiary = '0x' + '9'.repeat(40)
  assert.match(validateIntent(net, i, ask), /someone other/)
  const j = intent(); j.toAddress = '0x' + '9'.repeat(40)
  assert.match(validateIntent(net, j, ask), /not this wallet/)
})

test('rejects wrong tokens, chain, amount, over-spend, native value', () => {
  const cases = [
    [i => { i.tokenOutAddress = USDC }, /tokens differ/],
    [i => { i.tokenInChain = 'Base' }, /another chain/],
    [i => { i.amount = '2000000' }, /amount differs/],
    [i => { i.transaction.executionParams.instructions[1].amountToApprove = '1000000' }, /more than the request/],
    [i => { i.transaction.executionParams.instructions[0].tokenIn = EURC }, /another token/],
    [i => { i.transaction.executionParams.instructions[1].value = '1' }, /native value/],
  ]
  for (const [mut, re] of cases) { const i = intent(); mut(i); assert.match(validateIntent(net, i, ask), re) }
})

test('rejects an expired intent and one without a signature', () => {
  assert.match(validateIntent(net, intent(), { ...ask, now: 1791031500 * 1000 }), /expired/)
  const i = intent(); delete i.transaction.signature
  assert.match(validateIntent(net, i, ask), /signature/)
})

test('rejects a minimum below what the screen showed (H2)', () => {
  assert.match(validateIntent(net, intent(), { ...ask, minOutBase: 885000n }), /below the amount shown/)
  const i = intent(); i.transaction.executionParams.instructions[1].minTokenOut = '0'
  assert.match(validateIntent(net, i, { ...ask, minOutBase: 0n }), /no minimum/)
})
