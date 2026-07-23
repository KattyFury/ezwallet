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
  // Luật bàn phím 07-23 (đồng bộ SendAmount): gõ CHỮ (ô tên QR) → ẩn numpad app, blur → hiện lại
  const [typingText, setTypingText] = useState(false)
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
            <input className="memo-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name your QR" maxLength={30}
              onFocus={() => setTypingText(true)} onBlur={() => setTypingText(false)} />
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

      {/* Numpad panel XÁM phím TRẮNG (user chốt 07-20 đồng bộ sheet Swap + SendAmount): nửa hàng 6
          → đáy màn, full-bleed, bo góc trên; nút [Hủy][Tạo QR] .row10-dual nổi trên nền xám.
          ẨN khi đang gõ tên QR (luật bàn phím 07-23 — không cho 2 bàn phím cùng hiện). */}
      {!typingText && (
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '5dvh -20px 0', padding: '24px 20px 0', background: 'var(--color-surface-2)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* Numpad 5.5 phần (07-20c: phím thấp lại một tẹo), nút .row10-dual vẫn neo biên hàng 9-10 */}
        <div style={{ flex: 5.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 3.5 }} />
      </div>
      )}

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
