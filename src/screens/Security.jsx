import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getSDK, executeChallenge, resetPinChallenge } from '../circle'
import { t } from '../i18n'

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [pinStatus, setPinStatus] = useState('')

  async function handleResetPin() {
    setPinStatus(t('Đang chuẩn bị...'))
    try {
      const userToken = localStorage.getItem('ez_user_token')
      const encryptionKey = localStorage.getItem('ez_encryption_key')
      const challengeId = await resetPinChallenge(userToken)
      setPinStatus(t('Nhập PIN...'))
      await executeChallenge(getSDK(), userToken, encryptionKey, challengeId)
      setPinStatus(t('Đổi PIN thành công!'))
      setTimeout(() => setPinStatus(''), 2000)
    } catch (e) {
      setPinStatus(t('Lỗi:') + ' ' + (e.message || t('thử lại')))
    }
  }

  const email = localStorage.getItem('ez_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-label)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Bảo mật')}
      </div>

      {/* Mỗi mục 1 hàng (đồng bộ màn Ngôn ngữ & tiền tệ) — không dàn đều cả trang */}
      <div className="row-2" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="menu-item">
          <span style={LABEL}>{t('Email đăng nhập')}</span>
          <span style={VALUE}>{email}</span>
        </div>
      </div>
      <div className="row-3" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>{t('Địa chỉ ví')}</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? t('Đã sao chép') : shortAddr}</span>
          <Icon name="copy" size={16} color="var(--color-faint)" />
        </button>
      </div>
      <div className="row-4" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" onClick={handleResetPin}>
          <span style={LABEL}>{t('Đổi PIN')}</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size={15} color="var(--color-faint)" />}
        </button>
      </div>
      <div className="row-5" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" onClick={() => navigate('ComingSoon', { title: t('Phương thức khôi phục') })}>
          <span style={LABEL}>{t('Phương thức khôi phục')}</span>
          <Icon name="right2" size={15} color="var(--color-faint)" />
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
