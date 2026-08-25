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

export default function Currency() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  // The value chip = EXACTLY the token chip on the Swap screen (user decision 07-17f "match the other dropdown
  // buttons"): WHITE + GREY BORDER (it sits inside the grey box) + the down2 ARROW INSIDE the chip. Tap opens the popup.
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', borderRadius: 999, padding: '5px 10px 5px 14px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)' }

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
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Currency
      </div>

      {/* GREY BOX, 1 ROW (row 2) - it used to be 2 rows, Language + Currency, and Language was dropped 08-25
          with the i18n layer. Box height rule: 1 item = 1 grid row (Security has 3 items = '2 / 5'). */}
      <div style={{ gridRow: '2 / 3', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <button className="menu-item" onClick={() => setCurPicker(true)}>
          <span style={LABEL}>Default currency</span>
          <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>

      {curPicker && (
        <Picker title={'Select currency'} options={CURRENCY_OPTIONS} active={currency}
          onPick={pickCur} onClose={() => setCurPicker(false)} />
      )}
    </div>
  )
}
