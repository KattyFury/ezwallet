import { useState, useEffect } from 'react'
import { getDisplayCurrency, fmtDisplay } from '../data'
import { getDisplayRates, cachedRates } from '../chain'
import { useFitFontSize } from '../useFitFontSize'

// Shared balance block for HomeSend / HomeReceive / MenuScreen - takes 2 rows (row-1-2),
// the number being the big focal piece. Rendered in the DEFAULT CURRENCY (ez_currency).
export default function BalanceHeader({ totalUsd, loading }) {
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cachedRates)   // seeded from cache → no "..." when switching screens

  useEffect(() => {
    getDisplayRates().then(setRates).catch(() => setRates(r => r || { USDC: 1, EURC: 1.08 }))
  }, [])

  // BALANCE NOT KNOWN YET → '…', NEVER draw "$0.00" (that is inventing a balance - bug 07-16).
  // totalUsd == null = still loading / failed to read; only a REAL 0 may show as "$0.00".
  const unknown = loading || !rates || totalUsd == null || Number.isNaN(totalUsd)
  // fmtDisplay puts the symbol on the CORRECT side: "$127.66" but "1.250.000 ₫" (symbol trails the number).
  const str = unknown ? '…' : fmtDisplay(totalUsd, cur, rates)

  // MAX SIZE = 50 (user decision 2026-09-08, FIGMA-SCREENS-SPEC.md §12): the balance is capped at 50px,
  // shrinking by REAL MEASURED WIDTH via canvas (useFitFontSize) - NOT amountFontSize (character counting)
  // any more: some currencies are twice as long as USD ("1.250.000 ₫" vs "$50.00"), so guessing by length
  // overflows. The fit budget itself is capped at 75% of the SCREEN width (not just the container minus a
  // little padding) so a long decimal amount (e.g. "$10,000.00") never draws past 3/4 of the screen, exactly
  // the overflow the user hit that prompted this rule.
  const [fitRef, fitSize] = useFitFontSize(str, { max: 50, min: 28, weight: 300 })
  return (
    // Occupies row 1 + HALF of row 2 (not the full 2 rows like before max=76 needed) - flex-start instead of
    // center so the number sits at the TOP of the row-1-2 grid area, leaving the bottom half of row 2 empty
    // as breathing room before whatever starts at row 3.
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minWidth: 0 }}>
      <div ref={fitRef} style={{ height: '15dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 'min(75vw, calc(var(--screen-max) * 0.75))' }}>
        <span style={{ fontFamily: 'var(--font-condensed)', fontSize: fitSize, fontWeight: 'var(--fw-light)', color: 'var(--color-content)', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {str}
        </span>
      </div>
    </div>
  )
}
