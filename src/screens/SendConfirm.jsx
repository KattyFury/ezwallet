import { useState } from 'react'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { getSDK, executeChallenge } from '../circle'

const USDC_RATE = 25000

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  const { address, name, amount, memo } = params
  const usdcAmount = (amount / USDC_RATE).toFixed(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setLoading(true); setError('')
    try {
      const userToken = localStorage.getItem('ez_user_token')
      const encryptionKey = localStorage.getItem('ez_encryption_key')
      const walletId = localStorage.getItem('ez_wallet_id')

      // Tạo challenge gửi tiền
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken, walletId,
          toAddress: address,
          token: 'USDC',
          amountDecimal: usdcAmount,
          memo,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // User ký bằng PIN qua W3S SDK
      await executeChallenge(getSDK(), userToken, encryptionKey, data.challengeId)

      navigate('SendReceipt', { address, name, amount, memo, timestamp: Date.now() })
    } catch (e) {
      setError(e.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>Xác nhận giao dịch</span>
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', gap: 12 }}>
        <div className="confirm-box">
          <div className="confirm-row">
            <span className="confirm-label">Gửi đến</span>
            <span className="confirm-value">{name || shortenAddr(address)}</span>
          </div>
          {name && (
            <div className="confirm-row">
              <span className="confirm-label">Địa chỉ</span>
              <span className="confirm-value" style={{ fontSize: 'var(--fs-label)' }}>{shortenAddr(address)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Số tiền</span>
            <span className="confirm-value" style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-primary)' }}>
              {fmtVND(amount)}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Quy đổi</span>
            <span className="confirm-value" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              {usdcAmount} USDC
            </span>
          </div>
          {memo && (
            <div className="confirm-row">
              <span className="confirm-label">Nội dung</span>
              <span className="confirm-value">{memo}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Phí</span>
            <span className="confirm-value" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              ~0 VND (testnet)
            </span>
          </div>
        </div>

        <div className="warning-badge">⚠ Giao dịch không thể hoàn tác sau khi xác nhận</div>

        {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
        {loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>Đang mở xác nhận PIN...</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" disabled={loading} onClick={() => navigate('SendAmount', params)}>Sửa</button>
        <button className="btn" style={{ background: 'var(--color-error)', color: 'var(--color-white)', flex: 1 }}
          disabled={loading} onClick={handleConfirm}>
          {loading ? 'Đang xử lý...' : 'Xác nhận · PIN'}
        </button>
      </div>
    </div>
  )
}
