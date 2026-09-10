import { useState } from 'react'
import { useNav } from '../nav'
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

  // 18px semibold black (was fs-body/fw-medium) - RE-VERIFIED 2026-09-10 against a fresh design-context
  // pull (node 15:190, the Figma file's own name for this frame - misspelled "Secutiry", HANDOFF's old
  // node id 1:275 no longer exists). Value colour is --color-muted-2 (#667085), not --color-muted
  // (#94A3B8) - same "Label:"-line token as Confirm/Receipt's card rows, not the nav-inactive tone.
  const LABEL = { flex: 1, fontSize: 18, fontWeight: 'var(--fw-semibold)' }
  const VALUE = { fontSize: 16, fontWeight: 'var(--fw-semibold)', color: 'var(--color-muted-2)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // The "Change PIN" pill button - white, fully rounded, glow shadow (the SAME chip look Currency.jsx's
  // currency picker uses, but a plain button here, no caret - Figma draws no dropdown on this one).
  const PIN_CHIP = { border: 'none', background: 'var(--color-white)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)', borderRadius: 999, height: 42, padding: '0 18px', fontSize: 18, fontWeight: 'var(--fw-semibold)', cursor: 'pointer', flexShrink: 0 }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Security
      </div>

      {/* Card - node 15:196: rows 2-8 (340x586, radius 16 - was 20/rows 2-4), the SAME full-height card
          template every Menu sub-screen shares (About.jsx already had this right; Security/Currency did
          not). Content is NOT spread with justify-content:space-evenly like About's 7 rows - Figma packs
          Email/Wallet address/PIN into rows 2-4 only (86/172/258, each its own 70px row + 16px gap) and
          leaves the rest of the tall card blank, so the rows flow from the top instead. */}
      <div style={{ gridRow: '2 / 9', position: 'relative', minWidth: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', borderRadius: 16 }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="menu-item" style={{ height: 70, padding: '0 8px' }}>
            <span style={LABEL}>Email</span>
            <span style={VALUE}>{email}</span>
          </div>
          {/* Tap-to-copy kept (real functionality, predates this Figma pass) - the copy ICON is dropped
              because the fresh pull draws none on this row, only the plain value text. */}
          <button className="menu-item" style={{ height: 70, padding: '0 8px' }} onClick={copyAddr}>
            <span style={LABEL}>Wallet address</span>
            <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted-2)' }}>{copied ? 'Copied' : shortAddr}</span>
          </button>
          <div className="menu-item" style={{ height: 70, padding: '0 8px' }}>
            <span style={LABEL}>PIN</span>
            <button style={{ ...PIN_CHIP, color: pinStatus ? (pinErr ? 'var(--color-error)' : 'var(--color-primary)') : 'var(--color-black)' }} disabled={!!pinStatus} onClick={handleResetPin}>
              {pinStatus || 'Change PIN'}
            </button>
          </div>
        </div>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
