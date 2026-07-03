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

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [addrCopied, setAddrCopied] = useState(false)   // copy riêng cho nút dưới QR (khác nút "Chia sẻ")
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

  async function handleCopyAddr() {
    await navigator.clipboard.writeText(walletAddr)
    setAddrCopied(true)
    setTimeout(() => setAddrCopied(false), 1500)
  }

  return (
    <div className="screen">
      <BalanceHeader totalVND={totalVND} loading={false} />

      <div className="row-3-5 center col" style={{ gap: 14 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={200} level="M" />
        <button onClick={handleCopyAddr} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)' }}>
            {shortenAddr(walletAddr)}
          </span>
          <Icon name={addrCopied ? 'check' : 'copy'} size={18} color={addrCopied ? 'var(--color-primary)' : 'var(--color-muted)'} />
        </button>
      </div>

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        <NotifArea hints={[
          { label: 'Share', desc: 'share your wallet address' },
          { label: 'Create QR', desc: 'make a QR for the exact amount' },
          { label: 'QR Library', desc: 'keep your frequently used QRs' },
        ]} />
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
