import { useState } from 'react'
import { usePrivy, useWallets, useExportWallet, useMfaEnrollment, useAuthorizationSignature, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { privyErrorMessage, PRIVY_APP_ID } from '../privy'
import { useSetupPin, pinErrorMessage } from '../pinSigner'

export default function Security() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { wallets } = useWallets()
  const { exportWallet } = useExportWallet()
  const { showMfaEnrollmentModal } = useMfaEnrollment()
  const { generateAuthorizationSignature } = useAuthorizationSignature()

  // ⚠️ TWO OF THE ROWS BELOW ONLY EXIST FOR A PRIVY-MADE WALLET, and hiding them is honesty rather
  // than tidiness. Someone who signed in with MetaMask owns their key already - Privy cannot export
  // what it never held, and Privy's MFA cannot gate a signature MetaMask makes behind its own
  // password. Both rows would be buttons that either error or, worse, imply a protection that is not
  // there. MetaMask users manage all of this in MetaMask, where it actually lives.
  const isEmbedded = !!getEmbeddedConnectedWallet(wallets)
  const [copied, setCopied] = useState(false)
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

  // ⚠️ PRIVY'S OWN MODAL, not a hand-built flow (user decision 2026-08-30). It also handles turning
  // the lock OFF and adding other methods, so this one call covers the whole screen's worth of
  // settings. The earlier attempt called `initEnrollmentWithPasskey()` on its own and NOTHING OPENED:
  // enrollment is two steps in the headless API - init, then submitEnrollmentWithPasskey with the
  // credential ids - and half a flow silently does nothing at all. Do not go back to that.
  //
  // It returns void and reports nothing, so the On/Off state below is read from `user.mfaMethods`,
  // which updates on its own once Privy has finished.
  function openLockSettings() {
    setLockStatus('')
    try {
      showMfaEnrollmentModal()
    } catch (e) {
      setLockStatus(privyErrorMessage(e) || 'Could not open')
      setTimeout(() => setLockStatus(''), 4000)
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

  // ══ SET/CHANGE PIN (2026-09-04) - the row comes back, pointing at the REAL thing ══
  // Not the Circle-era row this replaces (removed 08-30 - it called a Circle session that no longer
  // exists). This PIN is real: dual-approval via Privy's key quorum (see pinSigner.js/pin.js) - a
  // server-held authorization key must co-sign alongside this wallet's own key, so a PIN entered here
  // actually gates money leaving the wallet, unlike the old string-compare one.
  // `ez_pin_is_set` is OUR OWN local flag, not something Privy tracks - it only affects the row's
  // label ("Set" vs "Change"), never a security decision (the server is the only source of truth for
  // whether a PIN hash actually exists).
  const { setupPin } = useSetupPin()
  const [pinStatus, setPinStatus] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [pinIsSet, setPinIsSet] = useState(() => localStorage.getItem('ez_pin_is_set') === '1')
  async function handleSetupPin() {
    setPinStatus('Verifying...'); setPinErr(false)
    try {
      const address = localStorage.getItem('ez_wallet_addr')
      await setupPin(address)
      localStorage.setItem('ez_pin_is_set', '1')
      setPinIsSet(true)
      setPinStatus('PIN set'); setTimeout(() => setPinStatus(''), 2500)
    } catch (e) {
      const msg = pinErrorMessage(e)
      if (!msg) { setPinStatus(''); return }   // the user closed a prompt themselves → stay silent
      setPinStatus(msg); setPinErr(true)
      setTimeout(() => { setPinStatus(''); setPinErr(false) }, 4000)
    }
  }

  // ══ TEMPORARY, ONE-TIME BOOTSTRAP (2026-09-04) - remove this whole block once clicked once ══
  // Assigns this wallet's owner to the PIN quorum. Cannot be done from the Privy dashboard (no such
  // control exists there, confirmed by checking) or from the server alone (Privy rejected a PATCH
  // signed only with the server's authorization key - the wallet's CURRENT implicit owner is the
  // user, and only the user's own live signature satisfies "signatures from the wallet's owner are
  // required by default"). This is the only place that signature can come from.
  const [ownerStatus, setOwnerStatus] = useState('')
  async function handleAssignOwner() {
    setOwnerStatus('Signing...')
    try {
      const requestPayload = {
        version: 1,
        method: 'PATCH',
        url: 'https://api.privy.io/v1/wallets/uihroi7x6jthz2f7bsvcdyzh',
        headers: { 'privy-app-id': PRIVY_APP_ID },
        body: { owner_id: 'p1loakdgs7wvd40loha4pf70' },
      }
      const { signature } = await generateAuthorizationSignature(requestPayload)
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign-owner', requestPayload, userSignature: signature }),
      })
      const d = await res.json()
      setOwnerStatus(res.ok ? 'Done! ' + JSON.stringify(d.data) : 'Failed: ' + JSON.stringify(d))
    } catch (e) {
      setOwnerStatus('Error: ' + (pinErrorMessage(e) || e.message))
    }
  }

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
      {/* The box SHRINKS to fit: 4 rows for a Privy wallet, 2 for a MetaMask one. A fixed height with
          space-evenly would spread two rows over four rows' worth of grey and read as a rendering bug. */}
      <div style={{ gridRow: isEmbedded ? '2 / 7' : '2 / 4', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
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
        {isEmbedded && (
          <button className="menu-item" onClick={openLockSettings}>
            <span style={LABEL}>Fingerprint or Face ID</span>
            {lockStatus
              ? <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-error)' }}>{lockStatus}</span>
              : <span style={{ ...VALUE, color: passkeyOn ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                  {passkeyOn ? 'On' : 'Off'}
                </span>}
          </button>
        )}
        {isEmbedded && (
          <button className="menu-item" onClick={handleSetupPin}>
            <span style={LABEL}>{pinIsSet ? 'Change PIN' : 'Set up PIN'}</span>
            {pinStatus
              ? <span style={{ fontSize: 'var(--fs-item)', color: pinErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{pinStatus}</span>
              : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
          </button>
        )}
        {isEmbedded && (
          <button className="menu-item" onClick={handleExportKey}>
            <span style={LABEL}>Export private key</span>
            {keyStatus
              ? <span style={{ fontSize: 'var(--fs-item)', color: keyErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{keyStatus}</span>
              : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
          </button>
        )}
      </div>

      {/* Says WHAT THE KEY IS FOR in the one place the user is looking at it, in the words this app
          uses elsewhere ("your money", not "your funds"). Sitting under the box rather than inside it
          keeps the rows evenly spaced, which is the whole point of that space-evenly box. */}
      <div className={isEmbedded ? 'row-7' : 'row-4'} style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.4 }}>
          {!isEmbedded
            ? 'You signed in with your own wallet, so your key and your security settings stay in that wallet - manage them there.'
            : passkeyOn
              ? 'Your fingerprint is asked for before any money leaves this wallet. Your private key opens this wallet in any other crypto app - never share it.'
              : 'Turn on Fingerprint or Face ID so nobody else can send money from this wallet. Your private key opens this wallet in any other crypto app - never share it.'}
        </span>
      </div>

      {/* TEMPORARY - remove this whole row once clicked once successfully. Deliberately ugly/unstyled
          so nobody mistakes it for a real feature. */}
      {isEmbedded && (
        <div className="row-9" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={handleAssignOwner} style={{ background: '#ffe27a', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
            🔧 ONE-TIME: assign wallet owner to PIN quorum
          </button>
          {ownerStatus && <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{ownerStatus}</span>}
        </div>
      )}

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
