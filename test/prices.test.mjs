// Locks the owner's option C (2026-10-03): CoinGecko primary, Binance backup + cross-check (functions/api/prices.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergePrices } from '../functions/api/prices.js'

const cg = { prices: { EURC: 1.12, cirBTC: 84640, ETH: 2676 }, change24h: { EURC: 0.1, cirBTC: -0.1, ETH: -1.1 }, vndPerUsd: 25984 }
const bn = { prices: { EURC: 1.1249, cirBTC: 84628, ETH: 2675 }, change24h: { EURC: 0.2, cirBTC: -0.2, ETH: -1.2 } }

test('both agree → CoinGecko wins', () => {
  const m = mergePrices(cg, bn, null)
  assert.deepEqual(m.prices, cg.prices)
  assert.deepEqual(m.src, { EURC: 'coingecko', cirBTC: 'coingecko', ETH: 'coingecko' })
  assert.equal(m.vndPerUsd, 25984)
})

test('CoinGecko down → Binance', () => {
  const m = mergePrices(undefined, bn, null)
  assert.equal(m.prices.ETH, 2675)
  assert.equal(m.src.ETH, 'binance')
  assert.equal(m.change24h.ETH, -1.2)
})

test('more than 2% apart → the last stored price is held', () => {
  const prev = { prices: { ETH: 2600 }, change24h: {}, vndPerUsd: 26000 }
  const m = mergePrices({ ...cg, prices: { ...cg.prices, ETH: 3000 } }, bn, prev)
  assert.equal(m.prices.ETH, 2600)
  assert.equal(m.src.ETH, 'held')
  assert.equal(m.src.EURC, 'coingecko')
})

test('both down → stale stored price, VND kept', () => {
  const prev = { prices: { EURC: 1.1 }, change24h: {}, vndPerUsd: 26000 }
  const m = mergePrices(undefined, undefined, prev)
  assert.deepEqual(m.prices, { EURC: 1.1 })
  assert.equal(m.src.EURC, 'stale')
  assert.equal(m.vndPerUsd, 26000)
})
