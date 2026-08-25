import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import ErrorToast from '../components/ErrorToast'
import { getTokenInfo, getDisplayRates, cachedRates } from '../chain'
import { ensureWalletAddress } from '../circle'
import { findContactName } from '../store'
import { displaySymbol, spendableOf, floorTo, fmtMoney } from '../data'
import { useFitFontSize } from '../useFitFontSize'
import { amountHints, fmtAmountHint } from '../amountHint'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// USD = the friendly label, what is sent = USDC (1:1). USDC/EURC/cirBTC send that exact token.
// ⛔ VND TURNED OFF 2026-08-12 (user decision): the app runs English/USD while a scanned QR produced VND → 'VND' was
// removed from this list so it CANNOT be selected and CANNOT arrive from a QR (params.currency='VND' falls back
// to USD on the line below). The VND maths further down (isVnd/vndRate/amount suggestions) is KEPT and not
// deleted - re-enabling only needs 'VND' back in this array + the locked flags removed in Currency.jsx + data.js.
// The original reason (user decision 08-04): "type VND directly, let the app convert to USDC" for Vietnamese users.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']
const effectiveToken = c => (c === 'USD' || c === 'VND' ? 'USDC' : c)

export default function SendAmount() {
  const { navigate, params } = useNav()
  const { address } = params
  const name = params.name || findContactName(address)
  // WHAT YOU SCAN IS WHAT YOU GET: if the QR carries a valid currency → open in that currency (2 USDC shows as "2 USDC",
  // NOT converted to USD). An old/unclear QR (e.g. 'VND') → default to USD.
  const qrCurrency = CURRENCIES.includes(params.currency) ? params.currency : null
  const [cur, setCur] = useState(qrCurrency || 'USD')
  const [digits, setDigits] = useState(params.amount ? String(params.amount) : '')
  // DEFAULT NOTE (user decision 07-20e): the user sets it once in the popup → every send prefills the memo with it
  // (as a real VALUE, not a faded placeholder). Tapping the field to type → the default note DISAPPEARS and typing is
  // free (noteTouched stops it being cleared again on later focus).
  const [defaultNote, setDefaultNote] = useState(() => localStorage.getItem('ez_default_note') || '')
  const [memo, setMemo] = useState(params.memo || localStorage.getItem('ez_default_note') || '')
  const [noteTouched, setNoteTouched] = useState(false)
  const [showNote, setShowNote] = useState(false)      // popup set default note
  const [draftNote, setDraftNote] = useState('')       // the value being typed in the popup
  const [showCur, setShowCur] = useState(false)
  // KEYBOARD RULE (user decision 07-23, option A): MONEY = the app numpad, TEXT = the iPhone keyboard, and NEVER
  // both at once. Typing in the note field (iPhone keyboard rising) → HIDE the numpad; blur → show it again.
  const [typingText, setTypingText] = useState(false)

  function openNotePopup() { setDraftNote(defaultNote); setShowNote(true) }
  function saveDefaultNote() {
    const v = draftNote.trim()
    localStorage.setItem('ez_default_note', v)
    // If the memo field is empty or still the old default (never hand-typed) → update the display to the new note right away
    if (!noteTouched || memo === '' || memo === defaultNote) { setMemo(v); setNoteTouched(false) }
    setDefaultNote(v); setShowNote(false)
  }
  // Tapping the note field for the first time while it holds the default note → clear it for fresh typing (user decision 07-20e)
  function onNoteFocus() {
    if (!noteTouched && defaultNote && memo === defaultNote) { setMemo(''); setNoteTouched(true) }
  }
  const [availableAmt, setAvailableAmt] = useState(null) // balance of the SELECTED token (in real token units)
  const [walletAddr, setWalletAddr] = useState(null)
  // Exchange rates (needed for VND). Seeded from the module-level cache → no waiting on the network before typing.
  const [rates, setRates] = useState(cachedRates)
  useEffect(() => { getDisplayRates().then(setRates).catch(() => {}) }, [])

  // SAFE wallet address: ensureWalletAddress restores it from Circle when localStorage is missing it - same as
  // HomeSend. It used to read localStorage directly: on mobile PWA (added to the home screen) ez_wallet_addr
  // can be absent → availableAmt=0 → the "Continue" button NEVER lit up despite having money. (Desktop had the key, so it worked.)
  useEffect(() => { ensureWalletAddress().then(a => setWalletAddr(a || null)).catch(() => setWalletAddr(null)) }, [])

  // Available balance: for the EXACT selected token (USD/USDC → USDC; EURC → EURC; cirBTC → cirBTC)
  useEffect(() => {
    if (!walletAddr) { setAvailableAmt(null); return }   // no address yet → treat as loading (null), do NOT force 0
    const tok = effectiveToken(cur)
    setAvailableAmt(null)
    // spendableOf: USDC holds GAS_RESERVE_USDC back for network fees (Arc gas is paid in USDC) - the customer cannot send every last cent
    // ⚠️ On a failed read KEEP null (showing "…"), NEVER setAvailableAmt(0): a fake 0 kills the button and
    // reports "Insufficient balance (available: 0.00)" WHILE THE WALLET HAS MONEY - bug 07-17, a 1000 USDC wallet could not
    // send. Retry after 3s so it recovers by itself once the RPC unclogs.
    let alive = true, retry
    const load = () => getTokenInfo(walletAddr, tok)
      .then(i => { if (alive) setAvailableAmt(spendableOf(tok, i.balance)) })
      .catch(() => { if (alive) retry = setTimeout(load, 3000) })
    load()
    return () => { alive = false; clearTimeout(retry) }
  }, [cur, walletAddr])

  // ── VND: type in Vietnamese money, send USDC ──────────────────────────────────────────────
  // rates[cur] = USD per unit. rates.VND ≈ 0.000038 (1 dong ≈ 0.000038 dollars).
  const isVnd = cur === 'VND'
  const vndRate = rates?.VND || null                       // null = no rate yet → cannot send
  const amount = isVnd ? parseInt(digits || '0', 10) : parseFloat(digits || '0')
  // The USDC amount that ACTUALLY leaves the wallet. floorTo (not toFixed): toFixed rounds UP → it can exceed the
  // balance by exactly one cent and be rejected by Circle, the very trap already hit by the Max button on Swap.
  const tokenAmount = isVnd && vndRate ? floorTo(amount * vndRate, 2) : amount
  // The balance converted into the UNIT BEING TYPED for comparison: typing VND must compare against the balance in VND,
  // otherwise "50,000" is always > "19.5 USDC" and Continue never lights up.
  const availableInCur = availableAmt === null ? null
    : isVnd ? (vndRate ? availableAmt / vndRate : null) : availableAmt
  const overBalance = availableInCur !== null && amount > availableInCur
  // FINAL GUARD against sending to yourself (user decision 07-31). PasteAddress/QRScanner block it at the door,
  // but Contacts is another way in (a user can save their own wallet as a contact), so it must be blocked
  // here too. Use `walletAddr` (from Circle via ensureWalletAddress) and NOT
  // localStorage: on mobile PWA localStorage can be absent → the guard would miss.
  const selfSend = !!walletAddr && address?.trim().toLowerCase() === walletAddr.toLowerCase()
  // The button lights up as soon as the amount is valid; it is ONLY blocked when we KNOW it exceeds the balance. Do not disable
  // the button merely because the balance is still loading (requiring availableAmt!==null used to "kill" it while the balance/address were in flight).
  // VND with no rate yet → no going on (the USDC amount cannot be computed).
  const canContinue = amount > 0 && !overBalance && !selfSend && (!isVnd || !!vndRate)
  const decimalsFor = c => (effectiveToken(c) === 'cirBTC' ? 8 : 2)
  const availableStr = isVnd
    ? `${availableInCur !== null ? Math.floor(availableInCur).toLocaleString('vi-VN') : '…'} ₫`
    : `${availableAmt !== null ? availableAmt.toFixed(decimalsFor(cur)) : '…'} ${cur}`
  // The Balance line, now in the blank space below the note field (user request 08-25: "the Send screen is missing Balance").
  // ⚠️ It shows the SPENDABLE amount (the same number the "Insufficient balance" message quotes), NOT the raw
  // wallet balance: USDC keeps GAS_RESERVE_USDC back for gas, so printing the raw balance here would promise
  // money that the Continue button then refuses - the exact confusion this line is meant to remove.
  // Formatted with fmtMoney (ONE STRING ONE STYLE): USD/USDC → "$70.00", EURC → "20.00 EURC", cirBTC → "0.00054321 cirBTC".
  // Not loaded yet → "…", NEVER a drawn 0 (bug 07-16: a fake 0 reads as an empty wallet).
  const balanceStr = isVnd
    ? (availableInCur !== null ? `${Math.floor(availableInCur).toLocaleString('vi-VN')} ₫` : '…')
    : (availableAmt !== null ? fmtMoney(availableAmt.toFixed(decimalsFor(cur)), cur) : '…')

  // AMOUNT SUGGESTIONS (user decision 08-04) - VND ONLY: typing "50" → [5,000] [50,000] [500,000].
  // Never for USD/EUR: typing "50" already means 50 dollars, and suggesting ×100 (5,000 dollars) would be a deadly trap.
  const hints = isVnd && !showCur ? amountHints(digits, availableInCur) : []

  // Numpad: '.' = the decimal separator (once only); BACK deletes one character at a time.
  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    // VND has NO decimals - block the dot entirely ("50.5 dong" is meaningless).
    if (key === '.') { if (isVnd) return; setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  // The number being typed, formatted for READABILITY: VND groups thousands as you type (500000 → 500.000)
  // - older users typing 6 digits in a row cannot tell whether they are at 50 thousand or 500 thousand.
  const shownDigits = isVnd && digits ? parseInt(digits, 10).toLocaleString('vi-VN') : digits
  const amountStr = (cur === 'USD' ? displaySymbol('USDC') : '') + shownDigits + (isVnd && digits ? ' ₫' : '')
  // Font size shrinks by REAL WIDTH (VND numbers are twice as long as USD, so counting characters overflows) - the "_" caret
  // is included in the measurement, otherwise it comes up exactly one caret short and overflows at the longest numbers.
  const [fitRef, fitSize] = useFitFontSize(amountStr + '_', { max: 52, min: 18, weight: 600 })

  return (
    <div className="screen">
      <ErrorToast message={params.sendError} />

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Send money
      </div>

      {/* The Send-to / amount / note block - one flex column centred over rows 2-5. gap 4dvh (user decision
          07-22c: 2dvh felt cramped, a little more air - still one block, not scattered). */}
      <div style={{ gridRow: '2 / 6', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4dvh', minWidth: 0 }}>
        <div className="center" style={{ gap: 6 }}>
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)' }}>Send to:</span>
          <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)' }}>
            {name || shortenAddr(address)}
          </span>
        </div>

        <div className="center col" style={{ gap: 6 }}>
          {/* The big number is ALWAYS centred; the currency chip is anchored to the RIGHT EDGE (no longer following the number's width) */}
          <div ref={fitRef} style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="num" style={{ fontSize: fitSize, fontWeight: 'var(--fw-semibold)', lineHeight: 1, whiteSpace: 'nowrap', color: overBalance ? 'var(--color-error)' : digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {amountStr}<span className="caret">_</span>
            </span>
            <button onClick={() => setShowCur(true)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {cur}<Icon name="down2" size="var(--is-md-lg)" color="var(--color-brand)" />
            </button>
          </div>
          {/* VND: state PLAINLY how much USDC will leave the wallet. The user types Vietnamese money but what moves on-chain
              is USDC - hiding that is deceptive, and showing it faintly means they never notice they are spending a
              stablecoin. No rate yet → say so, rather than leaving Continue dead with no explanation. */}
          {isVnd && digits && (
            <span className="num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center' }}>
              {vndRate ? `≈ ${tokenAmount.toFixed(2)} USDC` : 'Getting exchange rate...'}
            </span>
          )}
          {selfSend ? (
            /* The only way to reach this screen with your own wallet is via Contacts - say so IMMEDIATELY, do not
               let the user type an amount before finding out they cannot send. */
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
              That's your own wallet – you can't send to yourself
            </span>
          ) : overBalance && (
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
              {'Insufficient balance (available:'} {availableStr})
            </span>
          )}
        </div>

        {/* The note field + the options icon (opens the default-note popup) ON THE RIGHT (user decision 07-20e) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <input
            className="address-input"
            placeholder={'Transfer note (optional)'}
            value={memo}
            onFocus={() => { onNoteFocus(); setTypingText(true) }}
            onBlur={() => setTypingText(false)}
            onChange={e => { setMemo(e.target.value); setNoteTouched(true) }}
            maxLength={100}
            style={{ flex: 1, minWidth: 0, height: 52, fontSize: 'var(--fs-md-lg)' }}
          />
          <button onClick={openNotePopup} aria-label={'Set your default note'}
            style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, border: 'none', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="option" size="var(--is-md-lg)" color="var(--color-muted)" />
          </button>
        </div>

        {/* Balance - moved here 08-25 (user report: grouped with "Send to" up top looked messy) into the blank
            space right below the note field, so the original block above keeps its layout unchanged. */}
        <div className="center" style={{ gap: 6 }}>
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)' }}>Balance:</span>
          <span className="num" style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)' }}>
            {balanceStr}
          </span>
        </div>
      </div>

      {/* GREY numpad panel with WHITE keys (user decision 07-20, matching the Swap sheet): from half of row 6 to the bottom,
          full-bleed (negative margins cancelling .screen's padding), rounded top corners. Numpad flex 6 + button/padding area flex 3
          (the [Back][Continue] pair is .row10-dual, absolute, floating on the grey exactly over rows 9-10).
          HIDDEN while typing TEXT (note field focused / note popup open) - the iPhone keyboard rising on top of the
          numpad looks terrible (reported 07-23); blur / close the popup → the numpad returns. */}
      {!typingText && !showNote && (
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '5dvh -20px 0', padding: '24px 20px 0', background: 'var(--color-surface-2)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* AMOUNT SUGGESTIONS (VND only) - placed DIRECTLY ABOVE the numpad so the typing finger reaches them instantly, one tap
            instead of counting zeroes. Fixed height (space is reserved even with no suggestions) so the
            numpad does NOT jump up and down with every extra digit - a jumping layout is a nightmare for older
            users aiming a finger at a key. */}
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
          {hints.map(v => (
            <button key={v} onClick={() => setDigits(String(v))}
              style={{ border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {fmtAmountHint(v)}
            </button>
          ))}
        </div>
        {/* Numpad 5.5 parts (07-20c: keys a touch shorter), the .row10-dual buttons still anchored to the row 9-10 edge */}
        <div style={{ flex: 5.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma={!isVnd} />
        </div>
        <div style={{ flex: 3.5 }} />
      </div>
      )}

      {/* The [Back][Continue] pair = the STANDARD row10-dual position (rows 9-10, centred on the 9/10 boundary) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Back</button>
        <button className="btn btn-primary" disabled={!canContinue}
          onClick={() => navigate('SendConfirm', { address, name, amount, memo, currency: cur, tokenAmount })}>
          Continue
        </button>
      </div>

      {/* SET DEFAULT NOTE popup - standard .popup-card (centred over rows 1-6). Set once → every send prefills
          the memo with this note (user decision 07-20e). */}
      {showNote && (
        <div className="popup-overlay" onClick={() => setShowNote(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Set your default note</div>
            <input className="address-input" placeholder={'Type here'} value={draftNote}
              onChange={e => setDraftNote(e.target.value)} maxLength={100} autoFocus
              style={{ width: '100%', height: 52, fontSize: 'var(--fs-md-lg)' }} />
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={() => setShowNote(false)}>Back</button>
              <button className="btn btn-primary" onClick={saveDefaultNote}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Currency picker popup - standard .popup-card (centred over rows 2-5, leaving the bottom half for the keyboard) */}
      {showCur && (
        <div className="popup-overlay" onClick={() => setShowCur(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Select currency</div>
            {CURRENCIES.map(c => (
              // Changing currency → CLEAR what was typed. Whether "50" means 50 dollars or 50 dong are two entirely
              // different things; keeping the old number invites the user to send twenty thousand times too much.
              <button key={c} onClick={() => { if (c !== cur) setDigits(''); setCur(c); setShowCur(false) }}
                className={`btn ${c === cur ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
