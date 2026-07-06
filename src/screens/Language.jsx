import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { getDisplayCurrency, displaySymbol } from '../data'

// Hiện chỉ hỗ trợ stablecoin (Circle Wallet chưa hỗ trợ tiền pháp định khác), hiển thị nhãn
// thân thiện USD/EUR (chain vẫn dùng USDC/EURC). Ngôn ngữ đang khóa English → không có ô chọn.
const CURRENCIES = [
  { code: 'USDC', label: 'USD – US Dollar' },
  { code: 'EURC', label: 'EUR – Euro' },
]

export default function Language() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [picker, setPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setPicker(false) }

  // Chip giá trị ĐỒNG BỘ cho mọi hàng (English / $ …) — cùng 1 style, không mỗi chỗ mỗi kiểu.
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '6px 14px' }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Language &amp; Currency
      </div>

      {/* Ngôn ngữ = HÀNG 2. App khoá English (Circle SDK chỉ English) → làm mờ, không bấm. */}
      <div className="menu-item" style={{ gridRow: 2, opacity: 0.4, cursor: 'not-allowed' }}>
        <span style={LABEL}>Language</span>
        <span style={CHIP}>English</span>
      </div>

      {/* Tiền tệ = HÀNG 3. Chip cùng style với chip English. */}
      <button className="menu-item" style={{ gridRow: 3 }} onClick={() => setPicker(true)}>
        <span style={LABEL}>Default currency</span>
        <span style={CHIP}>{displaySymbol(currency)}</span>
        <Icon name="right2" size={15} color="var(--color-faint)" style={{ marginLeft: 8 }} />
      </button>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {picker && (
        <div className="popup-overlay" onClick={() => setPicker(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">{t('Chọn tiền tệ')}</div>
            {CURRENCIES.map(o => (
              <button key={o.code} onClick={() => pickCur(o.code)}
                className={`btn ${o.code === currency ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18 }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
