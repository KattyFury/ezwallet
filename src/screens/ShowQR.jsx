import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import { fmtMoney } from '../data'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'USD', name = '', saveToLibrary, fromStorage, back = 'HomeReceive' } = params
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  const qrValue = `ezwallet:${walletAddr}?amount=${amount}&cur=${currency}`
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

  // Tiêu đề (user chốt 07-20d): mở QR ĐÃ LƯU từ kho (fromStorage) → "QR Storage: <tên>", QR không
  // đặt tên → "QR Storage: Item". Tạo QR mới (màn Nhận / custom) → "Create receive QR".
  // Phân biệt bằng cờ fromStorage, KHÔNG dựa vào có/không tên (QR lưu không tên vẫn thuộc kho).
  const title = fromStorage ? `${t('Kho QR')}: ${name || 'Item'}` : t('Tạo QR nhận tiền')

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

      {/* Hàng 5 trở xuống: số tiền TO (như số dư màn chính) + phụ đề cỡ vừa-to cho dễ đọc */}
      <div style={{ gridRow: '5 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', lineHeight: 1, color: 'var(--color-content)' }}>{amountText}</span>
        <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)' }}>{t('Cho người gửi quét mã này')}</span>
      </div>

      {/* Ranh giới hàng 9-10: [Chia sẻ] trắng (trái) · [Quay lại] xanh (phải) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={shareQR}>{t('Chia sẻ')}</button>
        <button className="btn btn-primary" onClick={() => navigate(back)}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
