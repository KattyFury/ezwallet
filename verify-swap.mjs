// CỔNG VERIFY SWAP — chạy TRƯỚC khi bật SWAP_ENABLED. KHÔNG tốn tiền, KHÔNG cần PIN.
// Gọi Stablecoin Kit /swap thật + eth_simulateV1 trên Arc để xem USDC CÓ THỰC SỰ VỀ VÍ không.
// (HANDOFF: đừng tin "tx status=1" — tx cũ status=1 mà vẫn mất tiền. Phải thấy số dư TĂNG.)
//
// Cách chạy (trong thư mục ezwallet):
//   node verify-swap.mjs <địa_chỉ_ví> [tokenIn] [tokenOut] [amount]
// Ví dụ:
//   node verify-swap.mjs 0xVíCủaBạn EURC USDC 2
// Ví phải có sẵn số dư tokenIn (vd 2 EURC) trên Arc Testnet. Đọc KIT_KEY từ .env.txt.
import { readFileSync } from 'fs'
import { simulateSwap } from './functions/api/_swapCore.js'

const KIT_KEY = readFileSync('.env.txt', 'utf8').match(/^KIT_KEY=(.+)/m)?.[1]?.trim()
if (!KIT_KEY) { console.error('❌ Không thấy KIT_KEY trong .env.txt'); process.exit(1) }

const [walletAddress, tokenIn = 'EURC', tokenOut = 'USDC', amountIn = '2'] = process.argv.slice(2)
if (!walletAddress || !walletAddress.startsWith('0x')) {
  console.error('❌ Thiếu địa chỉ ví. Dùng: node verify-swap.mjs 0xVíCủaBạn EURC USDC 2')
  process.exit(1)
}

console.log(`\nĐang mô phỏng swap ${amountIn} ${tokenIn} → ${tokenOut} cho ví ${walletAddress} ...`)
const out = await simulateSwap({ kitKey: KIT_KEY, tokenIn, tokenOut, walletAddress, amountIn })

if (out.error) { console.error('\n❌ LỖI:', out.error, '\n', JSON.stringify(out.detail, null, 2)?.slice(0, 800)); process.exit(1) }

console.log('\n── Kết quả mô phỏng ─────────────────────')
console.log(`  Swap on-chain:   ${out.swapStatus === '0x1' ? '✓ thành công (không revert)' : '❌ REVERT ' + (out.swapError?.message || '')}`)
console.log(`  ${out.tokenOut} trước:      ${out.before}`)
console.log(`  ${out.tokenOut} sau:        ${out.after}`)
console.log(`  Chênh (nhận về):  ${out.delta}   (Kit ước tính: ${out.expected ?? 'n/a'})`)
console.log(`  Gas dùng:         ${out.gasUsed ? BigInt(out.gasUsed).toString() : 'n/a'}`)
console.log(`  Phí app → ${out.feeRecipient?.slice(0, 8)}…: +${out.feeDeltaIn} ${tokenIn} / +${out.feeDeltaOut} ${tokenOut}`)
console.log('─────────────────────────────────────────')

if (out.ok) {
  console.log(`\n✅ ĐẠT — ${out.tokenOut} THỰC SỰ VỀ VÍ (+${out.delta}). An toàn để bật SWAP_ENABLED = true.`)
} else {
  console.log(`\n❌ CHƯA ĐẠT — ${out.tokenOut} KHÔNG tăng. ĐỪNG bật swap. Gửi output này để mình sửa (có thể phải bỏ Multicall3From, tách approve/execute 2 PIN).`)
  process.exit(2)
}
