import { useState } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { displaySymbol, amountFontSize } from '../data'

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

  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === '.') { setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Create receive QR
      </div>

      {/* GEOMETRY MATCHES SendAmount (user decision 07-23 "two screens with the same job must look the same"):
          the label/amount block is one flex column, gridRow 2/6, gap 4dvh, exactly like Send. Line 1 = "Amount to
          receive" (where "Send to: X" sits, BLACK medium text at the same fs-md-lg size); line 2 = amount + [USD] chip
          copied verbatim from Send (chip fs-md-lg + BRAND arrow - it used to be fs-label + muted, which broke
          the 07-22c standard); line 3 = the QR name field (only from the QR library - sits where Send has its note field). */}
      <div style={{ gridRow: '2 / 6', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4dvh', minWidth: 0 }}>
        <div className="center" style={{ gap: 6 }}>
          <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)' }}>Amount to receive</span>
        </div>

        <div className="center col" style={{ gap: 6 }}>
          {/* The big number is ALWAYS centred; the currency chip is anchored to the RIGHT EDGE - block copied from SendAmount */}
          <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="num" style={{ fontSize: amountFontSize((cur === 'USD' ? '$' : '') + digits, 52, 9), fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {cur === 'USD' ? displaySymbol('USDC') : ''}{digits}<span className="caret">_</span>
            </span>
            <button onClick={() => setShowCur(true)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {cur}<Icon name="down2" size="var(--is-md-lg)" color="var(--color-brand)" />
            </button>
          </div>
        </div>

        {fromLibrary ? (
          <div className="memo-row" style={{ width: '100%' }}>
            <Icon name="pencil" size="var(--is-md-lg)" color="var(--color-muted)" />
            <input className="memo-input" value={name} onChange={e => setName(e.target.value)} placeholder={'Name your QR'} maxLength={30}
              onFocus={() => setTypingText(true)} onBlur={() => setTypingText(false)} />
          </div>
        ) : (
          /* Placeholder AS TALL as the note field on Send (52) - the Send block has 3 rows, and without this one
             justify-center drags the label/amount down by 43px, so the two screens stop lining up (measured 07-23). */
          <div style={{ height: 52 }} />
        )}
      </div>

      {/* GREY numpad panel with WHITE keys (user decision 07-20, matching the Swap sheet + SendAmount): from half of row 6
          to the bottom of the screen, full-bleed, rounded top corners; the [Cancel][Create QR] .row10-dual buttons float on the grey.
          HIDDEN while typing the QR name (keyboard rule 07-23 - never two keyboards at once). */}
      {!typingText && (
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '5dvh -20px 0', padding: '24px 20px 0', background: 'var(--color-surface-2)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* Numpad 5.5 parts (07-20c: keys a touch shorter), the .row10-dual buttons still anchored to the row 9-10 edge */}
        <div style={{ flex: 5.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 3.5 }} />
      </div>
      )}

      {/* The [Cancel][Create QR] buttons = the standard row10-dual position (rows 9-10) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate(fromLibrary ? 'SavedQRList' : 'HomeReceive')}>Cancel</button>
        <button className="btn btn-primary" disabled={amount <= 0}
          onClick={() => navigate('ShowQR', { amount, currency: cur, name: name.trim(), saveToLibrary: fromLibrary, back: fromLibrary ? 'SavedQRList' : 'HomeReceive' })}>
          Create QR
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
