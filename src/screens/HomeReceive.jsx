import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import NotifArea from '../components/NotifArea'
import { useNav } from '../nav'
import { getTokenBalances } from '../chain'
import { ensureWalletAddress } from '../circle'
import { t } from '../i18n'

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [totalVND, setTotalVND] = useState(0)
  const [walletAddr, setWalletAddr] = useState(localStorage.getItem('ez_wallet_addr') || '')

  // Lấy lại địa chỉ ví nếu thiếu (tạo ví xong nhưng Circle provision chậm)
  useEffect(() => {
    if (walletAddr) return
    ensureWalletAddress().then(a => { if (a) setWalletAddr(a) })
  }, [])

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

  return (
    <div className="screen">
      <BalanceHeader totalVND={totalVND} loading={false} />

      <div className="row-3-5 center col" style={{ gap: 14 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={200} level="M" />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', textAlign: 'center' }}>
          {t('Cho người khác quét để nhận tiền')}
        </span>
      </div>

      <div className="row-7-8" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2dvh' }}>
        <NotifArea fallback={
          <div style={{ width: '100%', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--fs-label)', textAlign: 'left', color: 'var(--color-content)' }}>
            <div><span style={{ fontWeight: 'var(--fw-medium)' }}>Share</span> = share your wallet address</div>
            <div><span style={{ fontWeight: 'var(--fw-medium)' }}>Create QR</span> = make a QR for the exact amount</div>
            <div><span style={{ fontWeight: 'var(--fw-medium)' }}>QR Library</span> = keep your frequently used QRs</div>
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
