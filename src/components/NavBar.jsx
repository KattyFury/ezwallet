import { useNav } from '../nav'
import Icon from './Icon'

// Tab 1 = SERVICE HUB (08-12), thay tab Swap cũ: Swap giờ là 1 trong nhiều dịch vụ (Swap ·
// Piggy Bank · LuckyPot) nên navbar trỏ vào TRANG CHỦ dịch vụ, không trỏ thẳng 1 dịch vụ nữa.
// → Màn Swap KHÔNG còn tab riêng ⇒ hàng 10 của nó là nút Exit (về ServiceHub), không phải NavBar.
const TABS = [
  { id: 'ServiceHub',  label: 'Services', icon: 'hub' },
  { id: 'HomeSend',    label: 'Send',     icon: 'up' },
  { id: 'HomeReceive', label: 'Receive',    icon: 'down' },
  { id: 'MenuScreen',  label: 'Menu',    icon: 'menu' },
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
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
