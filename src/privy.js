// ══════════════════════════════════════════════════════════════════════════════
// PRIVY - the replacement for circle.js (2026-08-30, plan in MIGRATION-PRIVY.md).
//
// WHAT DISAPPEARED. circle.js had to run a whole session machine: a userToken that died after
// 60 minutes, an encryptionKey, a refreshToken, forceFreshSession/isTokenExpiredError to survive
// the expiry, and a backend proxy (functions/api/session.js) holding the API key so the browser
// never saw it. Privy keeps the session itself, inside the browser, and refreshes it on its own -
// so none of that code has an equivalent here. That is the point of the migration, not an omission.
//
// WHAT THIS FILE IS. A thin bridge, nothing more. Privy hands its state to REACT COMPONENTS through
// hooks (usePrivy/useWallets), but around fifteen screens in this app read plain localStorage keys
// instead (`ez_wallet_addr`…), and rewriting all of them into hooks would be a far bigger change
// than this migration needs. So App.jsx - the one component that knows about Privy - copies what
// Privy knows into those keys through `rememberLogin` below, and every other screen keeps working
// untouched.
// ══════════════════════════════════════════════════════════════════════════════
import { arcTestnet } from './chain'

// PUBLIC, not a secret: it ships inside the JS bundle either way, exactly like Circle's appId did
// (Login.jsx used to hardcode `518fec6a-…`). The env var only exists so a different Privy app can be
// pointed at a preview deploy without editing source; the fallback keeps a deploy alive if the
// variable was never set in the Cloudflare dashboard.
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'cmtenk9en00250blabovll48e'

// ⚠️ THIS SHAPE IS SDK 3.x AND IS NOT WHAT THE PRIVY DOCS SHOW. In 2.x (and in most tutorials and
// blog posts still online) the key is `embeddedWallets: { createOnLogin }`. In 3.x it moved one
// level down, under a per-ecosystem key: `embeddedWallets: { ethereum: { createOnLogin } }`.
// Verified against node_modules/@privy-io/react-auth/dist/dts/types-Ck8tvlPZ.d.ts:1938, not guessed.
// Written the 2.x way it does not throw - it is simply IGNORED, and the user logs in successfully
// but never gets a wallet, which looks like a Privy outage rather than a config typo.
export const privyConfig = {
  // Email only, matching what the app offers today. The whole reason for leaving Circle is that
  // more methods become possible ('google', 'apple', 'sms', 'telegram'…) - adding one here plus
  // enabling it in the Privy dashboard is the entire job, but that is a separate, deliberate step.
  loginMethods: ['email'],
  defaultChain: arcTestnet,
  supportedChains: [arcTestnet],
  embeddedWallets: { ethereum: { createOnLogin: 'all-users' } },
}

// The keys the rest of the app reads. `ez_wallet_id` and `ez_user_token` are deliberately NOT in
// this list: both are Circle concepts (a walletId to open a challenge against, a 60-minute session
// token) that Privy has no counterpart for. The screens still reading them - SendConfirm, Swap,
// PinGate - are steps 3 to 5 of the migration and are untouched for now.
const ADDR = 'ez_wallet_addr'
const EMAIL = 'ez_google_email'      // shown as "Login email" in Security/Menu (name kept: 15 call sites)
const METHOD = 'ez_login_method'

// Everything the old Circle flow wrote at login, so signing out clears the same ground it used to.
// Keys that only Circle ever wrote are included on purpose: a user upgrading from the Circle build
// still has them sitting in localStorage, and leaving them behind would let App.jsx mistake stale
// Circle data for a live session.
const ALL_LOGIN_KEYS = [
  ADDR, EMAIL, METHOD,
  'ez_wallet_id', 'ez_user_token', 'ez_encryption_key', 'ez_refresh_token', 'ez_email',
]

export function savedWalletAddress() {
  return localStorage.getItem(ADDR)
}

// Copy what Privy knows into the keys the other screens read. Called from App.jsx whenever the
// wallet address arrives - which is NOT only at login: Privy restores the session on a page reload
// too, and the address can land a moment after `authenticated` flips to true.
export function rememberLogin({ address, email }) {
  if (address) localStorage.setItem(ADDR, address)
  if (email) localStorage.setItem(EMAIL, email)
  localStorage.setItem(METHOD, 'privy')
}

