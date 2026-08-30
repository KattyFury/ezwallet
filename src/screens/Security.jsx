import { useState } from 'react'
import { usePrivy, useExportWallet, useMfaEnrollment } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { privyErrorMessage } from '../privy'

export default function Security() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { exportWallet } = useExportWallet()
  const { initEnrollmentWithPasskey, unenrollWithPasskey } = useMfaEnrollment()
  const [copied, setCopied] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)
  const [lockStatus, setLockStatus] = useState('')

  // ══ THE LOCK ON THE MONEY (2026-08-30, user decision) ══
  // Under Circle this was a 6-digit PIN, and the PIN was real: it completed the MPC signature, so
  // without it nothing could be signed. That does not carry over - Privy holds the key in its own
  // secure hardware and gates signing on ITS session, so there is no local secret left for a PIN of
  // ours to lock. A PIN we built would either be a plain string comparison anyone could step around
  // with devtools, or would mean pulling the private key onto the device and encrypting it with six
  // digits - a million guesses, brute-forceable offline by whoever got hold of the file.
  //
  // A passkey is the honest replacement, and for the person this app is for it is also the KINDER
  // one: nothing to remember and nothing to type, just the fingerprint or face they already use to
  // unlock the phone. Privy checks it on its servers, so wrong attempts are rate limited there
  // rather than on a device an attacker is holding.
  const passkeyOn = (user?.mfaMethods || []).includes('passkey')

  async function toggleLock() {
    if (lockBusy) return
    setLockBusy(true); setLockStatus('')
    try {
      if (passkeyOn) {
        await unenrollWithPasskey()
        setLockStatus('Turned off')
      } else {
        // Opens the phone's own fingerprint/Face ID sheet. Privy finishes the enrollment itself once
        // the OS confirms - there is no code for us to submit afterwards.
        await initEnrollmentWithPasskey()
        setLockStatus('Turned on')
      }
      setTimeout(() => setLockStatus(''), 2500)
    } catch (e) {
      setLockStatus(privyErrorMessage(e) || 'Cancelled')
      setTimeout(() => setLockStatus(''), 4000)
    } finally {
      setLockBusy(false)
    }
  }
  // ⚠️ keyErr is a DEDICATED FLAG, do not go back to sniffing the start of the string (`/^(Error|...)/`)
  // like a much older version did: wording changes, and sniffing wording breaks the colouring (near-miss bug 08-04).
  const [keyStatus, setKeyStatus] = useState('')
  const [keyErr, setKeyErr] = useState(false)
  function showStatus(msg, isErr = false) { setKeyStatus(msg); setKeyErr(isErr) }

  // ══ EXPORT PRIVATE KEY (2026-08-30) - one of the three reasons for leaving Circle ══
  // Circle's User-Controlled Wallets are semi-custodial and never hand the key over, so this row
  // COULD NOT EXIST before. It is what turns "we promise you own your money" into something the user
  // can actually act on: they can walk away with this key and open the same wallet in MetaMask,
  // with or without our permission, whether or not this app still exists.
  //
  // The app never sees the key. Privy assembles it inside an iframe served from ITS OWN ORIGIN, so
  // neither our JavaScript nor Privy's own servers can read it - which is also why there is no
  // "show me the key" UI of ours to write here, and why we must NOT try to build one.
  async function handleExportKey() {
    showStatus('Opening...')
    try {
      const address = localStorage.getItem('ez_wallet_addr')
      // The promise resolves when the user CLOSES the modal, not when they copy anything - Privy
      // deliberately never tells us what happened in there. So there is no "Exported!" to report:
      // just clear the status and leave the screen as it was.
      await exportWallet(address ? { address } : undefined)
      showStatus('')
    } catch (e) {
      showStatus(privyErrorMessage(e), true)
      setTimeout(() => showStatus(''), 4000)
    }
  }

  // ⚠️ "Change PIN" USED TO BE THE THIRD ROW HERE and was removed on 2026-08-30, on purpose.
  // It called Circle (resetPinChallenge → executeChallenge), and with the move to Privy there is no
  // Circle session left for it to use, so the row could only ever show a red error. There is also no
  // PIN to change yet: step 5 of MIGRATION-PRIVY.md builds ours - a PIN that derives an encryption
  // key rather than being string-compared - and this row comes back then, pointing at that.
  // Leaving a dead button on the Security screen of a wallet is worse than leaving a gap.

  const email = localStorage.getItem('ez_google_email') || localStorage.getItem('ez_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // VALUE raised to fs-item 17 (user 07-17f: "content feels a bit small" - was fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // (Export status: an ERROR must be RED to stand out - user 07-17f. The keyErr flag is declared above.)

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Security
      </div>

      {/* SHARED GREY BOX rows 2-4 (Currency was split into its own screen 08-04 - see Currency.jsx);
          no grey separator lines inside the box (old rule kept). Export uses the RIGHT CHEVRON right2
          (the same rule Change PIN followed: it is a row that goes somewhere, not a dropdown). */}
      <div style={{ gridRow: '2 / 6', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <div className="menu-item">
          <span style={LABEL}>Login email</span>
          <span style={VALUE}>{email}</span>
        </div>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>Wallet address</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? 'Copied' : shortAddr}</span>
          <Icon name="copy" size="var(--is-item)" color="var(--color-brand)" />
        </button>
        {/* Deliberately NOT called "passkey", "MFA" or "two-factor" - words that mean nothing to the
            person this app is for. It says what it does: your fingerprint guards your money. */}
        <button className="menu-item" onClick={toggleLock}>
          <span style={LABEL}>Fingerprint or Face ID</span>
          {lockStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-primary)' }}>{lockStatus}</span>
            : <span style={{ ...VALUE, color: passkeyOn ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                {lockBusy ? '…' : passkeyOn ? 'On' : 'Off'}
              </span>}
        </button>
        <button className="menu-item" onClick={handleExportKey}>
          <span style={LABEL}>Export private key</span>
          {keyStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: keyErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{keyStatus}</span>
            : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
        </button>
      </div>

      {/* Says WHAT THE KEY IS FOR in the one place the user is looking at it, in the words this app
          uses elsewhere ("your money", not "your funds"). Sitting under the box rather than inside it
          keeps the three rows evenly spaced, which is the whole point of that space-evenly box. */}
      <div className="row-6" style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.4 }}>
          {passkeyOn
            ? 'Your fingerprint is asked for before any money leaves this wallet. Your private key opens this wallet in any other crypto app - never share it.'
            : 'Turn on Fingerprint or Face ID so nobody else can send money from this wallet. Your private key opens this wallet in any other crypto app - never share it.'}
        </span>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
