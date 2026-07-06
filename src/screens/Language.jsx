import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t, getLang, setLang } from '../i18n'
import { getDisplayCurrency } from '../data'

// Ngôn ngữ: hạ tầng i18n có en/vi/zh. ⚠️ Modal PIN/xác nhận Circle LUÔN tiếng Anh (không đổi được);
// nhiều chuỗi mới hardcode English → chọn VI/ZH còn lẫn Anh vài chỗ (cần dịch bổ sung nếu muốn full).
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
]
const LANG_LABEL = { en: 'English', vi: 'Tiếng Việt', zh: '中文' }

// Tiền HIỂN THỊ (quy đổi qua tỷ giá, KHÔNG phải token thật — chain vẫn USDC/EURC). code = giá trị
// lưu ez_currency; USD/EUR ứng token USDC/EURC, CNY/VND là pháp định quy đổi.
const CURRENCIES = [
  { code: 'USDC', short: 'USD', label: 'USD – US Dollar' },
  { code: 'EURC', short: 'EUR', label: 'EUR – Euro' },
  { code: 'CNY',  short: 'CNY', label: 'CNY – Chinese Yuan' },
  { code: 'VND',  short: 'VND', label: 'VND – Vietnamese Dong' },
]
const CUR_SHORT = { USDC: 'USD', EURC: 'EUR', CNY: 'CNY', VND: 'VND' }

export default function Language() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)
  const [langPicker, setLangPicker] = useState(false)
  const lang = getLang()

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }
  function pickLang(code) { setLang(code) }   // setLang tự lưu + reload (đọc lại LANG)

  // Chip giá trị ĐỒNG BỘ cho mọi hàng (cùng 1 style, không mỗi chỗ mỗi kiểu).
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '6px 14px' }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Language &amp; Currency
      </div>

      {/* Ngôn ngữ = HÀNG 2 — bấm mở popup chọn Anh/Việt/Trung */}
      <button className="menu-item" style={{ gridRow: 2 }} onClick={() => setLangPicker(true)}>
        <span style={LABEL}>Language</span>
        <span style={CHIP}>{LANG_LABEL[lang] || 'English'}</span>
        <Icon name="right2" size={15} color="var(--color-faint)" style={{ marginLeft: 8 }} />
      </button>

      {/* Tiền tệ = HÀNG 3 — bấm mở popup USD/EUR/CNY/VND */}
      <button className="menu-item" style={{ gridRow: 3 }} onClick={() => setCurPicker(true)}>
        <span style={LABEL}>Default currency</span>
        <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}</span>
        <Icon name="right2" size={15} color="var(--color-faint)" style={{ marginLeft: 8 }} />
      </button>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {langPicker && (
        <div className="popup-overlay" onClick={() => setLangPicker(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Language</div>
            {LANGUAGES.map(o => (
              <button key={o.code} onClick={() => pickLang(o.code)}
                className={`btn ${o.code === lang ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18 }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {curPicker && (
        <div className="popup-overlay" onClick={() => setCurPicker(false)}>
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
