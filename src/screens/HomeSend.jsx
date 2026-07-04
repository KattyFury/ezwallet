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
const TOKEN_TEXT_STYLE = { fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }

// Đồng bộ với nút "Gửi" trong Contacts.jsx (height 40, fs-item, Barlow medium — .btn) để cùng
// hệ thiết kế. Chiều ngang KHÔNG cố định — tự giãn theo nội dung.
// NHẤN GIỮ (không phải bật/tắt cố định): mặc định hiện $ (dễ hiểu với người dùng phổ thông);
// giữ tay mới hiện số lượng token thật; nhả tay tự động quay lại $ — tránh việc bấm xong quên
// đổi lại rồi không hiểu "0.0001 cirBTC" là gì.
// Xám cả nền lẫn chữ — nút phụ, không quan trọng bằng nội dung chính.
// NẰM TRONG PHẠM VI hàng 3-6 (vùng token), ĐÁY của hàng 6 — KHÔNG lấn qua hàng 7 (vùng thông
// báo), tránh hiểu lầm nút này liên quan tới lịch sử giao dịch. top:60% = đúng đáy hàng 6 của
// .screen (10 hàng đều nhau); translateY(-100%) đẩy trọn thân nút lên TRÊN mốc đó (không phải
// -50% cắt đôi ranh giới như trước) + chừa thêm 6px đệm cho thoáng.
function ShowTokensButton({ onHoldStart, onHoldEnd }) {
  return (
    <button
      onMouseDown={onHoldStart}
      onMouseUp={onHoldEnd}
      onMouseLeave={onHoldEnd}
      onTouchStart={onHoldStart}
      onTouchEnd={onHoldEnd}
      onTouchCancel={onHoldEnd}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'absolute', left: '50%', top: '60%', transform: 'translate(-50%, calc(-100% - 6px))', zIndex: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40,
        padding: '0 22px', borderRadius: 50, border: 'none', background: 'var(--color-gray)',
        color: 'var(--color-muted)', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-item)',
        fontWeight: 'var(--fw-medium)', cursor: 'pointer',
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}
      aria-label="hold to show token amounts instead of $"
    >
      Hold to show tokens
    </button>
  )
}

export default function HomeSend() {
  const { navigate } = useNav()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(null)
  // Toggle CHUNG cho cả danh sách (không còn per-token): mặc định false = hiện $; nhấn giữ
  // ShowTokensButton → true = hiện số lượng token thật; nhả tay → về lại $.
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    ensureWalletAddress().then(addr => {
      if (!addr) { setLoading(false); return }
      getTokenBalances(addr)
        .then(setTokens)
        .catch(console.error)
        .finally(() => setLoading(false))
    })
    getDisplayRates().then(setRates).catch(() => setRates({ USDC: 1, EURC: 1.08 }))
  }, [])

  const totalUsd = tokens.reduce((s, t) => s + t.usd, 0)

  return (
    <div className="screen">
      <BalanceHeader totalUsd={totalUsd} loading={loading} />

      {/* Hàng 3-6: danh sách token, cuộn được; mờ dần 1/3 hàng ở ĐÁY khi tiến sát nút Show tokens */}
      <div className="row-3-6 scroll-thin" style={{
        display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingTop: 2, paddingBottom: 8,
        WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>{t('Đang tải...')}</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>
            {t('Chưa có token nào')}
          </div>
        ) : (
          <>
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
                <Icon name="check" size={20} color="var(--color-primary)" />

                {/* CÙNG font + CÙNG màu với "USDC" bên trái (TOKEN_TEXT_STYLE) — theo toggle chung ở trên */}
                <span style={{ ...TOKEN_TEXT_STYLE, marginLeft: 'auto' }}>
                  {showToken
                    ? tk.amount.toFixed(tk.symbol === 'cirBTC' ? 4 : 2)
                    : (rates ? `${displaySymbol(cur)}${displayNum(tk.usd, cur, rates)}` : '…')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Nổi đúng ranh giới hàng 6/7 (position:absolute trong ShowTokensButton) — KHÔNG chiếm hàng riêng */}
      {tokens.length > 0 && (
        <ShowTokensButton onHoldStart={() => setShowToken(true)} onHoldEnd={() => setShowToken(false)} />
      )}

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        <NotifArea
          hints={[
            { label: 'Contacts', desc: "save people's wallet addresses" },
            { label: 'Scan QR', desc: "scan the recipient's QR" },
            { label: 'Paste', desc: "paste the recipient's address" },
          ]}
          warning={
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
            ) : null
          }
        />
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
