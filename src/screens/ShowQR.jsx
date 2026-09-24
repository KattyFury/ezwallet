import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtMoney } from '../data'
import { saveImageToPhotos, brandedQrCanvas } from '../saveImage'
import { loadSavedQRs, saveSavedQRs } from '../store'
import { buildQR } from '../qr'
import ScreenSheet from '../components/ScreenSheet'
import ExitBar from '../components/ExitBar'
import { GRADIENT } from '../brandBg'

export default function ShowQR() {
  const { navigate, params } = useNav()
  const { amount, currency = 'USD', name = '', saveToLibrary, fromStorage, back = 'HomeReceive' } = params
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''
  // Arc chain lock - see src/qr.js. Do NOT hand-build `ezwallet:...` strings here any more.
  const qrValue = buildQR(walletAddr, { amount, currency })
  // ONE STRING, ONE STYLE: "$2" / "2 USDC" (fmtMoney) - not a bold number plus a regular unit.
  const amountText = fmtMoney(amount, currency)
  const wrapRef = useRef(null)

  // Only saved to the library when created FROM the library (saveToLibrary) - with a NAME. A QR created on the
  // Receive screen is only shown/shared, NOT saved (user decision: do not stuff every QR into the library, it becomes a chore to clean).
  useEffect(() => {
    if (!saveToLibrary) return
    const list = loadSavedQRs()
    if (!list.some(q => q.amount === amount && (q.currency || 'USD') === currency && (q.name || '') === name)) {
      list.push({ id: Date.now(), amount, currency, name, createdAt: new Date().toISOString() })
      saveSavedQRs(list)
    }
  }, [])

  // "Share": Web Share API → iOS/Android "Save image to Photos" + sending through social apps.
  // IMAGE ONLY, no address text attached (user decision 08-13) - unlike the Receive screen. Here what matters is the
  // AMOUNT in the QR, and scanning it yields the address anyway; attaching the address is both redundant and makes iOS
  // filter the share targets. The image still goes through brandedQrCanvas for the logo + the "Only Arc Testnet" label, like Receive.
  async function shareQR() {
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!canvas) return
    saveImageToPhotos(await brandedQrCanvas(canvas), `ezwallet-qr-${amount}.png`)
  }

  // Title, RE-VERIFIED 2026-09-10 against nodes 1:128/18:296: a newly created QR reads "Created receive QR"
  // (past tense - the code said "Create...", missing the "d"), a saved QR's title is the NAME ITSELF, no
  // "QR:" prefix at all (node 18:296 literally reads "Arabica", not "QR: Arabica").
  const title = fromStorage ? (name || 'Item') : 'Created receive QR'

  return (
    <div className="screen" style={{ background: GRADIENT }}>
      <ScreenSheet />
      <div className="sheet-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
        {title}
      </div>

      {/* QR - node 58:541/58:640: fixed 258x258, top 11.81dvh, centred horizontally. A canvas is used so
          Share can export a PNG; rendered at size 512 then constrained in width for sharpness. */}
      <div ref={wrapRef} style={{ position: 'absolute', left: '50%', top: '11.81dvh', transform: 'translateX(-50%)', width: 258, height: 258 }}>
        <QRCodeCanvas value={qrValue} size={512} level="M" style={{ width: 258, height: 258 }} />
      </div>

      {/* Caption THEN amount, node 1:136/1:135 (RE-VERIFIED 2026-09-24, order swapped from the previous
          pass, ONE line only - "Have the sender scan this code" is gone, Figma draws just the network
          line): caption top-anchored 43.32dvh, amount centred 50dvh, 48px semibold brand blue. */}
      <div style={{ position: 'absolute', left: '50%', top: '43.32dvh', transform: 'translateX(-50%)', width: 340, fontSize: 14, fontWeight: 'var(--fw-semibold)', textAlign: 'center', color: 'var(--color-error)' }}>
        Current Available Network: Arc Testnet
      </div>
      <span className="num" style={{ position: 'absolute', left: '50%', top: '50dvh', transform: 'translate(-50%, -50%)', fontSize: 48, fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>{amountText}</span>

      {/* Share/Done - node 58:599/58:598: white "Share" (left, was "Back" pre-2026-09-24 - Figma dropped
          the Back role from this row) + blue "Done" (right). Since the row lost its own Back, the QR
          library's "return to where I came from" need is covered by Exit below instead. */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={shareQR} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="share" size="var(--is-content-1)" />
          Share
        </button>
        <button className="btn btn-primary" onClick={() => navigate('HomeReceive')}>Done</button>
      </div>

      <ExitBar onClick={() => navigate(back)} />
    </div>
  )
}
