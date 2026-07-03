import { useState } from 'react'
import Icon from '../components/Icon'

// Circle Wallet hiện chỉ hỗ trợ tiếng Anh + stablecoin → Onboarding khóa English,
// chỉ để người dùng chọn tiền tệ hiển thị mặc định (USDC/EURC). Ngôn ngữ luôn = 'en'.
const CURRENCIES = [
  { code: 'USDC', label: 'USDC', sub: 'USD Stablecoin' },
  { code: 'EURC', label: 'EURC', sub: 'Euro Stablecoin' },
]

export default function Onboarding() {
  const [currency, setCurrency] = useState('USDC')
  const [picker, setPicker] = useState(false)

  const curLabel = CURRENCIES.find(x => x.code === currency)?.label || ''

  function pickCur(code) { setCurrency(code); setPicker(false) }

  function handleStart() {
    localStorage.setItem('ez_lang', 'en')
    localStorage.setItem('ez_currency', currency)
    localStorage.setItem('ez_onboarded', '1')
    window.location.reload()
  }

  const Row = ({ label, value, onClick }) => (
    <button className="menu-item" style={{ width: '100%', padding: '16px 4px' }} onClick={onClick}>
      <span style={{ flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
      <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-content)', border: '1.5px solid var(--color-gray)', borderRadius: 8, padding: '4px 12px', marginRight: 8 }}>{value}</span>
      <Icon name="right2" size={15} color="var(--color-faint)" />
    </button>
  )

  return (
    <div className="screen">
      {/* Tiêu đề + phụ đề, nhóm trên (đồng vị trí cụm logo) */}
      <div className="row-2-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 10px' }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-medium)' }}>Welcome!</div>
        <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.3 }}>Choose your display currency</div>
      </div>

      {/* Hàng chọn tiền tệ */}
      <div className="row-6" style={{ display: 'flex', alignItems: 'center' }}>
        <Row label="Default currency" value={curLabel} onClick={() => setPicker(true)} />
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" style={{ width: '80%' }} onClick={handleStart}>
          Get started
        </button>
      </div>

      {picker && (
        <div onClick={() => setPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 340, background: 'var(--color-white)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', marginBottom: 4 }}>
              Select currency
            </div>
            {CURRENCIES.map(o => (
              <button key={o.code}
                onClick={() => pickCur(o.code)}
                className={`btn ${o.code === currency ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 18, gap: 6 }}>
                <span style={{ fontWeight: 'var(--fw-semibold)' }}>{o.label}</span>
                {o.sub && <span style={{ fontSize: 'var(--fs-label)', opacity: 0.7 }}>– {o.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
