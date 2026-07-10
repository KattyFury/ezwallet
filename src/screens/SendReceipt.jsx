import { useEffect } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { fmtVND, fmtMoney } from '../data'
import { addNotif } from '../notif'
import { saveImageToPhotos } from '../saveImage'
import logoLong from '../../design/logo.svg'
import { t } from '../i18n'

// Vòng tròn xanh + check.svg trắng (dùng chung icon hệ thống, không vẽ path riêng)
function CheckIcon() {
  return (
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={34} color="var(--color-white)" />
    </div>
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
  // "$2" một chuỗi một style (KHÔNG tách "2" đậm + "USD" thường — user chốt)
  const amountText = currency === 'VND' ? fmtVND(amount) : fmtMoney(amount, currency)
  // Token THẬT đã chuyển on-chain (USD = nhãn, thực chuyển USDC 1:1) — hiện rõ trong biên lai
  // để người nhận/gửi đối soát đúng tài sản (tránh "bị hố" nhìn nhãn tưởng token khác).
  const realToken = currency === 'USD' ? 'USDC' : currency
  const realAmountText = `${realToken === 'cirBTC' ? Number(amount).toFixed(8) : Number(amount).toFixed(2)} ${realToken}`

  // Lưu thông báo "đã gửi" để HomeSend hiện. dedupeKey theo timestamp (duy nhất mỗi lần gửi thật)
  // → chống nhân đôi do React.StrictMode gọi effect 2 lần ở dev mode.
  useEffect(() => {
    addNotif(`${t('Đã gửi')} ${amountText} ${t('cho')} ${to}`, 'sent', null, `sent-${timestamp}`)
  }, [])

  // Vẽ biên lai ra canvas rồi tải về kho ảnh
  async function saveReceipt() {
    const W = 620, H = memo ? 600 : 540   // +60 cho dòng Amount mới
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const x = cv.getContext('2d')
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H)
    // check tròn xanh lá (thành công)
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
    row('Amount', realAmountText)
    if (memo) row(t('Nội dung'), memo)
    row(t('Thời gian'), fmtTime(timestamp))
    // Logo EZwallet (branding chuẩn — design/logo.svg, EZ xanh thương hiệu + wallet đen) ở đáy
    const lw = 168, lh = lw * 144 / 463
    const img = new Image()
    img.src = logoLong
    try { await img.decode() } catch {}
    x.drawImage(img, (W - lw) / 2, H - 22 - lh, lw, lh)
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
        {/* MỘT span, MỘT font/size/weight — "$2" liền khối */}
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)' }}>
          {amountText}
        </span>
        <div className="confirm-box" style={{ width: '100%' }}>
          <div className="confirm-row">
            <span className="confirm-label">{t('Gửi đến')}</span>
            <span className="confirm-value">{to}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Amount</span>
            <span className="confirm-value num">{realAmountText}</span>
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
