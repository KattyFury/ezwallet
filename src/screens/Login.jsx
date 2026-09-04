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
export default function Login() {
  const { login } = usePrivy()

  // OPEN IT WITHOUT BEING ASKED, AND DO NOT LET IT BE CLOSED (user decision 2026-09-04). Arriving at
  // a sign-in screen and having to press "sign in" before being allowed to sign in is a step carrying
  // no information, and there is nothing behind the modal to escape TO - so the X and a click on the
  // backdrop lead nowhere and must not work.
  //
  // Privy ships no flag for this: `LoginModalOptions` is only loginMethods / prefill / disableSignup /
  // walletChainType (types-Ck8tvlPZ.d.ts:2709). So the modal is REOPENED whenever it reports itself
  // closed, which covers every way out at once - the X, the backdrop, Escape - without reaching into
  // Privy's DOM to hide anything.
  //
  // ⚠️ `isOpen` IS THE ONLY DEPENDENCY, and `login` is deliberately NOT one. Privy hands back a fresh
  // function identity on renders, and an effect that calls `login()` and depends on `login` is the
  // render loop that froze this app on 08-30, in a new place. The ref holds the live one.
  const { isOpen } = useModalStatus()
  const loginRef = useRef(login)
  loginRef.current = login
  useEffect(() => {
    if (!isOpen) loginRef.current()
  }, [isOpen])

  return (
    <div className="screen">
      {/* Rows 1-5: logo + slogan, centred */}
      <div className="row-1-5 center col" style={{ gap: '3dvh' }}>
        {/* 50% OF THE SCREEN WIDTH (user decision 07-17). Do NOT use width:'50%' - that is 50% of the
            .row-1-5 frame, which is inset 20px each side, giving 175px = 44.9% of the screen. The frame/screen ratio also CHANGES by
            device, so no fixed % of the frame equals 50% of the screen. Anchor it to the screen directly:
            .screen = min(100vw, --screen-max) → half the screen = min(50vw, --screen-max / 2). */}
        <img src={logoLong} alt="ezwallet" style={{ width: 'min(50vw, calc(var(--screen-max) / 2))' }} />
        {/* EXACTLY as wide as the "Sign in with Email" button (user decision 07-17): the button = width 80% of the
            gridRow 9/11 frame, and this span = 80% of the .row-1-5 frame - both frames are grid cells in the SAME COLUMN
            of .screen, so they share a width → 80% matches 80%. No forced <br /> any more: the text wraps by itself
            to that width (longer/shorter wording and font sizes still break correctly). */}
        <span style={{ width: '80%', fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center' }}>
          {'Create a wallet with email, send & receive money easily'}
        </span>
      </div>

      {/* THE SIGN-IN BUTTON IS GONE (2026-09-04). It was the only thing in rows 9-11, and it had
          nothing left to do: the modal is already open on arrival and cannot be dismissed, so a button
          to open it could never be reached, let alone pressed. */}
    </div>
  )
}
