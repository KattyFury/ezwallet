import { useState } from 'react'
import { useNav } from '../nav'
import { getSDK, executeChallenge, resetPinChallenge } from '../circle'

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [pinStatus, setPinStatus] = useState('')

  async function handleResetPin() {
    setPinStatus('Đang chuẩn bị...')
    try {
      const userToken = localStorage.getItem('ez_user_token')
      const encryptionKey = localStorage.getItem('ez_encryption_key')
      const challengeId = await resetPinChallenge(userToken)
      setPinStatus('Nhập PIN...')
      await executeChallenge(getSDK(), userToken, encryptionKey, challengeId)
      setPinStatus('Đổi PIN thành công!')
      setTimeout(() => setPinStatus(''), 2000)
    } catch (e) {
      setPinStatus('Lỗi: ' + (e.message || 'thử lại'))
    }
  }

  const email = localStorage.getItem('ez_email') || '—'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '—'
  const shortAddr = walletAddr !== '—' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '—'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  function logout() {
    localStorage.clear(); window.location.reload()
  }

  const ROW = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: '1px solid var(--color-gray)',
  }
  const LABEL = { fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }
  const VALUE = { fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }

  return (
    <div className="screen">
      <div className="row-1 center full-bleed" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', borderBottom: '1px solid var(--color-gray)' }}>
        Bảo mật
      </div>

      <div className="row-2-9" style={{ justifyContent: 'flex-start' }}>
        {/* Email */}
        <div style={ROW}>
          <span style={LABEL}>Email đăng nhập</span>
          <span style={VALUE}>{email}</span>
        </div>

        {/* Wallet address */}
        <button onClick={copyAddr} style={{ ...ROW, width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid var(--color-gray)' }}>
          <span style={LABEL}>Địa chỉ ví</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-black)' }}>{copied ? '✓ Đã sao chép' : shortAddr}</span>
        </button>

        {/* Change PIN */}
        <button style={{ ...ROW, width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid var(--color-gray)' }}
          onClick={handleResetPin}>
          <span style={LABEL}>Đổi PIN</span>
          <span style={{ fontSize: 'var(--fs-label)', color: pinStatus ? 'var(--color-primary)' : 'var(--color-muted)' }}>{pinStatus || '›'}</span>
        </button>

        {/* Recovery method */}
        <button style={{ ...ROW, width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid var(--color-gray)' }}
          onClick={() => navigate('ComingSoon', { title: 'Phương thức khôi phục' })}>
          <span style={LABEL}>Phương thức khôi phục</span>
          <span style={{ fontSize: 16, color: 'var(--color-muted)' }}>›</span>
        </button>

        {/* Logout */}
        <button onClick={logout}
          style={{ ...ROW, width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: 'none' }}>
          <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-error)', fontWeight: 'var(--fw-medium)' }}>Đăng xuất</span>
          <span style={{ fontSize: 16, color: 'var(--color-error)' }}>›</span>
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('MenuScreen')}>Quay lại</button>
      </div>
    </div>
  )
}
