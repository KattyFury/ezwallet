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
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Paste address to send
      </div>

      <div className="row-3" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <input
          className={`address-input${showError ? ' error' : ''}`}
          placeholder="0x..."
          value={address}
          onChange={e => { setAddress(e.target.value); setDirty(true) }}
          style={{ width: '100%', height: 52, fontSize: 'var(--fs-md-lg)' }}   /* matches the standard text field (email/memo): height 52 + --fs-md-lg */
        />
        {showError && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>
            {self ? "That's your own wallet – you can't send to yourself" : 'Invalid address – must start with 0x, 42 chars'}
          </span>
        )}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Back</button>
        {/* Field holds a valid EVM address → label flips "Paste" → "Confirm" (user decision 07-23: tapping goes
            straight on without reading the clipboard, so a "Paste" label would be confusing). handleDan covers both. */}
        <button className="btn btn-primary" onClick={handleDan}>{valid ? 'Confirm' : 'Paste'}</button>
      </div>
    </div>
  )
}
