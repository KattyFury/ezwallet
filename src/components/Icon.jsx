// Shared icon component - inlines the SVG (currentColor) → recolour via the color prop / the parent text colour.
// The SVGs are normalised: viewBox 100x100, stroke/fill = currentColor, width/height 100%.
// ⚠️ 07-29 (audit): 8 icons that no screen renders had their IMPORT REMOVED here to keep the bundle light -
// back · dca · facebook · google · hint · left · right · swap. The .svg FILES ARE STILL in `icon/`
// (the user's drawings, not deleted). To use one again: add one import line + one name to ICONS.
import add from '../../icon/add.svg?raw'
import bug from '../../icon/bug.svg?raw'
import check from '../../icon/check.svg?raw'
import clock from '../../icon/clock.svg?raw'
import copy from '../../icon/copy.svg?raw'
import down from '../../icon/down.svg?raw'
import down2 from '../../icon/down2.svg?raw'
import download from '../../icon/download.svg?raw'
import erase from '../../icon/erase.svg?raw'
import exchange from '../../icon/exchange.svg?raw'
import globe from '../../icon/globe.svg?raw'
import hub from '../../icon/hub.svg?raw'
import human from '../../icon/human.svg?raw'
import info from '../../icon/info.svg?raw'
import luckypot from '../../icon/luckypot.svg?raw'
import mail from '../../icon/mail.svg?raw'
import menu from '../../icon/menu.svg?raw'
import option from '../../icon/option.svg?raw'
import out from '../../icon/out.svg?raw'
import pencil from '../../icon/pencil.svg?raw'
import pig from '../../icon/pig.svg?raw'
import qr from '../../icon/qr.svg?raw'
import right2 from '../../icon/right2.svg?raw'
import scan from '../../icon/scan.svg?raw'
import share from '../../icon/share.svg?raw'
import shield from '../../icon/shield.svg?raw'
import trade from '../../icon/trade.svg?raw'
import up from '../../icon/up.svg?raw'
import warning from '../../icon/warning.svg?raw'
import x from '../../icon/x.svg?raw'

// ⚠️ luckypot · exchange · pig = viewBox 200×200 (every other icon is 100×100). DELIBERATE - the user drew them
// at double size because these 3 render LARGE in the Service Hub, so relatively thinner strokes are the intent.
// Do NOT "normalise" them to 100×100 or double the stroke-width. No display impact: width/height = 100%, the viewBox scales.
// ⚠️ luckypot is a FULL-COLOUR icon (yellow #FFCC00 + green #16A34A + black outline) - the user's drawing is kept
// as-is on purpose, NOT converted to currentColor. Consequence: the `color` prop has no effect on this one.
const ICONS = {
  add, bug, check, clock, copy, down, down2, download, erase, exchange, globe, hub,
  human, info, luckypot, mail, menu, option, out, pencil, pig, qr, right2, scan, share, shield, trade, up, warning, x,
}

export default function Icon({ name, size = 24, color, style, className }) {
  const svg = ICONS[name]
  if (!svg) return null
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, color, flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
