import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { t } from '../i18n'
import { getDisplayCurrency, displaySymbol } from '../data'
import { getUsdRate, estimateFeeUsd } from '../chain'
import { getSDK, executeChallenge, refreshSession } from '../circle'

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
  const [feeRates, setFeeRates] = useState({ USDC: 1, EURC: 1.08 })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)         // đã gửi thành công → khóa, không gửi lại
  const [error, setError] = useState('')          // lỗi terminal (hủy/mạng...) hiện tại chỗ

  useEffect(() => {
    Promise.all([getUsdRate('USDC'), getUsdRate('EURC')])
      .then(([u, e]) => setFeeRates({ USDC: u, EURC: e })).catch(() => {})
    // memo đi qua Memo contract → tốn gas hơn (~110k) so với transfer thường (~65k)
    estimateFeeUsd(memo && memo.trim() ? 110000 : 65000).then(setFeeUsd).catch(() => setFeeUsd(0))
  }, [memo])

  // USD = USDC (1:1, chỉ khác nhãn hiển thị); USDC/EURC/cirBTC gửi đúng số đã nhập, KHÔNG quy đổi.
  const token = currency === 'USD' ? 'USDC' : currency
  const sendAmountStr = token === 'cirBTC' ? amount.toFixed(8) : amount.toFixed(2)
  const mainEl = currency === 'USD' ? <>{displaySymbol('USDC')}{amount}</> : <>{amount} <Cur>{currency}</Cur></>

  // Phí mạng theo TIỀN TỆ MẶC ĐỊNH ở Cài đặt (getDisplayCurrency() luôn trả USDC/EURC)
  const displayCur = getDisplayCurrency()
  function feeEl() {
    if (feeUsd === null) return t('Đang tính...')
    const v = feeUsd / (feeRates[displayCur] || 1)
    const sign = displaySymbol(displayCur)
    return v < 0.01 ? `< ${sign}0.01` : `${sign}${v.toFixed(2)}`
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
      await executeChallenge(getSDK(), userToken, encryptionKey, data.challengeId)

      setDone(true)   // ký thành công → khóa màn, không cho gửi lại
      navigate('SendReceipt', { address, name, amount, memo, currency, timestamp: Date.now() })
    } catch (e) {
      // Tới đây CHỈ còn lỗi TERMINAL (hủy PIN / token hết hạn / mạng...) — KHÔNG phải sai PIN
      // (sai PIN đã được iframe cho nhập lại, không reject). Ở LẠI màn xác nhận để bấm gửi lại.
      setLoading(false)
      if (e?.code === 155701) return   // user tự bấm hủy nhập PIN → im lặng, về màn xác nhận
      console.error('[SendConfirm] gửi thất bại:', e)
      const reason = e?.message || e?.error?.message || (typeof e === 'string' ? e : null) || (e?.code ? `code ${e.code}` : null) || t('có lỗi xảy ra')
      const msg = `${t('Gửi thất bại:')} ${reason}`
      setError(msg)
      addNotif(msg, 'error')
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>{t('Xác nhận giao dịch')}</span>
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'stretch', gap: 14 }}>
        <div className="confirm-box">
          <div className="confirm-row">
            <span className="confirm-label">{t('Gửi đến')}</span>
            <span className="confirm-value">{name || shortenAddr(address)}</span>
          </div>
          {name && (
            <div className="confirm-row">
              <span className="confirm-label">{t('Địa chỉ')}</span>
              <span className="confirm-value" style={{ fontSize: 'var(--fs-label)' }}>{shortenAddr(address)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">{t('Số tiền')}</span>
            <span className="confirm-value num" style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-primary)' }}>
              {mainEl}
            </span>
          </div>
          {memo && (
            <div className="confirm-row">
              <span className="confirm-label">{t('Nội dung')}</span>
              <span className="confirm-value">{memo}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">{t('Phí mạng')}</span>
            <span className="confirm-value num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              {feeEl()}
            </span>
          </div>
        </div>

        <div className="warning-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="warning" size={16} color="var(--color-warning)" />{t('Giao dịch không thể hoàn tác sau khi xác nhận')}
        </div>

        {loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>{t('Đang mở xác nhận PIN...')}</span>}
        {error && !loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" disabled={loading || done} onClick={() => navigate('SendAmount', params)}>{t('Sửa')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? t('Đang xử lý...') : t('Xác nhận PIN')}
        </button>
      </div>
    </div>
  )
}
