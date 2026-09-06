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
import { useAuthorizationSignature, getIdentityToken } from '@privy-io/react-auth'
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
  // 'nonce-failed' removed 2026-09-06 with the nonce step itself (PIN-FLOW-SPEC.md §3).
  'not-authenticated': 'Please sign in again.',
  'bad-identity-token': 'Please sign in again.',
  'quorum-not-found': 'Could not read your wallet\'s security settings. Please try again.',
  'payload-mismatch': 'Your wallet\'s security settings changed. Please try again.',
  'enable-pin-plan-failed': 'Could not prepare PIN protection. Please try again.',
  'enable-pin-apply-failed': 'Could not turn on PIN protection. Please try again.',
  // PIN-FLOW-SPEC.md §4 - forgot PIN, added 2026-09-06.
  'forgot-pin-verify-failed': 'Could not verify your passkey. Please try again.',
  'forgot-pin-apply-failed': 'Could not reset your PIN. Please try again.',
  'forgot-pin-start-failed': 'Could not start your PIN reset. Please try again.',
  'bad-proof-token': 'That passkey check expired. Please try again.',
  'cancel-failed': 'Could not cancel the PIN reset. Please try again.',
  'bad-or-expired-token': 'That cancellation link is invalid or already used.',
  'id-token required': 'Please sign in again.',   // the literal error code functions/api/pin.js returns
}

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
// Module-level (not inside a hook) since it touches no hook state - both usePinSigner and
// useForgotPin need it.
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

