import { useLayoutEffect, useRef, useState } from 'react'

let _measureCtx = null
function measureWidth(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d')
  _measureCtx.font = font
  return _measureCtx.measureText(text).width
}

// Amount font size AUTO-SHRINKS by REAL WIDTH measured with canvas.measureText - replacing the guess
// "N characters fit at size X" (the old amountFontSize): counting characters is wrong when the container is
// narrower than assumed (e.g. the Swap card shares a row with the token chip) → the number still overflows or
// gets cut with "…" even at an allowed character count (user 07-22: typing 1000000 still showed "100000…").
// ref goes on the container (the width the number is ALLOWED to take); returns the LARGEST size `text` fits at.
export function useFitFontSize(text, { max = 52, min = 16, weight = 300, family = 'Barlow, sans-serif', buffer = 4 } = {}) {
  const ref = useRef(null)
  const [size, setSize] = useState(max)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      // clientWidth INCLUDES left/right padding (CSS: clientWidth = content + padding) - subtract it to get
      // the REAL width the text may occupy, otherwise the budget is too generous (the number still overflows /
      // gets ellipsised though it "fits" - bug 07-22e, a div with padding 2/12 for the touch area was not subtracted).
      // - buffer (default 4px): safety net for measurement error (e.g. the "_" caret has margin-left 2px in
      //   CSS but canvas.measureText knows nothing about it → the measurement comes up short, the real text is
      //   wider than computed → overflow/ellipsis though it "fits", bug 07-22f where 2px triggered the ellipsis
      //   for nothing). Subtract a little extra rather than accounting for every stray pixel of every child.
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
    // Barlow loads through an ASYNC Google Fonts <link> (index.html) - if canvas measures BEFORE the font
    // finishes loading, it silently falls back to a system font (different widths) → the computed size is wrong.
    // Measure once more when the font is ready to self-correct (only affects the very first measurement on entry).
    if (document.fonts && !document.fonts.check(`${weight} 16px ${family}`)) {
      document.fonts.ready.then(fit)
    }
    return () => ro.disconnect()
  }, [text, max, min, weight, family])

  return [ref, size]
}
