// THE WHITE SHEET - Figma node 1:333 on Send, 1:375 on Receive, 26:2 on Exchange.
//
// ⚠️ THIS IS THE THING I GOT WRONG FIRST TIME. The redesigned screens are NOT "a gradient background with
// cards on it". They are a WHITE SHEET LYING ON TOP OF THE GRADIENT, and the gradient is only visible in
// the last ~62px, behind the NavBar. The user, 2026-09-23: "các màn đang là màn trắng có drop shadow, chỉ
// lộ background ở 70px cuối cùng của màn hình, nó sẽ là dạng màn trắng đè lên trên màn gradient".
//
// And the sheet is not a rectangle: it grows a TAB that reaches down past the bottom edge under whichever
// NavBar item is active, so the active tab sits on white while the other three sit on the gradient. That
// is the whole reason the active item reads as "selected" now that the old grey NavBar bar is gone.
//
// The path below is the node's own geometry, read off the exported asset and shifted out of its 16px
// shadow margin: the sheet ends at y=782.327, the tab drops to y=852.327 (past the 844 frame bottom, so
// its square end is never seen), and the two joins are 8px fillets.
const COL = 97.5            // the NavBar's four equal columns of 390/4
const SHEET_BOTTOM = 782.327
const TAB_BOTTOM = 852.327
const R = 8                 // fillet radius where the sheet meets the tab
const K = 4.418             // 0.5523 * R - the cubic-Bezier constant for a quarter circle

// NavBar order, left to right. The index decides which column the tab sits under.
const ORDER = ['ServiceHub', 'HomeSend', 'HomeReceive', 'MenuScreen']

function sheetPath(i) {
  // No tab (a screen with no NavBar item selected): a plain sheet.
  if (i < 0) return `M0 ${SHEET_BOTTOM} H390 V0 H0 Z`

  const L = i * COL
  const Rt = L + COL
  // The tab's outer edge can coincide with the screen edge (first and last column). There is no fillet
  // there - the sheet simply continues down - so those two joins are dropped rather than drawn off-canvas.
  const lead = L <= 0
    ? `M0 ${TAB_BOTTOM}`
    : `M0 ${SHEET_BOTTOM} H${L - R} C${L - R + K} ${SHEET_BOTTOM} ${L} ${SHEET_BOTTOM + R - K} ${L} ${SHEET_BOTTOM + R} V${TAB_BOTTOM}`
  const trail = Rt >= 390
    ? `H390`
    : `H${Rt} V${SHEET_BOTTOM + R} C${Rt} ${SHEET_BOTTOM + R - K} ${Rt + K} ${SHEET_BOTTOM} ${Rt + R} ${SHEET_BOTTOM} H390`
  return `${lead} ${trail} V0 H0 Z`
}

export default function ScreenSheet({ active }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 844"
      // preserveAspectRatio="none" on purpose: the app's whole layout is proportional (x as a % of 390,
      // y as dvh of 844), so the sheet has to stretch exactly the same way the coordinates do.
      preserveAspectRatio="none"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        // Figma's filter is feOffset 0,0 + stdDeviation 8 at 48% black. CSS drop-shadow's blur argument
        // is twice the standard deviation, hence 16px.
        filter: 'drop-shadow(0 0 16px rgba(0, 0, 0, 0.48))',
        pointerEvents: 'none',
      }}>
      <path d={sheetPath(ORDER.indexOf(active))} fill="var(--color-white)" />
    </svg>
  )
}