export function usePinSigner() {
  const { generateAuthorizationSignature } = useAuthorizationSignature()

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

// ══ SETTING (or changing) THE PIN - NO WALLET SIGNATURE ANY MORE (2026-09-06, PIN-FLOW-SPEC.md §3) ══
// This used to prove wallet ownership with a nonce → personal_sign → session-token round trip (the
// same SIWE-style pattern sync.js's contacts backup still uses). That proof is what made Privy pop
// its own raw "Sign message" screen ("Set EZwallet PIN. Nonce: <uuid>") IN FRONT OF the actual PIN
// entry sheet - a real signature confirming a string nobody reads, ahead of the thing the user
// actually came here to do. The spec calls this out by name and settles it: every Privy account has
// exactly one embedded wallet, so Privy's OWN identity token already proves who is asking, as
// securely as a fresh signature would - there is nothing a nonce-signature adds here that
// `getIdentityToken()` (verified SERVER-SIDE against Privy's real JWKS in functions/api/pin.js, not
// merely decoded) does not already give us. Removing the round trip also removes the ENTIRE
// pinnonce:/pinsess: KV lifecycle - see pin.js for the server half.
export function useSetupPin() {
  async function setupPin() {
    const idToken = await getIdentityToken()
    if (!idToken) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' })

    const pin = await requestPin({ mode: 'set' })   // PinGateHost handles the enter→confirm loop itself
    const setRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', idToken, pin }) })
    const d = await setRes.json().catch(() => ({}))
    if (!setRes.ok) throw Object.assign(new Error(d.error || 'set-failed'), { code: d.error })
    return true
  }

  return { setupPin }
}

// ══ THE ONE COMPLETE "SET UP PIN" ACTION - hash + enforcement, in one call ══
// Added 2026-09-05 to back TWO screens that must behave IDENTICALLY: the mandatory SetupPin screen
// (shown once, right after login, before the user ever reaches Home - user decision 2026-09-06,
// EZWALLET-SIGNIN-DECISIONS.md's "PIN is mandatory" made literal in the flow itself) and Security's
// existing "Change PIN" row (the same two steps, run again later to change the PIN or re-assert
// protection). Extracted here so the sequencing and the exact status wording live in ONE place -
// before this, Security.jsx had its own copy of this logic; duplicating it into a second screen
// would have meant two places to keep in sync on every future change.
export function useCompletePinSetup() {
  const { setupPin } = useSetupPin()
  const { enableMandatoryPin } = useEnableMandatoryPin()

  // Sequenced deliberately, not merged into one round trip:
  //   1. setupPin - sets the PIN hash. On failure, nothing else runs.
  //   2. The hash is real now regardless of what happens next, so the caller should persist
  //      ez_pin_is_set / pinIsSet BEFORE step 3, not after - see onHashSet below.
  //   3. enableMandatoryPin - a SEPARATE signature prompt (a second passkey tap), because it is a
  //      genuinely different authorization (a quorum PATCH, not the personal_sign step 1 used).
  // `onHashSet` fires between the two steps so the caller can flip its OWN "hash exists" flag the
  // moment it becomes true, without waiting on step 3 - a real fact that should not be held hostage
  // to whether the enforcement step also succeeds.
  async function completeSetup(address, { onHashSet } = {}) {
    // `address` is only needed for step 3 now - step 1 identifies the caller from their Privy
    // identity token instead (see useSetupPin above), not from an address anyone could claim.
    await setupPin()
    onHashSet?.()
    const result = await enableMandatoryPin(address)
    return result   // { alreadyEnabled: true } | { ok: true, quorum: {...} }
  }

  return { completeSetup }
}

// ══ FORGOT PIN (2026-09-06, PIN-FLOW-SPEC.md §4) - two branches, by whether a passkey exists ══
export function useForgotPin() {
  const { generateAuthorizationSignature } = useAuthorizationSignature()

  // §4.1: has a passkey - proves it, then resets immediately, no lock. The "prove it" step signs a
  // FIXED message (never chosen by the caller - the server only ever relays this exact text, see
  // functions/api/pin.js) through the same wallet-RPC + server-cosign + Privy-relay pipeline
  // signWithPin already uses for real sends. If passkey MFA is on, Privy's own onMfaRequired
  // listener (App.jsx) fires here exactly as it does everywhere else - nothing special to do.
  async function forgotPinWithPasskey(address, newPin) {
    const idToken = await getIdentityToken()
    if (!idToken) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' })
    const walletId = await fetchWalletId(address)

    const requestPayload = {
      version: 1,
      method: 'POST',
      url: `https://api.privy.io/v1/wallets/${walletId}/rpc`,
      headers: { 'privy-app-id': PRIVY_APP_ID },
      body: { method: 'personal_sign', chain_type: 'ethereum', params: { encoding: 'utf-8', message: 'Verify passkey to reset EZwallet PIN' } },
    }
    const { signature: userSignature } = await generateAuthorizationSignature(requestPayload)

    const verifyRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot-pin-verify-passkey', idToken, requestPayload, userSignature }) })
    const verify = await verifyRes.json().catch(() => ({}))
    if (!verifyRes.ok || !verify.proofToken) throw Object.assign(new Error(verify.error || 'forgot-pin-verify-failed'), { code: verify.error || 'forgot-pin-verify-failed' })

    const applyRes = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot-pin-apply-passkey', proofToken: verify.proofToken, newPin }) })
    const applied = await applyRes.json().catch(() => ({}))
    if (!applyRes.ok) throw Object.assign(new Error(applied.error || 'forgot-pin-apply-failed'), { code: applied.error || 'forgot-pin-apply-failed' })
    return applied
  }

  // §4.2: no passkey - registers a 24h-cancellable pending reset. Identity comes from the token,
  // same as everywhere else in this file - never a client-claimed address.
  async function forgotPinStart(newPin) {
    const idToken = await getIdentityToken()
    if (!idToken) throw Object.assign(new Error('not-authenticated'), { code: 'not-authenticated' })
    const res = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot-pin-start', idToken, newPin }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(d.error || 'forgot-pin-start-failed'), { code: d.error || 'forgot-pin-start-failed' })
    return d   // { ok, pendingUntil, emailSent }
  }

  return { forgotPinWithPasskey, forgotPinStart }
}

// The "Not me" cancel link's confirmation page (CancelPinReset.jsx) calls this with NO auth at all -
// the token in the URL IS the credential, same trust model as any email unsubscribe link.
export async function cancelPinReset(token) {
  const res = await fetch(PIN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot-pin-cancel', token }) })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(d.error || 'cancel-failed'), { code: d.error || 'cancel-failed' })
  return d
}

export function pinErrorMessage(e) {
  if (e?.message === 'cancelled') return ''   // the user closed the PIN sheet themselves - say nothing
  const code = e?.code
  if (code && code in PIN_ERROR_BY_CODE) return PIN_ERROR_BY_CODE[code]
  return privyErrorMessage(e)
}
