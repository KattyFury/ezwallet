// THE SWAP VERIFY GATE - run this BEFORE enabling SWAP_ENABLED. Costs nothing, needs no PIN.
// It calls the real Stablecoin Kit /swap + eth_simulateV1 on Arc to see whether the USDC ACTUALLY REACHES THE WALLET.
// (HANDOFF: never trust "tx status=1" - an earlier tx had status=1 and still lost the money. The balance must RISE.)
//
// How to run (inside the ezwallet folder):
//   node verify-swap.mjs <wallet_address> [tokenIn] [tokenOut] [amount]
// Example:
//   node verify-swap.mjs 0xYourWallet EURC USDC 2
// The wallet must already hold the tokenIn balance (e.g. 2 EURC) on Arc Testnet. KIT_KEY is read from .env.txt.
import { readFileSync } from 'fs'
import { simulateSwap } from './functions/api/_swapCore.js'

const KIT_KEY = readFileSync('.env.txt', 'utf8').match(/^KIT_KEY=(.+)/m)?.[1]?.trim()
if (!KIT_KEY) { console.error('❌ KIT_KEY not found in .env.txt'); process.exit(1) }

const [walletAddress, tokenIn = 'EURC', tokenOut = 'USDC', amountIn = '2'] = process.argv.slice(2)
if (!walletAddress || !walletAddress.startsWith('0x')) {
  console.error('❌ Missing wallet address. Usage: node verify-swap.mjs 0xYourWallet EURC USDC 2')
  process.exit(1)
}

console.log(`\nSimulating a swap of ${amountIn} ${tokenIn} → ${tokenOut} for wallet ${walletAddress} ...`)
const out = await simulateSwap({ kitKey: KIT_KEY, tokenIn, tokenOut, walletAddress, amountIn })

if (out.error) { console.error('\n❌ ERROR:', out.error, '\n', JSON.stringify(out.detail, null, 2)?.slice(0, 800)); process.exit(1) }

console.log('\n── Simulation result ────────────────────')
console.log(`  Swap on-chain:   ${out.swapStatus === '0x1' ? '✓ succeeded (no revert)' : '❌ REVERT ' + (out.swapError?.message || '')}`)
console.log(`  ${out.tokenOut} before:     ${out.before}`)
console.log(`  ${out.tokenOut} sau:        ${out.after}`)
console.log(`  Delta (received): ${out.delta}   (Kit estimate: ${out.expected ?? 'n/a'})`)
console.log(`  Gas used:         ${out.gasUsed ? BigInt(out.gasUsed).toString() : 'n/a'}`)
console.log(`  App fee → ${out.feeRecipient?.slice(0, 8)}…: +${out.feeDeltaIn} ${tokenIn} / +${out.feeDeltaOut} ${tokenOut}`)
console.log('─────────────────────────────────────────')

if (out.ok) {
  console.log(`\n✅ PASS - ${out.tokenOut} GENUINELY REACHED THE WALLET (+${out.delta}). Safe to set SWAP_ENABLED = true.`)
} else {
  console.log(`\n❌ FAIL - ${out.tokenOut} did NOT increase. Do NOT enable swap. Send this output over so it can be fixed (Multicall3From may have to go, splitting approve/execute into 2 PINs).`)
  process.exit(2)
}
