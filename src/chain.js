import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem'
import { defineChain } from 'viem'
import { MOCK, MOCK_AMOUNTS, MOCK_RATES } from './mock'

// Multicall3 chuẩn có sẵn trên Arc Testnet (docs Arc → Network → Contract addresses:
// "Aggregates multiple read calls into a single call for efficient data retrieval").
// Khai trong chain để publicClient.multicall() gộp N lệnh đọc vào 1 request — xem getTokenBalances.
export const arcTestnet = defineChain({
  id: 5042002,
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

// GIÁ QUY VỀ USD (đơn vị tính của app). cgId: giá USD live từ CoinGecko; usdRate: fallback offline
// (USD mỗi 1 đơn vị). USDC LUÔN ghim = 1 (nó CHÍNH LÀ USD) → stablecoin hiện đúng 1:1, không lệch
// "$5"→"$4.99" như cách cũ (đi vòng qua VND + noise CoinGecko).
export const TOKENS = [
  { symbol: 'USDC',   address: '0x3600000000000000000000000000000000000000', decimals: 6, color: '#2775CA', cgId: 'usd-coin',  usdRate: 1 },
  { symbol: 'EURC',   address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, color: '#1A56DB', cgId: 'euro-coin', usdRate: 1.08 },
  { symbol: 'cirBTC', address: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf', decimals: 8, color: '#F7931A', cgId: 'bitcoin',   usdRate: 65000 },
]

// ── ĐỊA CHỈ FAUCET Circle trên Arc Testnet ──
// Tiền từ faucet phải hiện "Faucet successful", KHÔNG phải "Đã nhận … từ 0xd4c0…daae" (người già
// nhìn địa chỉ lạ sẽ tưởng người lạ chuyển tiền).
// TRA RA BẰNG DỮ LIỆU THẬT (ArcScan, 2026-07-17), không đoán: quét ~1000 tx gần nhất của cả 3
// token rồi lọc theo HÀNH VI faucet = gửi tới RẤT NHIỀU ví khác nhau + CHƯA BAO GIỜ nhận về.
// Cả 5 địa chỉ dưới đều phát ĐÚNG một bộ cố định USDC 20.00 + EURC 20.00 + cirBTC 0.00 cho
// 88–101 ví khác nhau, số nhận về = 0 → không thể nhầm với ví người dùng.
// (Đã loại 0xc3de926d… và 0xfa61e1de… : tuy cũng "chưa nhận về" nhưng số tiền lung tung
//  0.09/0.50/1.00… → là user thường, không phải faucet.)
// Faucet mới sinh ra sau này mà chưa có ở đây → vẫn được bắt bằng cờ ez_faucet_pending
// (user bấm nút Faucet trong app) — xem NotifArea.pollIncoming.
const FAUCET_ADDRESSES = new Set([
  '0x70e3fb28e1794bb91d5bceb7d66b731d0c61af8e',   // 101 ví · USDC+EURC+cirBTC
  '0x319dd63e0ac72e7ac74443029d074032c043460f',   //  96 ví
  '0x3c3380cdfb94dfeeaa41cad9f58254ae380d752d',   //  90 ví
  '0xd844ba11f64d23a7481e24474d2f184e350b9b3d',   //  89 ví
  '0xd4c0b787aa2ff9eb751bb515c877ebbf2daddaae',   //  88 ví
])
export function isFaucetAddress(addr) {
  return !!addr && FAUCET_ADDRESSES.has(addr.toLowerCase())
}

let priceCache = {}
let lastFetch = 0

// ── Cache tầng module: chuyển màn (Send↔Receive↔Menu) hiện số NGAY, không "..." nhấp nháy.
// Mỗi navigate thay mới component → mount lại → fetch lại; nếu seed state từ cache thì số cũ
// hiện tức thì, fetch nền cập nhật sau (như app ngân hàng). Sống theo phiên (mất khi reload trang).
let _balCache = {}      // addr(lowercase) -> tokens[] (kết quả getTokenBalances gần nhất)
let _ratesCache = null  // { USDC, EURC, cirBTC } gần nhất
// MOCK MODE: dựng số dư ảo từ TOKENS + MOCK_AMOUNTS (không đọc RPC).
function mockBalances() {
  return TOKENS
    .map(t => { const amount = MOCK_AMOUNTS[t.symbol] || 0; return { ...t, amount, usd: amount * (MOCK_RATES[t.symbol] ?? t.usdRate) } })
    .filter(t => t.amount > 0)
}

export function cachedBalances(addr) {
  if (MOCK) return mockBalances()   // trả ngay, không "..." nhấp nháy
  return addr ? (_balCache[addr.toLowerCase()] || null) : null
}
export function cachedRates() { return MOCK ? MOCK_RATES : _ratesCache }

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

// Đọc số dư CẢ 3 TOKEN bằng ĐÚNG 1 HTTP request (Multicall3 gộp 3 balanceOf).
//
// ⚠️ RPC công cộng của Arc CÓ RATE LIMIT (docs Arc "running-a-node" quảng cáo chạy node riêng =
// "No rate limits" → endpoint chung thì có). Đo thật 2026-07-17: bắn 3 balanceOf SONG SONG →
// HTTP 429, hỏng 5/5 lần. Tuần tự nghỉ 350ms vẫn 5/5 hỏng; phải nghỉ 700ms/token mới qua (>2s
// mới có số dư = quá chậm). Gộp Multicall3 → 5/5 thành công, 1 request/lần đọc.
//
// ĐỪNG QUAY LẠI đọc từng token rồi retry: bản cũ (readBalance thử 3 lần/token) bắn tới 9 request
// mỗi lần đọc số dư → TỰ ĐÂM vào rate limit → 429 → càng retry càng hỏng (HomeSend còn tự thử lại
// mỗi 3s → vòng lặp chết). Đó CHÍNH LÀ bug "1000 USDC mà báo khả dụng 0.00" ngày 07-17.
// Bonus: multicall đọc cả 3 token trong CÙNG 1 block → số dư nhất quán, không lệch block.
//
// Thử lại 2 lần cho trường hợp 429/timeout lẻ tẻ, giãn 600/1200ms (rate limit cần nghỉ LÂU hơn
// hẳn mức 250/500ms cũ). Hết lượt vẫn hỏng → NÉM LỖI (đừng nuốt → xem cảnh báo getTokenBalances).
async function readAllBalances(walletAddress, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const raws = await publicClient.multicall({
        allowFailure: false,   // 1 token hỏng → ném lỗi, KHÔNG trả 0 bịa
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

// ⚠️ ĐỪNG BAO GIỜ TRẢ 0 KHI ĐỌC HỎNG — đó là BỊA SỐ DƯ.
// Bug 07-16 (user: "các con số cứ loạn lên sai lệch rồi mới bình thường trở lại, ví dụ hiện
// 0 0 22 xong rồi mới về lại 240 0 0"): code cũ bọc mỗi balanceOf trong try/catch rồi trả
// `{amount: 0}` khi lỗi. RPC Arc lỗi lẻ tẻ từng token → token đọc hỏng hiện 0 y như số dư thật
// bằng 0 → lần fetch sau ăn thì số nhảy về đúng. Tệ hơn: kết quả BỊA đó còn được GHI VÀO CACHE
// → số sai lan sang mọi màn khác.
// Giờ: đọc hỏng cả 3 lần → Promise.all reject → HÀM NÉM LỖI → màn hình GIỮ NGUYÊN số cũ (cache/
// seed) thay vì vẽ số bịa. Chỉ ghi cache khi ĐỦ CẢ 3 TOKEN đọc thật thành công.
export async function getTokenBalances(walletAddress) {
  if (MOCK) return mockBalances()
  if (!walletAddress) return []
  // Giá và số dư chạy SONG SONG (trước đây await giá xong mới đọc số dư → chậm gấp đôi).
  // Giá hỏng không sao: fetchPrices tự nuốt lỗi, rate rơi về usdRate offline — giá sai lệch vài %
  // thì chấp nhận được, còn SỐ DƯ sai thì không.
  const [prices, amounts] = await Promise.all([
    fetchPrices(),
    readAllBalances(walletAddress),   // 1 request cho cả 3 token (Multicall3) — đừng tách ra lại
  ])
  // Hiện MỌI token hỗ trợ (kể cả số dư 0 THẬT) — ví luôn thấy đủ USDC/EURC/cirBTC (user chốt 07-15)
  const out = TOKENS.map((token, i) => {
    const amount = amounts[i]
    const rate = prices[token.symbol] ?? token.usdRate
    return { ...token, amount, usd: amount * rate }   // giá trị USD (KHÔNG làm tròn — cần phần lẻ cent)
  })
  _balCache[walletAddress.toLowerCase()] = out   // chỉ tới đây khi CẢ 3 token đọc thật thành công
  return out
}

export function fmtAmount(amount, decimals = 6) {
  if (amount === 0) return '0'
  if (amount < 0.000001) return amount.toExponential(2)
  return amount.toFixed(Math.min(4, decimals))
}

// Giá USD của 1 token (USD mỗi 1 đơn vị). USDC = 1. Fallback usdRate offline.
export async function getUsdRate(symbol = 'USDC') {
  if (MOCK) return MOCK_RATES[symbol] ?? 1
  const prices = await fetchPrices()
  const token = TOKENS.find(t => t.symbol === symbol)
  return prices[symbol] ?? token?.usdRate ?? 1
}

// Tỷ giá cho tiền tệ hiển thị: USD mỗi 1 đơn vị {USDC:1, EURC:~1.08, cirBTC:~giá BTC}.
// USDC ghim 1 → stablecoin hiện đúng 1:1 (5 USDC = $5.00). cirBTC để TxHistory quy đổi giao dịch
// cirBTC dùng CHUNG 1 nguồn tỷ giá với cột hiển thị (tránh lệch nguồn).
export async function getDisplayRates() {
  if (MOCK) { _ratesCache = MOCK_RATES; return MOCK_RATES }
  const [u, e, b] = await Promise.all([getUsdRate('USDC'), getUsdRate('EURC'), getUsdRate('cirBTC')])
  _ratesCache = { USDC: u, EURC: e, cirBTC: b }   // cache cho lần mount sau
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
  if (MOCK) return 0.002   // phí ảo nhỏ
  try {
    const gasPrice = await publicClient.getGasPrice()
    return Number(gasPrice * BigInt(gasUnits)) / 1e18
  } catch {
    return 0
  }
}
