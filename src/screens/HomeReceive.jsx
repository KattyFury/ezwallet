import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { getTokenBalances } from '../chain'
import { IconShare, IconQRSaved } from '../icons'

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

  function copyAddr() {
    navigator.clipboard.writeText(MOCK_ADDR)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="screen">
      {/* Row 1: Số dư khả dụng */}
      <div className="row-1 col" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>{fmtVND(totalVND)}</span>
      </div>

      {/* Row 2: Số dư thực tế */}
      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Số dư thực tế: {fmtVND(totalVND)}
        </span>
      </div>

      {/* Rows 3-6: QR */}
      <div className="row-3-6 center col" style={{ gap: 10 }}>
        <QRCodeSVG value={walletAddr || "0x"} size={160} level="M" />
        <button onClick={copyAddr} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid var(--color-gray)', borderRadius: 8,
          padding: '5px 12px', background: 'none', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-black)' }}>{shortAddr}</span>
          <span style={{ fontSize: 14 }}>{copied ? '✓' : '📋'}</span>
        </button>
      </div>

      {/* Rows 7-8: tip */}
      <div className="row-7-8" style={{ padding: '6px 0' }}>
        <div className="tip-box">Cho người gửi quét QR này để nhận tiền trực tiếp</div>
      </div>

      {/* Row 9: 2 buttons */}
      <div className="row-9 action-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className="action-card">
          <IconShare size={20} />
          <span>Chia sẻ QR</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('SavedQRList')}>
          <IconQRSaved size={20} />
          <span>QR đã lưu</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
