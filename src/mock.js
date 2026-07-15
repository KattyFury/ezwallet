// ══════════════════════════════════════════════════════════
// MOCK MODE (2026-07-15) — chạy LOCAL để canh UI/flow, KHÔNG đụng Circle SDK.
//   Bật:  npm run mock   (Vite --mode mock đọc .env.mock có VITE_MOCK=1)
//   Tắt:  npm run dev     (bình thường) — cờ không set → MOCK=false.
// KHÔNG BAO GIỜ vào production: build prod (mode=production) không có VITE_MOCK.
// Tác dụng: bỏ qua Login + PIN → vào thẳng app với VÍ ẢO + SỐ DƯ ẢO; mọi /api/* và ArcScan bị
// chặn trả data giả; nút Gửi/Swap giả lập THÀNH CÔNG (không gọi Circle, không mất tiền thật).
// Chỉ để dựng/canh giao diện — luồng tiền thật vẫn phải test trên deploy (Circle SDK cần https).
// ══════════════════════════════════════════════════════════
export const MOCK = import.meta.env.VITE_MOCK === '1'

// Ví ảo (địa chỉ demo, không phải ví thật)
export const MOCK_ADDR = '0x1234567890AbcdEF1234567890aBCDef12345678'
const OTHER_ADDR = '0x9AbCDef0123456789ABCdef0123456789abCDEf0'
const ADAPTER = '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b'   // Swap Adapter (để tx swap nhận diện đúng)

// Số dư ảo theo symbol (đơn vị token thật). Giá quy USD dùng MOCK_RATES.
export const MOCK_AMOUNTS = { USDC: 127.66, EURC: 84.20, cirBTC: 0.01542 }
export const MOCK_RATES = { USDC: 1, EURC: 1.08, cirBTC: 65000 }

// Lịch sử giao dịch ảo — SHAPE giống ArcScan tokentx (from/to/value base units/tokenSymbol/tokenDecimal/
// contractAddress/timeStamp/hash). Swap = 2 dòng CÙNG hash (1 out + 1 in) để TxHistory nhận là swap.
const _now = Math.floor(Date.now() / 1000)
export const MOCK_TX = [
  // Nhận 25 USDC (1h trước)
  { hash: '0xmockrcv1', from: OTHER_ADDR, to: MOCK_ADDR, value: '25000000', tokenSymbol: 'USDC', tokenDecimal: '6', contractAddress: '0x3600000000000000000000000000000000000000', timeStamp: String(_now - 3600) },
  // Gửi 10 EURC (hôm qua)
  { hash: '0xmocksnd1', from: MOCK_ADDR, to: OTHER_ADDR, value: '10000000', tokenSymbol: 'EURC', tokenDecimal: '6', contractAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', timeStamp: String(_now - 90000) },
  // Swap 20 USDC → ~18.5 EURC (2 ngày trước, cùng hash)
  { hash: '0xmockswp1', from: MOCK_ADDR, to: ADAPTER, value: '20000000', tokenSymbol: 'USDC', tokenDecimal: '6', contractAddress: '0x3600000000000000000000000000000000000000', timeStamp: String(_now - 180000) },
  { hash: '0xmockswp1', from: ADAPTER, to: MOCK_ADDR, value: '18500000', tokenSymbol: 'EURC', tokenDecimal: '6', contractAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', timeStamp: String(_now - 180000) },
]

// Seed phiên đăng nhập giả → App.jsx thấy có session + đã mở khoá PIN → vào thẳng HomeSend.
export function seedMockSession() {
  localStorage.setItem('ez_user_token', 'mock-token')
  localStorage.setItem('ez_wallet_addr', MOCK_ADDR)
  localStorage.setItem('ez_wallet_id', 'mock-wallet')
  localStorage.setItem('ez_email', 'demo@ezwallet.app')
  sessionStorage.setItem('ez_pin_ok', '1')
}

function jsonRes(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

// Chặn network: /api/* (Circle proxy) + ArcScan tokentx → trả data giả. Mọi URL khác (RPC viem…) đi
// qua fetch gốc và tự fail gracefully (getTxMemo/gasPrice đều có try/catch → không sao).
export function installMockFetch() {
  const orig = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url || '')
    if (url.includes('arcscan.app') && url.includes('tokentx')) return jsonRes({ result: MOCK_TX })
    if (url.includes('/api/send'))    return jsonRes({ challengeId: 'mock-challenge' })
    if (url.includes('/api/session')) return jsonRes({ userToken: 'mock-token', encryptionKey: 'mock-key' })
    if (url.includes('/api/wallet'))  return jsonRes({ address: MOCK_ADDR, walletId: 'mock-wallet' })
    return orig(input, init)
  }
}
