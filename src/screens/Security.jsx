import { useState } from 'react'
import { useExportWallet } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { privyErrorMessage } from '../privy'

export default function Security() {
  const { navigate } = useNav()
  const { exportWallet } = useExportWallet()
  const [copied, setCopied] = useState(false)
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
      <div className="row-5" style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.4 }}>
          Your private key opens this wallet in any other crypto app. Anyone who has it can take your
          money, so never share it or type it into a website.
        </span>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
