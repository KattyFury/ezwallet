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

  // The BIG balance takes ~1 row of height (user decision 07-20e: fill the empty space): base 76px, shrinking
  // by REAL MEASURED WIDTH via canvas (useFitFontSize) - NOT amountFontSize (character counting) any more:
  // some currencies are twice as long as USD ("1.250.000 ₫" vs "$50.00"), so guessing by length overflows.
  const [fitRef, fitSize] = useFitFontSize(str, { max: 76, min: 28, weight: 300 })
  return (
    <div ref={fitRef} className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, padding: '0 12px' }}>
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: fitSize, fontWeight: 'var(--fw-light)', color: 'var(--color-content)', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {str}
      </span>
    </div>
  )
}
