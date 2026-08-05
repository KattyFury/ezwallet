import { useState, useEffect, useRef } from 'react'
import { useNav } from '../nav'
import { refreshSession, forceFreshSession, isTokenExpiredError, getSDK, executeChallenge, signMessageChallenge, circleErrorMessage } from '../circle'
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

  // 1 lượt mở khoá: lấy token → tạo challenge ký message rỗng → bật PIN Circle. forceFresh=true =
  // BẮT mint token mới (dùng khi lượt trước dính 155104 "token hết hạn").
  async function attemptUnlock(forceFresh) {
    const { userToken, encryptionKey } = forceFresh ? await forceFreshSession() : await refreshSession()
    const walletId = localStorage.getItem('ez_wallet_id')
    const challengeId = await signMessageChallenge(userToken, walletId)
    await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
    sessionStorage.setItem('ez_pin_ok', '1')
    navigate(next)
  }

  async function unlock() {
    setBusy(true); setError('')
    try {
      await attemptUnlock(false)
    } catch (e) {
      if (e?.code === 155701) { setBusy(false); return }   // user tự hủy nhập PIN → hiện nút thử lại
      // Token phiên hết hạn/không hợp lệ (155104…): refreshSession có thể đã âm thầm trả token cũ.
      // Mint token MỚI rồi thử lại 1 lần — đúng khuyến nghị docs Circle. Vẫn hỏng (vd state phiên
      // thiếu) → về Login SẠCH; đăng nhập lại luôn chạy được (đây là lý do "sign out vào lại hết lỗi").
      if (isTokenExpiredError(e)) {
        try {
          await attemptUnlock(true)
        } catch (e2) {
          if (e2?.code === 155701) { setBusy(false); return }
          if (isTokenExpiredError(e2) || e2?.message === 'no-session') { signOut(); return }
          setError(circleErrorMessage(e2)); setBusy(false)
        }
        return
      }
      setError(circleErrorMessage(e))
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
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={unlock}>{t('Mở khoá')}</button>
      </div>
    </div>
  )
}
