import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import NotifArea from '../components/NotifArea'
import { useNav } from '../nav'
import { getTokenBalances } from '../chain'
import { t } from '../i18n'

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [totalVND, setTotalVND] = useState(0)
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  const shortAddr = walletAddr ? walletAddr.slice(0, 6) + '...' + walletAddr.slice(-4) : '…'

  useEffect(() => {
    if (!walletAddr) return
    getTokenBalances(walletAddr).then(ts => setTotalVND(ts.reduce((s, t) => s + t.vnd, 0)))
  }, [walletAddr])

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ text: walletAddr }); return } catch {}
    }
    await navigator.clipboard.writeText(walletAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="screen">
      <BalanceHeader totalVND={totalVND} loading={false} />

      <div className="row-3-5 center col" style={{ gap: 12 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={200} level="M" />
        <button onClick={copyAddr} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid var(--color-gray)', borderRadius: 8,
          padding: '6px 14px', background: 'none', cursor: 'pointer',
        }}>
          <span className="num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-content)' }}>{shortAddr}</span>
          <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? 'var(--color-primary)' : 'var(--color-content)'} />
        </button>
      </div>

      <div className="row-7-8" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2dvh' }}>
        <NotifArea fallback={
          <div className="tip-box" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8, textAlign: 'left', padding: '12px 16px' }}>
            <div><span style={{ color: 'var(--color-content)' }}>{t('QR mặc định')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Đây chính là địa chỉ ví của bạn')}</span></div>
            <div><span style={{ color: 'var(--color-content)' }}>{t('Chia sẻ')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Bấm để chia sẻ địa chỉ ví của bạn')}</span></div>
            <div><span style={{ color: 'var(--color-content)' }}>{t('Tạo QR')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Tạo mã QR nhận đúng số tiền bạn muốn')}</span></div>
            <div><span style={{ color: 'var(--color-content)' }}>{t('Kho QR')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Nơi bạn lưu trữ những QR hay dùng')}</span></div>
          </div>
        } />
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={handleShare}>
          <Icon name="share" size={22} />
          <span>{copied ? t('Đã copy!') : t('Chia sẻ')}</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('CreateQR')}>
          <Icon name="qr" size={22} color="var(--color-white)" />
          <span>{t('Tạo QR')}</span>
        </button>
        <button className="action-card" onClick={() => navigate('SavedQRList')}>
          <Icon name="download" size={22} />
          <span>{t('Kho QR')}</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
