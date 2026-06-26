import { useNav } from '../nav'
import tradeIcon from '../../icon/trade.png'
import upIcon from '../../icon/up.png'
import downIcon from '../../icon/down.png'
import menuIcon from '../../icon/menu.png'

const TABS = [
  { id: 'Swap',        label: 'Đổi tiền', icon: tradeIcon, disabled: true },
  { id: 'HomeSend',    label: 'Gửi',      icon: upIcon },
  { id: 'HomeReceive', label: 'Nhận',     icon: downIcon },
  { id: 'MenuScreen',  label: 'Menu',     icon: menuIcon },
]

export default function NavBar({ active }) {
  const { navigate } = useNav()
  return (
    <nav className="navbar full-bleed">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`navbar-btn${active === t.id ? ' active' : ''}`}
          disabled={t.disabled}
          onClick={t.disabled ? undefined : () => navigate(t.id)}
          style={t.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          {t.icon && <img src={t.icon} alt="" style={{ width: 18, height: 18, marginBottom: 2, opacity: active === t.id ? 1 : 0.4 }} />}
          {t.label}
        </button>
      ))}
    </nav>
  )
}
