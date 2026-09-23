import { useNav } from '../nav'
import Icon from '../components/Icon'

// THE NAVBAR - redrawn 2026-09-23 from Figma node 1:328 ("Send") and its siblings.
//
// ⚠️ IT NO LONGER HAS A BAR. The old version was a grey strip with a white "cell" behind the active tab
// and an inset shadow along its top edge; the redesign puts the four items STRAIGHT ONTO THE SCREEN'S
// GRADIENT with no background of any kind. Do not reintroduce a surface behind it.
//
// Geometry, straight off the node: four equal 97.5px columns, so the centres fall on 48.75 / 146.25 /
// 243.75 / 341.25 of 390 - i.e. 12.5% / 37.5% / 62.5% / 87.5%. The 24px icon sits at y=783 and the 16px
// semibold label at y=809. Active = black, inactive = the card grey #D2DCE6 (NOT the app's --color-muted:
// on this gradient a muted slate would disappear into the blue).
const TABS = [
  { id: 'ServiceHub',  label: 'Services', icon: 'hub',  left: '12.5%' },
  { id: 'HomeSend',    label: 'Send',     icon: 'up',   left: '37.5%' },
  { id: 'HomeReceive', label: 'Receive',  icon: 'down', left: '62.5%' },
  { id: 'MenuScreen',  label: 'Menu',     icon: 'menu', left: '87.5%' },
]

export default function NavBar({ active }) {
  const { navigate } = useNav()
  return (
    <nav>
      {TABS.map(tab => {
        const on = active === tab.id
        const color = on ? 'var(--color-black)' : 'var(--color-card)'
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            aria-current={on ? 'page' : undefined}
            style={{
              position: 'absolute', left: tab.left, top: '92.77dvh',
              transform: 'translateX(-50%)', width: '25%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 16, fontWeight: 'var(--fw-semibold)', color,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <Icon name={tab.icon} size={24} color={color} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
