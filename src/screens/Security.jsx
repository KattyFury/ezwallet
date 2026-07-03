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
      await executeChallenge(getSDK(), userToken, encryptionKey, challengeId)
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

  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-label)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // Mỗi mục nằm 1 grid row riêng → .menu-item luôn là :last-child của div cha → CSS bỏ border.
  // Thêm lại line xám thủ công cho đồng bộ với About/TxHistory (user báo Security thiếu divider).
  const DIVIDER = { borderBottom: '1px solid rgba(204,204,204,0.5)' }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Bảo mật')}
      </div>

      {/* Mỗi mục 1 hàng (đồng bộ màn Ngôn ngữ & tiền tệ) — không dàn đều cả trang */}
      <div className="row-2" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="menu-item" style={DIVIDER}>
          <span style={LABEL}>{t('Email đăng nhập')}</span>
          <span style={VALUE}>{email}</span>
        </div>
      </div>
      <div className="row-3" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={DIVIDER} onClick={copyAddr}>
          <span style={LABEL}>{t('Địa chỉ ví')}</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? t('Đã sao chép') : shortAddr}</span>
          <Icon name="copy" size={16} color="var(--color-faint)" />
        </button>
      </div>
      <div className="row-4" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={DIVIDER} onClick={handleResetPin}>
          <span style={LABEL}>{t('Đổi PIN')}</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size={15} color="var(--color-faint)" />}
        </button>
      </div>
      {/* Phương thức khôi phục CHƯA build → làm mờ, không bấm được (user: cái gì chưa xong thì làm mờ) */}
      <div className="row-5" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="menu-item" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
          <span style={LABEL}>{t('Phương thức khôi phục')}</span>
          <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>Coming soon</span>
        </div>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
