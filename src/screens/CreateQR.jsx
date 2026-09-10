import { useState } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { displaySymbol } from '../data'
import { useFitFontSize } from '../useFitFontSize'

// Consistent with the Send screen: USD (friendly label, backed by USDC) by default + USDC/EURC/cirBTC.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']

export default function CreateQR() {
  const { navigate, params } = useNav()
  const [digits, setDigits] = useState('')
  const [cur, setCur] = useState('USD')
  const [showCur, setShowCur] = useState(false)
  const [name, setName] = useState('')
  // Keyboard rule 07-23 (same as SendAmount): typing TEXT (the QR name field) → hide the app numpad, blur → show it again
  const [typingText, setTypingText] = useState(false)
  // From the QR library → creating also SAVES it to the library (with a NAME); from Receive → only shown to share, NOT saved.
  const fromLibrary = params?.from === 'SavedQRList'

  const amount = parseFloat(digits || '0')
  const amountStr = (cur === 'USD' ? displaySymbol('USDC') : '') + digits
  const [fitRef, fitSize] = useFitFontSize(amountStr + '_', { max: 44, min: 18, weight: 300 })

  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === '.') { setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Created receive QR
      </div>

      {/* "You receive" card - node 18:84: rows 3-4 (340x156, top 20.38dvh, radius 16 - ONE row lower than
          Send money's "You send" card, RE-VERIFIED 2026-09-10, not assumed from that screen's position). */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '20.38dvh', height: '18.48dvh', background: 'var(--color-surface)', borderRadius: 16 }} />

      <span style={{ position: 'absolute', left: '8.46%', top: '23.74dvh', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 'var(--fw-semibold)' }}>You receive</span>

      {/* Chip - node 18:88: centre 29.6dvh. Icon (18:89) is a literal 24x24 BLACK SQUARE, no rounding -
          same as Send money's chip, not a real token logo (Figma draws none). */}
      <button onClick={() => setShowCur(true)}
        style={{ position: 'absolute', left: '8.46%', top: '29.6dvh', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'var(--color-white)', borderRadius: 999, height: 42, padding: '0 14px 0 8px', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)', fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-black)', cursor: 'pointer' }}>
        <div style={{ width: 24, height: 24, background: 'var(--color-black)', flexShrink: 0 }} />
        {cur}
        <Icon name="down2" size="var(--is-item)" color="var(--color-brand)" />
      </button>

      {/* node 18:87: "Balance:" (not "Available:" - Receive's own wording, verbatim from Figma). */}
      <span style={{ position: 'absolute', left: '8.46%', top: '35.47dvh', transform: 'translateY(-50%)', fontSize: 16, whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--color-muted-2)' }}>Balance: </span>
        <span className="num" style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>20.00 {cur === 'USD' ? 'USDC' : cur}</span>
      </span>

      {/* Amount - node 18:93: top-anchored at 26.92dvh, right-aligned to the same 8.46% inset, 44px Light
          (Figma draws Regular - the app's standing "big numbers are always Light" rule, same override
          Send money's amount uses). */}
      <div ref={fitRef} style={{ position: 'absolute', left: '51%', right: '8.46%', top: '26.92dvh', textAlign: 'right' }}>
        <span className="num" style={{ fontSize: fitSize, fontWeight: 'var(--fw-light)', lineHeight: 1, whiteSpace: 'nowrap', color: digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
          {amountStr}<span className="caret">_</span>
        </span>
      </div>

      {/* QR name field - Figma draws no such row (this state only exists when arriving FROM the QR
          library, which has no dedicated Figma frame) - kept, placed in the blank space between the card
          and the numpad panel. */}
      {fromLibrary && (
        <div className="memo-row" style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '44.5dvh' }}>
          <Icon name="pencil" size="var(--is-md-lg)" color="var(--color-muted)" />
          <input className="memo-input" value={name} onChange={e => setName(e.target.value)} placeholder={'Name your QR'} maxLength={30}
            onFocus={() => setTypingText(true)} onBlur={() => setTypingText(false)} />
        </div>
      )}

      {/* GREY numpad panel - node 18:107 etc, same fixed 48px-key/8px-gap/27px-offset geometry as Send
          money's numpad (2026-09-10 correction there applies identically here - same component, same file). */}
      {!typingText && (
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '0 -20px 0', padding: '27px 20px 0', background: 'var(--color-surface-2)', borderRadius: '20px 20px 0 0' }}>
        <div style={{ height: 216 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
      </div>
      )}

      {/* The [Back][Continue] buttons - node 18:103/18:104/18:105/18:106: "Back"/"Continue" (was
          "Cancel"/"Create QR" - the exact Figma labels). Standard row10-dual position. */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate(fromLibrary ? 'SavedQRList' : 'HomeReceive')}>Back</button>
        <button className="btn btn-primary" disabled={amount <= 0}
          onClick={() => navigate('ShowQR', { amount, currency: cur, name: name.trim(), saveToLibrary: fromLibrary, back: fromLibrary ? 'SavedQRList' : 'HomeReceive' })}>
          Continue
        </button>
      </div>

      {showCur && (
        <div className="popup-overlay" onClick={() => setShowCur(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Select currency</div>
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => { setCur(c); setShowCur(false) }}
                className={`btn ${c === cur ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>{c}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
