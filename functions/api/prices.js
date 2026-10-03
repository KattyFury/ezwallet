// GET /api/prices → { ts, prices: { EURC, cirBTC, ETH }, change24h: {…}, vndPerUsd, src: {…}, up: {…}, errors: {…} }   (USD per unit)
// Owner decision 2026-10-03 (option C): CoinGecko is the PRIMARY source, Binance the BACKUP + CROSS-CHECK.
// - Server-side, so the CoinGecko Demo key (env COINGECKO_API, header x-cg-demo-api-key) never reaches the browser and
//   users no longer share CoinGecko's keyless per-IP limit (the old browser call failed on shared Wi-Fi / mobile IPs).
// - One result is kept in KV EZ_SYNC `prices:v1` for 5 minutes for EVERY user → at most ~8,640 CoinGecko calls a
//   month per Pages project, whatever the traffic (each 200 costs 1 credit - docs.coingecko.com/reference/authentication).
// - Binance public market data (data-api.binance.vision = Binance's market-data-only host, no key) is in USDT →
//   divided by USDCUSDT to get USD. cirBTC has no market of its own → priced as BTC (as before).
// - Cross-check: both sources answer and differ by more than MAX_GAP → neither is trusted, the last stored price is
//   kept (src 'held'). Only one source answers → that one is used. None → the stored price, however old (src 'stale').
// - USDC is not here: the client pins it to exactly 1. VND comes from CoinGecko only (Binance has no VND market).
import { JSON_HEADERS_BASE } from './_net.js'

const KV_KEY = 'prices:v1'
const FRESH_MS = 5 * 60 * 1000
const MAX_GAP = 0.02
const CG_IDS = { EURC: 'euro-coin', cirBTC: 'bitcoin', ETH: 'ethereum' }
const BN_PAIRS = { EURC: 'EURUSDT', cirBTC: 'BTCUSDT', ETH: 'ETHUSDT' }

async function getJson(url, headers) {
  // User-Agent: CoinGecko answers 403 "Please add a descriptive User-Agent" to Cloudflare Functions without one (measured 2026-10-03).
  const res = await fetch(url, { headers: { 'User-Agent': 'ezwallet.cash price service', ...headers }, signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`)
  return res.json()
}

// → { prices: {sym: usd}, change24h: {sym: %}, vndPerUsd }
async function fromCoinGecko(key) {
  const ids = [...Object.values(CG_IDS), 'usd-coin'].join(',')
  const d = await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,vnd&include_24hr_change=true`,
    key ? { 'x-cg-demo-api-key': key } : {})
  const out = { prices: {}, change24h: {}, vndPerUsd: d['usd-coin']?.vnd > 0 ? d['usd-coin'].vnd : null }
  for (const [sym, id] of Object.entries(CG_IDS)) {
    if (d[id]?.usd > 0) out.prices[sym] = d[id].usd
    if (d[id]?.usd_24h_change != null) out.change24h[sym] = d[id].usd_24h_change
  }
  return out
}

// Binance's official REST hosts, tried in order. data-api.binance.vision answered 403 to Cloudflare Functions
// (measured 2026-10-03, fine from a home PC) → the others are tried before giving up.
const BN_HOSTS = ['data-api.binance.vision', 'api.binance.com', 'api-gcp.binance.com', 'api1.binance.com', 'api4.binance.com']

async function fromBinance() {
  const symbols = encodeURIComponent(JSON.stringify([...Object.values(BN_PAIRS), 'USDCUSDT']))
  let rows
  const fails = []
  for (const host of BN_HOSTS) {
    try { rows = await getJson(`https://${host}/api/v3/ticker/24hr?symbols=${symbols}&type=MINI`); break }
    catch (e) { fails.push(`${host}: ${e.message.slice(0, 40)}`) }
  }
  if (!rows) throw new Error(fails.join(' | '))
  const by = Object.fromEntries(rows.map(r => [r.symbol, r]))
  const usdc = Number(by.USDCUSDT?.lastPrice)
  if (!(usdc > 0)) throw new Error('no USDCUSDT')
  const out = { prices: {}, change24h: {} }
  for (const [sym, pair] of Object.entries(BN_PAIRS)) {
    const last = Number(by[pair]?.lastPrice), open = Number(by[pair]?.openPrice)
    if (last > 0) out.prices[sym] = last / usdc
    if (last > 0 && open > 0) out.change24h[sym] = (last / open - 1) * 100
  }
  return out
}

// Pure: picks each price from the two sources + the previous stored result. Exported for the tests.
export function mergePrices(cg, bn, prev) {
  const out = { prices: {}, change24h: {}, src: {}, vndPerUsd: cg?.vndPerUsd ?? prev?.vndPerUsd ?? null }
  for (const sym of Object.keys(CG_IDS)) {
    const c = cg?.prices[sym], b = bn?.prices[sym], old = prev?.prices?.[sym]
    let p, src
    if (c && b) {
      if (Math.abs(c - b) / b <= MAX_GAP) { p = c; src = 'coingecko' }
      else if (old) { p = old; src = 'held' }
      else { p = c; src = 'coingecko-unconfirmed' }
    } else if (c) { p = c; src = 'coingecko' }
    else if (b) { p = b; src = 'binance' }
    else if (old) { p = old; src = 'stale' }
    if (p) { out.prices[sym] = p; out.src[sym] = src }
    const ch = cg?.change24h[sym] ?? bn?.change24h[sym] ?? prev?.change24h?.[sym]
    if (ch != null) out.change24h[sym] = ch
  }
  return out
}

export async function onRequestGet(ctx) {
  const kv = ctx.env.EZ_SYNC
  let prev = null
  try { prev = kv ? JSON.parse(await kv.get(KV_KEY) || 'null') : null } catch {}
  const reply = body => new Response(JSON.stringify(body), { headers: { ...JSON_HEADERS_BASE, 'Cache-Control': 'no-store' } })
  if (prev && Date.now() - prev.ts < FRESH_MS) return reply(prev)

  const [cg, bn] = await Promise.allSettled([fromCoinGecko(ctx.env.COINGECKO_API), fromBinance()])
  if (cg.status === 'rejected') console.error('[prices] coingecko', cg.reason?.message)
  if (bn.status === 'rejected') console.error('[prices] binance', bn.reason?.message)
  const merged = mergePrices(cg.value, bn.value, prev)
  const held = Object.entries(merged.src).filter(([, s]) => s !== 'coingecko').map(([k, s]) => `${k}=${s}`)
  if (held.length) console.warn('[prices]', held.join(' '), JSON.stringify({ cg: cg.value?.prices, bn: bn.value?.prices }))
  const errors = { coingecko: cg.reason?.message, binance: bn.reason?.message }   // undefined = no error (dropped by JSON)
  if (cg.status === 'rejected' && bn.status === 'rejected') return reply({ ...(prev || { ts: 0, prices: {}, change24h: {}, src: {} }), errors })
  // up / errors = which source answered this round and why not - checkable from outside (Binance blocks some Cloudflare egress).
  const result = { ts: Date.now(), ...merged, up: { coingecko: cg.status === 'fulfilled', binance: bn.status === 'fulfilled' }, errors }
  if (kv) { try { await kv.put(KV_KEY, JSON.stringify(result)) } catch {} }
  return reply(result)
}
