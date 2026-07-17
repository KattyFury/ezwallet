import { useState } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { displaySymbol, amountFontSize } from '../data'

// Đồng bộ màn Gửi: USD (nhãn thân thiện, ứng USDC) mặc định + USDC/EURC/cirBTC.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']

export default function CreateQR() {
  const { navigate, params } = useNav()
  const [digits, setDigits] = useState('')
  const [cur, setCur] = useState('USD')
  const [showCur, setShowCur] = useState(false)
  const [name, setName] = useState('')
  // Từ Kho QR → tạo xong LƯU vào kho (kèm TÊN); từ màn Nhận → chỉ hiện để share, KHÔNG lưu.
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

      {/* Từ Kho QR: ô ĐẶT TÊN (thiết kế đồng bộ ô memo lúc gửi) — để tiểu thương tạo cả menu.
          Từ màn Nhận: chỉ phụ đề "Số tiền muốn nhận". Ô nhập neo trên cùng (bàn phím che nửa dưới). */}
      <div className="row-2 center" style={{ padding: '0 4px' }}>
        {fromLibrary ? (
          <div className="memo-row" style={{ width: '100%' }}>
            <Icon name="pencil" size="var(--is-md-lg)" color="var(--color-muted)" />
            <input className="memo-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name your QR" maxLength={30} />
          </div>
        ) : (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{t('Số tiền muốn nhận')}</span>
        )}
      </div>

      {/* Số căn giữa MỘT STYLE (USD hiện tiền tố $ liền khối); chip tiền tệ neo BÌA PHẢI (đồng bộ SendAmount) */}
      <div className="row-3-4 center col">
        <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="num" style={{ fontSize: amountFontSize((cur === 'USD' ? '$' : '') + digits, 52, 9), fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
            {cur === 'USD' ? displaySymbol('USDC') : ''}{digits}<span className="caret">_</span>
          </span>
          <button onClick={() => setShowCur(true)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
            {cur}<Icon name="down2" size="var(--is-md-lg)" color="var(--color-muted)" />
          </button>
        </div>
      </div>

      {/* Numpad ở hàng 6.75-8.25 (đồng bộ SendAmount/Swap): gridRow 6/10, spacer 0.75 + numpad 2.5 + đệm dưới 0.75 */}
      <div style={{ gridRow: '6 / 10', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 0.75 }} />
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 0.75 }} />
      </div>

      {/* Nút [Hủy][Tạo QR] = vị trí chuẩn row10-dual (hàng 9-10) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate(fromLibrary ? 'SavedQRList' : 'HomeReceive')}>{t('Hủy')}</button>
        <button className="btn btn-primary" disabled={amount <= 0}
          onClick={() => navigate('ShowQR', { amount, currency: cur, name: name.trim(), saveToLibrary: fromLibrary, back: fromLibrary ? 'SavedQRList' : 'HomeReceive' })}>
          {t('Tạo QR')}
        </button>
      </div>

      {showCur && (
        <div className="popup-overlay" onClick={() => setShowCur(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">{t('Chọn tiền tệ')}</div>
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
