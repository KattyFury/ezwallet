import { useState, useEffect } from 'react'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { getDisplayRates, cachedRates } from '../chain'

// Cụm số dư dùng chung cho HomeSend / HomeReceive / MenuScreen — chiếm 2 hàng (row-1-2),
// con số là phần to nổi bật. Hiển thị theo TIỀN TỆ MẶC ĐỊNH (ez_currency).
export default function BalanceHeader({ totalUsd, loading }) {
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cachedRates)   // seed từ cache → không "..." khi chuyển màn

  useEffect(() => {
    getDisplayRates().then(setRates).catch(() => setRates(r => r || { USDC: 1, EURC: 1.08 }))
  }, [])

  // CHƯA BIẾT số dư → '…', KHÔNG BAO GIỜ vẽ "$0.00" (đó là bịa số dư — bug 07-16).
  // totalUsd == null = chưa tải xong / đọc hỏng; chỉ 0 THẬT mới được hiện "$0.00".
  const unknown = loading || !rates || totalUsd == null || Number.isNaN(totalUsd)
  const num = unknown ? '…' : displayNum(totalUsd, cur, rates)
  const sign = unknown ? '' : displaySymbol(cur)

  return (
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ký hiệu tiền tệ = TIỀN TỐ dính liền số (vd "$127.66") — cả cụm căn giữa như 1 khối, không tách suffix riêng */}
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', color: 'var(--color-content)', lineHeight: 1 }}>
        {sign}{num}
      </span>
    </div>
  )
}
