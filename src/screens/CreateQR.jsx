import { useState } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import { fmtVND } from '../data'

export default function CreateQR() {
  const { navigate } = useNav()
  const [digits, setDigits] = useState('')

  const amount = parseInt(digits || '0')

  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === ',') return
    if (digits.length >= 10) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title">
        <button className="back-btn" onClick={() => navigate('HomeReceive')}>‹</button>
        <span>Custom QR</span>
      </div>

      <div className="row-2-5 center col" style={{ gap: 12 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Số tiền muốn nhận
        </span>
        <div className="amount-display">
          {digits ? fmtVND(amount) : <span style={{ color: 'var(--color-gray)' }}>0 ₫</span>}
        </div>
      </div>

      <div className="row-7-9">
        <Numpad onKey={handleKey} showComma={false} />
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeReceive')}>Hủy</button>
        <button
          className="btn btn-primary"
          disabled={amount <= 0}
          onClick={() => navigate('ShowQR', { amount })}
        >
          Tạo QR
        </button>
      </div>
    </div>
  )
}
