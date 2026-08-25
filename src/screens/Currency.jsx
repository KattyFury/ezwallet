import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getDisplayCurrency } from '../data'

// Tiền hiển thị: USD/EUR (ứng token USDC/EURC). CNY + VND đã BỎ 2026-08-25 cùng lúc gỡ tiếng
// Trung/tiếng Việt khỏi dự án — cả 2 vốn đang khoá, không bấm được (VND từng bật 08-04 rồi khoá
// lại 08-12 vì app English/USD mà quét QR ra VND). Phần tỷ giá/format VND trong chain.js + qr.js
// KHÔNG đụng tới: QR không ghi tiền tệ vẫn được QRScanner đọc, xem ghi chú ở đó.
const CURRENCY_OPTIONS = [
  { code: 'USDC', short: 'USD', label: 'USD – US Dollar', locked: false },
  { code: 'EURC', short: 'EUR', label: 'EUR – Euro', locked: false },
]
const CUR_SHORT = { USDC: 'USD', EURC: 'EUR' }

export default function Currency() {
  const { navigate } = useNav()
  const [currency, setCurrency] = useState(getDisplayCurrency())
  const [curPicker, setCurPicker] = useState(false)

  function pickCur(code) { setCurrency(code); localStorage.setItem('ez_currency', code); setCurPicker(false) }

  // Chip giá trị = ĐÚNG KIỂU chip token màn Swap (user chốt 07-17f "match với các button dropdown
  // khác"): TRẮNG + VIỀN XÁM (nằm trong box xám) + MŨI TÊN XUỐNG down2 NẰM TRONG chip. Bấm mở popup.
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const CHIP = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', borderRadius: 999, padding: '5px 10px 5px 14px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)' }

  // Popup chọn tiền tệ: option locked = nút mờ, disabled (không bấm). Giữ cờ locked để sau thêm
  // tiền tệ mới chưa wire tỷ giá là dùng lại được ngay.
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
        Currency
      </div>

      {/* BOX XÁM 1 HÀNG (hàng 2) — trước là 2 hàng Ngôn ngữ + Tiền tệ, hàng Ngôn ngữ bỏ 08-25
          lúc gỡ i18n. Luật cao box: 1 item = 1 hàng grid (Security 3 item = '2 / 5'). */}
      <div style={{ gridRow: '2 / 3', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <button className="menu-item" onClick={() => setCurPicker(true)}>
          <span style={LABEL}>Default currency</span>
          <span style={CHIP}>{CUR_SHORT[currency] || 'USD'}<Icon name="down2" size="var(--is-item)" color="var(--color-brand)" /></span>
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>

      {curPicker && (
        <Picker title={'Select currency'} options={CURRENCY_OPTIONS} active={currency}
          onPick={pickCur} onClose={() => setCurPicker(false)} />
      )}
    </div>
  )
}
