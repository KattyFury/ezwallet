import logoLong from '../../design/logo.svg'
import Icon from '../components/Icon'
import { useNav } from '../nav'

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
// What is left is what this screen was always FOR: the logo, the promise, and one button.
export default function Login() {
  const { navigate } = useNav()

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

      {/* The Sign in with Email button - on the row 9-10 boundary (the bottom edge of rows 9/11, like every other screen) */}
      <div style={{ gridRow: '9 / 11', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2dvh' }}>
        <button className="btn btn-primary"
          style={{ width: '80%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
          onClick={() => navigate('EnterEmail')}>
          <Icon name="mail" size="var(--is-md-lg)" />
          <span style={{ whiteSpace: 'nowrap' }}>Sign in with Email</span>
        </button>
      </div>
    </div>
  )
}
