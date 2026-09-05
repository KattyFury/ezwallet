// ══════════════════════════════════════════════════════════════════════════════
// PIN-GATED SIGNING (2026-09-04) - the counterpart of functions/api/pin.js.
//
// Replaces `sendTransaction()` for anything that must go through PIN dual-approval. NOT a wrapper
// around sendTransaction - a dual-approval wallet's key alone only produces HALF the signatures Privy
// requires, so `useSendTransaction()` cannot be used here at all (see docs.privy.io/recipes/wallets/
// two-of-two-server-in-the-loop). The flow instead:
//   1. Build the exact Privy wallet-RPC request this transaction is.
//   2. Sign it with the USER's own key via `useAuthorizationSignature()` - if passkey MFA is on for
//      this wallet, Privy's EXISTING listener in App.jsx handles that prompt automatically here,
//      completely untouched by this file.
//   3. Ask the user for their PIN (the sheet in PinGateHost.jsx, woken via pinGate.js).
//   4. POST both to /api/pin (action 'sign'). The server checks the PIN and, only if right, produces
//      the SECOND signature and relays to Privy - see that file for the reasoning.
// A wrong PIN loops back to step 3 with the server's own attempts-left message shown on the sheet;
// the server enforces the real lockout (429 after 4 tries/5min), this is just presentation.
// ══════════════════════════════════════════════════════════════════════════════
import { useAuthorizationSignature, useSignMessage } from '@privy-io/react-auth'
import { requestPin } from './pinGate'
import { PRIVY_APP_ID, privyErrorMessage } from './privy'

const PIN_ENDPOINT = '/api/pin'

// Same error-code convention as privyErrorMessage in src/privy.js - mapped by code, not by matching
// English text, so a reworded server message never silently breaks this.
const PIN_ERROR_BY_CODE = {
  'pin-not-set': 'No PIN has been set up for this wallet yet.',
  'pin-locked': 'Too many wrong PINs. Please wait a few minutes and try again.',
  'pin-signing-disabled': 'PIN signing is not set up yet. Please report this.',
  'bad-request-payload': 'Something went wrong preparing this transaction. Please try again.',
  'privy-unreachable': 'Network error. Check your connection and try again.',
  'privy-failed': 'The transaction was rejected. Please try again.',
  // Added 2026-09-05 alongside the server-side wallet-id lookup and the replay guard. Each one is a
  // state a real user can actually reach, so each gets a sentence rather than falling through to the
  // generic Privy table - "wallet-mismatch" in particular must never read like a network blip.
  'no-wallet-id': 'Could not find your wallet. Please try again.',
  'wallet-not-found': 'Could not find your wallet. Please try again.',
  'wallet-mismatch': 'This request does not match your wallet. Please start again.',
  'replayed-request': 'That transaction was already submitted. Please start again.',
  'not-an-app-wallet': 'This wallet is not an EZwallet wallet.',
  'nonce-failed': 'Could not start PIN setup. Please try again.',
  'quorum-not-found': 'Could not read your wallet\'s security settings. Please try again.',
  'payload-mismatch': 'Your wallet\'s security settings changed. Please try again.',
  'enable-pin-plan-failed': 'Could not prepare PIN protection. Please try again.',
  'enable-pin-apply-failed': 'Could not turn on PIN protection. Please try again.',
}

export function usePinSigner() {
  const { generateAuthorizationSignature } = useAuthorizationSignature()

  // ⚠️ THE WALLET ID COMES FROM THE SERVER, AND HAS TO (2026-09-05).
  // This used to read `user.linkedAccounts[].id` in the browser. That is null for every user of this
  // app: Privy documents `Wallet.id` as "Null if the wallet is not delegated"
  // (react-auth/dist/dts/types-Ck8tvlPZ.d.ts:1008) and this app never delegates - the account's own
  // wallets come back `delegated: false` from Privy's API. So `walletIdFor()` returned null every
  // time and EVERY PIN-gated Send and Swap threw `no-wallet-id` before it reached the sheet. The
  // previous comment cited that same type file but stopped reading at "The server wallet ID of the
  // wallet" and missed the sentence after it.
  // The server holds PRIVY_APP_SECRET and gets the id from `GET /v1/wallets?address=...` without
  // delegation - see functions/api/pin.js. Do not "optimise" this round trip away by going back to
  // linkedAccounts; there is nothing there to read.
  async function fetchWalletId(address) {
    const res = await fetch(PIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'wallet-id', address }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.walletId) throw Object.assign(new Error(d.error || 'no-wallet-id'), { code: d.error || 'no-wallet-id' })
    return d.walletId
  }

  async function signWithPin({ to, data, value, chainId, address }) {
    const walletId = await fetchWalletId(address)

    const requestPayload = {
      version: 1,
      method: 'POST',
      url: `https://api.privy.io/v1/wallets/${walletId}/rpc`,
      headers: { 'privy-app-id': PRIVY_APP_ID },
      body: {
        caip2: `eip155:${chainId}`,
        method: 'eth_sendTransaction',
        chain_type: 'ethereum',
        params: { transaction: { to, data, ...(value ? { value } : {}) } },
      },
    }

    // Signs with the USER's key. If passkey MFA is on, Privy's own onMfaRequired listener (App.jsx)
    // fires here exactly as it does for a normal sendTransaction() - nothing special to do.
    const { signature: userSignature } = await generateAuthorizationSignature(requestPayload)

    let pinError
    for (;;) {
      const pin = await requestPin({ mode: 'verify', error: pinError })
      const res = await fetch(PIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', address, pin, requestPayload, userSignature }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) return { hash: d.hash }
      if (d.error === 'wrong-pin') {
        pinError = `Wrong PIN. ${d.attemptsLeft} attempt${d.attemptsLeft === 1 ? '' : 's'} left.`
        continue   // ask again, sheet reopens with the message above already showing
      }
      throw Object.assign(new Error(d.error || 'sign-failed'), { code: d.error })
    }
  }

  return { signWithPin }
}

