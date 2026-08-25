import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getSDK, executeChallenge, resetPinChallenge, refreshSession, circleErrorMessage } from '../circle'

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  // ⚠️ pinErr is a DEDICATED FLAG, do not go back to sniffing the start of the string (`/^(Error|...)/`)
  // like the old version did: wording changes, and sniffing wording breaks the colouring (near-miss bug 08-04).
  const [pinStatus, setPinStatus] = useState('')
  const [pinErr, setPinErr] = useState(false)
  function showStatus(msg, isErr = false) { setPinStatus(msg); setPinErr(isErr) }

  async function handleResetPin() {
    // Google users (SSO, no ez_email): Circle blocks PUT /user/pin at the platform layer
    // (403 code 3 even with a fresh token + an existing PIN - verified session 10). Skip the call, save a round trip.
    if (!localStorage.getItem('ez_email')) {
      showStatus('Not available for Google accounts', true)
      setTimeout(() => showStatus(''), 3000)
      return
    }
    showStatus('Preparing...')
    try {
      // Refresh the userToken first - avoids "userToken had expired" (Circle tokens last ~1h).
      const { userToken, encryptionKey } = await refreshSession()
      const challengeId = await resetPinChallenge(userToken)
      showStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      showStatus('PIN changed!')
      setTimeout(() => showStatus(''), 2000)
    } catch (e) {
      showStatus(circleErrorMessage(e), true)
    }
  }

  const email = localStorage.getItem('ez_email') || localStorage.getItem('ez_google_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // VALUE raised to fs-item 17 (user 07-17f: "content feels a bit small" - was fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // (PIN-change status: an ERROR must be RED to stand out - user 07-17f. The pinErr flag is declared above.)

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Security
      </div>

      {/* SHARED GREY BOX rows 2-4 (Currency was split into its own screen 08-04 - see Currency.jsx);
          no grey separator lines inside the box (old rule kept). Change PIN still uses the RIGHT CHEVRON right2
          (user decision: it is a row that goes somewhere, not a dropdown). */}
      <div style={{ gridRow: '2 / 5', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <div className="menu-item">
          <span style={LABEL}>Login email</span>
          <span style={VALUE}>{email}</span>
        </div>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>Wallet address</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? 'Copied' : shortAddr}</span>
          <Icon name="copy" size="var(--is-item)" color="var(--color-brand)" />
        </button>
        <button className="menu-item" onClick={handleResetPin}>
          <span style={LABEL}>Change PIN</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: pinErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
