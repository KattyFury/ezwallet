export const MOCK_VND  = 1_234_567
export const MOCK_USDC = 50.0
export const MOCK_ADDR = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'

export const TOKENS = [
  { symbol: 'USDC',   name: 'USD Coin',   vnd: 1_234_567, amount: 50.0,  color: '#2775CA' },
  { symbol: 'EURC',   name: 'EUR Coin',   vnd: 0,         amount: 0,     color: '#1A56DB' },
  { symbol: 'cirBTC', name: 'Circle BTC', vnd: 0,         amount: 0,     color: '#F7931A' },
]

export const SWAP_PAIRS = [
  ['USDC', 'EURC'],
  ['USDC', 'cirBTC'],
  ['EURC', 'cirBTC'],
]

export function fmtVND(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ₫'
}
