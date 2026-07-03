import { useState, useEffect } from 'react'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { getDisplayRates } from '../chain'

// Cụm số dư dùng chung cho HomeSend / HomeReceive / MenuScreen — chiếm 2 hàng (row-1-2),
// con số là phần to nổi bật. Hiển thị theo TIỀN TỆ MẶC ĐỊNH (ez_currency).
export default function BalanceHeader({ totalVND, loading }) {
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cur === 'VND' ? { VND: 1 } : null)

  useEffect(() => {
    if (cur !== 'VND') getDisplayRates().then(setRates).catch(() => setRates({ VND: 1 }))
  }, [cur])

  const num = (loading || (cur !== 'VND' && !rates)) ? '...' : displayNum(totalVND, cur, rates)
  const sign = loading ? '' : displaySymbol(cur)

  return (
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ký hiệu tiền tệ = TIỀN TỐ dính liền số (vd "$127.66") — cả cụm căn giữa như 1 khối, không tách suffix riêng */}
      <span style={{ fontFamily: 'var(--font-base)', fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1 }}>
        {sign}{num}
      </span>
    </div>
  )
}
