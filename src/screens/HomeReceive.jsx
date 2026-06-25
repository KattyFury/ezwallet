import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { getTokenBalances } from '../chain'
import { IconShare, IconScan, IconQRSaved } from '../icons'

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [totalVND, setTotalVND] = useState(0)
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  const shortAddr = walletAddr ? walletAddr.slice(0, 6) + '...' + walletAddr.slice(-4) : '—'

  useEffect(() => {
    if (!walletAddr) return
    getTokenBalances(walletAddr).then(ts => setTotalVND(ts.reduce((s, t) => s + t.vnd, 0)))
  }, [walletAddr])

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'EZwallet', text: `Địa chỉ ví: ${walletAddr}` }); return } catch {}
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
      <div className="row-1 col full-bleed" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>{fmtVND(totalVND)}</span>
      </div>

      <div className="row-2-5 center col" style={{ gap: 12 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={200} level="M" />
        <button onClick={copyAddr} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid var(--color-gray)', borderRadius: 8,
          padding: '6px 14px', background: 'none', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-black)' }}>{shortAddr}</span>
          <span style={{ fontSize: 14 }}>{copied ? '✓' : '📋'}</span>
        </button>
      </div>

      <div className="row-6-7" style={{ padding: '6px 0' }}>
        <div className="tip-box">Cho người gửi quét QR này để nhận tiền</div>
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={handleShare}>
          <IconShare size={20} />
          <span>{copied ? 'Đã copy!' : 'Chia sẻ'}</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('CreateQR')}>
          <IconScan size={22} />
          <span>Custom QR</span>
        </button>
        <button className="action-card" onClick={() => navigate('SavedQRList')}>
          <IconQRSaved size={20} />
          <span>QR đã lưu</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