// Wipe every trace of the previous account. MUST be paired with Privy's own `logout()` - this only
// clears OUR copy of the data; Privy's session lives in its own storage and survives this call.
export function clearLoginData() {
  ALL_LOGIN_KEYS.forEach(k => localStorage.removeItem(k))
  sessionStorage.removeItem('ez_pin_ok')
  sessionStorage.removeItem('ez_sync_token')
}

// Privy reports errors as a machine-readable STRING code, where circle.js had numeric ones. Mapped
// by code and never by matching English text, for the same reason the Circle table gave: if Privy
// rewords a message the text match goes quietly dead, whereas the codes are stable.
//
// ⚠️ THE VALUES BELOW ARE NOT THE ENUM NAMES. Privy's `PrivyErrorCode` enum names several members
// differently from the strings they carry - `USER_EXITED_AUTH_FLOW` is the string
// `'exited_auth_flow'`, and `MISSING_MFA_CREDENTIALS` is `'missing_or_invalid_mfa'`. Copied from
// node_modules/@privy-io/react-auth/dist/dts/types-Ck8tvlPZ.d.ts:401 (the enum cannot be imported:
// it is a type-only declaration and does not exist at runtime). Guessing a plausible-looking code
// here does not throw - the entry simply never matches, and the user gets Privy's raw internal
// string instead of a sentence.
const ERROR_BY_CODE = {
  // Signing in
  invalid_credentials: 'That code is not right. Please check it and try again.',
  missing_or_invalid_token: 'The code has expired. Please ask for a new one.',
  exited_auth_flow: '',                    // the user closed it themselves - say nothing
  user_does_not_exist: 'No account found for this email.',
  allowlist_rejected: 'This email is not allowed to sign in.',
  disallowed_login_method: 'This way of signing in is turned off.',
  disallowed_plus_email: 'This email address cannot be used. Please use your normal address.',
  too_many_requests: 'Too many attempts. Please wait a few minutes and try again.',
  captcha_failure: 'The security check failed. Please try again.',
  captcha_timeout: 'The security check timed out. Please try again.',
  client_request_timeout: 'The connection timed out. Please try again.',
  // Private/incognito windows block storage, and the sign-in cannot be remembered without it.
  // Worth naming exactly, because otherwise it looks like the app is simply broken.
  session_storage_unavailable: 'Your browser is blocking site storage, so signing in cannot work. Turn off private browsing and try again.',
  // The wallet itself
  embedded_wallet_create_error: 'Your wallet could not be created. Please try again.',
  unknown_embedded_wallet_error: 'Something went wrong with your wallet. Please try again.',
  embedded_wallet_not_found: 'No wallet found for this account.',
  unsupported_chain_id: 'This network is not supported.',
  // Sending (used from step 3 on)
  insufficient_balance: 'Not enough money in your wallet for this.',
  transaction_failure: 'The transaction did not go through. Please try again.',
  unable_to_sign: 'Your wallet could not approve this. Please try again.',
  // A BUILD fault, not a user fault: the Buffer polyfill is missing from vite.config.js. It cannot
  // be fixed by the person reading it, so the message says who to tell rather than "try again".
  buffer_not_defined: 'The app is missing a required component (Buffer). Please report this.',
}

export function privyErrorMessage(e) {
  const code = e?.code ?? e?.privyErrorCode ?? e?.error?.code
  if (code in ERROR_BY_CODE) return ERROR_BY_CODE[code]
  // Log the code of anything unmapped: it is the only way to learn which codes really turn up in
  // the wild and deserve a sentence. Same reasoning as the [Circle challenge] log in circle.js.
  if (code) console.error('[Privy] unmapped error code =', code, e)
  const msg = e?.message || e?.error?.message || (typeof e === 'string' ? e : '')
  if (/fetch|network|Failed to fetch/i.test(msg)) return 'Network error. Check your connection and try again.'
  return msg || 'Something went wrong'
}
