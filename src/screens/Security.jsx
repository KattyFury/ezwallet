import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getSDK, executeChallenge, resetPinChallenge, refreshSession } from '../circle'
import { t } from '../i18n'

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [pinStatus, setPinStatus] = useState('')

  async function handleResetPin() {
    // User Google (SSO, không có ez_email): Circle chặn PUT /user/pin ở tầng platform
    // (403 code 3 dù token tươi + PIN tồn tại — verify session 10). Không gọi cho đỡ tốn 1 vòng lỗi.
    if (!localStorage.getItem('ez_email')) {
      setPinStatus('Not available for Google accounts')
      setTimeout(() => setPinStatus(''), 3000)
      return
    }
    setPinStatus(t('Đang chuẩn bị...'))
    try {
      // Làm mới userToken trước — tránh "userToken had expired" (Circle token ~1h).
      const { userToken, encryptionKey } = await refreshSession()
      const challengeId = await resetPinChallenge(userToken)
      setPinStatus(t('Nhập PIN...'))
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      setPinStatus(t('Đổi PIN thành công!'))
      setTimeout(() => setPinStatus(''), 2000)
    } catch (e) {
      setPinStatus(t('Lỗi:') + ' ' + (e.message || t('thử lại')))
    }
  }

  const email = localStorage.getItem('ez_email') || localStorage.getItem('ez_google_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // VALUE lên fs-item 17 (user 07-17f: "nội dung hơi nhỏ" — trước fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // Trạng thái đổi PIN: LỖI phải ĐỎ cho bật (user 07-17f — "Error: User canceled" đen/xanh không bật)
  const pinErr = /^(Error|Lỗi|Not available)/.test(pinStatus)

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Bảo mật')}
      </div>

      {/* BOX XÁM chung hàng 2-4 (user chốt 07-17f); trong box KHÔNG line xám ngăn cách (luật cũ giữ).
          Đổi PIN vẫn dùng CHEVRON PHẢI right2 (user chốt: nó là hàng đi tiếp, không phải dropdown). */}
      <div style={{ gridRow: '2 / 5', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <div className="menu-item">
          <span style={LABEL}>{t('Email đăng nhập')}</span>
          <span style={VALUE}>{email}</span>
        </div>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>{t('Địa chỉ ví')}</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? t('Đã sao chép') : shortAddr}</span>
          <Icon name="copy" size="var(--is-item)" color="var(--color-brand)" />
        </button>
        <button className="menu-item" onClick={handleResetPin}>
          <span style={LABEL}>{t('Đổi PIN')}</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: pinErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-faint)" />}
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
