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

  // Chip giá trị = ĐÚNG KIỂU chip token màn Swap (user chốt 07-17f "match với các button dropdown
  // khác"): TRẮNG + VIỀN XÁM (nằm trong box xám) + MŨI TÊN XUỐNG down2 NẰM TRONG chip. Bấm mở popup.
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', borderRadius: 999, padding: '5px 10px 5px 14px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)' }

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

      {/* BOX XÁM chứa nội dung hàng 2-3 (user chốt 07-17f) — 2 hàng: Ngôn ngữ (English khoá) +
          Tiền tệ (USD/EUR chọn được). Bấm cả hàng mở popup. */}
      <div style={{ gridRow: '2 / 4', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <button className="menu-item" onClick={() => setLangPicker(true)}>
          <span style={LABEL}>Language</span>
          <span style={CHIP}>English<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
        <button className="menu-item" onClick={() => setCurPicker(true)}>
          <span style={LABEL}>Default currency</span>
          <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
      </div>

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
