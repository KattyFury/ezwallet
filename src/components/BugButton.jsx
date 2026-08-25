import { useState } from 'react'
import Icon from './Icon'

// ══ BUG REPORT BUTTON (user decision 2026-08-13) ══
// A 🐛 icon flush RIGHT, centred on ROW 1 - present on EVERY screen (rendered once in App.jsx, not
// pasted into each screen). Tap → a popup to describe the problem → POST /api/bug → straight into the owner's Telegram.
//
// ⚠️ GREY --color-muted-2, do NOT change it to blue/red (user decision after weighing all 3):
//   · brand blue = the app's "tap this" colour → the bug button would compete with the main content
//     (balance, Scan QR button) on EVERY screen.
//   · red = the error/danger colour (Exit, Sign out, the Arc warning) → a red dot next to the balance makes older
//     users think THEIR MONEY is in trouble while the app is perfectly fine.
//   grey = the right language for "a tool sitting there, not needed yet" (= an unselected navbar icon).
// A BARE icon: no background, no border, no shadow - it is NOT a raised button competing with the content.
//
// ⚠️ NEVER bundle localStorage into the report. Only the 4 fields below. Leaking `ez_user_token` /
// `ez_encryption_key` / `ez_refresh_token` / `ez_sync_token` means LOSING THE WALLET.
// The wallet address is sent: it is public information, and without it a failed transaction cannot be looked up.

// A compact device/browser string - do NOT ship the raw userAgent (long, rambling, painful to read).
function deviceInfo() {
  const ua = navigator.userAgent || ''
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'other'
  const br = /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua) ? 'Safari' : 'other'
  // standalone = added to the home screen (PWA) - share/audio/localStorage behaviour differs completely from
  // an ordinary Safari tab, so a bug report MUST say which it was.
  const pwa = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  return `${os} · ${br} · ${window.innerWidth}×${window.innerHeight}${pwa ? ' · PWA' : ''}`
}

export default function BugButton({ screen }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [state, setState] = useState('')   // '' | 'sending' | 'sent' | <an error string>

  function close() { setOpen(false); setText(''); setState('') }

  async function send() {
    if (!text.trim() || state === 'sending') return
    setState('sending')
    try {
      const r = await fetch('/api/bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          screen,
          wallet: localStorage.getItem('ez_wallet_addr') || '',
          device: deviceInfo(),
          version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
        }),
      })
      if (r.ok) { setState('sent'); setTimeout(close, 1600); return }
      const d = await r.json().catch(() => ({}))
      // Name each failure precisely - a vague "something went wrong" makes the user's report useless.
      setState(d.error === 'bug-report-disabled' ? 'Bug reporting is not set up yet'
        : d.error === 'rate-limited' ? 'Too many reports – please try again in an hour'
        : 'Could not send, please try again')
    } catch {
      setState('Could not send, please try again')
    }
  }

  return (
    <>
      {/* absolute inside the .app-frame (App.jsx) → anchored to the right edge of the APP FRAME, not the
          screen edge. top 5dvh = the centre of row 1 (10 equal rows). right 20px = exactly the .screen margin. */}
      <button onClick={() => setOpen(true)} aria-label={'Report a bug'}
        style={{
          position: 'absolute', top: '5dvh', right: 20, transform: 'translateY(-50%)', zIndex: 50,
          background: 'none', border: 'none', padding: 8, cursor: 'pointer', display: 'flex',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <Icon name="bug" size="var(--is-body)" color="var(--color-muted-2)" />
      </button>

      {open && (
        <div className="popup-overlay" onClick={close}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Report a bug</div>
            {/* A NUMBERED LIST of what gets attached (user decision 08-13, third revision).
                The road here: one long listing sentence → the user objected ("why so demanding?") → cut to one line → the user
                wanted the LISTING BACK but as a numbered list for easy scanning. A list reads far better than
                one long sentence stuffed with 4 clauses. `paddingLeft` must be declared by hand: the reset at index.css line 96 strips
                margin/padding from every element, and without it the numbers get clipped. */}
            {/* lineHeight 1.3 (not 1.45): on a small 360×640 screen the popup hits the 56dvh ceiling and
                the Send button needs scrolling to reach. Every 0.1 of lineHeight here is worth ~6px of height. */}
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.3 }}>
              This report will include:
              <ol style={{ paddingLeft: 20 }}>
                <li>The screen you reported from</li>
                <li>Your wallet address</li>
                <li>Your device</li>
                <li>App version</li>
                <li>The time you reported</li>
              </ol>
            </div>
            <textarea
              className="address-input" autoFocus value={text} maxLength={1000}
              onChange={e => setText(e.target.value)}
              // minHeight 72 (down from 96): adding the 5-item list pushed the popup into the
              // max-height 56dvh ceiling of .popup-card → the Send button needed SCROLLING to reach (measured 08-13).
              // 72px still fits 3 typed lines, and longer text scrolls inside the field.
              style={{ fontSize: 'var(--fs-body)', minHeight: 72, resize: 'none', lineHeight: 1.35, fontFamily: 'inherit' }}
            />
            {state && state !== 'sending' && (
              <span style={{ fontSize: 'var(--fs-label)', color: state === 'sent' ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {state === 'sent' ? 'Sent – thank you!' : state}
              </span>
            )}
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" disabled={!text.trim() || state === 'sending'} onClick={send}>
                {state === 'sending' ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
