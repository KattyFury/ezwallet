import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t, getLang, setLang, READY_LANGS } from '../i18n'
import { getDisplayCurrency } from '../data'

// Khoá/mở LẤY THEO READY_LANGS (i18n.js) — ĐỪNG sửa cờ locked bằng tay ở đây. Ngôn ngữ chỉ được
// mở khi dịch xong 100% app + Circle; xem điều kiện đầy đủ ở chỗ khai báo READY_LANGS.
// Hiện: vi + en mở, zh khoá (từ điển mới 35%, chưa có bản Circle).
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
].map(l => ({ ...l, locked: !READY_LANGS.includes(l.code) }))
const LANG_LABEL = { en: 'English', vi: 'Tiếng Việt', zh: '中文' }

// Tiền hiển thị: USD/EUR chọn được (ứng token USDC/EURC). CNY/VND hiện option nhưng KHOÁ (chưa
// wire tỷ giá — mở lại: bỏ locked + thêm rate ở chain.js getDisplayRates + SUPPORTED_CURRENCIES).
// Nhãn dựng trong component (không phải hằng module) để đổi ngôn ngữ là đổi theo.
const currencyList = () => [
  { code: 'USDC', short: 'USD', label: `USD – ${t('Đô la Mỹ')}`, locked: false },
  { code: 'EURC', short: 'EUR', label: `EUR – ${t('Euro')}`, locked: false },
  { code: 'CNY',  short: 'CNY', label: `CNY – ${t('Nhân dân tệ')}`, locked: true },
  { code: 'VND',  short: 'VND', label: `VND – ${t('Việt Nam Đồng')}`, locked: true },
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
        {t('Ngôn ngữ & Tiền tệ')}
      </div>

      {/* BOX XÁM chứa nội dung hàng 2-3 (user chốt 07-17f) — 2 hàng: Ngôn ngữ + Tiền tệ
          (USD/EUR chọn được). Bấm cả hàng mở popup. */}
      <div style={{ gridRow: '2 / 4', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <button className="menu-item" onClick={() => setLangPicker(true)}>
          <span style={LABEL}>{t('Ngôn ngữ')}</span>
          <span style={CHIP}>{LANG_LABEL[getLang()] || 'English'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
        <button className="menu-item" onClick={() => setCurPicker(true)}>
          <span style={LABEL}>{t('Tiền tệ mặc định')}</span>
          <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {langPicker && (
        <Picker title={t('Ngôn ngữ')} options={LANGUAGES} active={getLang()}
          onPick={setLang} onClose={() => setLangPicker(false)} />
      )}
      {curPicker && (
        <Picker title={t('Chọn tiền tệ')} options={currencyList()} active={currency}
          onPick={pickCur} onClose={() => setCurPicker(false)} />
      )}
    </div>
  )
}
