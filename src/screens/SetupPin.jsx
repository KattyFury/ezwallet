import { useEffect, useRef, useState } from 'react'
import { usePrivy, useLogout } from '@privy-io/react-auth'
import logoLong from '../../design/logo.svg'
import { useNav } from '../nav'
import { clearLoginData } from '../privy'
import { useCompletePinSetup, pinErrorMessage } from '../pinSigner'

// ══ THE MANDATORY PIN, RIGHT AFTER LOGIN (2026-09-06, user decision) ══
// The user's own words, verbatim: "1. log in = email OTP · 2. Set PIN · 3. Set passkey nếu muốn ·
// 4. trang chủ". This is step 2.
//
// ⚠️ CORRECTED 2026-09-06, SAME DAY - the first version of this screen was WRONG: it drew its own
// full-screen UI (a shield icon, a paragraph, a "Set PIN" button) that exists NOWHERE in the design.
// The actual PIN entry UI is Figma frames 3/4/5 (fileKey l26UsgoqIDfvLkrozVLPTq) - a centred POPUP
// over a blurred logo backdrop - and that popup ALREADY EXISTS: `PinGateHost.jsx`, mounted once in
// App.jsx, matches those exact frames pixel for pixel (verified 09-04). This screen's only job is to
// (1) show the SAME backdrop Login.jsx shows (the logo + tagline, copied from Login.jsx line for
// line, not reinvented) and (2) OPEN THAT EXISTING SHEET the moment the screen mounts, no button to
// press first - the same "ask without being asked" pattern Login.jsx already uses for Privy's own
// modal, for the same reason: arriving here and having to press something before being allowed to do
// the one mandatory thing is a step carrying no information.
//
// ⚠️ UNDISMISSABLE ON CANCEL ONLY - closing the sheet with its own ✕ just reopens it (matches
// Login.jsx: there is nothing behind this screen to escape to by dismissing it). But a REAL error
// (not a cancel) does NOT auto-retry, on purpose: the 09-05 incident that froze the tab solid was
// exactly a silent retry loop hitting a broken signing path (a stale passkey's server-side
// verification failing again and again with no pause). Reopening THIS sheet on every failure would
// risk rebuilding that same shape of bug into the one screen every user must pass through. A real
// error stops here, shows what happened, and waits for an explicit tap ("Try again") before the
// sheet opens once more.
export default function SetupPin() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { logout } = useLogout()
  const { completeSetup } = useCompletePinSetup()
  const [error, setError] = useState('')   // '' = sheet is open / about to open; non-empty = stopped

  // ⚠️ REFS, NOT STATE - `running` only guards against calling run() twice concurrently (this
  // component's own StrictMode double-invoke, or the mount-effect racing a manual retry tap), and
  // `mounted` only stops a stale async call from touching state after unmount. Neither should ever
  // be a dependency that re-runs anything.
  const runningRef = useRef(false)
  const mountedRef = useRef(true)
  // ⚠️ SET true ON EVERY MOUNT, NOT JUST DECLARED true ONCE - this app runs in React.StrictMode
  // (main.jsx), which in DEVELOPMENT mounts, cleans up, then mounts again to surface effects that
  // are not idempotent. Without resetting it here, the FIRST mount's cleanup would leave this false
  // forever, and every async callback below would silently no-op on the real, second mount -
  // production is unaffected (StrictMode's double-invoke is dev-only), but local `npm run dev`
  // testing would look completely stuck for a reason that has nothing to do with the PIN flow itself.
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  async function run() {
    if (runningRef.current) return
    runningRef.current = true
    setError('')
    const address = localStorage.getItem('ez_wallet_addr')
    try {
      await completeSetup(address, {
        onHashSet: () => localStorage.setItem('ez_pin_is_set', '1'),
      })
      if (!mountedRef.current) return
      const passkeyOn = !!user?.mfaMethods?.includes('passkey')
      navigate(passkeyOn ? 'HomeSend' : 'ProtectWallet')
    } catch (e) {
      if (!mountedRef.current) return
      runningRef.current = false
      if (e?.message === 'cancelled') { run(); return }   // the sheet's own ✕ - reopen, no message needed
      // A real failure - stop and show it, rather than retrying blind.
      setError(pinErrorMessage(e) || 'Something went wrong. Please try again.')
    }
  }

  // Open the sheet the instant this screen mounts - see the file-level comment for why there is no
  // button gating this first attempt.
  useEffect(() => { run() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Identical sequence to MenuScreen's "Sign out" (see the comment there): both clearLoginData() and
  // logout() are needed, neither is enough on its own.
  async function handleSignOut() {
    clearLoginData()
    ;['ez_notifs', 'ez_last_recv_ts'].forEach(k => localStorage.removeItem(k))
    try { await logout() } catch {}
    window.location.reload()
  }

  return (
    <div className="screen">
      {/* Exactly Login.jsx's own backdrop - see that file for the coordinate derivation. Reused
          verbatim rather than re-measured, because it is the SAME frame family (1/2 for login, 3/4/5
          for the PIN popup that sits over an identical background). */}
      <div className="row-1-5 col" style={{ alignItems: 'center', paddingTop: '21.43dvh', gap: '2.5dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: 'var(--col6)', maxWidth: 'min(50vw, calc(var(--screen-max) / 2))' }} />
      </div>

      {/* Only visible when a REAL error stopped the flow (see the file-level comment on why this
          does not auto-retry) - otherwise the sheet itself is the whole screen and this stays empty. */}
      {error && (
        <div className="row-7-8 col" style={{ alignItems: 'center', justifyContent: 'center', gap: '2dvh', padding: '0 8px' }}>
          <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>
          <button className="btn btn-primary" style={{ width: 'min(75vw, calc(var(--screen-max) * 0.75))' }} onClick={run}>
            Try again
          </button>
        </div>
      )}

      {/* The one real escape, for a genuinely broken signing flow - not a way to skip the PIN
          itself (there is no "Not now" here, unlike ProtectWallet). Placed low and quiet, matching
          how little attention it is meant to draw next to the sheet that owns this screen. */}
      <div className="row-9 center">
        <button type="button" onClick={handleSignOut} style={{
          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
          color: 'var(--color-muted)', fontSize: 'var(--fs-item)', textDecoration: 'underline',
        }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
