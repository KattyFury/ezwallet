import { useState, useRef } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '../components/Icon'
import Numpad from '../components/Numpad'
import { fmtMoney, getDisplayCurrency, displaySymbol } from '../data'
import { loadSavedQRs, saveSavedQRs } from '../store'
import { buildQR } from '../qr'

export default function SavedQRList() {
  const { navigate } = useNav()
  const [list, setList] = useState(loadSavedQRs)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)   // the QR awaiting delete confirmation (user decision 07-20e)
  // KEYBOARD RULE (user decision 07-23, option A): ENTERING MONEY = the app numpad, ENTERING TEXT = the iPhone keyboard.
  // The Amount field in the popup is no longer an <input> (the iPhone numeric keyboard lacks a locale decimal separator and
  // breaks the app standard) → tapping it opens the app numpad SHEET (geometry identical to the Swap sheet). Back = discard what
  // was typed, Done / tapping outside = keep it.
  const [pad, setPad] = useState(false)
  const padPrev = useRef('')
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  const amountNum = parseFloat(amountStr || '0')

  function openPad() { padPrev.current = amountStr; setPad(true) }
  function cancelPad() { setAmountStr(padPrev.current); setPad(false) }
  // Numpad keys - same logic as SendAmount ('.' once, BACK deletes backwards, at most 12 characters)
  function handlePadKey(key) {
    if (key === 'BACK') { setAmountStr(d => d.slice(0, -1)); return }
    if (key === '.') { setAmountStr(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    setAmountStr(d => (d.length >= 12 ? d : d === '0' ? key : d + key))
  }

  // Tapping × → OPEN A CONFIRMATION POPUP (no instant delete - guards against mis-taps, like Delete contact)
  function askDelete(q, e) { e.stopPropagation(); setPendingDelete(q) }
  function confirmDelete() {
    const updated = list.filter(q => q.id !== pendingDelete.id)
    setList(updated); saveSavedQRs(updated); setPendingDelete(null)
  }

  function resetForm() { setAdding(false); setName(''); setAmountStr(''); setPad(false) }

  // Save = CREATE a QR in the LIBRARY (it does not show the QR for scanning - that is the Create QR feature). Currency defaults to USD.
  function handleSave() {
    if (!(amountNum > 0)) return
    const updated = [...list, { id: Date.now(), amount: amountNum, currency: 'USD', name: name.trim(), createdAt: new Date().toISOString() }]
    setList(updated); saveSavedQRs(updated)
    resetForm()
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        QR Storage
      </div>

      {/* The QR area = a large GREY BOX over rows 2-8 (user decision 07-23, matching the History box style) · a 2-COLUMN grid
          (3 columns made the QRs too small) → bigger QRs and bigger text for older eyes. Each QR = a WHITE box raised off the
          grey: 1.5 grey border (the "tappable inside a grey box" rule) + a DROP SHADOW like a button (07-22d,
          white = alpha .25). The delete X sits top-right. With many QRs the box scrolls. */}
      {/* OUTER grey box (padding 10 = the white boxes sit exactly 10px from the left/right/top edges, user decision 07-23b)
          + INNER scrolling via .scroll-hidden. ⚠️ Do NOT use .scroll-thin INSIDE a grey box: that class has
          margin-right -20px (a trick for full-bleed lists) → content overflows to the right; desktop has scrollbar-gutter
          to compensate so it looks fine, but iOS does NOT support it → broken layout (the mobile bug reported 07-23b). */}
      <div style={{ gridRow: '2 / 9', background: 'var(--color-surface)', borderRadius: 20, padding: 10, overflow: 'hidden' }}>
      <div className="scroll-hidden" style={{ height: '100%' }}>
        {/* ⚠️ RIGHT COLUMN minmax(0,1fr) - with a bare '1fr' the content dictates min-width, and one big box blows the column
            open (the same lesson as .screen, section 6). Bug the user screenshotted 07-23c: 3 QRs → row 2 = [Blend | + button],
            and the + button with aspectRatio 1 was stretched as tall as the Blend box → so it INFLATED SIDEWAYS → the 2 columns went badly uneven. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignContent: 'start' }}>
          {list.map(q => {
            const c = q.currency || 'USD'
            const label = fmtMoney(q.amount, c)
            return (
              // View a saved QR (it is not re-saved), Back returns to the QR library. Shows: the QR · name + amount (brand BLUE
              // so it stands out against the black QR, user decision 07-28).
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, currency: c, name: q.name, fromStorage: true, saveToLibrary: false, back: 'SavedQRList' })}
                style={{ position: 'relative', minWidth: 0, border: '1.5px solid var(--color-gray)', borderRadius: 16, background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 10px 12px', fontFamily: 'inherit' }}>
                <span onClick={e => askDelete(q, e)} style={{ position: 'absolute', top: 8, right: 8, display: 'flex' }}><Icon name="x" size={16} color="var(--color-muted)" /></span>
                {/* THE QR SCALES WITH THE BOX (user decision 07-23b "do not fix the size, follow the grey"): a square frame with
                    aspectRatio 1 taking the full box width (minus 24px of margin and room for the X), svg fill 100%
                    (the viewBox scales, no distortion); flexShrink 0 stops the grid squashing it (the old distortion bug). */}
                <div style={{ alignSelf: 'stretch', margin: '0 12px', flexShrink: 0 }}>
                  {/* height auto = the svg keeps itself square via the viewBox (forcing height 100% was 3px off) */}
                  <QRCodeSVG value={buildQR(walletAddr, { amount: q.amount, currency: c })} size={104} level="M" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                {q.name && <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span>}
                <span className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-brand)' }}>{label}</span>
              </button>
            )
          })}
          {/* The + tile → opens the ADD QR POPUP (no new screen). PORTRAIT shape matching the QR tiles (user decision 07-28):
              minHeight 190 ≈ the height of a QR tile (measured with Playwright: QR box 194@390 / 187@375) + WIDER than the
              column (~160) → always portrait when it stands ALONE. Sharing a row with a QR, grid stretch makes them equal.
              Do NOT use aspectRatio (bug 07-23c: aspectRatio plus stretch inflated it sideways). */}
          <button onClick={() => setAdding(true)}
            style={{ minWidth: 0, minHeight: 190, border: '1.5px dashed var(--color-muted)', borderRadius: 16, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={40} color="var(--color-muted)" />
          </button>
        </div>
      </div>
      </div>

      {/* A WHITE Back (left) + BLUE Add (right) pair following the .row10-dual standard (user decision 07-29, replacing
          the old .row10-single blue Back): Add opens the same add-QR popup as the "+" tile in the grid - adding a QR is
          the main action of this screen, so it needs a button in row 9 rather than making people scroll to find "+". */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeReceive')}>Back</button>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>Add</button>
      </div>

      {/* Add QR popup - standard .popup-card (centred over rows 2-5, leaving the bottom half for the keyboard) */}
      {adding && (
        <div className="popup-overlay" onClick={resetForm}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Add to QR Storage</div>
            <input className="address-input" placeholder={'Name (optional)'} value={name} onChange={e => setName(e.target.value)} maxLength={30} style={{ fontSize: 'var(--fs-body)' }} />
            {/* Label carries the user's DEFAULT currency symbol (user decision 07-20: USDC→$, EURC→€…) */}
            {/* The Amount field is NOT an input (keyboard rule 07-23) - tapping opens the app numpad sheet; the Name field is
                blurred first so the iPhone keyboard drops before the numpad rises (never both at once).
                A blinking _ caret while the sheet is open (the app-wide signal that money is being entered). */}
            <div className="address-input" onClick={() => { document.activeElement?.blur?.(); openPad() }}
              style={{ fontSize: 'var(--fs-body)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              {amountStr ? (
                <span className="num">{amountStr}{pad && <span className="caret">_</span>}</span>
              ) : pad ? (
                <span className="num"><span className="caret">_</span></span>   /* empty while typing = caret ONLY (standard 07-20b) */
              ) : (
                <span style={{ color: 'var(--color-muted)' }}>{`Amount (${displaySymbol(getDisplayCurrency())})`}</span>
              )}
            </div>
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button className="btn btn-primary" disabled={!(amountNum > 0)} onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* The Amount numpad sheet - geometry IDENTICAL to the Swap sheet (.sheet-overlay/.sheet numpad-gray,
          55→100dvh, transparent overlay). Rendered AFTER the popup → it floats above it (same z-index 100,
          later in the DOM wins); the popup is anchored to the top half, so they do not cover each other. */}
      {pad && (
        <div className="sheet-overlay" onClick={() => setPad(false)}>
          <div className="sheet numpad-gray" onClick={e => e.stopPropagation()}>
            <div style={{ flex: 5.5, minHeight: 0, paddingTop: 24 }}>
              <Numpad onKey={handlePadKey} showComma />
            </div>
            <div style={{ flex: 0.5 }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-secondary" style={{ width: '44%' }} onClick={cancelPad}>Back</button>
              <button className="btn btn-primary" style={{ width: '44%' }} onClick={() => setPad(false)}>Done</button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      )}

      {/* QR delete confirmation - standard popup (centred over rows 1-6). "Delete QR: <name>" (no name → the amount) */}
      {pendingDelete && (
        <div className="popup-overlay" onClick={() => setPendingDelete(null)}>
          <div className="popup-card" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title">{'Delete QR:'} {pendingDelete.name || fmtMoney(pendingDelete.amount, pendingDelete.currency || 'USD')}</div>
            <div className="popup-actions" style={{ marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>Back</button>
              <button className="btn btn-error" onClick={confirmDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
