import { useState, useEffect, useRef } from 'react'
import Icon from '../components/Icon'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { t } from '../i18n'
import { fmtVND, getDisplayCurrency } from '../data'
import { getVndRate, estimateFeeVnd } from '../chain'
import { getSDK, executeChallenge, refreshSession } from '../circle'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  const { address, name, amount, memo, currency = 'VND' } = params
  const [rates, setRates] = useState({ USDC: 25000, EURC: 27000, CNY: 3448 })
  const [feeVnd, setFeeVnd] = useState(null)      // phí gas thật (null = đang tính)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)         // đã gửi thành công → khóa, không gửi lại
  // idempotencyKey CỐ ĐỊNH cho 1 lần mở màn xác nhận → bấm/retry không tạo 2 giao dịch
  const idemKey = useRef(crypto.randomUUID()).current

  useEffect(() => {
    Promise.all([getVndRate('USDC'), getVndRate('EURC')])
      .then(([u, e]) => setRates({ USDC: u, EURC: e, CNY: Math.round(u / 7.25) })).catch(() => {})
    // memo đi qua Memo contract → tốn gas hơn (~110k) so với transfer thường (~65k)
    estimateFeeVnd(memo && memo.trim() ? 110000 : 65000).then(setFeeVnd).catch(() => setFeeVnd(0))
  }, [memo])

  // VND/CNY → gửi USDC (quy đổi); USDC/EURC → gửi đúng token đó
  const token = currency === 'EURC' ? 'EURC' : 'USDC'
  const sendAmount = currency === 'VND' ? amount / rates.USDC
                   : currency === 'CNY' ? (amount * rates.CNY) / rates.USDC
                   : amount
  const sendAmountStr = (currency === 'VND' || currency === 'CNY') ? sendAmount.toFixed(4) : sendAmount.toFixed(2)
  const mainText = currency === 'VND' ? fmtVND(amount) : `${amount} ${currency}`
  // "Quy đổi" = lượng token thật chuyển đi; chỉ hiện khi nhập bằng tiền pháp định (VND/CNY)
  const convText = `${sendAmountStr} ${token}`
  const showConv = currency === 'VND' || currency === 'CNY'

  // Phí mạng theo TIỀN TỆ MẶC ĐỊNH (ez_currency), không cứng VND
  const displayCur = getDisplayCurrency()
  const dispRates = { VND: 1, ...rates }
  function feeStr() {
    if (feeVnd === null) return t('Đang tính...')
    if (displayCur === 'VND') return feeVnd < 1 ? '< 1đ' : fmtVND(feeVnd)
    const v = feeVnd / (dispRates[displayCur] || 1)
    return v < 0.01 ? `< 0.01 ${displayCur}` : `${v.toFixed(2)} ${displayCur}`
  }

  async function handleConfirm() {
    if (loading || done) return   // chặn bấm lặp / gửi trùng
    setLoading(true)
    try {
      // Làm mới userToken trước khi gửi — tránh "userToken had expired" nếu
      // người dùng mở app lâu (userToken Circle chỉ sống ~1 tiếng).
      const { userToken, encryptionKey } = await refreshSession()
      const walletId = localStorage.getItem('ez_wallet_id')

      // Tạo challenge gửi tiền — idempotencyKey cố định để Circle dedupe nếu gọi lại
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken, walletId,
          toAddress: address,
          token,
          amountDecimal: sendAmountStr,
          memo,
          idempotencyKey: idemKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // User ký bằng PIN qua W3S SDK
      await executeChallenge(getSDK(), userToken, encryptionKey, data.challengeId)

      setDone(true)   // ký thành công → khóa màn, không cho gửi lại
      navigate('SendReceipt', { address, name, amount, memo, currency, timestamp: Date.now() })
    } catch (e) {
      // Sai PIN / hủy / lỗi → KHÔNG cho sửa tại chỗ (gây kẹt với challenge cũ).
      // Ra ngoài màn nhập số tiền để làm LẠI TỪ ĐẦU: lần xác nhận mới sẽ tạo
      // challenge mới + idempotencyKey mới (component remount) → flow sạch.
      setLoading(false)
      // Lỗi từ W3S SDK không phải lúc nào cũng là Error chuẩn (có thể là
      // {code,message} hoặc string) — dò nhiều dạng để không rớt về "có lỗi xảy ra" mù mờ.
      console.error('[SendConfirm] gửi thất bại:', e)
      const reason = e?.message || e?.error?.message || (typeof e === 'string' ? e : null) || (e?.code ? `code ${e.code}` : null) || t('có lỗi xảy ra')
      const msg = `${t('Gửi thất bại:')} ${reason}`
      addNotif(msg, 'error')
      // SendAmount không có NotifArea → truyền lỗi qua params để màn đó tự hiện
      // banner (nếu không, người dùng chỉ thấy "tự nhiên bị đá về", không rõ vì sao).
      navigate('SendAmount', { ...params, sendError: msg })
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
              {mainText}
            </span>
          </div>
          {showConv && (
            <div className="confirm-row">
              <span className="confirm-label">{t('Quy đổi')}</span>
              <span className="confirm-value num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
                {convText}
              </span>
            </div>
          )}
          {memo && (
            <div className="confirm-row">
              <span className="confirm-label">{t('Nội dung')}</span>
              <span className="confirm-value">{memo}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">{t('Phí mạng')}</span>
            <span className="confirm-value num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              {feeStr()}
            </span>
          </div>
        </div>

        <div className="warning-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="warning" size={16} color="var(--color-warning)" />{t('Giao dịch không thể hoàn tác sau khi xác nhận')}
        </div>

        {loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>{t('Đang mở xác nhận PIN...')}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" disabled={loading || done} onClick={() => navigate('SendAmount', params)}>{t('Sửa')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? t('Đang xử lý...') : t('Xác nhận · PIN')}
        </button>
      </div>
    </div>
  )
}
