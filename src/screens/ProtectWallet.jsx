import { useEffect } from 'react'
import { usePrivy, useMfaEnrollment } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'

// ══ OFFERING THE LOCK AT SIGN-UP (2026-08-30) ══
// Under Circle, creating a PIN was PART of signing up - you could not end up with an unguarded
// wallet by accident. A fingerprint replaced that PIN (see Security.jsx for why a rebuilt PIN could
// not have been real), and a setting buried in a menu would mean almost nobody ever turns it on:
// the default state of a wallet holding real money would be "anyone holding this phone can send it".
// So it is offered here, once, in the flow - App.jsx routes through this screen after sign-in when
// the lock is off.
//
// It is an OFFER, not a wall. A laptop with no Windows Hello, a borrowed phone, someone who just
// wants to look around first - none of those are reasons to lock a person out of their own money at
// the door. "Not now" is one tap and Security turns it on later.
export default function ProtectWallet() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { showMfaEnrollmentModal } = useMfaEnrollment()

  const passkeyOn = (user?.mfaMethods || []).includes('passkey')

  // ⚠️ showMfaEnrollmentModal() RETURNS VOID - it opens Privy's modal and tells us nothing about how
  // it ended (there is no promise to await, and no callback). So success is detected by WATCHING the
  // user: `mfaMethods` gains 'passkey' once Privy has enrolled it. Do not go looking for a return
  // value to await here; there is none.
  useEffect(() => { if (passkeyOn) navigate('HomeSend') }, [passkeyOn])

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Protect your money
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'center', gap: '3dvh', padding: '0 8px' }}>
        <Icon name="shield" size="min(28vw, 120px)" color="var(--color-brand)" />
        {/* Says what it DOES, in the terms the user already understands - their own device, their own
            money. No "passkey", no "two-factor", no "MFA": those words explain nothing to the person
            this app was built for, and a word nobody understands is a word that gets skipped.
            "or screen lock" is there because on a laptop this is Windows Hello or a PIN, not a face. */}
        <span style={{ width: '85%', fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
          Use your fingerprint, face or screen lock to approve sending money, so nobody else can send
          it from your device.
        </span>
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Not now</button>
        <button className="btn btn-primary" onClick={() => showMfaEnrollmentModal()}>Turn on</button>
      </div>
    </div>
  )
}
