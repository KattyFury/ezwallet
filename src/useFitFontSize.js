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
//
// ⚠️ `family` MUST MATCH WHAT THE ELEMENT IS ACTUALLY DRAWN IN. This is a real measurement, not a
// label: canvas.measureText renders in the family it is handed, so a stale value here silently sizes
// the number against a typeface nobody is looking at, and it overflows or ellipsises for no visible
// reason. It said 'Barlow, sans-serif' until 2026-08-30, when the app dropped webfonts for the system
// stack - which is exactly the kind of leftover that keeps working just badly enough not to notice.
// It now reads --font-condensed straight off the document, so it can never drift from index.css again.
//
// ⚠️ READ ONCE AND CACHED, never per render. `getComputedStyle` forces the browser to recalculate
// style, and as a default parameter this ran on EVERY render of every screen showing an amount -
// HomeSend, SendAmount, Swap, the busiest screens in the app. The value cannot change at runtime (it
// is a static CSS variable), so reading it more than once buys nothing and costs a reflow each time.
let _family = null
function measuredFamily() {
  if (_family === null) {
    _family = getComputedStyle(document.documentElement).getPropertyValue('--font-condensed').trim() || 'sans-serif'
  }
  return _family
}

export function useFitFontSize(text, { max = 52, min = 16, weight = 300, family, buffer = 4 } = {}) {
  family = family || measuredFamily()
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
    // KEPT even though the app no longer loads a webfont (2026-08-30). It cost nothing and it is the
    // safety net for the day one comes back: a font arriving after the first measurement changes every
    // width, and without a second pass the number stays sized for the fallback. `document.fonts.check`
    // on a system stack simply answers true and this never runs.
    if (document.fonts && !document.fonts.check(`${weight} 16px ${family}`)) {
      document.fonts.ready.then(fit)
    }
    return () => ro.disconnect()
  }, [text, max, min, weight, family])

  return [ref, size]
}
