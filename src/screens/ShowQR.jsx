import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtMoney } from '../data'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'
import { buildQR } from '../qr'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'USD', name = '', saveToLibrary, fromStorage, back = 'HomeReceive' } = params
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  // Khoá chuỗi Arc — xem src/qr.js. ĐỪNG nối chuỗi `ezwallet:...` bằng tay ở đây nữa.
  const qrValue = buildQR(walletAddr, { amount, currency })
  // MỘT CHUỖI MỘT STYLE: "$2" / "2 USDC" (fmtMoney) — không tách bold số + regular đơn vị.
  const amountText = fmtMoney(amount, currency)
  const wrapRef = useRef(null)

  // CHỈ lưu vào kho khi tạo TỪ Kho QR (saveToLibrary) — kèm TÊN. QR tạo ở màn Nhận chỉ để
  // hiện/share, KHÔNG tự lưu (user chốt: đừng nhét mọi QR vào kho, phiền phải xóa).
  useEffect(() => {
    if (!saveToLibrary) return
    const list = loadSavedQRs()
    if (!list.some(q => q.amount === amount && (q.currency || 'USD') === currency && (q.name || '') === name)) {
      list.push({ id: Date.now(), amount, currency, name, createdAt: new Date().toISOString() })
      saveSavedQRs(list)
    }
  }, [])

  // "Chia sẻ": Web Share API → iOS/Android "Lưu ảnh vào Photos" + gửi qua app social.
  function shareQR() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    saveImageToPhotos(canvas, `ezwallet-qr-${amount}.png`)
  }

  // Tiêu đề (user chốt 07-20e): mở QR ĐÃ LƯU từ kho (fromStorage) → "QR: <tên>" (bỏ chữ "Storage"
  // cho gọn, tên dài đỡ thiếu chỗ), QR không đặt tên → "QR: Item". Tạo QR mới → "Create receive QR".
  const title = fromStorage ? `QR: ${name || 'Item'}` : t('Tạo QR nhận tiền')

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
        {title}
      </div>

      {/* QR TO = bằng QR màn Nhận (min(30dvh,78vw)), cao đúng 3 hàng (2-3-4). Dùng canvas để Share
          xuất PNG được; render size 512 rồi ép bề ngang cho nét (user chốt 07-20). */}
      <div ref={wrapRef} style={{ gridRow: '2 / 5', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <QRCodeCanvas value={qrValue} size={512} level="M" style={{ width: 'min(30dvh, 78vw)', height: 'min(30dvh, 78vw)' }} />
      </div>

      {/* Hàng 5 trở xuống: số tiền TO (như số dư màn chính) · câu chú thích · CHỮ Share.
          Câu chú thích nói rõ GIỚI HẠN (chỉ USDC trên Arc Testnet) — người gửi cầm QR này phải
          biết ngay, đừng để họ gửi token/chuỗi khác rồi mất tiền. */}
      <div style={{ gridRow: '5 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', lineHeight: 1, color: 'var(--color-content)' }}>{amountText}</span>
        <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', textAlign: 'center', padding: '0 8px' }}>
          {t('Cho người gửi quét mã này – hiện chỉ hỗ trợ USDC trên Arc Testnet')}
        </span>
        {/* Share = CHỮ XANH + icon, KHÔNG phải nút (user chốt 08-13): không viền, không nền,
            không đổ bóng. Vẫn bấm được — dùng <button> trần cho đúng ngữ nghĩa + bấm bằng phím. */}
        <button onClick={shareQR} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 2,
          background: 'none', border: 'none', padding: 6, cursor: 'pointer',
          fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)',
          color: 'var(--color-brand)', WebkitTextFillColor: 'var(--color-brand)', WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="share" size="var(--is-md-lg)" color="var(--color-brand)" />
          {t('Chia sẻ')}
        </button>
      </div>

      {/* Hàng 10: [Back] trắng · [Done] xanh (user sửa 08-13 — trước là [Chia sẻ] trắng ·
          [Quay lại] XANH, sai vai trò: nút xanh trong app LUÔN là hành động chính/kết thúc, mà
          "Quay lại" thì không phải; còn Chia sẻ đã chuyển lên thành chữ ở trên).
          Back = về đúng màn vừa tới từ đó (kho QR / màn Nhận). Done = xong hẳn, về màn Nhận. */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate(back)}>{t('Quay lại')}</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeReceive')}>{t('Xong')}</button>
      </div>
    </div>
  )
}
