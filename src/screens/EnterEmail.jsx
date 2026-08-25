import { useState } from 'react'
import { useNav } from '../nav'
import { createSession, createEmailToken, getSDK, initializeWallet, executeChallenge, getWalletAddress, circleErrorMessage } from '../circle'

const DOMAINS = ['@gmail.com', '@yahoo.com', '@icloud.com']
const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'
// ✅ Email OTP: signing in requires the CODE mailed to you → only the mailbox owner gets in (closing the "anyone who
// types your email is in" hole). Needs SMTP configured in Circle Console (done 2026-07-05). Flag off = back to the old
// direct-email flow (PIN, NO email verification) if OTP has problems.
// TESTED (2026-07-05): OTP users sign with the Confirmation UI and have NO PIN → losing the guard against family
// members + a "Contract Interaction" screen that baffles older users. → TURNED OFF, back to Email+PIN. Re-enable when
// Circle lets social/OTP use a PIN (or the confirm UI can be customised properly). The OTP code stays, only this flag flips.
const EMAIL_OTP_ENABLED = false

function getEmailHistory() {
  try { return JSON.parse(localStorage.getItem('ez_email_history') || '[]') } catch { return [] }
}

function saveEmailHistory(email) {
  const hist = getEmailHistory().filter(e => e !== email)
  hist.unshift(email)
  localStorage.setItem('ez_email_history', JSON.stringify(hist.slice(0, 5)))
}

export default function EnterEmail() {
  const { navigate } = useNav()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const showDomains = email.length > 0 && !email.includes('@')
  const history = getEmailHistory()
  const suggestions = email.length === 0
    ? history
    : history.filter(e => e.toLowerCase().startsWith(email.toLowerCase()) && e !== email)

  function applyDomain(d) { setEmail(e => e + d); setError('') }

  // Once a userToken exists (from OTP): create the wallet (if missing) → challenge (PIN or Approve, Circle's choice) →
  // fetch the address → into Home. OTP users refresh their token with refreshToken (like Google), and do NOT set ez_email.
  async function finishOtpLogin(result, emailStr, deviceId) {
    const { userToken, encryptionKey, refreshToken } = result
    localStorage.setItem('ez_user_token', userToken)
    localStorage.setItem('ez_encryption_key', encryptionKey)
    if (refreshToken) localStorage.setItem('ez_refresh_token', refreshToken)
    localStorage.setItem('ez_google_deviceId', deviceId)   // device fingerprint - used by refreshSocial
    localStorage.setItem('ez_google_email', emailStr)      // shown as "Login email"
    localStorage.setItem('ez_login_method', 'email')
    localStorage.removeItem('ez_email')                    // avoid the PIN-createSession branch (wrong for OTP users)
    localStorage.removeItem('ez_wallet_addr'); localStorage.removeItem('ez_wallet_id')

    const walletData = await initializeWallet(userToken)
    const challengeId = walletData?.data?.challengeId
    if (challengeId) await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)

    let info = null
    for (let i = 0; i < 3 && !info?.address; i++) {
      info = await getWalletAddress(userToken)
      if (!info?.address) await new Promise(r => setTimeout(r, 2000))
    }
    if (info?.address) localStorage.setItem('ez_wallet_addr', info.address)
    if (info?.walletId) localStorage.setItem('ez_wallet_id', info.walletId)
    saveEmailHistory(emailStr)
    sessionStorage.setItem('ez_pin_ok', '1')   // OTP users have no PIN → skip the PIN gate
    navigate('HomeSend')
  }

  async function handleSubmit() {
    if (!valid || loading) return
    setLoading(true); setError('')

    if (EMAIL_OTP_ENABLED) {
      const em = email.trim()
      try {
        const sdk = await getSDK()
        const deviceId = await sdk.getDeviceId()
        const { otpToken, deviceToken, deviceEncryptionKey } = await createEmailToken(deviceId, em)
        // Set the config + callback, then open Circle's hosted OTP screen.
        sdk.updateConfigs(
          { appSettings: { appId: APP_ID }, loginConfigs: { deviceToken, deviceEncryptionKey, otpToken } },
          async (error, result) => {
            if (error) {
              if (error?.code === 155701) { setLoading(false); return }   // user cancelled → stay silent
              setError(circleErrorMessage(error)); setLoading(false); return
            }
            if (!result?.userToken) { setLoading(false); return }
            try { await finishOtpLogin(result, em, deviceId) }
            catch (e) { setError(circleErrorMessage(e)); setLoading(false) }
          }
        )
        sdk.verifyOtp()   // keep loading=true; the callback above will navigate or raise the error
      } catch (e) {
        setError(circleErrorMessage(e)); setLoading(false)
      }
      return
    }

    // ── Old flow (flag off): direct email + PIN, NO email verification ──
    try {
      localStorage.removeItem('ez_wallet_addr')
      localStorage.removeItem('ez_wallet_id')
      const { userToken, encryptionKey } = await createSession(email.trim())
      localStorage.setItem('ez_user_token', userToken)
      localStorage.setItem('ez_encryption_key', encryptionKey)
      localStorage.setItem('ez_email', email.trim())
      const sdk = await getSDK()
      const walletData = await initializeWallet(userToken)
      const challengeId = walletData?.data?.challengeId
      if (challengeId) await executeChallenge(sdk, userToken, encryptionKey, challengeId)

      const freshSession = await createSession(email.trim())
      const freshToken = freshSession.userToken
      localStorage.setItem('ez_user_token', freshToken)
      localStorage.setItem('ez_encryption_key', freshSession.encryptionKey)

      let walletInfo = null
      for (let i = 0; i < 3; i++) {
        walletInfo = await getWalletAddress(freshToken)
        if (walletInfo?.address) break
        await new Promise(r => setTimeout(r, 2000))
      }
      if (walletInfo?.address) localStorage.setItem('ez_wallet_addr', walletInfo.address)
      if (walletInfo?.walletId) localStorage.setItem('ez_wallet_id', walletInfo.walletId)

      saveEmailHistory(email.trim())
      // First time = the PIN was just CREATED (challengeId present) → already authenticated → straight in. Second time on (no challengeId) → the PIN gate.
      if (challengeId) { sessionStorage.setItem('ez_pin_ok', '1'); navigate('HomeSend') }
      else navigate('PinGate', { next: 'HomeSend' })
    } catch (e) {
      setError(circleErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

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
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
