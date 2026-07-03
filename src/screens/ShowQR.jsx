import { useRef } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import { fmtVND, displaySymbol } from '../data'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'VND', from } = params
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  const qrValue = `ezwallet:${walletAddr}?amount=${amount}&cur=${currency}`
  const amountText = currency === 'VND' ? fmtVND(amount) : `${amount} ${displaySymbol(currency)}`
  const wrapRef = useRef(null)

  // Từ CreateQR → còn nút "Lưu vào kho QR" (lưu để dùng lại). Từ SavedQRList → đã có sẵn trong kho.
  const fromLibrary = from === 'SavedQRList'

  // "Chia sẻ": mở khay chia sẻ native (Web Share API) → iOS/Android hiện "Lưu ảnh vào Photos"
  // + gửi qua các app social. Fallback (desktop) = tải ảnh về. Flow đúng: người tạo QR có thể
  // GỬI ẢNH cho người khác qua social, không nhất thiết đưa họ quét trực tiếp.
  function shareQR() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    saveImageToPhotos(canvas, `ezwallet-qr-${amount}.png`)
  }

  function saveToLibrary() {
    const list = loadSavedQRs()
    if (!list.some(q => q.amount === amount && (q.currency || 'VND') === currency)) {
      list.push({ id: Date.now(), amount, currency, createdAt: new Date().toISOString() })
      saveSavedQRs(list)
    }
    navigate('SavedQRList')
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

      {/* Chia sẻ = hành động CHÍNH (gửi ảnh QR qua social / lưu Photos). "Lưu vào kho QR" phụ. */}
      <div style={{ gridRow: '8 / 11', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button className="btn btn-primary" style={{ width: '66%' }} onClick={shareQR}>{t('Chia sẻ')}</button>
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          {!fromLibrary && (
            <button className="btn btn-secondary" style={{ width: '44%' }} onClick={saveToLibrary}>{t('Lưu vào kho QR')}</button>
          )}
          <button className="btn btn-secondary" style={{ width: '44%' }} onClick={() => navigate(from === 'SavedQRList' ? 'SavedQRList' : 'HomeReceive')}>{t('Quay lại')}</button>
        </div>
      </div>
    </div>
  )
}
