import { useEffect } from 'react'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { addNotif } from '../notif'
import { saveImageToPhotos } from '../saveImage'
import { t } from '../i18n'

function CheckIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="var(--color-primary)" />
      <path d="M7 12l4 4 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

function fmtTime(ts) {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SendReceipt() {
  const { navigate, params } = useNav()
  const { address, name, amount, memo, currency = 'VND', timestamp } = params
  const to = name || shortenAddr(address)
  const amountText = currency === 'VND' ? fmtVND(amount) : `${amount} ${currency}`

  // Lưu thông báo "đã gửi" để HomeSend hiện
  useEffect(() => {
    addNotif(`${t('Đã gửi')} ${amountText} ${t('cho')} ${to}`, 'sent')
  }, [])

  // Vẽ biên lai ra canvas rồi tải về kho ảnh
  function saveReceipt() {
    const W = 620, H = memo ? 540 : 480
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const x = cv.getContext('2d')
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H)
    // check tròn xanh
    x.fillStyle = '#16A34A'; x.beginPath(); x.arc(W / 2, 90, 40, 0, Math.PI * 2); x.fill()
    x.strokeStyle = '#FFFFFF'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round'
    x.beginPath(); x.moveTo(W / 2 - 18, 90); x.lineTo(W / 2 - 5, 104); x.lineTo(W / 2 + 20, 76); x.stroke()
    x.textAlign = 'center'
    x.fillStyle = '#000000'; x.font = '600 32px sans-serif'; x.fillText(t('Đã gửi thành công'), W / 2, 175)
    x.fillStyle = '#16A34A'; x.font = '700 52px sans-serif'; x.fillText(amountText, W / 2, 240)
    // các dòng
    let yy = 320
    const row = (label, val) => {
      x.textAlign = 'left'; x.fillStyle = '#AEAEB2'; x.font = '22px sans-serif'; x.fillText(label, 50, yy)
      x.textAlign = 'right'; x.fillStyle = '#000000'; x.font = '500 22px sans-serif'; x.fillText(val, W - 50, yy)
      x.strokeStyle = '#E5E5EA'; x.lineWidth = 1; x.beginPath(); x.moveTo(50, yy + 22); x.lineTo(W - 50, yy + 22); x.stroke()
      yy += 60
    }
    row(t('Gửi đến'), to)
    if (memo) row(t('Nội dung'), memo)
    row(t('Thời gian'), fmtTime(timestamp))
    x.textAlign = 'center'; x.fillStyle = '#16A34A'; x.font = '700 26px sans-serif'; x.fillText('EZ Wallet', W / 2, H - 30)
    saveImageToPhotos(cv, `bien-lai-${timestamp}.png`)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Biên lai')}
      </div>

      <div className="row-2-8 col center" style={{ gap: 12 }}>
        <CheckIcon />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{t('Đã gửi thành công')}</span>
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)' }}>
          {currency === 'VND' ? amountText : <>{amount} <span style={{ fontFamily: 'var(--font-base)', fontWeight: 'var(--fw-medium)' }}>{currency}</span></>}
        </span>
        <div className="confirm-box" style={{ width: '100%' }}>
          <div className="confirm-row">
            <span className="confirm-label">{t('Gửi đến')}</span>
            <span className="confirm-value">{to}</span>
          </div>
          {memo ? (
            <div className="confirm-row">
              <span className="confirm-label">{t('Nội dung')}</span>
              <span className="confirm-value">{memo}</span>
            </div>
          ) : null}
          <div className="confirm-row">
            <span className="confirm-label">{t('Thời gian')}</span>
            <span className="confirm-value" style={{ fontSize: 'var(--fs-label)' }}>{fmtTime(timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={saveReceipt}>{t('Lưu biên lai')}</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>{t('Xong')}</button>
      </div>
    </div>
  )
}
