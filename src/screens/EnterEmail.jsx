import { useState, useEffect } from 'react'
import { usePrivy, useLoginWithEmail, useWallets, useMfaEnrollment, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { privyErrorMessage } from '../privy'

const DOMAINS = ['@gmail.com', '@yahoo.com', '@icloud.com']

// ══ WHY THIS SCREEN NOW HAS TWO STEPS (2026-08-30, MIGRATION-PRIVY.md) ══
// The Circle build signed you in from the EMAIL ALONE - typing an address minted a session, with no
// proof you owned the mailbox. The code for a real OTP flow existed but sat behind
// `EMAIL_OTP_ENABLED = false`, switched off in 07-05 because Circle's OTP users could not have a PIN
// (they got a "Contract Interaction" confirmation screen that baffled older users) - so the app
// traded the security hole for the friendlier screen.
//
// Privy removes the trade-off: its email login is ALWAYS a one-time code, and the code arriving in
// the inbox is what proves ownership - so the hole closes without costing anything, and the PIN is
// a separate thing we build ourselves in step 5. Hence: step 'email' → step 'code'.
export default function EnterEmail() {
  const { navigate } = useNav()
  const { user } = usePrivy()
  const { sendCode, loginWithCode } = useLoginWithEmail()
  const { initEnrollmentWithPasskey } = useMfaEnrollment()
  const { wallets } = useWallets()
  const passkeyOn = (user?.mfaMethods || []).includes('passkey')

  const [step, setStep] = useState('email')   // 'email' → 'code' → 'protect' → 'done'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingWallet, setCreatingWallet] = useState(false)
  const [error, setError] = useState('')

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const showDomains = email.length > 0 && !email.includes('@')
  const history = getEmailHistory()
  const suggestions = email.length === 0
    ? history
    : history.filter(e => e.toLowerCase().startsWith(email.toLowerCase()) && e !== email)

  function applyDomain(d) { setEmail(e => e + d); setError('') }

  // The code is signed in but the WALLET is created a beat later (Privy's
  // `embeddedWallets.ethereum.createOnLogin`, configured in src/privy.js). Going to HomeSend before
  // the address exists shows an empty wallet with no balance and no receive address, so hold here -
  // with a message saying why - until it appears. App.jsx writes it into `ez_wallet_addr` for the
  // rest of the app; this screen only waits for it.
  const embeddedWallet = getEmbeddedConnectedWallet(wallets)
  useEffect(() => {
    if (!creatingWallet || !embeddedWallet?.address) return
    saveEmailHistory(email.trim())
    sessionStorage.setItem('ez_pin_ok', '1')
    // Straight into the wallet if the lock is already on (signing in again on another device).
    // Otherwise offer it once, HERE, while the user is still in "setting things up" mode.
    setStep(passkeyOn ? 'done' : 'protect')
  }, [creatingWallet, embeddedWallet?.address])

  useEffect(() => { if (step === 'done') navigate('HomeSend') }, [step])

  // ══ OFFERING THE LOCK AT SIGN-UP (2026-08-30) ══
  // Under Circle, creating a PIN was PART of signing up - you could not end up with an unguarded
  // wallet by accident. Passkeys replaced that PIN (see Security.jsx), and a setting buried in a menu
  // would mean almost nobody ever turns it on: the default state of a wallet holding real money would
  // be "anyone holding this phone can send it". So it is offered right here, once, in the flow.
  //
  // It is an OFFER, not a wall. A phone with no fingerprint reader, a borrowed device, someone who
  // just wants to look around first - none of those are reasons to lock a person out of their own
  // money at the door. Skipping is one tap and Security turns it on later.
  async function handleProtect() {
    if (loading) return
    setLoading(true); setError('')
    try {
      await initEnrollmentWithPasskey()
      setStep('done')
    } catch (e) {
      // Cancelling the OS sheet is a normal answer to a question we asked, not a failure - let them
      // into their wallet rather than trapping them behind a prompt they just declined.
      const msg = privyErrorMessage(e)
      if (!msg) { setStep('done'); return }
      setError(msg)
      setLoading(false)
    }
  }

  async function handleSendCode() {
    if (!valid || loading) return
    setLoading(true); setError('')
    try {
      await sendCode({ email: email.trim() })
      setStep('code')
    } catch (e) {
      setError(privyErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (code.trim().length < 6 || loading) return
    setLoading(true); setError('')
    try {
      await loginWithCode({ code: code.trim() })
      // Do NOT navigate here: the wallet does not exist yet. The effect above takes over.
      setCreatingWallet(true)
    } catch (e) {
      setError(privyErrorMessage(e))
      setCode('')
      setLoading(false)
    }
  }

  // ── STEP 3: offer the lock (only reached once, straight after the wallet is created) ──
  if (step === 'protect' || step === 'done') {
    return (
      <div className="screen">
        <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
          Protect your money
        </div>

        <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'center', gap: '3dvh', padding: '0 8px' }}>
          <Icon name="shield" size="min(28vw, 120px)" color="var(--color-brand)" />
          {/* Says what it DOES, in the terms the user already understands - their own phone, their own
              money. No "passkey", no "two-factor", no "MFA": those words explain nothing to the person
              this app was built for, and a word nobody understands is a word that gets skipped. */}
          <span style={{ width: '85%', fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
            Use your fingerprint or face to approve sending money, so nobody else can send it from
            your phone.
          </span>
          {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
        </div>

        <div className="row-10 row10-dual">
          <button className="btn btn-secondary" disabled={loading} onClick={() => setStep('done')}>Not now</button>
          <button className="btn btn-primary" disabled={loading} onClick={handleProtect}>
            {loading ? 'Processing...' : 'Turn on'}
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 2: the code from the inbox ──
  if (step === 'code') {
    return (
      <div className="screen">
        <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
          Enter the code
        </div>

        <div className="row-3" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: 'calc(50% - 52px)', left: 0, right: 0, textAlign: 'center', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
            We sent a 6-digit code to<br />{email.trim()}
          </span>
          {/* inputMode/pattern → phones open the NUMBER pad, not the full keyboard. autoComplete
              one-time-code → iOS and Android offer the code from the SMS/email notification to fill in. */}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            className="address-input"
            placeholder="000000"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
            autoFocus
            style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 52, fontSize: 'var(--fs-title)', textAlign: 'center', letterSpacing: '0.3em' }}
          />
          {creatingWallet && (
            <span style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, marginTop: 8, textAlign: 'center', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              Creating your wallet...
            </span>
          )}
          {error && !creatingWallet && <span style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, marginTop: 8, fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
        </div>

        <div className="row-10 row10-dual">
          <button className="btn btn-secondary" disabled={creatingWallet}
            onClick={() => { setStep('email'); setCode(''); setError('') }}>Back</button>
          <button className="btn btn-primary" disabled={code.length < 6 || loading || creatingWallet} onClick={handleVerifyCode}>
            {(loading || creatingWallet) ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 1: the email address (unchanged from the Circle build apart from what the button does) ──
  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Sign in with Email
      </div>

      <div className="row-3" style={{ position: 'relative' }}>
        {/* The input is pinned to the middle of row-5 */}
        <input
          type="email"
          className="address-input"
          placeholder="email@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSendCode()}
          autoFocus
          style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 52, fontSize: 'var(--fs-md-lg)' }}
        />

        {/* Suggestions render absolutely below the input - they do not push it */}
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setEmail(s); setError('') }}
                style={{
                  // THE APP-WIDE HINT STANDARD (user decision 07-22d) = a chip with a BLUE BORDER + BLUE TEXT on white
                  // (matching the amount suggestion chips on Swap). Tappable.
                  textAlign: 'left', padding: '6px 12px',
                  border: '1.5px solid var(--color-brand)', borderRadius: 999,
                  background: 'var(--color-white)', cursor: 'pointer',
                  fontSize: 'var(--fs-item)', fontFamily: 'inherit', color: 'var(--color-brand)',
                  fontWeight: 'var(--fw-medium)', alignSelf: 'flex-start', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Domain suggestions while typing the part before the @ */}
        {showDomains && suggestions.length === 0 && (
          // flexWrap: 3 chips @gmail/@yahoo/@icloud at font size 21 do NOT fit on one row (350px) →
          // they used to overflow past the right edge. Let them wrap instead of clipping/overflowing.
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => applyDomain(d)}
                style={{
                  // The standard HINT chip = blue border + blue text (matching the email suggestions above + the Swap chips)
                  padding: '6px 12px', border: '1.5px solid var(--color-brand)', borderRadius: 999,
                  background: 'var(--color-white)', cursor: 'pointer',
                  fontSize: 'var(--fs-item)', fontFamily: 'inherit', color: 'var(--color-brand)',
                  fontWeight: 'var(--fw-medium)',
                }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {error && <span style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, marginTop: 8, fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Login')}>Back</button>
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSendCode}>
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

function getEmailHistory() {
  try { return JSON.parse(localStorage.getItem('ez_email_history') || '[]') } catch { return [] }
}

function saveEmailHistory(email) {
  const hist = getEmailHistory().filter(e => e !== email)
  hist.unshift(email)
  localStorage.setItem('ez_email_history', JSON.stringify(hist.slice(0, 5)))
}
