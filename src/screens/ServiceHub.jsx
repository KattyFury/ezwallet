import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import { useNav } from '../nav'

// ══ SERVICE HUB - the services home (navbar tab 1, replacing the old Swap tab) ══
// Swap is no longer a tab of its own but one TILE in here, next to the services still to be built.
// Adding a service = adding one line to SERVICES; do NOT copy the JSX block into a loose fourth tile.
//   screen : the screen name in SCREENS (App.jsx). null = not built yet → the tile dims itself and is not tappable.
const SERVICES = [
  { id: 'swap', icon: 'exchange', label: 'Swap',        screen: 'Swap' },
  { id: 'pig',  icon: 'pig',      label: 'Piggy Bank',         screen: null },
  { id: 'luckypot', icon: 'luckypot', label: 'LuckyPot',    screen: null },
]

export default function ServiceHub() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Service Hub
      </div>

      {/* GREY BOX over rows 2-9 + a 2-COLUMN grid inside - EXACTLY the geometry of the QR Storage screen (user decision 08-12
          "pretty much the QR Storage layout, three squares that size"): padding 10 = tiles sit 10px from the box
          edge, gap 10 between tiles. The third tile drops to the next row by itself, in the left column.
          ⚠️ minmax(0,1fr) and NOT a bare '1fr': with '1fr' the content dictates min-width, so one tile with
          large content blows the whole column open (lesson 07-23c, QR Storage).
          ⚠️ alignItems:'start' - grid defaults to `stretch`, which STRETCHES the tile to the row height and then
          aspectRatio 1 inflates it sideways => the 2 columns go uneven (exactly bug 07-23c). start = each tile stays square. */}
      {/* marginBottom 2dvh = the GAP before the NavBar (user report 08-13: the grey box ate all of row 9 and stuck to the
          navbar). 2dvh is the standard bottom gap used on every other screen (the action-grid on HomeSend/
          HomeReceive, the button block on Swap) - do not invent a different number just for this screen. */}
      <div style={{ gridRow: '2 / 10', marginBottom: '2dvh', background: 'var(--color-surface)', borderRadius: 20, padding: 10, minWidth: 0 }}>
        {/* gridAutoRows '1fr' = EVERY ROW THE SAME HEIGHT, taken from the tallest tile. Needed because labels vary in
            length at font size 30: "Swap" 1 line · "Piggy Bank" 2 lines · "Dollar-Cost
            Averaging" (the third tile's old label) 3 lines → left alone, the 3 tiles came out 147/180/213 tall, badly uneven (measured 08-13).
            Do NOT use alignItems:'start' any more - the default `stretch` is what makes a tile fill its row.
            (It is aspectRatio + stretch TOGETHER that caused the sideways inflation of 07-23c; aspectRatio is gone
            here, so stretch is safe.) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridAutoRows: '1fr', gap: 10, alignContent: 'start' }}>
          {SERVICES.map(({ id, icon, label, screen }) => {
            const soon = !screen   // not built → dimmed and not tappable (the same disabled standard as MenuScreen)
            return (
              // A RAISED TILE = exactly the QR tiles in QR Storage: white + a 1.5 grey border (the "tappable inside a grey
              // box" rule) + a .25 drop shadow like a button.
              // ⚠️ NO more aspectRatio 1 (as in the first 08-12 version): at title size 30px
              // "Dollar-Cost Averaging" took 2 lines ≈ 70px, and with the 64 icon that exceeded the 160px column
              // width ⇒ forcing a square pushed the text outside the tile. minHeight follows the column width (an aspect ratio
              // on the MINIMUM rather than on the size) → short-label tiles stay square, long-label ones grow taller.
              <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
                style={{
                  minWidth: 0, border: '1.5px solid var(--color-gray)', borderRadius: 16,
                  background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: '16px 10px', fontFamily: 'inherit',
                  opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
                }}>
                {/* Icon 56 - the user drew these 3 icons on a 200×200 canvas specifically for large sizes. Brand blue =
                    the leading-icon language of menu items (user decision 07-17e).
                    ⚠️ THE SIZE WAS SETTLED AFTER 2 MISSES (user 08-13): 48 + text 17 = "too small",
                    64 + text 30 = "too big" → settled IN BETWEEN: icon 56 + text 21. Do NOT push it back to either extreme. */}
                <Icon name={icon} size={56} color="var(--color-brand)" />
                {/* Text = --fs-md-lg 21 = exactly the app's BUTTON text size (these tiles are buttons after all) → balanced
                    against the 56 icon while being clearly bigger than the old 17. A long label wraps to 2 lines → NO
                    whiteSpace:nowrap; lineHeight 1.15 keeps 2 lines compact. */}
                <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', textAlign: 'center', lineHeight: 1.15, maxWidth: '100%' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <NavBar active="ServiceHub" />
    </div>
  )
}
