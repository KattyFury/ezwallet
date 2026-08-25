import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { getDisplayCurrency, displaySymbol, fmtDisplay, decimalsOfCurrency } from '../data'
import { getDisplayRates, estimateFeeUsd } from '../chain'
import { getSDK, executeChallenge, refreshSession, circleErrorMessage } from '../circle'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// Ký hiệu tiền tệ / tên token dùng font Barlow (--font-condensed); số vẫn Barlow qua .num
function Cur({ children }) {
  return <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 'var(--fw-medium)' }}>{children}</span>
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  // currency = 'USD' (nhãn thân thiện, gửi USDC) hoặc token thật (USDC/EURC/cirBTC) — đến từ SendAmount.
  const { address, name, amount, memo, currency = 'USD' } = params
  const [feeUsd, setFeeUsd] = useState(null)      // phí gas thật (USD, null = đang tính)
  // Tỷ giá riêng cho PHÍ (USD mỗi 1 đơn vị tiền hiển thị — USDC:1, EURC:~1.08)
  const [feeRates, setFeeRates] = useState({ USDC: 1, EURC: 1.08, VND: 1 / 26300 })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)         // đã gửi thành công → khóa, không gửi lại
  const [error, setError] = useState('')          // lỗi terminal (hủy/mạng...) hiện tại chỗ

  useEffect(() => {
    // getDisplayRates (không phải getUsdRate từng token) — nó gồm cả VND, mà VND không phải token
    // nên getUsdRate tra TOKENS sẽ không có.
    getDisplayRates().then(setFeeRates).catch(() => {})
    // memo đi qua Memo contract → tốn gas hơn (~110k) so với transfer thường (~65k)
    estimateFeeUsd(memo && memo.trim() ? 110000 : 65000).then(setFeeUsd).catch(() => setFeeUsd(0))
  }, [memo])

  // USD = USDC (1:1, chỉ khác nhãn hiển thị); USDC/EURC/cirBTC gửi đúng số đã nhập, KHÔNG quy đổi.
  // VND = tiền pháp định, KHÔNG có trên chain → gửi USDC.
  const token = currency === 'USD' || currency === 'VND' ? 'USDC' : currency
  // ⚠️⚠️ VND: LẤY LẠI ĐÚNG số token SendAmount đã chốt (params.tokenAmount), TUYỆT ĐỐI KHÔNG quy
  // đổi lại từ tỷ giá ở màn này. Tỷ giá nhích liên tục (CoinGecko làm mới mỗi 60s) — quy đổi lần
  // hai thì con số user vừa nhìn thấy ("≈ 19.00 USDC") và con số THẬT SỰ rời ví sẽ khác nhau.
  // Người dùng phải nhận đúng cái họ đã xác nhận.
  const sendUnits = currency === 'VND' ? (params.tokenAmount ?? 0) : amount
  const sendAmountStr = token === 'cirBTC' ? sendUnits.toFixed(8) : sendUnits.toFixed(2)
  const mainEl = currency === 'USD' ? <>{displaySymbol('USDC')}{amount}</>
    : currency === 'VND' ? <>{amount.toLocaleString('vi-VN')} <Cur>₫</Cur></>
    : <>{amount} <Cur>{currency}</Cur></>

  // Phí mạng theo TIỀN TỆ MẶC ĐỊNH ở Cài đặt (USDC/EURC/VND)
  const displayCur = getDisplayCurrency()
  function feeEl() {
    if (feeUsd === null) return 'Calculating...'
    const v = feeUsd / (feeRates[displayCur] || 1)
    // Ngưỡng "quá nhỏ để hiện" phải theo SỐ LẺ của tiền tệ: $0.01 với USD, nhưng VND không có số
    // lẻ nên ngưỡng là 1 ₫ — dùng chung 0.01 thì phí 500 ₫ vẫn bị hiện thành "< 0,01 ₫" (vô nghĩa).
    const dec = decimalsOfCurrency(displayCur)
    const min = 10 ** -dec
    return v < min ? `< ${fmtDisplay(min * (feeRates[displayCur] || 1), displayCur, feeRates)}`
                   : fmtDisplay(feeUsd, displayCur, feeRates)
  }

  async function handleConfirm() {
    if (loading || done) return   // chặn bấm lặp / gửi trùng
    setLoading(true); setError('')
    // idempotencyKey MỚI mỗi lần bấm → nếu lần trước hủy/lỗi, lần này tạo challenge SẠCH.
    // Chống gửi trùng bằng cờ loading (đang gửi) + done (đã xong), KHÔNG bằng idemKey cố định.
    const idempotencyKey = crypto.randomUUID()
    try {
      // Làm mới userToken trước khi gửi — tránh "userToken had expired" nếu
      // người dùng mở app lâu (userToken Circle chỉ sống ~1 tiếng).
      const { userToken, encryptionKey } = await refreshSession()
      const walletId = localStorage.getItem('ez_wallet_id')

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken, walletId,
          toAddress: address,
          token,
          amountDecimal: sendAmountStr,
          memo,
          idempotencyKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // User ký bằng PIN qua W3S SDK. executeChallenge (circle.js) đã xử lý: nhập SAI PIN
      // → iframe tự cho nhập lại; nhập ĐÚNG → resolve → chạy tiếp xuống dưới (KHÔNG văng ra).
      await executeChallenge(await getSDK(), userToken, encryptionKey, data.challengeId)

      setDone(true)   // ký thành công → khóa màn, không cho gửi lại
      navigate('SendReceipt', { address, name, amount, memo, currency, tokenAmount: sendUnits, timestamp: Date.now() })
    } catch (e) {
      // Tới đây CHỈ còn lỗi TERMINAL (hủy PIN / token hết hạn / mạng...) — KHÔNG phải sai PIN
      // (sai PIN đã được iframe cho nhập lại, không reject). Ở LẠI màn xác nhận để bấm gửi lại.
      setLoading(false)
      if (e?.code === 155701) return   // user tự bấm hủy nhập PIN → im lặng, về màn xác nhận
      console.error('[SendConfirm] send failed:', e)
      const reason = circleErrorMessage(e)
      const msg = `${'Send failed:'} ${reason}`
      setError(msg)
      addNotif(msg, 'error')
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>Confirm transaction</span>
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'stretch', gap: 14 }}>
        <div className="confirm-box">
          <div className="confirm-row">
            <span className="confirm-label">Send to</span>
            <span className="confirm-value">{name || shortenAddr(address)}</span>
          </div>
          {name && (
            <div className="confirm-row">
              <span className="confirm-label">Address</span>
              <span className="confirm-value" style={{ fontSize: 'var(--fs-body)' }}>{shortenAddr(address)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Amount</span>
            <span className="confirm-value num" style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-brand)' }}>
              {mainEl}
            </span>
          </div>
          {/* VND: nói RÕ số USDC thật sự rời ví — user gõ tiền Việt nhưng thứ chạy trên chain là
              USDC, giấu đi là đánh lừa. Đây đúng con số đã chốt ở màn trước, không tính lại. */}
          {currency === 'VND' && (
            <div className="confirm-row">
              <span className="confirm-label">Actually sent</span>
              <span className="confirm-value num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
                {sendAmountStr} USDC
              </span>
            </div>
          )}
          {memo && (
            <div className="confirm-row">
              <span className="confirm-label">Note</span>
              <span className="confirm-value">{memo}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Network fee</span>
            <span className="confirm-value num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
              {feeEl()}
            </span>
          </div>
        </div>

        <div className="warning-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="warning" size="var(--is-label)" color="var(--color-warning)" />{'This transaction cannot be undone once confirmed'}
        </div>

        {loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>Opening PIN confirmation...</span>}
        {error && !loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" disabled={loading || done} onClick={() => navigate('SendAmount', params)}>Edit</button>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? 'Processing...' : 'Confirm PIN'}
        </button>
      </div>
    </div>
  )
}
