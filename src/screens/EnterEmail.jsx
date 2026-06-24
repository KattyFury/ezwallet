import { useState } from 'react';
import { useNav } from '../nav';
import { createSession, getSDK, initializeWallet, executeChallenge } from '../circle';

const DOMAINS = ['@gmail.com', '@yahoo.com', '@outlook.com'];

export default function EnterEmail() {
  const { navigate } = useNav();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showDomains = email.length > 0 && !email.includes('@');

  function applyDomain(domain) {
    setEmail(e => e + domain);
    setError('');
  }

  async function handleSubmit() {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      const { userToken, encryptionKey } = await createSession(email.trim());
      localStorage.setItem('ez_user_token', userToken);
      localStorage.setItem('ez_encryption_key', encryptionKey);
      localStorage.setItem('ez_email', email.trim());

      const sdk = getSDK();
      const walletData = await initializeWallet(userToken);
      const challengeId = walletData?.data?.challengeId;
      if (challengeId) await executeChallenge(sdk, userToken, encryptionKey, challengeId);
      navigate('HomeSend');
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>Đăng nhập</span>
      </div>

      <div className="row-5 col" style={{ justifyContent: 'center', gap: 10 }}>
        <input
          type="email"
          className="address-input"
          placeholder="example@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{ height: 48, fontSize: 'var(--fs-body)' }}
        />
        {showDomains && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => applyDomain(d)}
                className="btn btn-secondary"
                style={{ height: 32, fontSize: 'var(--fs-label)', padding: '0 10px', flex: 'none' }}>
                {d}
              </button>
            ))}
          </div>
        )}
        {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
      </div>

      <div className="row-9 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Login')}>Quay lại</button>
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? 'Đang xử lý...' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  );
}
