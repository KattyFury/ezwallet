import { useState } from 'react'
import logoLong from '../../design/logo.svg'
import { cancelPinReset } from '../pinSigner'

// ══ "NOT ME" - THE CANCEL LINK'S LANDING PAGE (2026-09-06, PIN-FLOW-SPEC.md §4.2) ══
// Reached from the email sent when someone (hopefully the account owner, but not necessarily)
// starts a no-passkey PIN reset. PUBLIC - no login required, works on a signed-out browser or a
// device that has never opened this app, because that is exactly the situation "it wasn't me" means.
// The token in the URL IS the credential (functions/api/pin.js's forgot-pin-cancel), same trust
// model as any email unsubscribe link.
//
// ⚠️ THIS PAGE DOES NOT CANCEL ON LOAD - it waits for an explicit tap. Some email clients and
// corporate link-scanners PREFETCH every link in an email for safety scanning, which would fire a
// bare GET-triggers-everything link before the real recipient ever saw it. Requiring a click here
// (which fires the actual POST) means a prefetch only ever loads this inert page, never cancels
// anything by itself.
export default function CancelPinReset() {
  const token = new URLSearchParams(window.location.search).get('token')
  const [status, setStatus] = useState(token ? '' : 'This link is missing its token.')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleCancel() {
    setBusy(true); setStatus('')
    try {
      await cancelPinReset(token)
      setDone(true)
    } catch (e) {
      setStatus(e.code === 'bad-or-expired-token'
        ? 'This link is invalid or was already used.'
        : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="row-1-5 col" style={{ alignItems: 'center', paddingTop: '21.43dvh', gap: '2.5dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: 'var(--col6)', maxWidth: 'min(50vw, calc(var(--screen-max) / 2))' }} />
      </div>

      <div className="row-7-8 col" style={{ alignItems: 'center', justifyContent: 'center', gap: '2dvh', padding: '0 8px' }}>
        {done ? (
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-primary)', textAlign: 'center' }}>
            The PIN reset has been cancelled. Your old PIN still works.
          </span>
        ) : (
          <>
            <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center' }}>
              A PIN reset was requested for your EZwallet account. If this was not you, cancel it below.
            </span>
            {status && <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-error)', textAlign: 'center' }}>{status}</span>}
            {token && (
              <button className="btn btn-primary" style={{ width: 'min(75vw, calc(var(--screen-max) * 0.75))' }} onClick={handleCancel} disabled={busy}>
                {busy ? 'Cancelling...' : 'Cancel this PIN reset'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
