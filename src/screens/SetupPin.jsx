import { useEffect, useRef } from 'react'
import logoLong from '../../design/logo.svg'
import { useNav } from '../nav'
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
// ⚠️ ERRORS BELONG INSIDE THE SHEET, NOT ON THIS SCREEN (corrected 2026-09-07).
// An earlier version drew its OWN error block here - red text, a "Try again" button, a "Sign out"
// link - none of which exist in any frame. Figma frame 5 already specifies exactly where a PIN
// error goes, in its own annotation: "If error, make it understandable and make it red, size 17" -
// i.e. the red line INSIDE the PIN popup, which PinGateHost already renders and `requestPin({ mode,
// error })` already feeds. So a failure re-opens the SAME sheet carrying the message, and nothing
// new is drawn on the backdrop at all.
// This is not the silent retry loop that froze the tab on 09-05 either: the sheet waits for six
// fresh taps before it can try again, so a human gates every attempt.
export default function SetupPin() {
  const { navigate } = useNav()
  const { completeSetup } = useCompletePinSetup()

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

  // `error` is what the sheet shows on its own red line (Figma frame 5) when this is a retry after a
  // failure - empty on the first, clean attempt.
  async function run(error = '') {
    if (runningRef.current) return
    runningRef.current = true
    const address = localStorage.getItem('ez_wallet_addr')
    try {
      await completeSetup(address, {
        error,
        onHashSet: () => localStorage.setItem('ez_pin_is_set', '1'),
      })
      if (!mountedRef.current) return
      // ⚠️ ALWAYS HOME - there is no passkey SCREEN to send anyone to any more (2026-09-07, user
      // decision "1.b"). The optional passkey offer is Privy's own popup, fired from App.jsx once the
      // user is actually on Home. Deciding it here as well would mean two places choosing when that
      // popup appears.
      navigate('HomeSend')
    } catch (e) {
      if (!mountedRef.current) return
      runningRef.current = false
      // Cancel (the sheet's ✕) reopens it clean; a real failure reopens it carrying the reason on
      // frame 5's own red line. Either way nothing is drawn outside the sheet.
      run(e?.message === 'cancelled' ? '' : (pinErrorMessage(e) || 'Something went wrong. Please try again.'))
    }
  }

  // Open the sheet the instant this screen mounts - see the file-level comment for why there is no
  // button gating this first attempt.
  useEffect(() => { run() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      {/* Exactly Login.jsx's own backdrop - see that file for the coordinate derivation. Reused
          verbatim rather than re-measured, because it is the SAME frame family (1/2 for login, 3/4/5
          for the PIN popup that sits over an identical background). Nothing else is on this screen:
          the sheet is the whole interface, errors included. */}
      <div className="row-1-5 col" style={{ alignItems: 'center', paddingTop: '21.43dvh', gap: '2.5dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: 'var(--col6)', maxWidth: 'min(50vw, calc(var(--screen-max) / 2))' }} />
      </div>
    </div>
  )
}
