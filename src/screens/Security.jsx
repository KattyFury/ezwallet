import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getSDK, executeChallenge, resetPinChallenge, refreshSession } from '../circle'
import { t } from '../i18n'
import { getDisplayCurrency } from '../data'

// Ngôn ngữ KHOÁ English (Circle SDK chỉ English + chuỗi mới hardcode English). Hiện thêm option
// Việt/Trung cho popup đỡ trống nhưng KHOÁ (thấy được, không bấm) — user chốt (chuyển từ Language.jsx
// khi gộp Language & Currency vào màn Security).
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

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [pinStatus, setPinStatus] = useState('')
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)
  const [langPicker, setLangPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  async function handleResetPin() {
    // User Google (SSO, không có ez_email): Circle chặn PUT /user/pin ở tầng platform
    // (403 code 3 dù token tươi + PIN tồn tại — verify session 10). Không gọi cho đỡ tốn 1 vòng lỗi.
    if (!localStorage.getItem('ez_email')) {
      setPinStatus('Not available for Google accounts')
      setTimeout(() => setPinStatus(''), 3000)
      return
    }
    setPinStatus(t('Đang chuẩn bị...'))
    try {
      // Làm mới userToken trước — tránh "userToken had expired" (Circle token ~1h).
      const { userToken, encryptionKey } = await refreshSession()
      const challengeId = await resetPinChallenge(userToken)
      setPinStatus(t('Nhập PIN...'))
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      setPinStatus(t('Đổi PIN thành công!'))
      setTimeout(() => setPinStatus(''), 2000)
    } catch (e) {
      setPinStatus(t('Lỗi:') + ' ' + (e.message || t('thử lại')))
    }
  }

  const email = localStorage.getItem('ez_email') || localStorage.getItem('ez_google_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // VALUE lên fs-item 17 (user 07-17f: "nội dung hơi nhỏ" — trước fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // Trạng thái đổi PIN: LỖI phải ĐỎ cho bật (user 07-17f — "Error: User canceled" đen/xanh không bật)
  const pinErr = /^(Error|Lỗi|Not available)/.test(pinStatus)

  // Chip giá trị = ĐÚNG KIỂU chip token màn Swap (user chốt 07-17f "match với các button dropdown
  // khác"): TRẮNG + VIỀN XÁM (nằm trong box xám) + MŨI TÊN XUỐNG down2 NẰM TRONG chip. Bấm mở popup.
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
        {t('Bảo mật')}
      </div>

      {/* BOX XÁM chung hàng 2-6 (mở rộng từ 2-4 khi gộp Language & Currency vào đây); trong box
          KHÔNG line xám ngăn cách (luật cũ giữ). Đổi PIN vẫn dùng CHEVRON PHẢI right2 (user chốt:
          nó là hàng đi tiếp, không phải dropdown). */}
      <div style={{ gridRow: '2 / 7', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <div className="menu-item">
          <span style={LABEL}>{t('Email đăng nhập')}</span>
          <span style={VALUE}>{email}</span>
        </div>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>{t('Địa chỉ ví')}</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? t('Đã sao chép') : shortAddr}</span>
          <Icon name="copy" size="var(--is-item)" color="var(--color-brand)" />
        </button>
        <button className="menu-item" onClick={handleResetPin}>
          <span style={LABEL}>{t('Đổi PIN')}</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: pinErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
        </button>
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
