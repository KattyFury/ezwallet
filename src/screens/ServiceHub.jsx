import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import { useNav } from '../nav'

// ══ SERVICE HUB - the services home (navbar tab 1) ══
// REBUILT 2026-09-07 from FIGMA-SCREENS-SPEC.md §7 (Frame 6): the old 2-column grid of square tiles is
// gone, replaced by full-width HORIZONTAL cards - icon left, title + description right - measured off
// the frame (card height 148.8px, 20px gap between cards, matching the guideline's "2 yếu tố sát nhau
// cách 20px" rule exactly). "Swap" is relabelled "Exchange" per the frame (still routes to Swap.jsx -
// only the tile's display label changed, not the screen id).
//
// ⚠️ Piggy Bank is NOT drawn in the new Figma frame at all (only 2 cards: Exchange + LuckyPot) - left
// OUT of SERVICES below rather than shown as a 3rd disabled card, since the new full-width layout has
// no natural "half-built" slot for it the way the old 2-column grid did. Not deleted, just commented out
// - FIGMA-SCREENS-SPEC.md §8.3 flags this as still needing your decision (drop it for good, or it comes
// back once there's a real screen for it).
// Adding a service = adding one line to SERVICES.
//   screen : the screen name in SCREENS (App.jsx). null = not built yet → the card dims itself and is not tappable.
const SERVICES = [
  { id: 'swap',     icon: 'exchange', label: 'Exchange', desc: 'Swap USDC to EURC or cirBTC with Stablecoin Kit', screen: 'Swap' },
  // { id: 'pig',   icon: 'pig',      label: 'Piggy Bank', desc: '…', screen: null },  -- see note above, not in the new Figma frame
  { id: 'luckypot', icon: 'luckypot', label: 'LuckyPot',  desc: 'Your idle USDC can bring you $$$$',      screen: 'LuckyPot' },
]

export default function ServiceHub() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Service Hub
      </div>

      {/* Cards start at row 2 (Figma top=94.4 ≈ 11.18dvh, close enough to row 2's 8.44dvh start to use
          the row boundary directly) and stack downward - justifyContent flex-start on purpose: the frame
          leaves the rest of the screen blank below the 2nd card rather than stretching cards to fill it. */}
      <div style={{ gridRow: '2 / 10', display: 'flex', flexDirection: 'column', gap: '2.37dvh' /* 20px / 844 */, minWidth: 0 }}>
        {SERVICES.map(({ id, icon, label, desc, screen }) => {
          const soon = !screen   // not built → dimmed and not tappable (the same disabled standard as MenuScreen)
          return (
            // A RAISED CARD - white + a drop shadow, no border (Figma: `shadow-[0_0_15px_rgba(0,0,0,.5)]`,
            // no border on these cards, unlike the old grey-bordered tiles).
            <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
              style={{
                height: '17.63dvh' /* 148.8/844 */, minWidth: 0, width: '100%',
                border: 'none', borderRadius: 10,
                background: 'var(--color-white)', boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
                display: 'flex', alignItems: 'center',
                padding: '0 12px 0 5.09%' /* Figma icon left edge 19.84/390 */, gap: 14, fontFamily: 'inherit', textAlign: 'left',
                opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
              }}>
              {/* Icon 62.263px in the frame (15.96% of 390) - the user's icons are drawn on a 200×200
                  canvas for exactly this kind of large render. */}
              <Icon name={icon} size="min(7.38dvh, 15.96vw)" color="var(--color-brand)" />
              {/* minWidth 0 - the mandatory guard whenever a flex item holds text (see the .screen note in
                  index.css): without it a long description widens the card instead of wrapping. */}
              <span className="col" style={{ minWidth: 0, gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1.15 }}>
                  {label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)', lineHeight: 1.25 }}>
                  {desc}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <NavBar active="ServiceHub" />
    </div>
  )
}
