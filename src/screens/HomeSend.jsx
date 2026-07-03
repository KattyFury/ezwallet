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

export default function HomeSend() {
  const { navigate } = useNav()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cur === 'VND' ? { VND: 1 } : null)
  // Mắt (per-token): mặc định false = hiện quy đổi USD; NHẤN GIỮ → true = hiện số lượng token
  // thật; nhả tay → về lại USD. Không phải click-toggle.
  const [revealMap, setRevealMap] = useState({})
  const holdStart = sym => setRevealMap(m => ({ ...m, [sym]: true }))
  const holdEnd = sym => setRevealMap(m => ({ ...m, [sym]: false }))

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
            {/* "Bao gồm" = tổng số dư (BalanceHeader) được cấu thành từ các token nào */}
            <span style={{ fontFamily: 'var(--font-base)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)', paddingLeft: 2 }}>{t('Bao gồm')}</span>
            {tokens.map(tk => {
              const revealed = !!revealMap[tk.symbol]
              return (
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

                {/* Mắt (xám, NHẤN GIỮ để xem số lượng token thật, nhả tay về lại quy đổi USD) */}
                <button
                  onMouseDown={() => holdStart(tk.symbol)}
                  onMouseUp={() => holdEnd(tk.symbol)}
                  onMouseLeave={() => holdEnd(tk.symbol)}
                  onTouchStart={() => holdStart(tk.symbol)}
                  onTouchEnd={() => holdEnd(tk.symbol)}
                  onTouchCancel={() => holdEnd(tk.symbol)}
                  onContextMenu={e => e.preventDefault()}
                  style={{ background: 'none', border: 'none', padding: 4, margin: 0, display: 'flex', cursor: 'pointer', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  aria-label="hold to reveal token amount">
                  <Icon name="eye" size={18} color="var(--color-muted)" />
                </button>

                {/* CÙNG font + CÙNG màu với "USDC" bên trái (TOKEN_TEXT_STYLE) — kể cả khi nhấn giữ */}
                <span style={{ ...TOKEN_TEXT_STYLE, marginLeft: 'auto' }}>
                  {revealed
                    ? tk.amount.toFixed(tk.symbol === 'cirBTC' ? 4 : 2)
                    : (rates ? `${displaySymbol(cur)}${displayNum(tk.vnd, cur, rates)}` : '…')}
                </span>
              </div>
              )
            })}
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
