import { useEffect, useRef } from 'react'
import logoLong from '../../design/logo.svg'
import { usePrivy, useModalStatus } from '@privy-io/react-auth'

// This screen used to carry ~150 lines of Circle plumbing: a lazy-loaded W3SSdk, a deviceId
// fingerprint, four cookies to survive the Google OAuth redirect, and an onLoginComplete callback
// that created the wallet and set the first PIN. All of it is gone with the move to Privy
// (2026-08-30, MIGRATION-PRIVY.md) - not merely disabled:
//
//   - The Google button had been dead since 2026-07-03 anyway. Circle blocked SSO users from
//     changing their PIN (PUT /user/pin → 403), so the plumbing was kept only in the hope Circle
//     would open it up. Privy makes that hope irrelevant: adding Google is one entry in
//     `loginMethods` in src/privy.js plus a switch in the Privy dashboard, with none of this code.
//   - The wallet-creation dance is handled by `embeddedWallets.ethereum.createOnLogin` in
//     src/privy.js, so no screen has to orchestrate it any more.
//
// SIGN-IN IS PRIVY'S OWN MODAL (user decision 2026-08-30, replacing the earlier plan to wrap the
// headless hooks in our own screens). `login()` opens it, Privy runs the email + one-time-code flow
// inside it, and App.jsx notices `authenticated` flip and moves on. The hand-built EnterEmail screen
// that used to do this - two steps, its own OTP field, its own error wording - is deleted: it was a
// second implementation of a flow Privy already ships, and every bug in it would have been ours.
//
// SINCE 2026-09-04 THE MODAL OPENS BY ITSELF, so this screen is mostly what stands BEHIND it - and
// Privy's overlay covers it and blurs it - measured, not assumed: `#privy-dialog-backdrop` comes back
// position:fixed at the full viewport. The logo and the promise stay here anyway, and Privy's box
// carries NO logo of its own (appearance.logo is '' in src/privy.js), so the mark is on screen once.
//
// ⚠️ CLOSING THE MODAL NO LONGER FORCE-REOPENS IT (2026-09-06, PIN-FLOW-SPEC.md §2.1, reversing the
// 09-04 decision above this comment). Closing it (X / backdrop / Escape) now reveals a placeholder -
// not a blank, meaningless wait. ⚠️ THE PLACEHOLDER IS FIGMA FRAME 1 ITSELF, VERBATIM - the user was
// explicit that this screen's own resting state (the logo + tagline already drawn below) already IS
// the placeholder the spec means; the first version of this fix invented NEW text and a NEW button
// on top of it, the exact mistake already made once today on SetupPin.jsx. There is no separate
// widget to add - the existing block becomes the tap target that reopens the modal.
export default function Login() {
  const { login, authenticated } = usePrivy()

  // OPEN IT WITHOUT BEING ASKED, THE FIRST TIME (user decision 2026-08-30/09-04, unchanged: arriving
  // here and having to press "sign in" before being allowed to sign in is a step carrying no
  // information). `autoOpenedRef` stops this firing again after the user closes it themselves -
  // that is the ONLY thing that changed 09-06: it used to reopen unconditionally on every close,
  // which is what "cannot be dismissed" meant before the spec settled on a placeholder instead.
  //
  // ⚠️ `isOpen` IS THE ONLY EFFECT DEPENDENCY, and `login` is deliberately NOT one. Privy hands back
  // a fresh function identity on renders, and an effect that calls `login()` and depends on `login`
  // is the render loop that froze this app on 08-30, in a new place. The ref holds the live one.
  // ⚠️ `authenticated` IS A GUARD, NOT DECORATION (added 2026-09-05, still needed here). Without it
  // this effect also fires on the SUCCESSFUL sign-in: Privy closes its own modal the moment login
  // completes, `isOpen` flips false, and this would reopen it. React flushes a CHILD's effects before
  // its parent's, so on the render where `authenticated` becomes true this runs before App.jsx's
  // navigation effect has swapped Login out - i.e. the modal would be reliably reopened over a user
  // who had just got in. Reopening a login modal in a loop is also precisely the shape of the 09-04
  // freeze.
  const { isOpen } = useModalStatus()
  const loginRef = useRef(login)
  loginRef.current = login
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!isOpen && !authenticated && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      loginRef.current()
    }
  }, [isOpen, authenticated])

  // ⚠️ A SEPARATE REF FROM `autoOpenedRef`, NOT THE SAME ONE. `autoOpenedRef` flips true the instant
  // `login()` is CALLED, before Privy has had any chance to actually open the modal - if the
  // placeholder below were gated on that same flag, it would flash for one render on every normal
  // arrival, in the gap between calling login() and Privy's `isOpen` becoming true. This one only
  // ever flips true on a render where `isOpen` has ALREADY been observed true, so the placeholder
  // can only appear after a REAL open-then-close, never during the ordinary opening animation.
  const everOpenedRef = useRef(false)
  useEffect(() => { if (isOpen) everOpenedRef.current = true }, [isOpen])
  const showPlaceholder = !isOpen && !authenticated && everOpenedRef.current

  return (
    <div className="screen">
      {/* ROWS 1-5, TOP-ALIGNED TO THE FIGMA COORDINATES (frames 1-2, DESIGN-GRID-390.md).
          Not centred any more: the frames put this block at a MEASURED height, and centring it in
          rows 1-5 floated it ~3.7dvh above where it is drawn. Converted with y/844 → dvh:
            logo    y=180.91 h=55.44  → top 21.43dvh, bottom 28.0dvh
            tagline y=257.69 h=46     → top 30.53dvh
          ⇒ paddingTop 21.43dvh and a 2.5dvh gap reproduce both exactly.
          The tagline sits UNDER Privy's card (which starts at row 4 = 30dvh), so it is only ever
          visible in frame 1's state - i.e. before the modal paints. That overlap is Figma's, not a
          mistake: frame 2 shows the card covering it. */}
      <div className="row-1-5 col" style={{ alignItems: 'center', paddingTop: '21.43dvh', gap: '2.5dvh' }}>
        {/* 6 OF THE 12 COLUMNS = 50% of the screen (Figma x=97.5 w=195 on a 390 board), which is
            exactly what this already was (user decision 07-17) - the new grid confirms it rather
            than changing it. Do NOT use width:'50%' - that is 50% of the .row-1-5 frame, which is
            inset 20px each side, giving 175px = 44.9% of the screen. The frame/screen ratio also
            CHANGES by device, so no fixed % of the frame equals 50% of the screen. Anchor it to the
            screen directly: .screen = min(100vw, --screen-max) → half = min(50vw, --screen-max/2). */}
        <img src={logoLong} alt="ezwallet" style={{ width: 'var(--col6)', maxWidth: 'min(50vw, calc(var(--screen-max) / 2))' }} />
        {/* 259.8 / 390 = 66.6% OF THE SCREEN (Figma frames 2-5). This used to be "80% of the frame,
            to match the Sign in with Email button" - that button was DELETED on 09-04, so the
            rationale for 80% went with it and the measured width now governs. Screen-anchored for
            the same reason as the logo above. */}
        <span style={{
          width: 'min(66.6vw, calc(var(--screen-max) * 0.666))',
          fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center',
        }}>
          {'Create a wallet with email, send & receive money easily'}
        </span>
      </div>

      {/* ══ THE PLACEHOLDER'S BUTTON - DRAWN BY THE USER, NOT INVENTED (2026-09-07) ══
          The Figma file now separates the two states this screen has, as two frames:
            `Splash`       - logo + tagline, NOTHING else = what stands behind Privy's modal
            `Login-signup` - the same, PLUS this button = what is left after the modal is closed
          which is exactly the `showPlaceholder` distinction this file already computed. Until today
          there was no button at all and the WHOLE screen was the tap target, because frame 1 as it
          stood on 09-06 drew none - the user has since drawn one, so the invisible whole-screen
          target is gone and this is the affordance.
          Measured off Rectangle 47: x=69 w=254 y=613.76 h=48.66 on a 390×844 board
            → 254/390 = 65.13% of the SCREEN (screen-anchored, same reasoning as the logo above)
            → 613.76/844 = 72.72dvh, and the height is .btn's own 5.765dvh, the app-wide pill height.
          ABSOLUTE, like every other element given exact frame coordinates: 72.72dvh is inside row 8
          but not aligned to it, and a fixed-height grid item would stretch the 10-row grid (the bug
          documented at length in HomeSend.jsx). */}
      {showPlaceholder && (
        <button
          className="btn btn-primary"
          onClick={() => loginRef.current()}
          style={{
            position: 'absolute', top: '72.72dvh', left: '50%', transform: 'translateX(-50%)',
            width: 'min(65.13vw, calc(var(--screen-max) * 0.6513))',
          }}
        >
          Log in or sign up
        </button>
      )}
    </div>
  )
}
