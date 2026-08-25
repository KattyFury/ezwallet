import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem'
import { defineChain } from 'viem'
import { MOCK, MOCK_AMOUNTS, MOCK_RATES, MOCK_CHANGE_24H } from './mock'
// The chain id is declared in qr.js (a module that does NOT depend on viem) so screens that only draw/read QRs - ShowQR,
// SavedQRList - can use it without pulling all of viem into their chunk. ONE source of truth: changing chains means
// editing exactly one place over there, and this file follows.
import { ARC_CHAIN_ID } from './qr'

// The standard Multicall3 is already deployed on Arc Testnet (Arc docs → Network → Contract addresses:
// "Aggregates multiple read calls into a single call for efficient data retrieval").
// Declared on the chain so publicClient.multicall() can fold N reads into 1 request - see getTokenBalances.
export const arcTestnet = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

// PRICES IN USD (the app's unit of account). cgId: the live USD price from CoinGecko; usdRate: the offline fallback
// (USD per unit). USDC is ALWAYS pinned to 1 (it IS the dollar) → stablecoins show exactly 1:1, without the old
// "$5"→"$4.99" drift (which came from routing through VND + CoinGecko noise).
export const TOKENS = [
  { symbol: 'USDC',   address: '0x3600000000000000000000000000000000000000', decimals: 6, color: '#2775CA', cgId: 'usd-coin',  usdRate: 1 },
  { symbol: 'EURC',   address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, color: '#1A56DB', cgId: 'euro-coin', usdRate: 1.08 },
  { symbol: 'cirBTC', address: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf', decimals: 8, color: '#F7931A', cgId: 'bitcoin',   usdRate: 65000 },
]

// ── CIRCLE FAUCET ADDRESSES on Arc Testnet ──
// Money from the faucet must read "Faucet successful", NOT "Received … from 0xd4c0…daae" (an older person seeing an
// unknown address assumes a stranger sent them money).
// FOUND FROM REAL DATA (ArcScan, 2026-07-17), not guessed: scanned the ~1000 most recent txs of all 3
// tokens and filtered by FAUCET BEHAVIOUR = sends to MANY different wallets + has NEVER received anything.
// All 5 addresses below pay out the exact same fixed bundle, USDC 20.00 + EURC 20.00 + cirBTC 0.00, to
// 88-101 different wallets, with 0 incoming → they cannot be confused with a user's wallet.
// (0xc3de926d… and 0xfa61e1de… were excluded: they have also never received anything, but their amounts are all over
//  the place - 0.09/0.50/1.00… - so they are ordinary users, not faucets.)
// A new faucet created later that is not listed here → still caught by the ez_faucet_pending flag
// (the user pressed the Faucet button in the app) - see NotifArea.pollIncoming.
const FAUCET_ADDRESSES = new Set([
  '0x70e3fb28e1794bb91d5bceb7d66b731d0c61af8e',   // 101 wallets · USDC+EURC+cirBTC
  '0x319dd63e0ac72e7ac74443029d074032c043460f',   //  96 wallets
  '0x3c3380cdfb94dfeeaa41cad9f58254ae380d752d',   //  90 wallets
  '0xd844ba11f64d23a7481e24474d2f184e350b9b3d',   //  89 wallets
  '0xd4c0b787aa2ff9eb751bb515c877ebbf2daddaae',   //  88 wallets
])
export function isFaucetAddress(addr) {
  return !!addr && FAUCET_ADDRESSES.has(addr.toLowerCase())
}

let priceCache = {}
let priceCache24h = {}   // symbol -> % change in the last 24h (CoinGecko usd_24h_change), for the token-list arrow
let lastFetch = 0

// ── Module-level cache: switching screens (Send↔Receive↔Menu) shows the number IMMEDIATELY, with no "..." flash.
// Every navigate swaps the component → it remounts → it refetches; seeding state from the cache shows the previous
// number instantly while a background fetch updates it (like a banking app). It lives for the session (lost on page reload).
let _balCache = {}      // addr(lowercase) -> tokens[] (the most recent getTokenBalances result)
let _ratesCache = null  // the most recent { USDC, EURC, cirBTC }
// MOCK MODE: build fake balances from TOKENS + MOCK_AMOUNTS (no RPC reads).
function mockBalances() {
  return TOKENS
    .map(t => { const amount = MOCK_AMOUNTS[t.symbol] || 0; return { ...t, amount, usd: amount * (MOCK_RATES[t.symbol] ?? t.usdRate), change24h: MOCK_CHANGE_24H[t.symbol] ?? null } })
    .filter(t => t.amount > 0)
}

export function cachedBalances(addr) {
  if (MOCK) return mockBalances()   // return immediately, no "..." flash
  return addr ? (_balCache[addr.toLowerCase()] || null) : null
}
export function cachedRates() { return MOCK ? MOCK_RATES : _ratesCache }

// Fallback USD→VND rate for when CoinGecko does not answer (offline / rate limited). Being a few % off beats
// showing NO number at all - but do NOT treat this as the primary source, it goes stale over the years.
const VND_PER_USD_FALLBACK = 26300

async function fetchPrices() {
  if (Date.now() - lastFetch < 60000) return priceCache
  try {
    const ids = TOKENS.filter(t => t.cgId).map(t => t.cgId).join(',')
    // +vnd: ask for the VND price IN THE SAME request (do not add a second one - CoinGecko's
    // free tier is strictly rate limited, and the app already calls this every 60s).
    // include_24hr_change: the 24h % move, for the up/down indicator on the token list (user request 08-25) -
    // same request, no extra call.
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,vnd&include_24hr_change=true`)
    const data = await res.json()
    TOKENS.forEach(t => {
      if (t.cgId && data[t.cgId]?.usd != null) priceCache[t.symbol] = data[t.cgId].usd
      if (t.cgId && data[t.cgId]?.usd_24h_change != null) priceCache24h[t.symbol] = data[t.cgId].usd_24h_change
    })
    priceCache['USDC'] = 1  // pinned: USDC = exactly $1 (do not let CoinGecko's ~0.9998 skew it)
    // VND is stored as "USD per 1 VND" to MATCH every other rate (rates[cur] = USD per unit),
    // which is what lets displayNum(usd, cur, rates) = usd / rates[cur] be shared with no special case.
    // usd-coin.vnd = the number of VND per USDC (~26,300) → inverted, ~0.000038.
    const vndPerUsd = data['usd-coin']?.vnd
    priceCache['VND'] = 1 / (vndPerUsd > 0 ? vndPerUsd : VND_PER_USD_FALLBACK)
    lastFetch = Date.now()
  } catch {}
  return priceCache
}

// Read the balances of ALL 3 TOKENS in EXACTLY 1 HTTP request (Multicall3 folds the 3 balanceOf calls together).
//
// ⚠️ Arc's public RPC IS RATE LIMITED (the Arc "running-a-node" docs advertise running your own node as
// "No rate limits" → so the shared endpoint has them). Measured for real 2026-07-17: firing 3 balanceOf calls IN PARALLEL →
// HTTP 429, failing 5 times out of 5. Sequential with a 350ms gap still failed 5/5; only a 700ms gap per token got through (>2s
// before a balance appeared = far too slow). Folding into Multicall3 → 5/5 successes, 1 request per read.
//
// DO NOT GO BACK to per-token reads with retries: the old version (readBalance trying 3 times per token) fired up to 9 requests
// per balance read → it WALKED INTO the rate limit → 429 → and every retry made it worse (HomeSend also retried
// every 3s → a death loop). That IS the "1000 USDC but it says available 0.00" bug of 07-17.
// Bonus: multicall reads all 3 tokens in the SAME block → consistent balances, never split across blocks.
//
// Two retries for the occasional 429/timeout, spaced 600/1200ms (rate limits need a MUCH longer pause than the
// old 250/500ms). Still failing after that → THROW (do not swallow → see the getTokenBalances warning).
async function readAllBalances(walletAddress, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const raws = await publicClient.multicall({
        allowFailure: false,   // one bad token → throw, do NOT return a made-up 0
        contracts: TOKENS.map(token => ({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        })),
      })
      return raws.map((raw, k) => Number(raw) / Math.pow(10, TOKENS[k].decimals))
    } catch (e) {
      lastErr = e
      if (i < tries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw lastErr
}

// ⚠️ NEVER RETURN 0 ON A FAILED READ - that is INVENTING A BALANCE.
// Bug 07-16 (the user: "the numbers go all over the place and wrong before settling down, e.g. it shows
// 0 0 22 and then comes back to 240 0 0"): the old code wrapped each balanceOf in try/catch and returned
// `{amount: 0}` on error. Arc's RPC fails sporadically per token → a failed read showed 0 exactly like a real zero
// balance → the next successful fetch snapped the number back. Worse: that INVENTED result was also WRITTEN TO CACHE
// → the wrong number spread to every other screen.
// Now: all 3 attempts fail → Promise.all rejects → THE FUNCTION THROWS → the screen KEEPS the previous number (cache/
// seed) instead of drawing a fiction. The cache is only written when ALL 3 TOKENS were genuinely read.
export async function getTokenBalances(walletAddress) {
  if (MOCK) return mockBalances()
  if (!walletAddress) return []
  // Prices and balances run IN PARALLEL (it used to await the prices before reading balances → twice as slow).
  // A failed price fetch is fine: fetchPrices swallows its own errors and the rate falls back to the offline usdRate - a price
  // being a few % off is acceptable, a wrong BALANCE is not.
  const [prices, amounts] = await Promise.all([
    fetchPrices(),
    readAllBalances(walletAddress),   // 1 request for all 3 tokens (Multicall3) - do not split it up again
  ])
  // Show EVERY supported token (including a REAL zero balance) - the wallet always lists USDC/EURC/cirBTC (user decision 07-15)
  const out = TOKENS.map((token, i) => {
    const amount = amounts[i]
    const rate = prices[token.symbol] ?? token.usdRate
    return { ...token, amount, usd: amount * rate, change24h: priceCache24h[token.symbol] ?? null }   // the USD value (NOT rounded - the cents matter)
  })
  _balCache[walletAddress.toLowerCase()] = out   // only reached when all 3 tokens were genuinely read
  return out
}

// The USD price of one token (USD per unit). USDC = 1. Falls back to the offline usdRate.
export async function getUsdRate(symbol = 'USDC') {
  if (MOCK) return MOCK_RATES[symbol] ?? 1
  const prices = await fetchPrices()
  const token = TOKENS.find(t => t.symbol === symbol)
  return prices[symbol] ?? token?.usdRate ?? 1
}

// Rates for the display currency: USD per unit {USDC:1, EURC:~1.08, cirBTC:~the BTC price}.
// USDC pinned to 1 → stablecoins show exactly 1:1 (5 USDC = $5.00). cirBTC is included so TxHistory converts cirBTC
// transactions using the SAME rate source as the display column (avoiding a source mismatch).
export async function getDisplayRates() {
  if (MOCK) { _ratesCache = MOCK_RATES; return MOCK_RATES }
  const [u, e, b] = await Promise.all([getUsdRate('USDC'), getUsdRate('EURC'), getUsdRate('cirBTC')])
  // VND: not a token, so it does not go through getUsdRate (which looks through TOKENS) - it is taken straight from
  // the priceCache that fetchPrices filled in the 3 calls above. Missing (the first call failed) → use the fallback.
  const prices = await fetchPrices()
  _ratesCache = { USDC: u, EURC: e, cirBTC: b, VND: prices.VND || 1 / VND_PER_USD_FALLBACK }
  return _ratesCache
}

// One token's balance + its USD price (USDC = the token used for sending)
export async function getTokenInfo(addr, symbol = 'USDC') {
  const [balances, rate] = await Promise.all([getTokenBalances(addr), getUsdRate(symbol)])
  const t = balances.find(b => b.symbol === symbol)
  return { balance: t?.amount ?? 0, usd: t?.usd ?? 0, rate }
}

// Read the memo (Arc Transaction Memos) of one transaction from the on-chain Memo event → text
const MEMO_CONTRACT = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505'
const memoEventAbi = parseAbiItem('event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)')
// ── MEMOS: REMEMBER THEM FOREVER + QUEUE THEM, DO NOT FIRE ALL AT ONCE (user decision 07-31 "stop spamming") ──
// Each memo is its own receipt read. The History screen used to fire 30 of them AT ONCE on every open
// → the public RPC blocked it (429), which dragged the balance/fee reads down with it → the app stalled.
// Two guards:
//  1. REMEMBER PERMANENTLY in localStorage - once a transaction is on chain its memo NEVER changes.
//     Remember the "no memo" case (null) too - most transactions land there, and without it
//     every open asks the same questions again. From the second open on = 0 network calls.
//  2. AT MOST 3 CALLS IN FLIGHT, the rest queue up. Every memo still arrives, just spread out.
const MEMO_KEY = 'ez_memos'
const MEMO_MAX = 800          // ~1 line per transaction; over the limit, wipe and start over (cheaper than an LRU)
const MEMO_CONCURRENCY = 3
let _memos = null
function memoStore() {
  if (!_memos) { try { _memos = JSON.parse(localStorage.getItem(MEMO_KEY) || '{}') } catch { _memos = {} } }
  return _memos
}
function rememberMemo(hash, memo) {
  const s = memoStore()
  if (Object.keys(s).length >= MEMO_MAX) { _memos = {} }
  _memos[hash] = memo
  try { localStorage.setItem(MEMO_KEY, JSON.stringify(_memos)) } catch {}
}
let _memoRunning = 0
const _memoQueue = []
function queued(job) {
  return new Promise(resolve => {
    const start = () => {
      _memoRunning++
      job().then(resolve).catch(() => resolve(null)).finally(() => {
        _memoRunning--
        const next = _memoQueue.shift()
        if (next) next()
      })
    }
    if (_memoRunning < MEMO_CONCURRENCY) start()
    else _memoQueue.push(start)
  })
}

export async function getTxMemo(hash) {
  const s = memoStore()
  if (hash in s) return s[hash]              // already asked (including "none") → do NOT ask again
  const memo = await queued(() => readMemoOnChain(hash))
  rememberMemo(hash, memo)
  return memo
}

async function readMemoOnChain(hash) {
  try {
    const r = await publicClient.getTransactionReceipt({ hash })
    for (const log of r.logs) {
      if (log.address.toLowerCase() !== MEMO_CONTRACT.toLowerCase()) continue
      try {
        const d = decodeEventLog({ abi: [memoEventAbi], data: log.data, topics: log.topics })
        if (d.eventName === 'Memo' && d.args.memo && d.args.memo.length > 2) {
          const bytes = Uint8Array.from(d.args.memo.slice(2).match(/.{1,2}/g).map(b => parseInt(b, 16)))
          return new TextDecoder().decode(bytes)
        }
      } catch {}
    }
  } catch {}
  return null
}

// The real gas fee: Arc prices gas in USDC (18 decimals internally). USDC = $1 → the USD fee IS feeUsdc.
// gasUnits: ~65k for a plain transfer, ~110k for a transfer with a memo. NOT rounded (the fee is tiny, cents matter).
export async function estimateFeeUsd(gasUnits = 65000) {
  if (MOCK) return 0.002   // a small fake fee
  try {
    const gasPrice = await publicClient.getGasPrice()
    return Number(gasPrice * BigInt(gasUnits)) / 1e18
  } catch {
    return 0
  }
}
