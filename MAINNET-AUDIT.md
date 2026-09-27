# Mainnet readiness audit – how money could be lost

**Date:** 2026-09-27 · **Scope:** the code in this repo (= the testnet app at `241bb36`) read end to end on every
money path (`functions/api/*`, `src/circle.js`, `src/chain.js`, `src/qr.js`, Send/Confirm/Receipt/Swap screens),
plus live checks against Arc Mainnet (`rpc.mainnet.arc.io`, chainId `0x13b2` = 5042) and Circle's own SDK source.
**Status:** findings only - nothing below is fixed yet. Every item must be closed (or explicitly accepted by the
user) before real money touches this app.

Severity: 🔴 can lose customer or owner money · 🟠 can mislead people about money / enable fraud · 🟡 hardening.

---

## Verified facts (sources, not guesses)

| Item | Mainnet value | Source |
|---|---|---|
| Chain | Arc, chainId **5042**, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io` | docs.arc.io `/arc/references/connect-to-arc`, `eth_chainId` = `0x13b2` |
| USDC (ERC-20 iface, 6 dec) | `0x3600000000000000000000000000000000000000` (same as testnet) | docs.arc.io contract-addresses |
| EURC (6 dec) | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` (**different** from testnet) | docs.arc.io; `eth_getCode` = contract |
| cirBTC (8 dec) | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` (different) - out of v1 scope per spec | docs.arc.io |
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` (same) | docs.arc.io; contract on mainnet |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` (same) | docs.arc.io; contract on mainnet |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` (same) | docs.arc.io |
| **Swap Adapter** | **`0x7FB8c7260b63934d8da38aF902f87ae6e284a845`** (different) | `@circle-fin/adapter-viem-v2@1.18.0` `ADAPTER_CONTRACT_EVM_MAINNET`; contract on mainnet |
| Swap on Arc mainnet | supported (USDC/EURC/cirBTC), Circle Wallets adapter listed | docs.arc.io `/app-kit/references/supported-blockchains` |
| Circle Wallets on Arc **mainnet** | **NOT CONFIRMED** - Circle's supported-blockchains page lists only `ARC-TESTNET`; Arc's App Kit page says "Circle Wallets" works on Arc. The chain code (`ARC`?) must be confirmed with a LIVE API key. | developers.circle.com `/w3s/supported-blockchains-and-currencies` |
| `eth_simulateV1` on the public mainnet RPC | **not supported** (`-32601 method not supported`) | live call |

---

## ⛔ Blocker

### B1. Circle user-controlled wallets do not (yet) support Arc mainnet
Circle's supported-blockchains page lists only `ARC-TESTNET`, and Circle's own
`@circle-fin/adapter-circle-wallets@1.8.0` maps only `'ARC-TESTNET'` to a chain (no Arc mainnet entry). The PIN
wallet is the core of ezwallet, so **mainnet cannot launch until Circle ships native Arc mainnet support**.
**Owner decision 2026-09-27: no workaround** (e.g. a generic "EVM" wallet + sign-transaction + self-broadcast is
NOT to be built). Wait for Circle; re-check their supported-blockchains page and the adapter's chain map, then
confirm with a LIVE API key and set `circleBlockchain` in `src/network.js` (left `null` so the app fails closed).

## 🔴 Critical

### C1. Anyone can log in as anyone (no email verification)
`functions/api/session.js` takes `{ email }`, creates the Circle user if missing and returns that user's
`userToken` + `encryptionKey` - with **no proof the caller owns the email**. The endpoint is CORS `*`.
- **Account squatting:** an attacker registers a victim's email first (setting the attacker's own PIN and
  security answers). The victim later "signs up", lands in the attacker's wallet, shares its address, and every
  payment they receive belongs to the attacker.
- **Takeover via security questions:** with a token for any email, the attacker can open the Forgot-PIN
  challenge; the only remaining barrier is the security answers - weak for the target audience (older users,
  guessable/social-engineerable answers).
- **Privacy:** balance, address and history of any email are readable.
- **Owner's money:** the endpoint can be scripted to create unlimited Circle users (billing/abuse).
**Fix:** verify email ownership in OUR backend before minting a token (a 6-digit code emailed via a mail
provider, short TTL, attempt limit), then keep `userId=email` + PIN exactly as today. Circle's own Email-OTP
auth mode is NOT an option (it removes the PIN - see HANDOFF). Add rate limiting on `/api/session`.

### C2. Hard-coded testnet addresses silently "succeed" on mainnet
On mainnet the testnet **Swap Adapter** and **EURC** addresses have **no code**. EVM calls to a code-less address
succeed without doing anything, so:
- **Swap:** the batch `approve(tokenIn → 0xBBD7…) + execute()` would succeed, move nothing, and leave an
  **allowance to an unknown address** - whoever controls that key can later pull the customer's tokens.
- **Send EURC:** `transfer` to a code-less token address "succeeds"; the app shows "Sent" and nothing moved.
Addresses are duplicated in `send.js`, `_swapCore.js`, `chain.js`, `swap.js` (chain name `Arc_Testnet`),
`wallet.js` (`ARC-TESTNET` + a fallback to `list[0]`), `qr.js` (chainId).
**Fix:** one network config module used by client AND functions; values from the table above only; a startup
self-check (`eth_getCode` must be non-empty for every contract, `eth_chainId` must equal 5042) that refuses to
send if anything is off; remove the `list[0]` wallet fallback.

