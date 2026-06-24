import { useState } from 'react'
import { useNav } from '../nav'

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim())
}

export default function PasteAddress() {
  const { navigate } = useNav()
  const [address, setAddress] = useState('')
  const [dirty, setDirty] = useState(false)

  const trimmed = address.trim()
  const valid = isValidAddress(trimmed)
  const showError = dirty && address && !valid

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setAddress(text)
      setDirty(true)
    } catch {}
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>Dán địa chỉ</span>
      </div>

      <div className="row-5 col" style={{ justifyContent: 'center', gap: 10 }}>
        <textarea
          className={`address-input${showError ? ' error' : ''}`}
          placeholder="0x…"
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

      <div className="row-6 center">
        <button className="btn btn-secondary" style={{ width: '66.67%', height: 44 }} onClick={handlePaste}>
          Dán từ clipboard
        </button>
      </div>

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
