import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import hintIcon from '../../icon/hint.png'
import danhbaIcon from '../../icon/danhba.png'
import qrIcon from '../../icon/qr.png'
import qrWhiteIcon from '../../icon/qr-white.png'
import verifiedIcon from '../../icon/verified.png'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { getTokenBalances, fmtAmount } from '../chain'
import { IconPaste } from '../icons'

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
      <div className="row-1-5" style={{ display: 'grid', gridTemplateRows: 'repeat(5, 1fr)', overflowY: 'auto' }}>
        {/* Số dư — căn trái, cùng khoảng cách như mỗi token */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
          <span style={{ fontSize: 20, color: 'var(--color-muted)' }}>Số dư:</span>
          <span style={{ fontSize: 28, fontWeight: 'var(--fw-bold)', color: 'var(--color-black)', lineHeight: 1 }}>
            {loading ? '...' : totalVND.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          </span>
          <span style={{ fontSize: 20, color: 'var(--color-muted)' }}>VND</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>Đang tải...</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>
            {localStorage.getItem('ez_wallet_addr') ? 'Chưa có token' : 'Ví chưa được tạo — nạp USDC để kích hoạt'}
          </div>
        ) : tokens.map(t => (
          <div key={t.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
            <img
              src={`/tokens/${t.symbol.toLowerCase()}.png`}
              alt=""
              style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }}
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="token-icon" style={{ background: t.color, flexShrink: 0, display: 'none' }}>{t.symbol.slice(0, 2)}</div>
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>
              {t.amount.toFixed(t.symbol === 'cirBTC' ? 4 : 2)} {t.symbol}
            </span>
            <img src={verifiedIcon} alt="verified" style={{ width: 17, height: 17, flexShrink: 0 }} />
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{fmtVND(t.vnd)}</span>
          </div>
        ))}
      </div>

      <div className="row-7-8" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2dvh' }}>
        {!loading && (tokens.find(t => t.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
          <div className="tip-box" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
            <img src={hintIcon} alt='' style={{ width: 16, height: 16, marginRight: 6 }} />Hết USDC — cần USDC để thanh toán phí giao dịch. Vào <b>Đổi tiền</b> để swap.
          </div>
        ) : (
          <div className="tip-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <img src={hintIcon} alt='' style={{ width: 16, height: 16 }} />
              <b>Cách gửi tiền:</b>
            </div>
            <div><b>Danh bạ</b> — lưu địa chỉ ví quen thuộc để gửi nhanh</div>
            <div><b>Quét QR</b> — quét mã người nhận để chuyển tiền tiện lợi</div>
            <div><b>Dán để gửi</b> — dán địa chỉ ví người khác đưa cho bạn</div>
          </div>
        )}
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('Contacts')}><img src={danhbaIcon} alt="" style={{ width: 20, height: 20 }} /><span>Danh bạ</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><img src={qrWhiteIcon} alt="" style={{ width: 24, height: 24 }} /><span>Quét QR</span></button>
        <button className="action-card" onClick={() => navigate('PasteAddress')}><IconPaste size={20} /><span>Dán để gửi</span></button>
      </div>

      <NavBar active="HomeSend" />
    </div>
  )
}
