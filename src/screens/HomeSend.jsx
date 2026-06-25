import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { getTokenBalances, fmtAmount } from '../chain'
import { IconContacts, IconScan, IconPaste } from '../icons'

export default function HomeSend() {
  const { navigate } = useNav()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    if (!addr) { setLoading(false); return }
    getTokenBalances(addr)
      .then(setTokens)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalVND = tokens.reduce((s, t) => s + t.vnd, 0)

  return (
    <div className="screen">
      <div className="row-1 col full-bleed" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>
          {loading ? '...' : fmtVND(totalVND)}
        </span>
      </div>

      <div className="row-2-5" style={{ display: 'grid', gridTemplateRows: `repeat(${Math.max(tokens.length, 1)}, 1fr)`, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>Đang tải...</div>
        ) : tokens.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>
            {localStorage.getItem('ez_wallet_addr') ? 'Chưa có token' : 'Vui lòng đăng nhập lại'}
          </div>
        ) : tokens.map(t => (
          <div key={t.symbol} className="token-item">
            <div className="token-icon" style={{ background: t.color }}>{t.symbol.slice(0, 2)}</div>
            <div className="token-info">
              <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{t.symbol}</div>
            </div>
            <div className="token-amount">
              <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{fmtVND(t.vnd)}</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{t.amount.toFixed(t.symbol === 'cirBTC' ? 6 : 2)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row-6-7" style={{ padding: '6px 0' }}>
        {!loading && (tokens.find(t => t.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
          <div className="tip-box" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
            ⚠ Hết USDC — cần USDC để thanh toán phí giao dịch. Vào <b>Đổi tiền</b> để swap.
          </div>
        ) : (
          <div className="tip-box">Chọn danh bạ, quét QR, hoặc dán địa chỉ để gửi tiền</div>
        )}
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('Contacts')}><IconContacts size={20} /><span>Danh bạ</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><IconScan size={26} /><span>Quét QR</span></button>
        <button className="action-card" onClick={() => navigate('PasteAddress')}><IconPaste size={20} /><span>Dán địa chỉ</span></button>
      </div>

      <NavBar active="HomeSend" />
    </div>
  )
}
