import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import { fmtMoney } from '../data'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'USD', isNew, back = 'HomeReceive' } = params
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  const qrValue = `ezwallet:${walletAddr}?amount=${amount}&cur=${currency}`
  // MỘT CHUỖI MỘT STYLE: "$2" / "2 USDC" (fmtMoney) — không tách bold số + regular đơn vị.
  const amountText = fmtMoney(amount, currency)
  const wrapRef = useRef(null)

  // AUTO lưu vào kho khi VỪA TẠO (isNew) — bỏ bước "Lưu vào kho QR" thủ công (user chốt).
  // Xem existing (từ Kho QR) thì isNew=false → không lưu lại (khỏi trùng).
  useEffect(() => {
    if (!isNew) return
    const list = loadSavedQRs()
    if (!list.some(q => q.amount === amount && (q.currency || 'USD') === currency)) {
      list.push({ id: Date.now(), amount, currency, createdAt: new Date().toISOString() })
      saveSavedQRs(list)
    }
  }, [])

  // "Chia sẻ": Web Share API → iOS/Android "Lưu ảnh vào Photos" + gửi qua app social.
  function shareQR() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    saveImageToPhotos(canvas, `ezwallet-qr-${amount}.png`)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Tạo QR nhận tiền')}
      </div>

      <div ref={wrapRef} className="row-3-6 center col" style={{ gap: 12 }}>
        <QRCodeCanvas value={qrValue} size={200} level="M" />
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)' }}>{amountText}</span>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{t('Cho người gửi quét mã này')}</span>
      </div>

      {/* Chỉ 2 nút: [Chia sẻ] trắng (trái) · [Quay lại] xanh (phải) — ngang hàng */}
      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={shareQR}>{t('Chia sẻ')}</button>
        <button className="btn btn-primary" onClick={() => navigate(back)}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
