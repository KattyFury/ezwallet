import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { MOCK_VND, TOKENS, fmtVND } from '../data'
import { IconContacts, IconScan, IconPaste } from '../icons'

function TokenRow({ token }) {
  return (
    <div className="token-item" style={{ height: '100%' }}>
      <div className="token-icon" style={{ background: token.color }}>
        {token.symbol.slice(0, 2)}
      </div>
      <div className="token-info">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{token.name}</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{token.symbol}</div>
      </div>
      <div className="token-amount">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{fmtVND(token.vnd)}</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{token.amount.toFixed(2)} {token.symbol}</div>
      </div>
    </div>
  )
}

export default function HomeSend() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      {/* Row 1: Số dư khả dụng */}
      <div className="row-1 col" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>{fmtVND(MOCK_VND)}</span>
      </div>

      {/* Row 2: Số dư thực tế */}
      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Số dư thực tế: {fmtVND(MOCK_VND)}
        </span>
      </div>

      {/* Rows 3-6: token list */}
      <div className="row-3-6" style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)' }}>
        {TOKENS.map(t => <TokenRow key={t.symbol} token={t} />)}
      </div>

      {/* Rows 7-8: tip */}
      <div className="row-7-8" style={{ padding: '6px 0' }}>
        <div className="tip-box">Chọn danh bạ, quét QR, hoặc dán địa chỉ để gửi tiền</div>
      </div>

      {/* Row 9: 3 action buttons */}
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
