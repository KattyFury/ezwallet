import { useEffect } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { fmtMoney } from '../data'
import { addNotif } from '../notif'
import { saveImageToPhotos } from '../saveImage'
import logoLong from '../../design/logo.svg'

// Big GREEN check icon (success) - check.svg already includes the outlined circle and the tick
function CheckIcon() {
  return <Icon name="check" size={76} color="var(--color-primary)" />
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
  // Defaults to 'USD' (it used to be 'VND' - a leftover from when the app counted in VND). Since 08-04 VND is a REAL
  // currency, so a wrong default would render a receipt with a missing currency as Vietnamese money.
  const { address, name, amount, memo, currency = 'USD', timestamp } = params
  const to = name || shortenAddr(address)
  // "$2" as one string in one style (NOT a bold "2" plus a regular "USD" - user decision)
  const amountText = currency === 'VND' ? `${Number(amount).toLocaleString('vi-VN')} ₫` : fmtMoney(amount, currency)
  // The REAL token moved on-chain (USD = a label, USDC actually moves 1:1) - shown plainly on the receipt
  // so sender and recipient can reconcile the actual asset (nobody should read a label and assume another token).
  // ⚠️ VND is NOT a token: what actually moves is USDC, and the USDC figure ≠ the VND typed → you must use
  // params.tokenAmount (decided in SendAmount, forwarded by SendConfirm), never `amount`.
  const realToken = currency === 'USD' || currency === 'VND' ? 'USDC' : currency
  const realUnits = currency === 'VND' ? (params.tokenAmount ?? 0) : Number(amount)
  const realAmountText = `${realToken === 'cirBTC' ? realUnits.toFixed(8) : realUnits.toFixed(2)} ${realToken}`

  // Store the "sent" notification for HomeSend to show. dedupeKey is the timestamp (unique per real send)
  // → guards against duplication from React.StrictMode running the effect twice in dev mode.
  useEffect(() => {
    addNotif(`Sent ${amountText} to ${to}`, 'sent', null, `sent-${timestamp}`)
  }, [])

  // Draw the receipt onto a canvas, then save it to the photo library
  async function saveReceipt() {
    // Height = bottom of the last row + 50 breathing space + logo + 22 margin (user decision 07-23: the logo used to
    // touch the last row's divider). 3 fixed rows = 590; the Address row (only when named) / Note row add 60 each.
    const W = 620, H = 590 + (name && address ? 60 : 0) + (memo ? 60 : 0)
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const x = cv.getContext('2d')
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H)
    // Big GREEN check icon (outlined circle + tick, same style as check.svg) - success
    x.strokeStyle = '#16A34A'; x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round'
    x.beginPath(); x.arc(W / 2, 90, 44, 0, Math.PI * 2); x.stroke()
    x.beginPath(); x.moveTo(W / 2 - 20, 90); x.lineTo(W / 2 - 6, 105); x.lineTo(W / 2 + 22, 73); x.stroke()
    x.textAlign = 'center'
    x.fillStyle = '#000000'; x.font = '600 32px sans-serif'; x.fillText('Sent successfully', W / 2, 180)
    x.fillStyle = '#0B53BF'; x.font = '700 52px sans-serif'; x.fillText(amountText, W / 2, 245)
    // the rows
    let yy = 320
    const row = (label, val) => {
      x.textAlign = 'left'; x.fillStyle = '#AEAEB2'; x.font = '22px sans-serif'; x.fillText(label, 50, yy)
      x.textAlign = 'right'; x.fillStyle = '#000000'; x.font = '500 22px sans-serif'; x.fillText(val, W - 50, yy)
      x.strokeStyle = '#E5E5EA'; x.lineWidth = 1; x.beginPath(); x.moveTo(50, yy + 22); x.lineTo(W - 50, yy + 22); x.stroke()
      yy += 60
    }
    row('Send to', to)
    if (name && address) row('Address', shortenAddr(address))   // shortened; only when Send to = a contact name
    row('Amount', realAmountText)
    if (memo) row('Note', memo)
    row('Time', fmtTime(timestamp))
    // The EZwallet logo (the standard branding - design/logo.svg, brand-blue EZ + black wallet) at the bottom -
    // anchored to the canvas BOTTOM, H already reserves 50px of breathing space after the last row (keep the logo off the divider)
    const lw = 168, lh = lw * 380 / 1160   // aspect ratio of the new logo.svg (viewBox 1160×380)
    const img = new Image()
    img.src = logoLong
    try { await img.decode() } catch {}
    x.drawImage(img, (W - lw) / 2, H - 22 - lh, lw, lh)
    saveImageToPhotos(cv, `bien-lai-${timestamp}.png`)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Receipt
      </div>

      <div className="row-2-8 col center" style={{ gap: 12 }}>
        <CheckIcon />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>Sent successfully</span>
        {/* ONE span, ONE font/size/weight - "$2" as a single block */}
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>
          {amountText}
        </span>
        <div className="confirm-box" style={{ width: '100%' }}>
          <div className="confirm-row">
            <span className="confirm-label">Send to</span>
            <span className="confirm-value">{to}</span>
          </div>
          {/* SHORTENED wallet address 0x1234…5678 (user decision 07-23: not the full one, it is long and ugly). Shown ONLY when
              Send to is a contact NAME - without a name, Send to is already the shortened address, so this would repeat it. */}
          {name && address ? (
            <div className="confirm-row">
              <span className="confirm-label">Address</span>
              <span className="confirm-value num">{shortenAddr(address)}</span>
            </div>
          ) : null}
          <div className="confirm-row">
            <span className="confirm-label">Amount</span>
            <span className="confirm-value num">{realAmountText}</span>
          </div>
          {memo ? (
            <div className="confirm-row">
              <span className="confirm-label">Note</span>
              <span className="confirm-value">{memo}</span>
            </div>
          ) : null}
          <div className="confirm-row">
            <span className="confirm-label">Time</span>
            <span className="confirm-value" style={{ fontSize: 'var(--fs-body)' }}>{fmtTime(timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={saveReceipt}>Save receipt</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>Done</button>
      </div>
    </div>
  )
}
