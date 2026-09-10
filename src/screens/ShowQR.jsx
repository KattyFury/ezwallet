import { useRef, useEffect } from 'react'
import { useNav } from '../nav'
import { QRCodeCanvas } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtMoney } from '../data'
import { saveImageToPhotos, brandedQrCanvas } from '../saveImage'
import { loadSavedQRs, saveSavedQRs } from '../store'
import { buildQR } from '../qr'

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
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
        {title}
      </div>

      {/* QR - node 1:238/18:166/18:304: a literal fixed 258x258 (was a responsive min(30dvh,78vw)), top
          11.81dvh, centred horizontally. A canvas is used so Share can export a PNG; rendered at size 512
          then constrained in width for sharpness (user decision 07-20). */}
      <div ref={wrapRef} style={{ position: 'absolute', left: '50%', top: '11.81dvh', transform: 'translateX(-50%)', width: 258, height: 258 }}>
        <QRCodeCanvas value={qrValue} size={512} level="M" style={{ width: 258, height: 258 }} />
      </div>

      {/* Amount - node 1:135/18:302: centre 46.66dvh, 48px SEMIBOLD (not the app's usual hero-number Light -
          this is a RESULT display like Receipt's amount, not an input, and Figma draws it semibold here
          same as Receipt's card row), brand blue. */}
      <span className="num" style={{ position: 'absolute', left: '50%', top: '46.66dvh', transform: 'translate(-50%, -50%)', fontSize: 48, fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>{amountText}</span>

      {/* Caption - node 1:136/18:303: centre 55.09dvh, 16px semibold, 2 lines - "Have the sender scan this
          code" black, "Current Available Network: Arc Testnet" in --color-error (the file's OLDER, unedited
          copies of this frame still draw the pre-09-08 red #EC221F - BRAND-GUIDELINE.md's current #FF383C
          wins, per the two-sources rule: an unedited leftover inside Figma is not a second source). */}
      <div style={{ position: 'absolute', left: '50%', top: '55.09dvh', transform: 'translate(-50%, -50%)', width: 324, fontSize: 16, fontWeight: 'var(--fw-semibold)', textAlign: 'center', lineHeight: '24px' }}>
        <span>Have the sender scan this code</span><br />
        <span style={{ color: 'var(--color-error)' }}>Current Available Network: Arc Testnet</span>
      </div>

      {/* Share - node has none drawn (Figma's static mock only shows Back/Done) - kept as real, working,
          previously-verified functionality (user decision 08-13), positioned in the blank space below the
          caption rather than removed. */}
      <button onClick={shareQR} style={{
        position: 'absolute', left: '50%', top: '63dvh', transform: 'translateX(-50%)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', padding: 6, cursor: 'pointer',
        fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)',
        color: 'var(--color-brand)', WebkitTextFillColor: 'var(--color-brand)', WebkitTapHighlightColor: 'transparent',
      }}>
        <Icon name="share" size="var(--is-md-lg)" color="var(--color-brand)" />
        Share
      </button>

      {/* Row 10: [Back] white · [Done] blue (user fix 08-13 - it used to be [Share] white ·
          [Back] BLUE, the wrong roles: a blue button in this app is ALWAYS the primary/finishing action, which
          "Back" is not; and Share moved up to be text).
          Back = return to wherever you came from (QR library / Receive screen). Done = finished, back to Receive. */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate(back)}>Back</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeReceive')}>Done</button>
      </div>
    </div>
  )
}