// ONE function for screens to call, regardless of which half of the flow threw: errors from
// generateAuthorizationSignature() are Privy SDK errors (privyErrorMessage's table - cancelling the
// passkey prompt, etc.), errors from the /api/pin round-trip carry OUR OWN codes above. Unknown codes
// fall through to privyErrorMessage last, same "log it, don't guess a sentence" behaviour it already has.
// ══ SETTING (or changing) THE PIN ITSELF - a different, cheaper proof than `sign` above ══
// No dual-approval needed here: nothing moves money, so a plain wallet signature (personal_sign,
// same EIP-191 pattern sync.js already uses for the contacts backup) is enough proof "this is really
// the wallet owner". Mirrors functions/api/pin.js's nonce → session → set exactly.
// ══ MAKING THE PIN LOAD-BEARING (2026-09-05) ══
// Setting a PIN hash (useSetupPin below) and the wallet actually REQUIRING it are two separate
// facts. Every embedded wallet is owned, from creation, by Privy's own default 1-of-1 quorum - one
// signature (the user's alone) is already enough, so until this runs, `signWithPin`'s dual-approval
// is Privy accepting the user's half and never even asking for the server's. `enableMandatoryPin`
// closes that gap: it raises the wallet's OWN quorum to 2-of-2 (adds the server's key), which is a
// QUORUM update, not the WALLET-ownership update Privy's client SDK refuses - see the long comment
// on buildEnablePinPayload in functions/api/pin.js for why that distinction is what makes this
// possible at all.
// ⚠️ NOT WIRED TO ANY BUTTON YET. This raises a real security bar on a real wallet - deliberately
// left for the user to trigger themselves once ready, not fired automatically by this code.
export function useEnableMandatoryPin() {
  const { generateAuthorizationSignature } = useAuthorizationSignature()

  async function enableMandatoryPin(address) {
    const planRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enable-pin-plan', address }) })
    const plan = await planRes.json().catch(() => ({}))
    if (!planRes.ok) throw Object.assign(new Error(plan.error || 'enable-pin-plan-failed'), { code: plan.error || 'enable-pin-plan-failed' })
    if (plan.alreadyEnabled) return { alreadyEnabled: true }

    // Signs with the wallet's OWN key - sufficient authorization today because the quorum being
    // changed is still 1-of-1. If passkey MFA is on, Privy's own onMfaRequired listener (App.jsx)
    // fires here exactly as it does for signWithPin - nothing special to do.
    const { signature: userSignature } = await generateAuthorizationSignature(plan.payload)

    const applyRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enable-pin-apply', address, requestPayload: plan.payload, userSignature }) })
    const applied = await applyRes.json().catch(() => ({}))
    if (!applyRes.ok) throw Object.assign(new Error(applied.error || 'enable-pin-apply-failed'), { code: applied.error || 'enable-pin-apply-failed' })
    return applied
  }

  return { enableMandatoryPin }
}

export function useSetupPin() {
  const { signMessage } = useSignMessage()

  async function setupPin(address) {
    const nonceRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'nonce' }) })
    const nonceBody = await nonceRes.json().catch(() => ({}))
    // ⚠️ CHECK THE RESPONSE BEFORE USING IT. Unchecked, a 503 (KV binding missing) or any other
    // failure left `message` undefined and this went straight on to ask the user - and their
    // fingerprint - to sign the literal string "undefined". A signature prompt is the most expensive
    // thing this app can ask for; never raise one on data that was never validated.
    if (!nonceRes.ok || !nonceBody.nonce || !nonceBody.message) {
      throw Object.assign(new Error(nonceBody.error || 'nonce-failed'), { code: nonceBody.error || 'nonce-failed' })
    }
    const { nonce, message } = nonceBody
    // No `uiOptions: { showWalletUIs: false }` - same reason as everywhere else in this app: it
    // breaks the moment passkey MFA is on.
    const { signature } = await signMessage({ message }, { address })
    const sessRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'session', nonce, signature }) })
    const sess = await sessRes.json()
    if (!sessRes.ok || !sess.token) throw Object.assign(new Error(sess.error || 'session-failed'), { code: sess.error })

    const pin = await requestPin({ mode: 'set' })   // PinGateHost handles the enter→confirm loop itself
    const setRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', token: sess.token, pin }) })
    const d = await setRes.json()
    if (!setRes.ok) throw Object.assign(new Error(d.error || 'set-failed'), { code: d.error })
    return true
  }

  return { setupPin }
}

export function pinErrorMessage(e) {
  if (e?.message === 'cancelled') return ''   // the user closed the PIN sheet themselves - say nothing
  const code = e?.code
  if (code && code in PIN_ERROR_BY_CODE) return PIN_ERROR_BY_CODE[code]
  return privyErrorMessage(e)
}
