// ══ THE EZWALLET QR FORMAT - SINGLE SOURCE OF TRUTH ══
// Every place that DRAWS a QR (HomeReceive · ShowQR · SavedQRList) and the place that READS one (QRScanner)
// goes through this file. Do NOT hand-build `ezwallet:...` strings in a screen: it used to live in 3 places, and fixing one left the others wrong.
//
// ⚠️ LOCKED TO THE ARC NETWORK (user decision 08-13: "make it Arc only, other networks must not be able to scan it").
// The problem: the default Receive QR drew a BARE `0x…` address. EVM addresses are identical on EVERY chain, so any
// wallet (MetaMask sitting on Ethereum/Base/BSC…) could scan that QR and send - and money sent on another chain is
// GONE, with nobody able to retrieve it. EZwallet users are older people; they have no way of noticing the wrong chain
// on their own.
//
// How it is locked: wrap it in a PRIVATE scheme `ezwallet:` plus `@<chainId>`.
//   ezwallet:0xABC…@5042002
//   ezwallet:0xABC…@5042002?amount=25&cur=USD
// Because `ezwallet:` is not a standard scheme, other wallets do NOT understand it → they cannot send, which is the point.
//
// ⚠️ EIP-681 (`ethereum:0x…@5042002`) IS DELIBERATELY NOT USED: that standard does have a real chainId field, but
// plenty of wallets implement it sloppily - they read the address and IGNORE `@chainId`, sending on whatever chain is
// open. That is more dangerous than a bare address, because we would believe it was locked when it is not. Faced with
// an unknown scheme, other wallets have only one option: refuse.
export const ARC_CHAIN_ID = 5042002

// A valid EVM address (shared by both the drawing and the reading side)
export const isEvmAddress = a => /^0x[0-9a-fA-F]{40}$/.test(String(a || '').trim())

// ── DRAW ──────────────────────────────────────────────────────────────────────────────────────
// buildQR(addr)                                → 'ezwallet:0x…@5042002'
// buildQR(addr, { amount: 25, currency: 'USD' }) → 'ezwallet:0x…@5042002?amount=25&cur=USD'
// amount missing/invalid → drop the query part entirely (the app's "bare address" QR).
export function buildQR(addr, { amount, currency } = {}) {
  const base = `ezwallet:${addr}@${ARC_CHAIN_ID}`
  const amt = Number(amount)
  if (!(amt > 0)) return base
  return `${base}?amount=${amt}&cur=${currency || 'USD'}`
}

// ── READ ──────────────────────────────────────────────────────────────────────────────────────
// Returns { address, amount, currency } · null if unreadable · { wrongChain: <id> } if it is an EZwallet QR
// from ANOTHER chain (so the scan screen can say why, instead of a vague "invalid QR").
//
// Accepts 3 shapes, in order:
//   1. ezwallet:0x…@<chainId>[?amount=&cur=]   ← the CURRENT standard shape
//   2. ezwallet:0x…[?amount=&cur=]             ← the OLD shape (before 08-13, no @chain).
//      STILL ACCEPTED because QRs users already printed/sent/saved as images must keep working - treated as Arc.
//   3. bare 0x…                                ← an address QR from an OUTSIDE source (another wallet, an exchange).
//      STILL ACCEPTED: this is a QR we scan in order to SEND, and locking it would leave the user unable to send to
//      outsiders. The Arc lock is for the QRs WE EMIT, not for what we read.
//
// Default currency 'USD' - do NOT change it to 'VND' (bug 08-12: a QR with no currency defaulted to VND, so the
// amount screen opened in VND while the app was running English/USD).
export function parseQR(text) {
  const raw = String(text || '').trim()

  const m = raw.match(/^ezwallet:(0x[0-9a-fA-F]{40})(?:@(\d+))?(?:\?amount=([\d.]+))?(?:&cur=(\w+))?$/)
  if (m) {
    const chain = m[2] ? Number(m[2]) : ARC_CHAIN_ID   // an old QR carries no chain → treat it as Arc
    if (chain !== ARC_CHAIN_ID) return { wrongChain: chain }
    return { address: m[1], amount: m[3] ? parseFloat(m[3]) : null, currency: m[4] || 'USD' }
  }

  if (isEvmAddress(raw)) return { address: raw.trim(), amount: null, currency: 'USD' }
  return null
}
