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
import { usePrivy, useAuthorizationSignature } from '@privy-io/react-auth'
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
}

export function usePinSigner() {
  const { user } = usePrivy()
  const { generateAuthorizationSignature } = useAuthorizationSignature()

  // The wallet's internal Privy ID (needed for the /v1/wallets/{id}/rpc URL) lives only on
  // user.linkedAccounts, NOT on the ConnectedWallet objects useWallets() returns - checked directly
  // against node_modules/@privy-io/react-auth/dist/dts/types-Ck8tvlPZ.d.ts (`Wallet.id`), not guessed.
  function walletIdFor(address) {
    const acc = user?.linkedAccounts?.find(
      a => a.type === 'wallet' && a.address?.toLowerCase() === address.toLowerCase(),
    )
    return acc?.id || null
  }

  async function signWithPin({ to, data, value, chainId, address }) {
    const walletId = walletIdFor(address)
    if (!walletId) throw new Error('no-wallet-id')

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
export function pinErrorMessage(e) {
  if (e?.message === 'cancelled') return ''   // the user closed the PIN sheet themselves - say nothing
  const code = e?.code
  if (code && code in PIN_ERROR_BY_CODE) return PIN_ERROR_BY_CODE[code]
  return privyErrorMessage(e)
}
