import { useNav } from '../nav'
import Icon from './Icon'

// Tab 1 = SERVICE HUB (08-12), replacing the old Swap tab: Swap is now one service among many
// (Swap · Piggy Bank · LuckyPot), so the navbar points at the services HOME, not at one service.
// → Swap has no tab of its own ⇒ its row 10 is the Exit button (back to ServiceHub), not the NavBar.
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
