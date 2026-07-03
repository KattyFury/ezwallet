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

  return (
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Số dư căn giữa tuyệt đối; ký hiệu tiền tệ treo bên phải (absolute) + căn giữa dọc */}
      <span style={{ position: 'relative', fontFamily: 'var(--font-base)', fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1 }}>
        {num}
        <span style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10, fontFamily: 'var(--font-base)', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-normal)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>{displaySymbol(cur)}</span>
      </span>
    </div>
  )
}
