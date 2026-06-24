import { QRCodeSVG } from 'qrcode.react'
import NavBar from '../components/NavBar'
import { useNav } from '../nav'
import { MOCK_VND, MOCK_ADDR, fmtVND } from '../data'
import { IconShare, IconQRSaved } from '../icons'

export default function HomeReceive() {
  const { navigate } = useNav()
  const shortAddr = MOCK_ADDR.slice(0, 6) + '...' + MOCK_ADDR.slice(-4)

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

      <div className="row-3-6 center col" style={{ gap: 8 }}>
        <QRCodeSVG value={MOCK_ADDR} size={150} level="M" />
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-gray)' }}>
          {shortAddr} · địa chỉ ví của bạn
        </span>
      </div>

      <div className="row-7-8" style={{ padding: '6px 0' }}>
        <div className="tip-box">Cho người gửi quét QR này để nhận tiền trực tiếp</div>
      </div>

      <div className="row-9 action-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className="action-card">
          <IconShare size={20} />
          <span>Chia sẻ QR</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('SavedQRList')}>
          <IconQRSaved size={20} />
          <span>QR đã lưu</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
