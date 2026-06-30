import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { getDisplayCurrency, fmtDisplay } from '../data'
import { getTokenBalances, getDisplayRates } from '../chain'
import NotifArea from '../components/NotifArea'
import { t } from '../i18n'

export default function HomeSend() {
  const { navigate } = useNav()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cur === 'VND' ? { VND: 1 } : null)

  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    if (!addr) { setLoading(false); return }
    getTokenBalances(addr)
      .then(setTokens)
      .catch(console.error)
      .finally(() => setLoading(false))
    if (cur !== 'VND') getDisplayRates().then(setRates).catch(() => setRates({ VND: 1 }))
  }, [])

  const totalVND = tokens.reduce((s, t) => s + t.vnd, 0)

  return (
    <div className="screen">
      <BalanceHeader totalVND={totalVND} loading={loading} />

      <div className="row-3-5" style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>{t('Đang tải...')}</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>
            {t('Chưa có token nào')}
          </div>
        ) : tokens.map(tk => (
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
            <span className="num" style={{ fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)' }}>
              {tk.amount.toFixed(tk.symbol === 'cirBTC' ? 4 : 2)} {tk.symbol}
            </span>
            {/* Quy đổi sang tiền tệ mặc định; ẩn nếu token CHÍNH LÀ tiền tệ đang hiển thị */}
            {tk.symbol !== cur && (
              <span className="num" style={{ marginLeft: 'auto', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-normal)', color: 'var(--color-muted)' }}>
                {rates ? fmtDisplay(tk.vnd, cur, rates) : '…'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="row-7-8" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2dvh' }}>
        <NotifArea fallback={
          !loading && (tokens.find(tk => tk.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
            <div className="tip-box" onClick={() => window.open('https://faucet.circle.com/', '_blank')}
              style={{ borderColor: 'var(--color-warning)', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8, textAlign: 'left', padding: '12px 16px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="warning" size={18} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--color-content)' }}>{t('Hết USDC để trả phí giao dịch')}</span>
              </span>
              <span style={{ color: 'var(--color-warning)', textDecoration: 'underline', paddingLeft: 26 }}>{t('Bấm để nhận USDC testnet từ Faucet')}</span>
            </div>
          ) : (
            <div className="tip-box" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8, textAlign: 'left', padding: '12px 16px' }}>
              <div><span style={{ color: 'var(--color-content)' }}>{t('Danh bạ')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Nơi bạn lưu địa chỉ ví của người quen')}</span></div>
              <div><span style={{ color: 'var(--color-content)' }}>{t('Quét QR')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Bấm để quét mã QR của người nhận')}</span></div>
              <div><span style={{ color: 'var(--color-content)' }}>{t('Dán để gửi')}</span> <span style={{ color: 'var(--color-muted)' }}>– {t('Bấm để dán địa chỉ ví của người nhận')}</span></div>
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
