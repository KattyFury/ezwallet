import { useState } from 'react'
import { useNav } from '../nav'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

export default function PasteAddress() {
  const { navigate } = useNav()
  const [address, setAddress] = useState('')
  const [dirty, setDirty] = useState(false)

  const trimmed = address.trim()
  const valid = isValid(trimmed)
  const showError = dirty && address && !valid

  async function handlePaste() {
    try { const t = await navigator.clipboard.readText(); setAddress(t); setDirty(true) } catch {}
  }

  return (
    <div className="screen">
      {/* Row 1: title */}
      <div className="row-1 center" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Dán địa chỉ
      </div>

      {/* Row 5: input */}
      <div className="row-5 col" style={{ justifyContent: 'center', gap: 8 }}>
        <textarea
          className={`address-input${showError ? ' error' : ''}`}
          placeholder="0x..."
          value={address}
          onChange={e => { setAddress(e.target.value); setDirty(true) }}
          rows={3}
          style={{ fontSize: 'var(--fs-body)', resize: 'none' }}
        />
        {showError && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>
            Địa chỉ không hợp lệ — bắt đầu bằng 0x, 42 ký tự
          </span>
        )}
      </div>

      {/* Row 6: clipboard button */}
      <div className="row-6 center">
        <button className="btn btn-secondary" style={{ width: '66.67%' }} onClick={handlePaste}>
          Dán từ clipboard
        </button>
      </div>

      {/* Row 9: buttons */}
      <div className="row-9 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Quay lại</button>
        <button className="btn btn-primary" disabled={!valid}
          onClick={() => navigate('SendAmount', { address: trimmed, name: null })}>
          Tiếp tục
        </button>
      </div>
    </div>
  )
}
