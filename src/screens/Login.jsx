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
  const { login, authenticated } = usePrivy()

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
  // ⚠️ `authenticated` IS A GUARD, NOT DECORATION (added 2026-09-05).
  // Without it this effect also fired on the SUCCESSFUL sign-in: Privy closes its own modal the
  // moment login completes, `isOpen` flips false, and this reopened it. React flushes a CHILD's
  // effects before its parent's, so on the render where `authenticated` becomes true this ran before
  // App.jsx's navigation effect had swapped Login out - i.e. the modal was reliably reopened over a
  // user who had just got in, with no sign-in button left to escape through (it was deleted on
  // 09-04). Reopening a login modal in a loop is also precisely the shape of the 09-04 freeze.
  const { isOpen } = useModalStatus()
  const loginRef = useRef(login)
  loginRef.current = login
  useEffect(() => {
    if (!isOpen && !authenticated) loginRef.current()
  }, [isOpen, authenticated])

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

      {/* THE SIGN-IN BUTTON IS GONE (2026-09-04). It was the only thing in rows 9-11, and it had
          nothing left to do: the modal is already open on arrival and cannot be dismissed, so a button
          to open it could never be reached, let alone pressed. */}
    </div>
  )
}
