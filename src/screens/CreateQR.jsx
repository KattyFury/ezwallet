import { useState } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { displaySymbol } from '../data'

// Đồng bộ màn Gửi: USD (nhãn thân thiện, ứng USDC) mặc định + USDC/EURC/cirBTC.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']

export default function CreateQR() {
  const { navigate, params } = useNav()
  const [digits, setDigits] = useState('')
  const [cur, setCur] = useState('USD')
  const [showCur, setShowCur] = useState(false)
  // Khi tạo từ Kho QR → tạo xong AUTO lưu (không cần bước "thêm vào kho")
  const fromLibrary = params?.from === 'SavedQRList'

  const amount = parseFloat(digits || '0')

  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === '.') { setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Tạo QR nhận tiền')}
      </div>

      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{t('Số tiền muốn nhận')}</span>
      </div>

      {/* Số căn giữa MỘT STYLE (USD hiện tiền tố $ liền khối); chip tiền tệ neo BÌA PHẢI (đồng bộ SendAmount) */}
      <div className="row-3-4 center col">
        <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
            {cur === 'USD' ? displaySymbol('USDC') : ''}{digits || '0'}
          </span>
          <button onClick={() => setShowCur(true)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '6px 10px', background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
            {cur}<Icon name="down2" size={12} color="var(--color-muted)" />
          </button>
        </div>
      </div>

      {/* Numpad 2.5 hàng + nút — CÓ phím thập phân (nhập 1.5) đồng bộ màn Gửi */}
      <div style={{ gridRow: '7 / 11', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button className="btn btn-secondary" style={{ width: '44%' }} onClick={() => navigate(fromLibrary ? 'SavedQRList' : 'HomeReceive')}>{t('Hủy')}</button>
          <button className="btn btn-primary" style={{ width: '44%' }} disabled={amount <= 0}
            onClick={() => navigate('ShowQR', { amount, currency: cur, isNew: true, back: fromLibrary ? 'SavedQRList' : 'HomeReceive' })}>
            {t('Tạo QR')}
          </button>
        </div>
      </div>

      {showCur && (
        <div onClick={() => setShowCur(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14dvh' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '70%', maxWidth: 300, background: 'var(--color-white)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', padding: '6px 0' }}>{t('Chọn tiền tệ')}</div>
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => { setCur(c); setShowCur(false) }}
                className={`btn ${c === cur ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>{c}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
