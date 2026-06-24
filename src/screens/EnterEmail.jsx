import { useState } from 'react'
import { useNav } from '../nav'
import { createSession, getSDK, initializeWallet, executeChallenge } from '../circle'

const DOMAINS = ['@gmail.com', '@yahoo.com', '@outlook.com']

export default function EnterEmail() {
  const { navigate } = useNav()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const showDomains = email.length > 0 && !email.includes('@')

  function applyDomain(d) { setEmail(e => e + d); setError('') }

  async function handleSubmit() {
    if (!valid || loading) return
    setLoading(true); setError('')
    try {
      const { userToken, encryptionKey } = await createSession(email.trim())
      localStorage.setItem('ez_user_token', userToken)
      localStorage.setItem('ez_encryption_key', encryptionKey)
      localStorage.setItem('ez_email', email.trim())
      const sdk = getSDK()
      const walletData = await initializeWallet(userToken)
      const challengeId = walletData?.data?.challengeId
      if (challengeId) await executeChallenge(sdk, userToken, encryptionKey, challengeId)
      navigate('HomeSend')
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      {/* Row 1: title */}
      <div className="row-1 center" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Đăng nhập
      </div>

      {/* Row 5: input + domain suggestions */}
      <div className="row-5 col" style={{ justifyContent: 'center', gap: 10 }}>
        <input
          type="email"
          className="address-input"
          placeholder="email@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{ height: 52, fontSize: 'var(--fs-body)' }}
        />
        {showDomains && (
          <div style={{ display: 'flex', gap: 8 }}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => applyDomain(d)}
                style={{
                  flex: 1, height: 34, border: '1px solid var(--color-gray)', borderRadius: 8,
                  background: 'none', cursor: 'pointer', fontSize: 'var(--fs-label)', fontFamily: 'inherit',
                }}>
                {d}
              </button>
            ))}
          </div>
        )}
        {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
      </div>

      {/* Row 9: buttons */}
      <div className="row-9 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Login')}>Quay lại</button>
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? 'Đang xử lý...' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  )
}
