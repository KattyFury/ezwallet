import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem'
import { defineChain } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
})

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

// GIÁ QUY VỀ USD (đơn vị tính của app). cgId: giá USD live từ CoinGecko; usdRate: fallback offline
// (USD mỗi 1 đơn vị). USDC LUÔN ghim = 1 (nó CHÍNH LÀ USD) → stablecoin hiện đúng 1:1, không lệch
// "$5"→"$4.99" như cách cũ (đi vòng qua VND + noise CoinGecko).
export const TOKENS = [
  { symbol: 'USDC',   address: '0x3600000000000000000000000000000000000000', decimals: 6, color: '#2775CA', cgId: 'usd-coin',  usdRate: 1 },
  { symbol: 'EURC',   address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, color: '#1A56DB', cgId: 'euro-coin', usdRate: 1.08 },
  { symbol: 'cirBTC', address: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf', decimals: 8, color: '#F7931A', cgId: 'bitcoin',   usdRate: 65000 },
]

let priceCache = {}
let lastFetch = 0

// ── Cache tầng module: chuyển màn (Send↔Receive↔Menu) hiện số NGAY, không "..." nhấp nháy.
// Mỗi navigate thay mới component → mount lại → fetch lại; nếu seed state từ cache thì số cũ
// hiện tức thì, fetch nền cập nhật sau (như app ngân hàng). Sống theo phiên (mất khi reload trang).
let _balCache = {}      // addr(lowercase) -> tokens[] (kết quả getTokenBalances gần nhất)
let _ratesCache = null  // { USDC, EURC, cirBTC } gần nhất
export function cachedBalances(addr) { return addr ? (_balCache[addr.toLowerCase()] || null) : null }
export function cachedRates() { return _ratesCache }

async function fetchPrices() {
  if (Date.now() - lastFetch < 60000) return priceCache
  try {
    const ids = TOKENS.filter(t => t.cgId).map(t => t.cgId).join(',')
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
    const data = await res.json()
    TOKENS.forEach(t => {
      if (t.cgId && data[t.cgId]?.usd != null) priceCache[t.symbol] = data[t.cgId].usd
    })
    priceCache['USDC'] = 1  // ghim: USDC = $1 chính xác (đừng để CoinGecko ~0.9998 làm lệch)
    lastFetch = Date.now()
  } catch {}
  return priceCache
}

export async function getTokenBalances(walletAddress) {
  if (!walletAddress) return []
  const prices = await fetchPrices()
  const results = await Promise.all(
    TOKENS.map(async token => {
      try {
        const raw = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        })
        const amount = Number(raw) / Math.pow(10, token.decimals)
        const rate = prices[token.symbol] ?? token.usdRate
        return { ...token, amount, usd: amount * rate }   // giá trị USD (KHÔNG làm tròn — cần phần lẻ cent)
      } catch {
        return { ...token, amount: 0, usd: 0 }
      }
    })
  )
  const out = results.filter(t => t.amount > 0)
  if (walletAddress) _balCache[walletAddress.toLowerCase()] = out   // cache cho lần mount sau
  return out
}

export function fmtAmount(amount, decimals = 6) {
  if (amount === 0) return '0'
  if (amount < 0.000001) return amount.toExponential(2)
  return amount.toFixed(Math.min(4, decimals))
}

// Giá USD của 1 token (USD mỗi 1 đơn vị). USDC = 1. Fallback usdRate offline.
export async function getUsdRate(symbol = 'USDC') {
  const prices = await fetchPrices()
  const token = TOKENS.find(t => t.symbol === symbol)
  return prices[symbol] ?? token?.usdRate ?? 1
}

// Tỷ giá pháp định CNY/VND = USD mỗi 1 đơn vị (để displayNum quy usd/rate ra số CNY/VND).
// CoinGecko trả giá 1 USDC theo cny/vnd (= bao nhiêu CNY/VND đổi 1 USD, vì USDC≈$1) → nghịch đảo.
// Fallback offline khi API lỗi: 1 CNY≈$0.14, 1 VND≈$0.0000395.
async function fetchFiatRates() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=cny,vnd')
    const d = await res.json()
    const cnyPerUsd = d['usd-coin']?.cny, vndPerUsd = d['usd-coin']?.vnd
    return {
      CNY: cnyPerUsd ? 1 / cnyPerUsd : 0.14,
      VND: vndPerUsd ? 1 / vndPerUsd : 0.0000395,
    }
  } catch { return { CNY: 0.14, VND: 0.0000395 } }
}

// Tỷ giá cho tiền tệ hiển thị: USD mỗi 1 đơn vị {USDC:1, EURC:~1.08, cirBTC:~giá BTC, CNY, VND}.
// USDC ghim 1 → stablecoin hiện đúng 1:1 (5 USDC = $5.00). cirBTC để TxHistory quy đổi giao dịch
// cirBTC dùng CHUNG 1 nguồn tỷ giá với cột hiển thị (tránh lệch nguồn). CNY/VND cho tiền hiển thị.
export async function getDisplayRates() {
  const [u, e, b, fiat] = await Promise.all([getUsdRate('USDC'), getUsdRate('EURC'), getUsdRate('cirBTC'), fetchFiatRates()])
  _ratesCache = { USDC: u, EURC: e, cirBTC: b, CNY: fiat.CNY, VND: fiat.VND }   // cache cho lần mount sau
  return _ratesCache
}

// Số dư 1 token + giá USD (USDC = token dùng để gửi)
export async function getTokenInfo(addr, symbol = 'USDC') {
  const [balances, rate] = await Promise.all([getTokenBalances(addr), getUsdRate(symbol)])
  const t = balances.find(b => b.symbol === symbol)
  return { balance: t?.amount ?? 0, usd: t?.usd ?? 0, rate }
}

// Đọc memo (Arc Transaction Memos) của 1 giao dịch từ Memo event on-chain → text
const MEMO_CONTRACT = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505'
const memoEventAbi = parseAbiItem('event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)')
export async function getTxMemo(hash) {
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

// Phí gas thật: Arc tính gas bằng USDC (18 decimals nội bộ). USDC = $1 → phí USD CHÍNH LÀ feeUsdc.
// gasUnits: ~65k cho transfer thường, ~110k cho transfer kèm memo. KHÔNG làm tròn (phí rất nhỏ, cần cent).
export async function estimateFeeUsd(gasUnits = 65000) {
  try {
    const gasPrice = await publicClient.getGasPrice()
    return Number(gasPrice * BigInt(gasUnits)) / 1e18
  } catch {
    return 0
  }
}
