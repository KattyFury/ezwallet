import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { fmtVND } from '../data'
import { TOKENS } from '../chain'

const ARCSCAN = 'https://testnet.arcscan.app/api'
const TOKEN_MAP = Object.fromEntries(TOKENS.map(t => [t.address.toLowerCase(), t]))

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - parseInt(ts)
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return new Date(ts * 1000).toLocaleDateString('vi-VN')
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

function TxRow({ tx, walletAddr }) {
  const token = TOKEN_MAP[tx.contractAddress?.toLowerCase()]
  const decimals = parseInt(tx.tokenDecimal || 6)
  const amount = parseFloat(tx.value) / Math.pow(10, decimals)
  const isSend = tx.from?.toLowerCase() === walletAddr?.toLowerCase()
  const symbol = tx.tokenSymbol || token?.symbol || '?'
  const vnd = Math.round(amount * (token?.vndRate || 25000))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--color-gray)',
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: isSend ? '#FEF3C7' : '#DCFCE7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {isSend ? '↑' : '↓'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>
          {isSend ? 'Đã gửi' : 'Đã nhận'} {symbol}
        </div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          {isSend ? `Đến ${shortAddr(tx.to)}` : `Từ ${shortAddr(tx.from)}`} · {timeAgo(tx.timeStamp)}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)',
          color: isSend ? 'var(--color-error)' : 'var(--color-primary)',
        }}>
          {isSend ? '-' : '+'}{amount.toFixed(amount < 0.01 ? 6 : 2)} {symbol}
        </div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          {fmtVND(vnd)}
        </div>
      </div>
    </div>
  )
}

export default function TxHistory() {
  const { navigate } = useNav()
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const walletAddr = localStorage.getItem('ez_wallet_addr')

  useEffect(() => {
    if (!walletAddr) { setLoading(false); return }
    fetch(`${ARCSCAN}?module=account&action=tokentx&address=${walletAddr}&sort=desc&limit=50`)
      .then(r => r.json())
      .then(d => setTxs(d?.result || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddr])

  return (
    <div className="screen">
      <div className="row-1 center full-bleed" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', borderBottom: '1px solid var(--color-gray)' }}>
        Lịch sử giao dịch
      </div>

      <div className="row-2-9" style={{ overflowY: 'auto', justifyContent: 'flex-start' }}>
        {loading ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>
            Đang tải...
          </div>
        ) : txs.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Chưa có giao dịch nào</div>
          </div>
        ) : (
          txs.map(tx => <TxRow key={tx.hash} tx={tx} walletAddr={walletAddr} />)
        )}
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('MenuScreen')}>Quay lại</button>
      </div>
    </div>
  )
}
