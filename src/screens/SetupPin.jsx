import { useState } from 'react'
import { usePrivy, useLogout } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { clearLoginData } from '../privy'
import { useCompletePinSetup, pinErrorMessage } from '../pinSigner'

// ══ THE MANDATORY PIN, RIGHT AFTER LOGIN (2026-09-06, user decision) ══
// The user's own words for the flow, verbatim: "1. log in = email OTP · 2. Set PIN · 3. Set passkey
// nếu muốn · 4. trang chủ" - login, then a MANDATORY PIN, THEN an OPTIONAL passkey offer, THEN home.
// This REORDERS what shipped on 08-30/09-04: back then ProtectWallet (passkey) ran first and PIN
// setup was buried as an easy-to-skip row inside Security, which never actually made PIN mandatory
// in the ONBOARDING PATH even though EZWALLET-SIGNIN-DECISIONS.md had already called it a mandatory
// baseline. This screen is what finally makes that decision literal in the flow itself.
//
// ⚠️ NO "Not now" HERE - unlike ProtectWallet, which is genuinely optional (its own comment: "an
// OFFER, not a wall"). The user's flow lists PIN with no skip and calls passkey out separately as
// "if wanted" - the asymmetry is deliberate, not an oversight to fix later.
// ⚠️ A "Sign out" escape DOES exist (small text link, not a competing CTA) - a MANDATORY screen with
// a bug and no way out at all would strand a real user on their own money. Retrying is the intended
// path; signing out is the fallback for when retrying is not working.
//
// App.jsx routes here whenever the wallet has no PIN hash yet, BEFORE the passkey-offer effect gets
// a turn (that effect now also checks `ez_pin_is_set` and stays out of the way until this screen is
// done) - so a fresh signup reaches this screen first.
//
// ⚠️ THIS SCREEN NAVIGATES ITSELF ON SUCCESS, unlike ProtectWallet (which can only detect success by
// WATCHING `user.mfaMethods` change, because `showMfaEnrollmentModal()` returns void with no promise
// to await). `completeSetup` DOES resolve/reject, so there is a real outcome to act on directly -
// straight to ProtectWallet if the user has no passkey yet (continuing the mandated order: PIN, then
// the OPTIONAL passkey offer), or straight to Home if they already have one (returning user whose
// account somehow reached this screen with a passkey already on - e.g. it existed before this PIN
// gate shipped). App.jsx's gate effect is therefore only ever responsible for the FIRST placement,
// not for reacting to the flag changing later.
export default function SetupPin() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { logout } = useLogout()
  const { completeSetup } = useCompletePinSetup()
  const [status, setStatus] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSetPin() {
    setBusy(true); setStatus('Verifying...'); setErr(false)
    const address = localStorage.getItem('ez_wallet_addr')
    try {
      await completeSetup(address, {
        onHashSet: () => { localStorage.setItem('ez_pin_is_set', '1'); setStatus('Turning on protection...') },
      })
      const passkeyOn = !!user?.mfaMethods?.includes('passkey')
      navigate(passkeyOn ? 'HomeSend' : 'ProtectWallet')
    } catch (e) {
      const msg = pinErrorMessage(e)
      // Unlike Security's "Change PIN" row, there is no pre-existing PIN here to distinguish a
      // step-1 vs step-2 failure by - a fresh signup has neither yet, so ONE message covers both:
      // whatever failed, the user is still on this screen and can just press the button again.
      setStatus(msg || 'Something went wrong. Please try again.')
      setErr(true)
    } finally {
      setBusy(false)
    }
  }

  // Identical sequence to MenuScreen's "Sign out" - both are needed, neither is enough (see the
  // comment there): Privy keeps its own session in its own storage, so without `logout()` the
  // reload below would find the user still signed in and walk them straight back onto this exact
  // screen. Duplicated rather than shared, matching how MenuScreen itself keeps this inline rather
  // than as a hook - it is 5 lines, and the two call sites are not likely to drift apart badly
  // enough to be worth a shared module for it.
  async function handleSignOut() {
    clearLoginData()
    ;['ez_notifs', 'ez_last_recv_ts'].forEach(k => localStorage.removeItem(k))
    try { await logout() } catch {}
    window.location.reload()
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Set your PIN
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'center', gap: '3dvh', padding: '0 8px' }}>
        <Icon name="shield" size="min(28vw, 120px)" color="var(--color-brand)" />
        {/* Same plain-language register as ProtectWallet - no "dual-approval", no "quorum", no
            "authorization key": those words explain the MECHANISM, not what the user needs to know. */}
        <span style={{ width: '85%', fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
          Set a 6-digit PIN to protect your money. You'll need it every time you send.
        </span>
        {/* Height reserved even when empty, same reasoning as PinGateHost's own error line - the
            button below must not jump between attempts. */}
        <div style={{ minHeight: 'calc(var(--fs-item) * 1.3 * 2)', display: 'flex', alignItems: 'center' }}>
          {status && (
            <span style={{ fontSize: 'var(--fs-item)', color: err ? 'var(--color-error)' : 'var(--color-muted)', textAlign: 'center' }}>
              {status}
            </span>
          )}
        </div>
        {/* The fallback for a genuinely stuck signature/signing bug, NOT a way to skip the PIN
            itself - kept small and out of the button row below, which is ONE primary action only
            (the app-wide row10-single shape), not a place to cram a second, unequal-weight control
            into a fixed 10dvh band that a button alone already nearly fills. */}
        <button type="button" onClick={handleSignOut} style={{
          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
          color: 'var(--color-muted)', fontSize: 'var(--fs-item)', textDecoration: 'underline',
        }}>
          Sign out
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={handleSetPin} disabled={busy}>
          {busy ? 'Working...' : 'Set PIN'}
        </button>
      </div>
    </div>
  )
}
