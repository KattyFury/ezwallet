import { useState, useEffect } from 'react'
import { getDisplayCurrency, displayNum, displaySymbol, amountFontSize } from '../data'
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

  // Số dư TO chiếm ~1 hàng chiều cao (user chốt 07-20e: lấp chỗ trống): base 76px, tự CO NHỎ theo độ
  // dài để số lớn vẫn vừa bề ngang (amountFontSize: 7 ký tự vừa khít ở 76, dài hơn co xuống, sàn 40).
  const str = `${sign}${num}`
  return (
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, padding: '0 12px' }}>
      {/* Ký hiệu tiền tệ = TIỀN TỐ dính liền số (vd "$127.66") — cả cụm căn giữa như 1 khối, không tách suffix riêng */}
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: amountFontSize(str, 76, 7, 40), fontWeight: 'var(--fw-light)', color: 'var(--color-content)', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {str}
      </span>
    </div>
  )
}
