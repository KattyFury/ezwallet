import { useEffect, useState } from 'react'
import Numpad from './Numpad'
import { _registerPinGateListener, resolvePin, rejectPin } from '../pinGate'

// ══════════════════════════════════════════════════════════════════════════════
// THE PIN SHEET (2026-09-04) - matches Figma frames 3/4/5 (fileKey l26UsgoqIDfvLkrozVLPTq) pixel for
// pixel: white card 325px, 30px radius, shadow 0 0 20 rgba(0,0,0,.32), centred on screen (NOT the
// app's own .popup-card, which is pinned at 30dvh with 16px radius - this one deliberately mirrors
// where Privy's OWN modal sits, measured earlier this session: #privy-dialog-backdrop is centred
// full-viewport, not bottom-anchored). Mounted ONCE in App.jsx, next to <BugButton>, same "present on
// every screen" reasoning already written there - this is what actually shows the sheet; pinGate.js
// is only the promise plumbing that wakes it up.
//
// TWO MODES, ONE COMPONENT:
//   'set'    - first-time (or changed) PIN. Two steps: enter, then re-enter to confirm (Figma frames
//              3 and 4 - "Set up your PIN" / "Re-enter your PIN"). A mismatch on step 2 restarts step 1.
//   'verify' - at signing time (Figma frame 5 - "Enter PIN"). One step. The RED error line under the
//              grid (Figma's own annotation: "make it understandable and make it red, size 17") is
//              driven by `pending.error`, seeded by pinSigner.js when it retries after a wrong-PIN
//              response - this component never talks to the backend itself, it only collects digits.
//
// CANCELLABLE, unlike the sign-in modal (Login.jsx): dismissing this has somewhere to go back to -
// the screen that asked for the PIN (e.g. SendConfirm) simply stays on "Send" with nothing sent.
// ══════════════════════════════════════════════════════════════════════════════
const PIN_LEN = 6

function PinBoxes({ digits }) {
  return (
    <div className="pin-boxes">
      {Array.from({ length: PIN_LEN }).map((_, i) => (
        <div key={i} className={`pin-box${i < digits.length ? ' filled' : ''}`}>
          {i < digits.length ? '●' : ''}
        </div>
      ))}
    </div>
  )
}

export default function PinGateHost() {
  const [req, setReq] = useState(null)          // { mode, error } | null
  const [step, setStep] = useState('enter')      // 'set' mode only: 'enter' | 'confirm'
  const [digits, setDigits] = useState('')
  const [firstPin, setFirstPin] = useState('')   // 'set' mode: held between step 1 and step 2
  const [error, setError] = useState('')

  useEffect(() => {
    _registerPinGateListener((pending) => {
      setReq({ mode: pending.mode })
      setStep('enter')
      setDigits('')
      setFirstPin('')
      setError(pending.error || '')
    })
    return () => _registerPinGateListener(null)
  }, [])

  // ⚠️ digits IS UPDATED VIA THE FUNCTIONAL setState FORM, and submitting on completion is a
  // separate effect watching `digits`, NOT done inline inside onKey. A PIN is 6 taps in quick
  // succession on a touchscreen - onKey reading `digits` from the render closure and computing
  // `next = digits + k` breaks under React 18's batching the moment two taps land before a
  // re-render: both handlers see the SAME stale `digits`, so the second tap's computed value
  // overwrites the first instead of extending it, and a digit gets silently dropped. Caught by
  // testing this with scripted rapid clicks, not by inspection.
  useEffect(() => {
    if (req && digits.length === PIN_LEN) submit(digits)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  if (!req) return null

  function onKey(k) {
    if (k === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (k === '.') return   // no decimal point on a PIN
    setDigits(d => (d.length >= PIN_LEN ? d : d + k))
  }

  function submit(pin) {
    if (req.mode === 'verify') {
      resolvePin(pin)
      setReq(null)
      return
    }
    // mode === 'set'
    if (step === 'enter') {
      setFirstPin(pin)
      setStep('confirm')
      setDigits('')
      setError('')
      return
    }
    // step === 'confirm'
    if (pin !== firstPin) {
      setError('PINs did not match. Try again.')
      setStep('enter')
      setDigits('')
      setFirstPin('')
      return
    }
    resolvePin(pin)
    setReq(null)
  }

  function cancel() {
    rejectPin('cancelled')
    setReq(null)
  }

  const title = req.mode === 'verify' ? 'Enter PIN'
    : step === 'enter' ? 'Set up your PIN'
    : 'Re-enter your PIN'

  return (
    <div className="pin-sheet-overlay">
      <div className="pin-card">
        <button type="button" className="pin-close" onClick={cancel} aria-label="Cancel">
          ✕
        </button>
        <div className="pin-title">{title}</div>
        <PinBoxes digits={digits} />
        {/* height reserved even when empty (Figma frame 5) so the numpad below does not jump when the
            error line appears after a wrong PIN */}
        <div className="pin-error">{error}</div>
        <Numpad onKey={onKey} />
      </div>
    </div>
  )
}
