import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import { fmtMoney } from '../data'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'USD', name = '', saveToLibrary, back = 'HomeReceive' } = params
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
