import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import { useNav } from '../nav'

// ══ SERVICE HUB - the services home (navbar tab 1) ══
// REBUILT 2026-09-10 against the current Figma file (GxgsMU6HAYqolckzvPWXp1, node 1:43) on the
// guideline grid (70px rows + 16px gutter, see HANDOFF.md READ FIRST §1): 2 full-width cards, each
// spanning exactly one "double row" (156px = 2×70+16) - card 1 at rows 2-3 (top 10.19dvh), card 2 at
// rows 4-5 (top 30.57dvh), the 16px gap between them falling exactly on the grid gutter.
//
// ⚠️ Piggy Bank is NOT drawn in the Figma frame at all (only 2 cards: Exchange + LuckyPot) - left OUT
// of SERVICES below rather than shown as a 3rd disabled card. Not deleted, just not listed here.
const SERVICES = [
  { id: 'swap', icon: 'exchange', label: 'Exchange', desc: 'Swap between USDC, EURC & cirBTC', screen: 'Swap', top: '10.19dvh' },
  { id: 'luckypot', icon: 'luckypot', label: 'LuckyPot', desc: 'Your idle money can become lottery tickets – for free', screen: 'LuckyPot', top: '30.57dvh' },
]

export default function ServiceHub() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      {/* THE HEADER RULE (see .screen-title in index.css): every screen title sits bottom-anchored,
          centred, size 28, in the 70px row-1 box - the same shared class every other screen's title
          uses, not an ad-hoc position. Lowercase "hub" per the exact Figma text. */}
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Service hub
      </div>

      {SERVICES.map(({ id, icon, label, desc, screen, top }) => {
        const soon = !screen   // not built → dimmed and not tappable (the same disabled standard as MenuScreen)
        return (
          // A RAISED WHITE CARD, radius 16, glow shadow (nodes 7:113/7:117) - not the old grey-border
          // tile style. Icon is a real Icon component at the Figma placeholder's exact 55.844px box,
          // inset 10px from the card's left edge and vertically centred; the label+desc block starts
          // right after it with a 9px gap, both lines in BLACK (the description is NOT muted grey here,
          // unlike almost every other secondary-text line in the app - this frame draws it solid black).
          <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
            style={{
              position: 'absolute', left: '6.41%', right: '6.41%', top, height: '18.48dvh',
              border: 'none', borderRadius: 16, background: 'var(--color-white)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)',
              display: 'flex', alignItems: 'center', padding: '0 8px 0 10px', gap: 9, minWidth: 0,
              fontFamily: 'inherit', textAlign: 'left', opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
            }}>
            <Icon name={icon} size="min(14.32vw, calc(var(--screen-max) * 0.1432))" color="var(--color-brand)" style={{ flexShrink: 0 }} />
            <span className="col" style={{ minWidth: 0, gap: 2 }}>
              <span style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1.2 }}>{label}:</span>
              <span style={{ fontSize: 'var(--fs-content-2)', fontWeight: 'var(--fw-normal)', color: 'var(--color-content)', lineHeight: 1.3 }}>{desc}</span>
            </span>
          </button>
        )
      })}

      <NavBar active="ServiceHub" />
    </div>
  )
}
