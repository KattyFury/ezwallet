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

  const Row = ({ label, value, onClick }) => (
    <button className="menu-item" style={{ width: '100%' }} onClick={onClick}>
      <span style={{ flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
      <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', borderRadius: 8, padding: '4px 12px', marginRight: 8 }}>{value}</span>
      <Icon name="right2" size={15} color="var(--color-faint)" />
    </button>
  )

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Tiền tệ')}
      </div>

      <div className="row-3" style={{ display: 'flex', alignItems: 'center' }}>
        <Row label={t('Tiền tệ')} value={displaySymbol(currency)} onClick={() => setPicker(true)} />
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {picker && (
        <div onClick={() => setPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: 'var(--color-white)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '80dvh', overflowY: 'auto' }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', marginBottom: 4 }}>
              {t('Chọn tiền tệ')}
            </div>
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
