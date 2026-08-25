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

  // Title (user decision 07-20e): opening a SAVED QR from the library (fromStorage) → "QR: <name>" (the word "Storage"
  // was dropped to leave room for long names), an unnamed QR → "QR: Item". A newly created QR → "Create receive QR".
  const title = fromStorage ? `QR: ${name || 'Item'}` : 'Create receive QR'

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>
        {title}
      </div>

      {/* BIG QR = the same size as the Receive screen's (min(30dvh,78vw)), exactly 3 rows tall (2-3-4). A canvas is used so
          Share can export a PNG; rendered at size 512 then constrained in width for sharpness (user decision 07-20). */}
      <div ref={wrapRef} style={{ gridRow: '2 / 5', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <QRCodeCanvas value={qrValue} size={512} level="M" style={{ width: 'min(30dvh, 78vw)', height: 'min(30dvh, 78vw)' }} />
      </div>

      {/* Row 5 down: the BIG amount (like the main balance) · the caption · the Share text.
          The caption spells out the LIMIT (USDC on Arc Testnet only) - whoever holds this QR has to know that
          immediately, rather than sending another token/chain and losing the money. */}
      <div style={{ gridRow: '5 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 10, paddingTop: 8 }}>
        <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', lineHeight: 1, color: 'var(--color-content)' }}>{amountText}</span>
        {/* Font size: --fs-item 17 (user decision 08-13 "it is only a caption after all"), down from
            --fs-md-lg 21 - 21 is the BUTTON size, using it for a caption is the wrong role and made this sentence
            run to 3 lines. Do NOT drop it all the way to --fs-label 15 (the standard "secondary text" size): this app is
            for older people, and 15px is the edge of legibility. 17 = the size used by the hint blocks on Send/Receive. */}
        <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', textAlign: 'center', padding: '0 8px' }}>
          Have the sender scan this code – currently supports only USDC on Arc Testnet
        </span>
        {/* Share = BLUE TEXT + icon, NOT a button (user decision 08-13): no border, no background,
            no shadow. Still tappable - a bare <button> for correct semantics and keyboard access. */}
        <button onClick={shareQR} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 2,
          background: 'none', border: 'none', padding: 6, cursor: 'pointer',
          fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)',
          color: 'var(--color-brand)', WebkitTextFillColor: 'var(--color-brand)', WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="share" size="var(--is-md-lg)" color="var(--color-brand)" />
          Share
        </button>
      </div>

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
