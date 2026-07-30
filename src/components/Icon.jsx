// Icon dùng chung — nhúng SVG (currentColor) → recolor bằng prop color / màu chữ cha.
// SVG đã chuẩn hóa: viewBox 100x100, stroke/fill = currentColor, width/height 100%.
// ⚠️ 07-29 (kiểm toán): 7 icon KHÔNG màn nào render đã BỎ IMPORT ở đây cho nhẹ bundle —
// back · facebook · google · hint · left · right · swap. FILE .svg VẪN CÒN trong `icon/`
// (tranh của user, không xoá). Cần dùng lại: thêm 1 dòng import + 1 tên vào ICONS là xong.
import add from '../../icon/add.svg?raw'
import check from '../../icon/check.svg?raw'
import clock from '../../icon/clock.svg?raw'
import copy from '../../icon/copy.svg?raw'
import down from '../../icon/down.svg?raw'
import down2 from '../../icon/down2.svg?raw'
import download from '../../icon/download.svg?raw'
import erase from '../../icon/erase.svg?raw'
import globe from '../../icon/globe.svg?raw'
import human from '../../icon/human.svg?raw'
import info from '../../icon/info.svg?raw'
import mail from '../../icon/mail.svg?raw'
import menu from '../../icon/menu.svg?raw'
import option from '../../icon/option.svg?raw'
import out from '../../icon/out.svg?raw'
import pencil from '../../icon/pencil.svg?raw'
import qr from '../../icon/qr.svg?raw'
import right2 from '../../icon/right2.svg?raw'
import scan from '../../icon/scan.svg?raw'
import share from '../../icon/share.svg?raw'
import shield from '../../icon/shield.svg?raw'
import trade from '../../icon/trade.svg?raw'
import up from '../../icon/up.svg?raw'
import warning from '../../icon/warning.svg?raw'
import x from '../../icon/x.svg?raw'

const ICONS = {
  add, check, clock, copy, down, down2, download, erase, globe,
  human, info, mail, menu, option, out, pencil, qr, right2, scan, share, shield, trade, up, warning, x,
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
