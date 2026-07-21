import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { getTokenBalances, getDisplayRates, cachedBalances, cachedRates } from '../chain'
import { ensureWalletAddress } from '../circle'
import NotifArea, { NOTIF_FS } from '../components/NotifArea'
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
// NẰM GIỮA hàng 6 (dưới list token hàng 3-5, TRÊN vùng thông báo hàng 7) — tách đều 2 phía để
// không ai tưởng bấm nút này ra thông báo. top:55% = tâm hàng 6 của .screen (10 hàng đều nhau,
// hàng 6 = 50%→60%); translate(-50%,-50%) đặt trọn thân nút vào đúng tâm mốc đó.
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
        position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', zIndex: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40,
        // Nút NẰM TRONG box xám (vùng token 07-17f) → TRẮNG + VIỀN XÁM để nổi trên nền surface
        // (luật user 07-17f: "button nằm trong vùng box xám thì thành trắng viền xám", giống chip
        // token màn Swap). Chữ GIỮ muted — user dặn "vẫn dùng màu xám đen chứ không cho màu đen".
        padding: '0 22px', borderRadius: 50, border: '1.5px solid var(--color-gray)', background: 'var(--color-white)',
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
  // Seed từ cache tầng module → chuyển màn hiện số NGAY (không "..." nhấp nháy), fetch nền cập nhật.
  const seedTokens = cachedBalances(localStorage.getItem('ez_wallet_addr'))
  const [tokens, setTokens] = useState(seedTokens || [])
  const [loading, setLoading] = useState(!seedTokens)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cachedRates)
  // Toggle CHUNG cho cả danh sách (không còn per-token): mặc định false = hiện $; nhấn giữ
  // ShowTokensButton → true = hiện số lượng token thật; nhả tay → về lại $.
  const [showToken, setShowToken] = useState(false)

  // Đọc số dư: hỏng thì THỬ LẠI, TUYỆT ĐỐI không để rơi về 0.
  // Bug 07-16: `.catch(console.error).finally(() => setLoading(false))` — fetch hỏng mà chưa có
  // cache → tokens=[] + loading=false → totalUsd=0 → màn tự tin vẽ "$0.00" (số dư BỊA). Giờ hỏng
  // thì GIỮ trạng thái đang tải ("…") + tự thử lại mỗi 3s cho tới khi có số THẬT.
  useEffect(() => {
    let cancelled = false
    let timer = null
    ensureWalletAddress().then(addr => {
      if (cancelled) return
      if (!addr) { setLoading(false); return }
      const load = () => getTokenBalances(addr)
        .then(ts => { if (!cancelled) { setTokens(ts); setLoading(false) } })
        .catch(() => { if (!cancelled) timer = setTimeout(load, 3000) })
      load()
    })
    getDisplayRates().then(setRates).catch(() => setRates(r => r || { USDC: 1, EURC: 1.08 }))
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const totalUsd = tokens.reduce((s, t) => s + t.usd, 0)

  return (
    <div className="screen">
      <BalanceHeader totalUsd={totalUsd} loading={loading} />

      {/* Hàng 3-5.5 (user chốt 07-17f): BOX XÁM surface chứa danh sách token — kéo dài thêm 5dvh
          xuống nửa hàng 6 (height calc bên dưới; grid không cắt phần thò) để nút "Hold to show
          tokens" (absolute top 55% = đúng mép dưới box) nằm GỌN TRONG box. Cuộn + mờ đáy nằm ở
          DIV TRONG — đặt mask lên box thì cả nền xám bị mờ theo, lem sang trắng. */}
      <div className="row-3-5" style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '12px 16px 0', height: 'calc(100% + 5dvh)', minWidth: 0 }}>
        <div className="scroll-thin" style={{
          display: 'flex', flexDirection: 'column', gap: 26, overflowY: 'auto', height: '100%', paddingTop: 2, paddingBottom: 52,
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
                <Icon name="check" size="var(--is-num)" color="var(--color-primary)" />

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
      </div>

      {/* Nổi giữa hàng 6 (position:absolute trong ShowTokensButton) — KHÔNG chiếm hàng riêng */}
      {tokens.length > 0 && (
        <ShowTokensButton onHoldStart={() => setShowToken(true)} onHoldEnd={() => setShowToken(false)} />
      )}

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        <NotifArea
          // Mỗi dòng = 1 CÂU đủ nghĩa, từ khoá gạch chân BẤM ĐƯỢC → đi đúng nơi nút cùng tên ở
          // hàng 9 dẫn tới (user chốt 07-21).
          hints={[
            { label: 'Contacts', desc: 'Save wallet addresses of people you know', onClick: () => navigate('Contacts') },
            { label: 'Scan QR', desc: "Scan the receiver's QR code to send", onClick: () => navigate('QRScanner') },
            { label: 'Paste', desc: "Paste the receiver's wallet address to send", onClick: () => navigate('PasteAddress') },
          ]}
          warning={
            !loading && (tokens.find(tk => tk.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
              <div onClick={() => { const a = localStorage.getItem('ez_wallet_addr'); if (a) { try { navigator.clipboard.writeText(a) } catch {} } localStorage.setItem('ez_faucet_pending', String(Date.now())); window.open('https://faucet.circle.com/', '_blank') }}
                style={{ width: '100%', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                {/* Icon CENTER-TRÁI cả khối 2 dòng (user chốt 07-17) — không dính dòng 1 */}
                <Icon name="warning" size="var(--is-item)" color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-content)' }}>{t('Hết USDC để trả phí giao dịch')}</span>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-content)' }}>
                    {t('Bấm để nhận USDC testnet từ')}{' '}
                    <span style={{ color: 'var(--color-warning)', textDecoration: 'underline' }}>Faucet</span>
                  </span>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('Contacts')}><Icon name="human" size="var(--is-item)" /><span>{t('Danh bạ')}</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><Icon name="scan" size="var(--is-item)" color="var(--color-white)" /><span>{t('Quét QR')}</span></button>
        <button className="action-card" onClick={() => navigate('PasteAddress')}><Icon name="copy" size="var(--is-item)" /><span>{t('Dán để gửi')}</span></button>
      </div>

      <NavBar active="HomeSend" />
    </div>
  )
}
