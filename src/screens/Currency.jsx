import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getDisplayCurrency } from '../data'

// Display currency: USD/EUR (backed by the USDC/EURC tokens). CNY + VND were DROPPED 2026-08-25 together with
// Vietnamese/Chinese - both were already locked and unreachable (VND was enabled 08-04 then locked again 08-12
// because an English/USD app scanning a QR produced VND). The VND rate/format plumbing in chain.js + qr.js is
// left ALONE: a QR that carries no currency is still read by QRScanner, see the notes there.
const CURRENCY_OPTIONS = [
  { code: 'USDC', short: 'USD', label: 'USD – US Dollar', locked: false },
  { code: 'EURC', short: 'EUR', label: 'EUR – Euro', locked: false },
]
const CUR_SHORT = { USDC: 'USD', EURC: 'EUR' }

// Locked to English-only since the whole i18n layer was deleted 2026-08-25 - the row is REBUILT here
// (2026-09-10, node 1:259) because Figma still draws it, but it opens a popup with exactly ONE locked
// option (the same disabled-button pattern CURRENCY_OPTIONS already uses below), never a real switch.
const LANGUAGE_OPTIONS = [{ code: 'en', label: 'English', locked: true }]

export default function Currency() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)
  const [langPicker, setLangPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  // The value chip = EXACTLY the token chip on the Swap screen (user decision 07-17f "match the other dropdown
  // buttons"): WHITE + no border, GLOW shadow (2026-09-10: node 1:259/1:266/1:269 draw shadow, not a grey
  // border) + the down2 ARROW INSIDE the chip. Tap opens the popup.
  const LABEL = { flex: 1, fontSize: 18, fontWeight: 'var(--fw-semibold)' }
  const CHIP = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', border: 'none', background: 'var(--color-white)', borderRadius: 999, padding: '5px 10px 5px 14px', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)' }

  // Currency picker popup: a locked option is a dimmed, disabled button. The locked flag stays so a new currency
  // without a wired exchange rate can reuse it immediately.
  const Picker = ({ title, options, active, onPick, onClose }) => (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        <div className="popup-title">{title}</div>
        {options.map(o => (
          <button key={o.code} disabled={o.locked}
            onClick={() => { if (!o.locked) onPick(o.code); else return }}
            className={`btn ${o.code === active ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18 }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Language & Currency
      </div>

      {/* Card - node 1:265: rows 2-8 (340x586, radius 16), the same full-height card template every Menu
          sub-screen shares (About.jsx/Security.jsx). Language is BACK as a row (Figma still draws it,
          node 1:273) even though i18n was deleted 08-25 - it opens a popup with English locked, never a
          real switch (see LANGUAGE_OPTIONS above). Rows pack at the top (86/172, each its own 70px row +
          16px gap), not spread across the tall card. */}
      <div style={{ gridRow: '2 / 9', position: 'relative', minWidth: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', borderRadius: 16 }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button className="menu-item" style={{ height: 70, padding: '0 8px' }} onClick={() => setLangPicker(true)}>
            <span style={LABEL}>Language</span>
            <span style={CHIP}>English<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
          </button>
          <button className="menu-item" style={{ height: 70, padding: '0 8px' }} onClick={() => setCurPicker(true)}>
            <span style={LABEL}>Default currency</span>
            <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
          </button>
        </div>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>

      {curPicker && (
        <Picker title={'Select currency'} options={CURRENCY_OPTIONS} active={currency}
          onPick={pickCur} onClose={() => setCurPicker(false)} />
      )}
      {langPicker && (
        <Picker title={'Select language'} options={LANGUAGE_OPTIONS} active={'en'}
          onPick={() => {}} onClose={() => setLangPicker(false)} />
      )}
    </div>
  )
}
