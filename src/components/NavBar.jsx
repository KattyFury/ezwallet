import { useNav } from '../nav'
import Icon from './Icon'
import { t } from '../i18n'

const TABS = [
  { id: 'Swap',        label: 'Đổi tiền', icon: 'trade' },
  { id: 'HomeSend',    label: 'Gửi',      icon: 'up' },
  { id: 'HomeReceive', label: 'Nhận',     icon: 'down' },
  { id: 'MenuScreen',  label: 'Menu',     icon: 'menu' },
]

export default function NavBar({ active }) {
  const { navigate } = useNav()
  return (
    <nav className="navbar full-bleed">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`navbar-btn${active === tab.id ? ' active' : ''}`}
          disabled={tab.disabled}
          onClick={tab.disabled ? undefined : () => navigate(tab.id)}
          style={{ position: 'relative', ...(tab.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
        >
          {active === tab.id && (
            <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 5, borderRadius: '0 0 5px 5px', background: 'var(--color-brand)' }} />
          )}
          <Icon name={tab.icon} size="var(--is-body)" color={active === tab.id ? 'var(--color-black)' : 'var(--color-muted-2)'} style={{ marginBottom: 2 }} />
          {t(tab.label)}
        </button>
      ))}
    </nav>
  )
}
