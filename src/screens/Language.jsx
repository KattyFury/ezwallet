import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { getDisplayCurrency } from '../data'

// Ngôn ngữ KHOÁ English (Circle SDK chỉ English + chuỗi mới hardcode English). Hiện thêm option
// Việt/Trung cho popup đỡ trống nhưng KHOÁ (thấy được, không bấm) — user chốt.
const LANGUAGES = [
  { code: 'en', label: 'English', locked: false },
  { code: 'vi', label: 'Tiếng Việt', locked: true },
  { code: 'zh', label: '中文', locked: true },
]

// Tiền hiển thị: USD/EUR chọn được (ứng token USDC/EURC). CNY/VND hiện option nhưng KHOÁ (chưa
// wire tỷ giá — mở lại: bỏ locked + thêm rate ở chain.js getDisplayRates + SUPPORTED_CURRENCIES).
const CURRENCIES = [
  { code: 'USDC', short: 'USD', label: 'USD – US Dollar', locked: false },
  { code: 'EURC', short: 'EUR', label: 'EUR – Euro', locked: false },
  { code: 'CNY',  short: 'CNY', label: 'CNY – Chinese Yuan', locked: true },
  { code: 'VND',  short: 'VND', label: 'VND – Vietnamese Dong', locked: true },
]
const CUR_SHORT = { USDC: 'USD', EURC: 'EUR', CNY: 'CNY', VND: 'VND' }

export default function Language() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)
  const [langPicker, setLangPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  // Chip giá trị ĐỒNG BỘ cho mọi hàng (cùng 1 style).
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', border: 'none', background: 'var(--color-surface)', borderRadius: 10, padding: '6px 14px' }

  // 1 popup dùng chung cho cả ngôn ngữ & tiền tệ: option locked = nút mờ, disabled (không bấm).
  const Picker = ({ title, options, active, onPick, onClose }) => (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        <div className="popup-title">{title}</div>
        {options.map(o => (
          <button key={o.code} disabled={o.locked}
            onClick={() => { if (!o.locked) onPick(o.code); else return }}
            className={`btn ${o.code === active ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18 }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Language &amp; Currency
      </div>

      {/* Ngôn ngữ = HÀNG 2 — bấm mở popup (English chọn được; Việt/Trung khoá) */}
      <button className="menu-item" style={{ gridRow: 2 }} onClick={() => setLangPicker(true)}>
        <span style={LABEL}>Language</span>
        <span style={CHIP}>English</span>
        <Icon name="right2" size="var(--is-md-lg)" color="var(--color-faint)" style={{ marginLeft: 8 }} />
      </button>

      {/* Tiền tệ = HÀNG 3 — bấm mở popup (USD/EUR chọn được; CNY/VND khoá) */}
      <button className="menu-item" style={{ gridRow: 3 }} onClick={() => setCurPicker(true)}>
        <span style={LABEL}>Default currency</span>
        <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}</span>
        <Icon name="right2" size="var(--is-md-lg)" color="var(--color-faint)" style={{ marginLeft: 8 }} />
      </button>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {langPicker && (
        <Picker title="Language" options={LANGUAGES} active="en"
          onPick={() => setLangPicker(false)} onClose={() => setLangPicker(false)} />
      )}
      {curPicker && (
        <Picker title={t('Chọn tiền tệ')} options={CURRENCIES} active={currency}
          onPick={pickCur} onClose={() => setCurPicker(false)} />
      )}
    </div>
  )
}
