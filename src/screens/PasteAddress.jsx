import { useState } from 'react'
import { useNav } from '../nav'
import { isOwnAddress } from '../data'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

export default function PasteAddress() {
  const { navigate } = useNav()
  const [address, setAddress] = useState('')
  const [dirty, setDirty] = useState(false)

  const trimmed = address.trim()
  // BLOCK SENDING TO YOURSELF (user decision 07-31). A well-formed address that is the user's own wallet →
  // do NOT let it through: it only burns fees, the balance does not change, and history gains a confusing row.
  const self = isOwnAddress(trimmed)
  const valid = isValid(trimmed) && !self
  const showError = dirty && address && !valid

  // The "Paste" button: field ALREADY holds a valid address → go straight on, do NOT touch the clipboard
  // (user decision 07-23: it used to always readText → iOS popped the OS-level "Paste|Speak" confirmation
  // even when pointless - that popup is iOS 16+ clipboard security, the web CANNOT turn it off, it can only
  // be avoided by not reading when there is no need). Empty field → then read the clipboard (one OS popup, fine).
  const goNext = a => { if (isValid(a) && !isOwnAddress(a)) { navigate('SendAmount', { address: a, name: null }); return true } return false }

  async function handleDan() {
    let a = trimmed
    if (goNext(a)) return
    if (isOwnAddress(a)) { setDirty(true); return }   // own wallet → stop, do NOT overwrite from the clipboard
    try {
      const txt = await navigator.clipboard.readText()
      if (txt && txt.trim()) { a = txt.trim(); setAddress(a); setDirty(true) }
    } catch {}
    if (!goNext(a)) setDirty(true)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Paste address to send
      </div>

      {/* Input - node 1:212/1:214: centre 24.4dvh (calc(20%+37.2px) of 844), height 40 (was 52), radius 8
          (matches BRAND-GUIDELINE "Input: 8px"), placeholder/typed text 19px (was --fs-md-lg 21). */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '24.4dvh', transform: 'translateY(-50%)' }}>
        <input
          className={`address-input${showError ? ' error' : ''}`}
          placeholder="0x..."
          value={address}
          onChange={e => { setAddress(e.target.value); setDirty(true) }}
          style={{ width: '100%', height: 40, fontSize: 'var(--fs-content-1)', borderRadius: 8 }}
        />
        {showError && (
          <span style={{ display: 'block', marginTop: 8, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>
            {self ? "That's your own wallet – you can't send to yourself" : 'Invalid address – must start with 0x, 42 chars'}
          </span>
        )}
      </div>

      {/* Back/Paste - node 1:208-1:211: both ~166px wide, i.e. exactly (340 content width − 8px gap) / 2 -
          flex:1 each with an 8px gap reproduces that exactly. Centre 85.63dvh (calc(80%+23.52px) of 844),
          glow shadow (was .btn-secondary/.btn-primary's straight-down shadow, not yet updated app-wide -
          same per-screen rollout as every other button fixed this session). */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '85.63dvh', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }} onClick={() => navigate('HomeSend')}>Back</button>
        {/* Field holds a valid EVM address → label flips "Paste" → "Confirm" (user decision 07-23: tapping goes
            straight on without reading the clipboard, so a "Paste" label would be confusing). handleDan covers both. */}
        <button className="btn btn-primary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }} onClick={handleDan}>{valid ? 'Confirm' : 'Paste'}</button>
      </div>
    </div>
  )
}
