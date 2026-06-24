import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { MOCK_VND, TOKENS, fmtVND } from '../data'
import { IconContacts, IconScan, IconPaste } from '../icons'

function TokenRow({ token }) {
  return (
    <div className="token-item">
      <div className="token-icon" style={{ background: token.color }}>
        {token.symbol.slice(0, 2)}
      </div>
      <div className="token-info">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{token.name}</div>
        <div style={{ fontSize: 'var(--fs-sub)', color: 'var(--color-gray)' }}>{token.symbol}</div>
      </div>
      <div className="token-amount">
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{fmtVND(token.vnd)}</div>
        <div style={{ fontSize: 'var(--fs-sub)', color: 'var(--color-gray)' }}>{token.amount.toFixed(2)} {token.symbol}</div>
      </div>
    </div>
  )
}

export default function HomeSend() {
  const { navigate } = useNav()
  return (
    <div className="screen">
      <div className="row-1 col" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)' }}>{fmtVND(MOCK_VND)}</span>
      </div>

      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-gray)' }}>
          Số dư thực tế: {fmtVND(MOCK_VND)}
        </span>
      </div>

      <div className="row-3-6" style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', overflowY: 'auto' }}>
        {TOKENS.map(t => <TokenRow key={t.symbol} token={t} />)}
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
