import { useState, useEffect, useRef } from 'react'
import { useNav } from '../nav'
import { refreshSession, getSDK, executeChallenge, signMessageChallenge } from '../circle'
import { t } from '../i18n'

// KHOÁ MỞ VÍ bằng chính PIN Circle (không tạo mã thứ 2). Chỉ dùng cho đăng nhập LẦN 2+ / mở lại
// app — người tạo ví lần đầu vừa đặt PIN nên KHÔNG qua đây (thừa). Ký 1 message rỗng để xác thực
// PIN: đúng PIN mới vào ví → chặn "ai gõ email cũng soi tiền". Không gas, không lên chain.
export default function PinGate() {
  const { navigate, params } = useNav()
  const next = params?.next || 'HomeSend'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const tried = useRef(false)

  async function unlock() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const walletId = localStorage.getItem('ez_wallet_id')
      const challengeId = await signMessageChallenge(userToken, walletId)
      await executeChallenge(getSDK(), userToken, encryptionKey, challengeId)
      sessionStorage.setItem('ez_pin_ok', '1')
      navigate(next)
    } catch (e) {
      if (e?.code === 155701) { setBusy(false); return }   // user tự hủy nhập PIN → cho bấm lại
      setError(e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Unlock failed'))
      setBusy(false)
    }
  }

  // Tự mở màn nhập PIN ngay khi vào (như app ngân hàng). Hủy thì còn nút Unlock để thử lại.
  useEffect(() => { if (!tried.current) { tried.current = true; unlock() } }, [])

  function signOut() {
    ;['ez_user_token', 'ez_wallet_addr', 'ez_wallet_id', 'ez_encryption_key', 'ez_email', 'ez_refresh_token', 'ez_google_email', 'ez_login_method'].forEach(k => localStorage.removeItem(k))
    sessionStorage.removeItem('ez_pin_ok')
    navigate('Login')
  }

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>Enter your PIN</div>
        <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', maxWidth: 300 }}>Enter your PIN to unlock your wallet.</div>
        {error && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', maxWidth: 300 }}>{error}</div>}
      </div>
      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={signOut}>{t('Đăng xuất')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={unlock}>{busy ? t('Đang xử lý...') : 'Unlock'}</button>
      </div>
    </div>
  )
}
