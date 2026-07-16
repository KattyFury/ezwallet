import { useState, useEffect, useRef } from 'react'
import { useNav } from '../nav'
import { refreshSession, getSDK, executeChallenge, signMessageChallenge } from '../circle'
import { t } from '../i18n'
import logoLong from '../../design/logo.svg'

// KHOÁ MỞ VÍ bằng chính PIN Circle. Vào màn là TỰ bật iframe PIN của Circle NGAY — KHÔNG hiện thêm
// màn "Enter your PIN" riêng của dự án (user chốt 2026-07-15: bỏ màn PIN dự án, click đăng nhập chỉ
// thấy PIN của Circle). Trong lúc bật PIN chỉ hiện logo (nền sạch). User HỦY/lỗi mới hiện nút thử lại.
export default function PinGate() {
  const { navigate, params } = useNav()
  const next = params?.next || 'HomeSend'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)   // mặc định busy = đang bật PIN Circle → chưa hiện UI dự án
  const tried = useRef(false)

  async function unlock() {
    setBusy(true); setError('')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const walletId = localStorage.getItem('ez_wallet_id')
      const challengeId = await signMessageChallenge(userToken, walletId)
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      sessionStorage.setItem('ez_pin_ok', '1')
      navigate(next)
    } catch (e) {
      if (e?.code === 155701) { setBusy(false); return }   // user tự hủy nhập PIN → hiện nút thử lại
      setError(e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Unlock failed'))
      setBusy(false)
    }
  }

  // Tự mở màn nhập PIN Circle ngay khi vào (như app ngân hàng).
  useEffect(() => { if (!tried.current) { tried.current = true; unlock() } }, [])

  function signOut() {
    ;['ez_user_token', 'ez_wallet_addr', 'ez_wallet_id', 'ez_encryption_key', 'ez_email', 'ez_refresh_token', 'ez_google_email', 'ez_login_method'].forEach(k => localStorage.removeItem(k))
    sessionStorage.removeItem('ez_pin_ok')
    navigate('Login')
  }

  // Đang bật PIN Circle → chỉ hiện logo (nền sạch), iframe PIN của Circle nổi lên trên.
  if (busy) {
    return (
      <div className="screen">
        <div className="row-1-9 center col"><img src={logoLong} alt="EZwallet" style={{ width: '56%' }} /></div>
      </div>
    )
  }

  // User đã hủy/lỗi → cho thử lại (chỉ lúc này mới hiện UI + nút).
  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <img src={logoLong} alt="EZwallet" style={{ width: '56%' }} />
        {error && <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-error)', maxWidth: 300 }}>{error}</div>}
      </div>
      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={signOut}>{t('Đăng xuất')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={unlock}>Unlock</button>
      </div>
    </div>
  )
}
