import { useState } from 'react'
import hintIcon from '../../icon/hint.png'
import { useNav } from '../nav'
import { createSession, getSDK, initializeWallet, executeChallenge, getWalletAddress } from '../circle'

const DOMAINS = ['@gmail.com', '@yahoo.com', '@icloud.com']

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

  async function handleSubmit() {
    if (!valid || loading) return
    setLoading(true); setError('')
    try {
      localStorage.removeItem('ez_wallet_addr')
      localStorage.removeItem('ez_wallet_id')
      const { userToken, encryptionKey } = await createSession(email.trim())
      localStorage.setItem('ez_user_token', userToken)
      localStorage.setItem('ez_encryption_key', encryptionKey)
      localStorage.setItem('ez_email', email.trim())
      const sdk = getSDK()
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
      navigate('HomeSend')
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Đăng nhập với Email
      </div>

      <div className="row-3" style={{ position: 'relative' }}>
        {/* Input khóa vị trí giữa row-5 */}
        <input
          type="email"
          className="address-input"
          placeholder="email@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 52, fontSize: 'var(--fs-body)' }}
        />

        {/* Suggestions hiện absolute bên dưới input — không đẩy input */}
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setEmail(s); setError('') }}
                style={{
                  textAlign: 'left', padding: '6px 12px',
                  border: 'none', borderRadius: 10,
                  background: 'var(--color-gray)', cursor: 'pointer',
                  fontSize: 'var(--fs-label)', fontFamily: 'inherit', color: 'var(--color-black)',
                  opacity: 0.8, alignSelf: 'flex-start',
                }}>
                <img src={hintIcon} alt='' style={{ width: 15, height: 15, marginRight: 6, verticalAlign: 'middle' }} />{s}
              </button>
            ))}
          </div>
        )}

        {/* Domain suggestions khi gõ phần trước @ */}
        {showDomains && suggestions.length === 0 && (
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', gap: 8, marginTop: 8 }}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => applyDomain(d)}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 10,
                  background: 'var(--color-gray)', cursor: 'pointer',
                  fontSize: 'var(--fs-label)', fontFamily: 'inherit', color: 'var(--color-black)', opacity: 0.8,
                }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {error && <span style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, marginTop: 8, fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Login')}>Quay lại</button>
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? 'Đang xử lý...' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  )
}
