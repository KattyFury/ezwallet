import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import { useNav } from '../nav'

// ══ SERVICE HUB - the services home (navbar tab 1, replacing the old Swap tab) ══
// Swap is no longer a tab of its own but one CARD in here, next to the services still to be built.
// Adding a service = adding one line to SERVICES; do NOT copy the JSX block into a loose fourth card.
//   screen : the screen name in SCREENS (App.jsx). null = not built yet → the card dims itself and is not tappable.
//
// ⚠️ REDRAWN 2026-09-05 to Figma frame 10 (DESIGN-GRID-390.md). This screen was a grey box holding a
// 2-COLUMN grid of square tiles (icon 56 over a centred label, copied from the QR Storage layout on
// 08-12). The frame replaces that with THREE FULL-WIDTH HORIZONTAL CARDS - icon on the left, title
// and a one-line description on the right - and there is no grey box behind them any more. The
// aspectRatio/alignItems traps documented on the old version (bugs 07-23c, 08-13) belonged to that
// square-tile grid and are gone with it; nothing here is square, so nothing can inflate sideways.
//
// The DESCRIPTIONS are new content that only exists in the frame - they are not invented here.
// The first two LABELS changed with them: "Swap" → "Exchange", "Piggy Bank" → "PigSave".
const SERVICES = [
  { id: 'swap',     icon: 'exchange', label: 'Exchange', desc: 'Swap USDC to EURC or cirBTC with LI.FI', screen: 'Swap' },
  { id: 'pig',      icon: 'pig',      label: 'PigSave',  desc: 'Buy a piggy bank and start saving',      screen: null },
  { id: 'luckypot', icon: 'luckypot', label: 'LuckyPot', desc: 'Your idle USDC can earn you $$$$',       screen: null },
]

export default function ServiceHub() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      {/* Figma: y=28.54 h=55.86, full width, centred → row 1. */}
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Service Hub
      </div>

      {/* THE THREE CARDS, positioned from the frame's own coordinates (y/844 → dvh):
            card tops  96.03 / 264.95 / 432.40 → 11.38 / 31.39 / 51.23 dvh
            card height          145.3         → 17.21 dvh
            pitch                168.42        → 19.95 dvh  ⇒ gap = 19.95 - 17.21 = 2.74 dvh
          Row 2 starts at 10dvh, so paddingTop 1.38dvh puts the first card at 11.38dvh exactly.
          justifyContent flex-start (NOT space-between): the block deliberately ENDS at 68.4dvh and
          leaves the bottom of rows 2-9 empty, which is what the frame draws - stretching the cards
          down to the navbar would be a different design. */}
      <div style={{
        gridRow: '2 / 10', minWidth: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-start', paddingTop: '1.38dvh', gap: '2.74dvh',
      }}>
        {SERVICES.map(({ id, icon, label, desc, screen }) => {
          const soon = !screen   // not built → dimmed and not tappable (the same disabled standard as MenuScreen)
          return (
            // A RAISED CARD, keeping the app's existing "tappable" language: white + a 1.5 grey
            // border + a .25 drop shadow, exactly like the tiles it replaces. The frame specifies
            // geometry only (it is a wireframe - no fills, no radii, see DESIGN-GRID-390.md §5), so
            // colour and type stay on the locked system rather than being guessed from grey boxes.
            <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
              style={{
                height: '17.21dvh', minWidth: 0, width: '100%',
                border: '1.5px solid var(--color-gray)', borderRadius: 16,
                background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                display: 'flex', alignItems: 'center',
                // Figma: icon left edge 19.6 inside the card, then a ~14px gap before the text.
                padding: '0 12px 0 19.6px', gap: 14, fontFamily: 'inherit', textAlign: 'left',
                opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
              }}>
              {/* Icon 100.39 square, vertically centred in the card (Figma: 22.45 of clearance top and
                  bottom of a 145.3 card - i.e. dead centre). 100.39/844 = 11.9dvh; the vw term is the
                  guard for a short, wide window, where a pure dvh icon would shrink to nothing.
                  The user drew these 3 icons on a 200×200 canvas, so a 100px render is their size. */}
              <Icon name={icon} size="min(11.9dvh, 25.7vw)" color="var(--color-brand)" />
              {/* minWidth 0 - the mandatory guard whenever a flex item holds text (see the .screen
                  note in index.css): without it a long description widens the card instead of wrapping. */}
              <span className="col" style={{ minWidth: 0, gap: 4 }}>
                <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1.15 }}>
                  {label}
                </span>
                {/* One description line, secondary grey at --fs-item 17 - the list-item size, which is
                    the step below the 21 of the label it hangs under. Figma gives it w=202.53 h=46
                    (two 17px lines of room), so wrapping to a second line is expected, not an overflow. */}
                <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-normal)', color: 'var(--color-muted)', lineHeight: 1.25 }}>
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
