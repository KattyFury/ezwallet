import { useState } from 'react'
import { useNav } from '../nav'
import { isOwnAddress } from '../data'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

export default function PasteAddress() {
  const { navigate } = useNav()
  const [address, setAddress] = useState('')
  const [dirty, setDirty] = useState(false)

  const trimmed = address.trim()
  // CHẶN GỬI CHO CHÍNH MÌNH (user chốt 07-31). Địa chỉ đúng chuẩn nhưng là ví của user →
  // KHÔNG cho đi tiếp: gửi cho mình chỉ mất phí, số dư không đổi, lịch sử thêm dòng khó hiểu.
  const self = isOwnAddress(trimmed)
  const valid = isValid(trimmed) && !self
  const showError = dirty && address && !valid

  // Nút "Dán": ô ĐÃ có địa chỉ hợp lệ → đi tiếp NGAY, KHÔNG đụng clipboard (user chốt 07-23:
  // trước đây luôn readText → iOS bật popup xác nhận "Paste|Speak" của HỆ ĐIỀU HÀNH cả khi vô
  // nghĩa — popup đó là bảo mật clipboard iOS 16+, web KHÔNG tắt được, chỉ né được bằng cách
  // không đọc khi không cần). Ô trống → mới đọc clipboard (popup OS hiện 1 lần, chấp nhận).
  const goNext = a => { if (isValid(a) && !isOwnAddress(a)) { navigate('SendAmount', { address: a, name: null }); return true } return false }

  async function handleDan() {
    let a = trimmed
    if (goNext(a)) return
    if (isOwnAddress(a)) { setDirty(true); return }   // ví mình → dừng, KHÔNG đọc clipboard đè lên
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
          style={{ width: '100%', height: 52, fontSize: 'var(--fs-md-lg)' }}   /* đồng bộ chuẩn ô nhập text (email/memo): cao 52 + --fs-md-lg */
        />
        {showError && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>
            {self ? "That's your own wallet – you can't send to yourself" : 'Invalid address – must start with 0x, 42 chars'}
          </span>
        )}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Back</button>
        {/* Ô đã có địa chỉ EVM hợp lệ → nhãn đổi "Paste" → "Confirm" (user chốt 07-23: bấm sẽ đi
            thẳng không đọc clipboard, để nhãn Paste gây lú). handleDan xử lý đúng cả 2 nhánh. */}
        <button className="btn btn-primary" onClick={handleDan}>{valid ? 'Confirm' : 'Paste'}</button>
      </div>
    </div>
  )
}
