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

// cgId: lấy giá VND live từ CoinGecko; vndRate: fallback offline nếu API lỗi
export const TOKENS = [
  { symbol: 'USDC',   address: '0x3600000000000000000000000000000000000000', decimals: 6, color: '#2775CA', cgId: 'usd-coin',  vndRate: 25000 },
  { symbol: 'EURC',   address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, color: '#1A56DB', cgId: 'euro-coin', vndRate: 27000 },
  { symbol: 'cirBTC', address: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf', decimals: 8, color: '#F7931A', cgId: 'bitcoin',   vndRate: 2600000000 },
]

let priceCache = {}
let lastFetch = 0

async function fetchPrices() {
  if (Date.now() - lastFetch < 60000) return priceCache
  try {
    const ids = TOKENS.filter(t => t.cgId).map(t => t.cgId).join(',')
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=vnd`)
    const data = await res.json()
    TOKENS.forEach(t => {
      if (t.cgId && data[t.cgId]?.vnd) priceCache[t.symbol] = data[t.cgId].vnd
    })
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
        const rate = prices[token.symbol] ?? token.vndRate
        return { ...token, amount, vnd: Math.round(amount * rate) }
      } catch {
        return { ...token, amount: 0, vnd: 0 }
      }
    })
  )
  return results.filter(t => t.amount > 0)
}

export function fmtAmount(amount, decimals = 6) {
  if (amount === 0) return '0'
  if (amount < 0.000001) return amount.toExponential(2)
  return amount.toFixed(Math.min(4, decimals))
}

// Tỷ giá VND live (CoinGecko), fallback vndRate offline
export async function getVndRate(symbol = 'USDC') {
  const prices = await fetchPrices()
  const token = TOKENS.find(t => t.symbol === symbol)
  return prices[symbol] ?? token?.vndRate ?? 25000
}

// Tỷ giá cho tiền tệ hiển thị: VND mỗi 1 đơn vị {USDC, EURC, cirBTC, CNY}. CNY suy từ USDC/7.25.
// cirBTC thêm để TxHistory quy đổi giao dịch cirBTC — dùng CHUNG 1 nguồn tỷ giá với cột hiển thị
// (trước đây txInfo dùng token.vndRate cache lệch nguồn → 1 USDC hiện $0.95, user báo lỗi).
export async function getDisplayRates() {
  const [u, e, b] = await Promise.all([getVndRate('USDC'), getVndRate('EURC'), getVndRate('cirBTC')])
  return { VND: 1, USDC: u, EURC: e, cirBTC: b, CNY: Math.round(u / 7.25) }
}

// Số dư 1 token + tỷ giá (USDC = token dùng để gửi)
export async function getTokenInfo(addr, symbol = 'USDC') {
  const [balances, rate] = await Promise.all([getTokenBalances(addr), getVndRate(symbol)])
  const t = balances.find(b => b.symbol === symbol)
  return { balance: t?.amount ?? 0, vnd: t?.vnd ?? 0, rate }
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

// Phí gas thật: Arc tính gas bằng USDC (18 decimals nội bộ) → quy ra VND
// gasUnits: ~65k cho transfer thường, ~110k cho transfer kèm memo
export async function estimateFeeVnd(gasUnits = 65000) {
  try {
    const [gasPrice, rate] = await Promise.all([publicClient.getGasPrice(), getVndRate('USDC')])
    const feeUsdc = Number(gasPrice * BigInt(gasUnits)) / 1e18
    return Math.round(feeUsdc * rate)   // làm tròn về VND nguyên (tránh fmtVND chèn dấu vào phần lẻ)
  } catch {
    return 0
  }
}
