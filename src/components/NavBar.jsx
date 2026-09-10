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
          style={tab.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          {/* 24px, measured off Send/Receive/Menu (2026-09-10) - was --is-body 19 */}
          <Icon name={tab.icon} size={24} color={active === tab.id ? 'var(--color-black)' : 'var(--color-muted)'} style={{ marginBottom: 2 }} />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
