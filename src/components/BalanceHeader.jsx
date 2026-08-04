import { useState, useEffect } from 'react'
import { getDisplayCurrency, fmtDisplay } from '../data'
import { getDisplayRates, cachedRates } from '../chain'
import { useFitFontSize } from '../useFitFontSize'

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
  // fmtDisplay tự đặt ký hiệu ĐÚNG BÊN: "$127.66" nhưng "1.250.000 ₫" (tiếng Việt để ₫ sau số).
  const str = unknown ? '…' : fmtDisplay(totalUsd, cur, rates)

  // Số dư TO chiếm ~1 hàng chiều cao (user chốt 07-20e: lấp chỗ trống): base 76px, tự CO theo
  // BỀ RỘNG THẬT đo bằng canvas (useFitFontSize) — KHÔNG dùng amountFontSize (đếm ký tự) nữa:
  // số VND dài gấp đôi số USD ("1.250.000 ₫" vs "$50.00") nên đoán theo số ký tự là tràn layout.
  const [fitRef, fitSize] = useFitFontSize(str, { max: 76, min: 28, weight: 300 })
  return (
    <div ref={fitRef} className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, padding: '0 12px' }}>
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: fitSize, fontWeight: 'var(--fw-light)', color: 'var(--color-content)', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {str}
      </span>
    </div>
  )
}
