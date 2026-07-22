import { useLayoutEffect, useRef, useState } from 'react'

let _measureCtx = null
function measureWidth(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d')
  _measureCtx.font = font
  return _measureCtx.measureText(text).width
}

// Cỡ chữ số tiền AUTO CO theo BỀ RỘNG THẬT đo bằng canvas.measureText — thay cho đoán
// "N ký tự vừa khít ở size X" (amountFontSize cũ): đoán theo số ký tự sai khi container hẹp hơn
// giả định (vd card Swap share 1 hàng với chip token) → số vẫn tràn/bị "…" cắt cụt dù đúng cỡ ký
// tự cho phép (user 07-22: gõ 1000000 vẫn hiện "100000…", không co).
// ref gắn vào container (bề rộng chỗ số được PHÉP chiếm); trả cỡ chữ TO NHẤT mà `text` vừa khít.
export function useFitFontSize(text, { max = 52, min = 16, weight = 300, family = 'Barlow, sans-serif', buffer = 4 } = {}) {
  const ref = useRef(null)
  const [size, setSize] = useState(max)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      // clientWidth GỒM CẢ padding trái/phải (CSS: clientWidth = content + padding) — trừ ra để
      // lấy đúng bề rộng chữ THẬT được phép chiếm, không thì tính dư (số vẫn tràn/bị ellipsis dù
      // "đã fit" — bug 07-22e khi div có padding 2/12 cho vùng chạm mà quên trừ).
      // - buffer (mặc định 4px): lưới an toàn cho sai số đo (vd caret "_" có margin-left 2px
      //   trong CSS nhưng canvas.measureText không biết → đo thiếu, số thật rộng hơn tính toán
      //   đúng phần margin đó → tràn/ellipsis dù "đã fit", bug 07-22f lệch 2px làm ellipsis kích
      //   hoạt oan). Trừ thêm cho chắc thay vì tính đúng từng px lẻ của từng phần tử con.
      const cs = getComputedStyle(el)
      const width = el.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0) - buffer
      if (!width) return
      let lo = min, hi = max, best = min
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const w = measureWidth(text || '', `${weight} ${mid}px ${family}`)
        if (w <= width) { best = mid; lo = mid + 1 } else { hi = mid - 1 }
      }
      setSize(best)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    // Barlow load qua Google Fonts <link> ASYNC (index.html) — nếu canvas đo TRƯỚC khi font tải
    // xong, nó âm thầm fallback sang font hệ thống (bề rộng khác) → size tính ra sai. Đo lại 1 lần
    // sau khi font sẵn sàng để tự sửa (chỉ ảnh hưởng lần đo đầu tiên lúc mới vào app).
    if (document.fonts && !document.fonts.check(`${weight} 16px ${family}`)) {
      document.fonts.ready.then(fit)
    }
    return () => ro.disconnect()
  }, [text, max, min, weight, family])

  return [ref, size]
}
