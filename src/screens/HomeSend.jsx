import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { getTokenBalances, getDisplayRates } from '../chain'
import { ensureWalletAddress } from '../circle'
import NotifArea from '../components/NotifArea'
import { t } from '../i18n'

// USDC (trái) và $98.59 (phải) phải CÙNG font + CÙNG màu — dùng chung 1 style object
// để không lệch (thay vì khai riêng, dễ chỉnh nhầm 1 bên).
const TOKEN_TEXT_STYLE = { fontFamily: 'var(--font-base)', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }

// Đồng bộ với nút "Gửi" trong Contacts.jsx (height 40, fs-item, Barlow medium — .btn) để cùng
// hệ thiết kế. Chiều ngang KHÔNG cố định — tự giãn theo nội dung 2 nhãn.
const SEGMENT_STYLE = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderRadius: 50, fontFamily: 'var(--font-base)', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', whiteSpace: 'nowrap', transition: 'background .12s, color .12s' }

// Toggle NHẤN GIỮ (không phải bật/tắt cố định): mặc định hiện $ (dễ hiểu với người dùng phổ
// thông); giữ tay mới hiện số lượng token thật; nhả tay tự động quay lại $ — tránh việc bấm
// xong quên đổi lại rồi không hiểu "0.0001 cirBTC" là gì.
function DisplayToggle({ showToken, onHoldStart, onHoldEnd }) {
  return (
    <div
      onMouseDown={onHoldStart}
      onMouseUp={onHoldEnd}
      onMouseLeave={onHoldEnd}
      onTouchStart={onHoldStart}
      onTouchEnd={onHoldEnd}
      onTouchCancel={onHoldEnd}
      onContextMenu={e => e.preventDefault()}
      style={{ display: 'inline-flex', alignItems: 'center', height: 40, borderRadius: 50, background: 'var(--color-gray)', padding: 3, cursor: 'pointer', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      aria-label="hold to show token amounts instead of $"
    >
      <span style={{ ...SEGMENT_STYLE, background: showToken ? 'transparent' : 'var(--color-primary)', color: showToken ? 'var(--color-muted)' : 'var(--color-white)' }}>Hiển thị $</span>
      <span style={{ ...SEGMENT_STYLE, background: showToken ? 'var(--color-primary)' : 'transparent', color: showToken ? 'var(--color-white)' : 'var(--color-muted)' }}>Hiển thị token</span>
    </div>
  )
}

export default function HomeSend() {
  const { navigate } = useNav()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cur === 'VND' ? { VND: 1 } : null)
  // Toggle CHUNG cho cả danh sách (không còn per-token): mặc định false = hiện $; nhấn giữ
  // DisplayToggle → true = hiện số lượng token thật; nhả tay → về lại $.
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    ensureWalletAddress().then(addr => {
      if (!addr) { setLoading(false); return }
      getTokenBalances(addr)
        .then(setTokens)
        .catch(console.error)
        .finally(() => setLoading(false))
    })
    if (cur !== 'VND') getDisplayRates().then(setRates).catch(() => setRates({ VND: 1 }))
  }, [])

  const totalVND = tokens.reduce((s, t) => s + t.vnd, 0)

  return (
    <div className="screen">
      <BalanceHeader totalVND={totalVND} loading={loading} />

      <div className="row-3-5" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingTop: 2 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>{t('Đang tải...')}</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>
            {t('Chưa có token nào')}
          </div>
        ) : (
          <>
            {/* Thay "Bao gồm" bằng toggle NHẤN GIỮ — chọn hiện $ hay hiện token thật cho CẢ danh sách */}
            <DisplayToggle showToken={showToken} onHoldStart={() => setShowToken(true)} onHoldEnd={() => setShowToken(false)} />
            {tokens.map(tk => (
              <div key={tk.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
                <img
                  src={`/tokens/${tk.symbol.toLowerCase()}.png`}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }}
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="token-icon" style={{ background: tk.color, flexShrink: 0, display: 'none' }}>{tk.symbol.slice(0, 2)}</div>

                {/* Tên token thật (USDC/EURC/cirBTC) + huy hiệu đã xác minh (xanh lá của app) */}
                <span style={TOKEN_TEXT_STYLE}>{tk.symbol}</span>
                <Icon name="check" size={14} color="var(--color-primary)" />

                {/* CÙNG font + CÙNG màu với "USDC" bên trái (TOKEN_TEXT_STYLE) — theo toggle chung ở trên */}
                <span style={{ ...TOKEN_TEXT_STYLE, marginLeft: 'auto' }}>
                  {showToken
                    ? tk.amount.toFixed(tk.symbol === 'cirBTC' ? 4 : 2)
                    : (rates ? `${displaySymbol(cur)}${displayNum(tk.vnd, cur, rates)}` : '…')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="row-7-8" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2dvh' }}>
        <NotifArea fallback={
          !loading && (tokens.find(tk => tk.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
            <div onClick={() => window.open('https://faucet.circle.com/', '_blank')}
              style={{ width: '100%', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-label)', color: 'var(--color-content)' }}>
                <Icon name="warning" size={18} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                {t('Hết USDC để trả phí giao dịch')}
              </span>
              <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-content)', paddingLeft: 26 }}>
                {t('Bấm để nhận USDC testnet từ')}{' '}
                <span style={{ color: 'var(--color-warning)', textDecoration: 'underline' }}>Faucet</span>
              </span>
            </div>
          ) : (
            <div style={{ width: '100%', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 'var(--fs-label)', textAlign: 'left', color: 'var(--color-content)' }}>
              <div><span style={{ fontWeight: 'var(--fw-medium)' }}>Contacts</span> = save people's wallet addresses</div>
              <div><span style={{ fontWeight: 'var(--fw-medium)' }}>Scan QR</span> = scan the recipient's QR</div>
              <div><span style={{ fontWeight: 'var(--fw-medium)' }}>Paste address</span> = paste the recipient's address</div>
            </div>
          )
        } />
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('Contacts')}><Icon name="human" size={22} /><span>{t('Danh bạ')}</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><Icon name="scan" size={22} color="var(--color-white)" /><span>{t('Quét QR')}</span></button>
        <button className="action-card" onClick={() => navigate('PasteAddress')}><Icon name="copy" size={22} /><span>{t('Dán để gửi')}</span></button>
      </div>

      <NavBar active="HomeSend" />
    </div>
  )
}