### C3. Double payment after a network drop
`SendConfirm` treats `executeChallenge` resolving as "sent" and anything thrown as "failed". If the connection
drops after the PIN is accepted, Circle may already have broadcast the transfer while the screen says
**"Send failed"** with the button re-enabled and a **fresh idempotencyKey** → the customer pays twice.
Swap has the same shape. **Fix (spec item 6):** after the PIN, poll Circle `GET /transactions/{id}` (or by
wallet) until `COMPLETE`/`FAILED`; on any doubt show "Checking…" and block re-sending until the previous
transaction's final state is known; reuse one idempotencyKey per confirmation screen.

### C4. The receipt claims success without checking the chain
`SendReceipt` never reads the transaction. A signed-but-reverted/failed transfer still produces "Sent", a
notification and a **savable receipt image** - which people will show a seller as proof of payment.
**Fix:** only show the receipt after the on-chain status is `COMPLETE`; include the tx hash on the receipt.

### C5. The swap server trusts the intent blindly and does not simulate
`swap.js` `execute` takes Circle's intent and builds the batch without checking that every
`tokens[].beneficiary` is the user's own wallet, that `tokenIn`/amount match the request, or that
`minTokenOut` is sane. The app never runs `simulate` before `execute` (only the manual `verify-swap.mjs` does),
and `eth_simulateV1` is not available on the public mainnet RPC anyway.
**Fix:** validate the intent server-side (beneficiary, tokens, amounts, deadline, adapter address) and refuse
otherwise; simulate through a provider that supports `eth_simulateV1` (Alchemy/QuickNode) or an `eth_call`
of the batch from the user's address, and require the tokenOut balance to rise.

---

## 🟠 High

### H1. Amount rounding differs from what the user confirmed
`SendConfirm` sends `toFixed(2)` for USDC/EURC. The keypad limits input to 2 decimals, but a **QR-supplied
amount** (`qr.js` → `SendAmount` `digits = String(params.amount)`) is not limited: `0.004` is sent as **0**
("Sent $0.004" shown), `12.345` as `12.35`. The server also converts with floats
(`Math.round(parseFloat(x) * 10**dec)`), accepts negatives and exponent notation.
**Fix:** one decimal-string → base-units conversion (viem `parseUnits`) on the server, reject anything that is
not a positive decimal with ≤ token decimals; show and send the same string; spec says up to 6 decimals.

### H2. Price shown ≠ price executed on swap, and 3% slippage
The screen shows a `/quote` result; `execute` fetches a **new** `/swap` intent with `slippageBps: 300`. The
customer can receive up to 3% less than the number they saw. **Fix:** execute exactly the intent whose amount
was displayed (or re-display before the PIN), and use a stablecoin-appropriate slippage (e.g. 30–50 bps) -
spec: "Giá hiển thị trước khi ký lấy trực tiếp từ quote của route sẽ thi hành".

### H3. Malicious QR can prefill a large amount in a different token
`ezwallet:0x…?amount=1&cur=cirBTC` opens Send with **1 cirBTC** (~tens of thousands of USD) prefilled.
**Fix:** v1 drops cirBTC (spec); show a clear "amount requested by this QR" state; cap/confirm large amounts.

### H4. Testnet addresses shared as text can receive mainnet money
The testnet app shares the bare address (no chain) by design. A tester who gives that address out may receive
**mainnet** USDC at an address whose key lives in Circle's TESTNET environment - possibly unrecoverable.
**Fix:** label the testnet app "TESTNET – not real money" on Receive/Share, append "(Arc Testnet)" to shared
text; in mainnet docs warn never to reuse testnet addresses.

### H5. The fee recipient must be replaced
`FEE_RECIPIENT = 0xEb2D…52F6` has no code (an EOA). On mainnet every swap pays 0.1% there - the owner's own
revenue, not customer funds. **Owner decision 2026-09-27: switch to a different wallet** (address to be supplied).
Multi-sig is NOT required: ezwallet deploys no contracts and never holds customer money (Circle MPC + the user's
PIN), so the spec's "deploy with multi-sig" rule does not apply. A wallet whose key the owner controls safely
(hardware wallet or an offline seed) is enough.

### H6. Addresses are not checksum-validated
`/^0x[0-9a-fA-F]{40}$/` accepts a mixed-case address with a typo. **Fix:** `viem.isAddress(addr, { strict: true })`
on every entry path (Paste, QR, Contacts) and on the server.

---

## 🟡 Hardening

- **No server-side validation** of `toAddress` in `send.js` (the memo path hand-encodes calldata with
  `padStart`, which would silently turn a malformed address into a different one).
- **Spec items not built:** 24h lock after PIN reset; gas shown in USDC before confirming (fee estimate uses a
  fixed gas guess); "checking" state (C3).
- **`userToken` + `encryptionKey` live in `localStorage`** - an XSS would leak them (the PIN is still needed to
  move money). Keep a strict CSP; avoid third-party scripts (Cloudflare Insights beacon is currently injected).
- **CORS `*` on all functions** - restrict to the app origin.
- **Circle API errors are returned verbatim with `detail`** - fine for testnet, trim for mainnet.
- **Circle LIVE account:** mainnet needs production API + Kit keys (possibly account verification) - owner task.

---

## Proposed order of work

1. Owner: wait for B1 (Circle Arc-mainnet support); Circle LIVE API key + Kit key; the new fee-wallet address;
   a mail provider for C1 (6-digit email code, decided 2026-09-27); a paid RPC for C5.
2. Code, in this order: network config + self-check (C2) → amount/address validation (H1, H6, server) →
   transaction status tracking + receipt gating + no double send (C3, C4) → email verification (C1) →
   swap intent validation + simulation + quote/slippage (C5, H2) → QR/cirBTC scope (H3) → hardening.
3. Test on mainnet with **tiny amounts** (≤ $1) from a dedicated wallet, one flow at a time, before any user.
