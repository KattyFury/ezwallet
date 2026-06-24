import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { fetchBalance } from '../circle'
import { IconContacts, IconScan, IconPaste } from '../icons'

const USDC_RATE = 25000 // 1 USDC = 25,000 VND (mock rate)
const TOKEN_COLORS = { USDC: '#2775CA', EURC: '#1A56DB', cirBTC: '#F7931A' }

function TokenRow({ symbol, amount }) {
  const vnd = parseFloat(amount || 0) * USDC_RATE
  return (
    <div className="token-item" style={{ height: '100%' }}>
      <div className="token-icon" style={{ background: TOKEN_COLORS[symbol] || '#999' }}>
        {symbol.slice(0, 2)}
      </div>
      <div className="token-info">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{symbol}</div>
      </div>
      <div className="token-amount">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{fmtVND(Math.round(vnd))}</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{parseFloat(amount || 0).toFixed(4)} {symbol}</div>
      </div>
    </div>
  )
}

export default function HomeSend() {
  const { navigate } = useNav()
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalance()
      .then(b => setBalances(b))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalVND = balances.reduce((sum, b) => sum + parseFloat(b.amount || 0) * USDC_RATE, 0)

  return (
    <div className="screen">
      <div className="row-1 col" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>
          {loading ? '...' : fmtVND(Math.round(totalVND))}
        </span>
      </div>

      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Số dư thực tế: {loading ? '...' : fmtVND(Math.round(totalVND))}
        </span>
      </div>

      <div className="row-3-6" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>
            Đang tải...
          </div>
        ) : balances.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>
            Chưa có token
          </div>
        ) : (
          balances.map(b => <TokenRow key={b.token?.id || b.token?.symbol} symbol={b.token?.symbol || 'USDC'} amount={b.amount} />)
        )}
      </div>

      <div className="row-7-8" style={{ padding: '6px 0' }}>
        <div className="tip-box">Chọn danh bạ, quét QR, hoặc dán địa chỉ để gửi tiền</div>
      </div>

      <div className="row-9 action-grid">
        <button className="action-card">
          <IconContacts size={20} />
          <span>Danh bạ</span>
        </button>
        <button className="action-card primary">
          <IconScan size={26} />
          <span>Quét QR</span>
        </button>
        <button className="action-card" onClick={() => navigate('PasteAddress')}>
          <IconPaste size={20} />
          <span>Dán địa chỉ</span>
        </button>
      </div>

      <NavBar active="HomeSend" />
    </div>
  )
}
