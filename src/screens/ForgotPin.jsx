import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useNav } from '../nav'
import { requestPin } from '../pinGate'
import { useForgotPin, pinErrorMessage } from '../pinSigner'

// ══ FORGOT PIN (2026-09-06, PIN-FLOW-SPEC.md §4) ══
// A plain settings screen, not a Figma-specified one - the spec gives behaviour (two branches by
// whether a passkey exists), not a mockup, so this stays as close to Security's own existing rows
// as possible rather than inventing a new visual language.
// ⚠️ THE NEW PIN IS COLLECTED VIA THE EXISTING PIN SHEET (PinGateHost, mode 'set'), not a new field
// drawn here - same reasoning as SetupPin.jsx: the 6-digit entry UI already exists and is Figma-
// matched, this screen only orchestrates which server calls happen around it.
export default function ForgotPin() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { forgotPinWithPasskey, forgotPinStart } = useForgotPin()
  const [status, setStatus] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const passkeyOn = !!user?.mfaMethods?.includes('passkey')

  async function handleReset() {
    setBusy(true); setStatus(''); setErr(false)
    try {
      const newPin = await requestPin({ mode: 'set' })   // the sheet handles enter→confirm itself
      if (passkeyOn) {
        setStatus('Verifying your passkey...')
        const address = localStorage.getItem('ez_wallet_addr')
        await forgotPinWithPasskey(address, newPin)
        setStatus('Your PIN has been reset.')
      } else {
        setStatus('Starting...')
        const result = await forgotPinStart(newPin)
        setStatus(result.emailSent
          ? "We've emailed you to confirm. If you don't cancel it, your new PIN takes effect in 24 hours."
          : 'Your PIN reset is recorded. If not cancelled, it takes effect in 24 hours.')
      }
    } catch (e) {
      const msg = pinErrorMessage(e)
      if (!msg) { setStatus(''); return }   // the user closed the PIN sheet themselves - stay silent
      setStatus(msg); setErr(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Forgot PIN
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'center', gap: '3dvh', padding: '0 8px' }}>
        <span style={{ width: '85%', fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
          {passkeyOn
            ? "You'll verify with your fingerprint or face, then set a new PIN. It takes effect right away."
            : "You'll set a new PIN now. Since you don't have a fingerprint or face lock, it takes effect in 24 hours - we'll email you in case this wasn't you."}
        </span>
        <div style={{ minHeight: 'calc(var(--fs-item) * 1.3 * 2)', display: 'flex', alignItems: 'center' }}>
          {status && (
            <span style={{ fontSize: 'var(--fs-item)', color: err ? 'var(--color-error)' : 'var(--color-muted)', textAlign: 'center' }}>
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Security')}>Back</button>
        <button className="btn btn-primary" onClick={handleReset} disabled={busy}>Reset PIN</button>
      </div>
    </div>
  )
}
