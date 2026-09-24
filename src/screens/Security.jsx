import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import ScreenSheet from '../components/ScreenSheet'
import ExitBar from '../components/ExitBar'
import { GRADIENT } from '../brandBg'
import { getSDK, executeChallenge, resetPinChallenge, refreshSession, circleErrorMessage } from '../circle'
import { getDisplayCurrency } from '../data'

// SECURITY - Figma node 58:332, rebuilt 2026-09-24 against the 2026-09-23 redesign's gradient+sheet
// shell (was the pre-redesign plain-white `.screen`/`.row-10` layout). Figma now merges the old separate
// "Language & currency" screen (Currency.jsx) into this one card - Network/Email/Wallet address as plain
// lines, then PIN/Language/Default currency as rows with a value chip - so Currency.jsx is deleted and
// its picker logic (and PIN reset logic, unchanged) both live here now. MenuScreen's "Security, language
// & currency" row already pointed at this screen id before this rebuild, so no nav.js change needed.
const CURRENCY_OPTIONS = [
  { code: 'USDC', short: 'USD', label: 'USD – US Dollar', locked: false },
  { code: 'EURC', short: 'EUR', label: 'EUR – Euro', locked: false },
]
const CUR_SHORT = { USDC: 'USD', EURC: 'EUR' }
// Locked to English-only since the whole i18n layer was deleted 2026-08-25 - kept from Currency.jsx as a
// disabled-option popup (never a real switch), not a fresh guess.
const LANGUAGE_OPTIONS = [{ code: 'en', label: 'English', locked: true }]

// Value chip - node 58:362/58:364/58:366: white pill, glow shadow, no border, 42px tall.
const CHIP = { border: 'none', background: 'var(--color-white)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)', borderRadius: 999, height: 42, padding: '0 14px', fontSize: 18, fontWeight: 'var(--fw-semibold)', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }
const ROW = { position: 'absolute', left: '9.23%', right: '9.23%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }

function Picker({ title, options, active, onPick, onClose }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        <div className="popup-title">{title}</div>
        {options.map(o => (
          <button key={o.code} disabled={o.locked}
            onClick={() => { if (!o.locked) onPick(o.code) }}
            className={`btn ${o.code === active ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18 }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Security() {
  const { navigate } = useNav()
  const [pinStatus, setPinStatus] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)
  const [langPicker, setLangPicker] = useState(false)
  function showStatus(msg, isErr = false) { setPinStatus(msg); setPinErr(isErr) }

  async function handleResetPin() {
    // Google users (SSO, no ez_email): Circle blocks PUT /user/pin at the platform layer
    // (403 code 3 even with a fresh token + an existing PIN - verified session 10). Skip the call, save a round trip.
    if (!localStorage.getItem('ez_email')) {
      showStatus('Not available for Google accounts', true)
      setTimeout(() => showStatus(''), 3000)
      return
    }
    showStatus('Preparing...')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const challengeId = await resetPinChallenge(userToken)
      showStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      showStatus('PIN changed!')
      setTimeout(() => showStatus(''), 2000)
    } catch (e) {
      showStatus(circleErrorMessage(e), true)
    }
  }

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  const email = localStorage.getItem('ez_email') || localStorage.getItem('ez_google_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  return (
    <div className="screen" style={{ background: GRADIENT }}>
      <ScreenSheet />
      <div className="sheet-title">Security, language & currency</div>

      {/* Card - node 1:265: 340x586 at (25,86), radius 16. Network/Email/Wallet address are plain
          "Label: value" lines (brand-blue value, same as MenuScreen's info card); PIN/Language/Default
          currency are rows with a value chip. */}
      <div style={{ position: 'absolute', left: '6.41%', top: '10.19dvh', width: '87.18%', height: '69.43dvh', background: 'var(--color-card)', borderRadius: 16 }} />

      <p style={{ position: 'absolute', left: '9.23%', right: '9.23%', top: '13.21dvh', margin: 0, fontSize: 18, lineHeight: '32px', color: 'var(--color-black)' }}>
        Network: <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>Arc Testnet</span><br />
        Email: <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{email}</span><br />
        Wallet address: <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{shortAddr}</span>
      </p>

      <div style={{ ...ROW, top: '36.84dvh' }}>
        <span style={{ fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-black)' }}>PIN</span>
        <button style={{ ...CHIP, color: pinStatus ? (pinErr ? 'var(--color-error)' : 'var(--color-primary)') : 'var(--color-black)' }} disabled={!!pinStatus} onClick={handleResetPin}>
          {pinStatus || 'Change PIN'}
        </button>
      </div>
      <div style={{ ...ROW, top: '44.39dvh' }}>
        <span style={{ fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-black)' }}>Language</span>
        <button style={CHIP} onClick={() => setLangPicker(true)}>
          English<Icon name="down2" size={17} color="var(--color-brand)" />
        </button>
      </div>
      <div style={{ ...ROW, top: '51.95dvh' }}>
        <span style={{ fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-black)' }}>Default currency</span>
        <button style={CHIP} onClick={() => setCurPicker(true)}>
          {CUR_SHORT[currency] || 'USD'}<Icon name="down2" size={17} color="var(--color-brand)" />
        </button>
      </div>

      {/* Done - node 58:334/58:337: brand-blue pill, full card width, 48px tall. */}
      <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}
        style={{ position: 'absolute', left: '6.41%', width: '87.18%', top: '82.82dvh', height: 48, minHeight: 0 }}>
        Done
      </button>

      <ExitBar onClick={() => navigate('MenuScreen')} />

      {curPicker && <Picker title="Select currency" options={CURRENCY_OPTIONS} active={currency} onPick={pickCur} onClose={() => setCurPicker(false)} />}
      {langPicker && <Picker title="Select language" options={LANGUAGE_OPTIONS} active="en" onPick={() => {}} onClose={() => setLangPicker(false)} />}
    </div>
  )
}
