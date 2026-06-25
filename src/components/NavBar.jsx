import { useNav } from '../nav'
import tradeIcon from '../../icon/trade.png'
import upIcon from '../../icon/up.png'
import downIcon from '../../icon/down.png'

const TABS = [
  { id: 'Swap',        label: 'Đổi tiền', icon: tradeIcon },
  { id: 'HomeSend',    label: 'Gửi',      icon: upIcon },
  { id: 'HomeReceive', label: 'Nhận',     icon: downIcon },
  { id: 'MenuScreen',  label: 'Menu',     icon: null },
]

export default function NavBar({ active }) {
  const { navigate } = useNav()
  return (
    <nav className="navbar full-bleed">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`navbar-btn${active === t.id ? ' active' : ''}`}
          onClick={() => navigate(t.id)}
        >
          {t.icon && <img src={t.icon} alt="" style={{ width: 18, height: 18, marginBottom: 2 }} />}
          {t.label}
        </button>
      ))}
    </nav>
  )
}
