import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { TOKENS, getTxMemo, getDisplayRates } from '../chain'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { loadContacts } from '../store'

const ARCSCAN = 'https://testnet.arcscan.app'
const TOKEN_MAP = Object.fromEntries(TOKENS.map(t => [t.address.toLowerCase(), t]))

function loadContactMap() {
  try {
    const m = {}
    loadContacts().forEach(c => { if (c.address) m[c.address.toLowerCase()] = c.name })
    return m
  } catch { return {} }
}

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - parseInt(ts)
  if (diff < 60) return t('vừa xong')
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t('phút trước')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('giờ trước')}`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('ngày trước')}`
  return new Date(ts * 1000).toLocaleDateString('vi-VN')
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

// Style nút lọc đang bật: nền trắng + viền xanh + chữ xanh (không tô đặc)
const activeFilter = {
  borderColor: 'var(--color-primary)',
  color: 'var(--color-primary)',
  WebkitTextFillColor: 'var(--color-primary)',
}

// Tính thông tin chung của 1 giao dịch. vnd quy từ CÙNG NGUỒN rates với cột hiển thị
// (trước dùng token.vndRate cache lệch nguồn → 1 USDC hiện $0.95 — user báo lỗi).
function txInfo(tx, walletAddr, contacts, rates) {
  const token = TOKEN_MAP[tx.contractAddress?.toLowerCase()]
  const decimals = parseInt(tx.tokenDecimal || 6)
  const amount = parseFloat(tx.value) / Math.pow(10, decimals)
  const isSend = tx.from?.toLowerCase() === walletAddr?.toLowerCase()
  const symbol = tx.tokenSymbol || token?.symbol || '?'
  const vnd = amount * (rates?.[symbol] ?? token?.vndRate ?? 25000)
  const counter = isSend ? tx.to : tx.from
  const name = contacts[counter?.toLowerCase()] || null
  return { isSend, amount, symbol, vnd, counter, name }
}

// Layout user chốt (2026-07-03): icon đã nói lên gửi/nhận —
//   [icon] Sent USDC to hieu · 5 min ago      | -$1.00   (tiền hiển thị, chính)
//          (lời nhắn nếu có — để đối soát)     | 1.00 USDC (token thật, xám nhỏ)
function TxRow({ tx, walletAddr, contacts, onClick, cur, rates, memo }) {
  const { isSend, amount, symbol, vnd, counter, name } = txInfo(tx, walletAddr, contacts, rates)
  const who = name || shortAddr(counter)
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
      borderBottom: '1px solid var(--color-gray)', fontFamily: 'inherit', textAlign: 'left',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: isSend ? 'var(--color-info-soft)' : 'var(--color-primary-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={isSend ? 'up' : 'down'} size={22} color={isSend ? 'var(--color-info)' : 'var(--color-primary)'} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSend ? 'Sent' : 'Received'} {symbol} {isSend ? 'to' : 'from'} {who} <span style={{ color: 'var(--color-muted)', fontWeight: 'var(--fw-regular)' }}>· {timeAgo(tx.timeStamp)}</span>
        </div>
        {memo && (
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {memo}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {/* Chính: tiền hiển thị ($). Phụ: token thật, xám mờ */}
        <div className="num" style={{ fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)', color: isSend ? 'var(--color-error)' : 'var(--color-primary)' }}>
          {isSend ? '-' : '+'}{rates ? `${displaySymbol(cur)}${displayNum(vnd, cur, rates)}` : '…'}
        </div>
        <div className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          {amount.toFixed(amount < 0.01 ? 6 : 2)} {symbol}
        </div>
      </div>
    </button>
  )
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-gray)' }}>
      <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', textAlign: 'right', wordBreak: 'break-word' }}>{children}</span>
    </div>
  )
}

export default function TxHistory() {
  const { navigate, params } = useNav()
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'send' | 'receive'
  const [selected, setSelected] = useState(null)
  const [memo, setMemo] = useState(null)
  const [memoLoading, setMemoLoading] = useState(false)
  const [memos, setMemos] = useState({})   // hash → memo text (lời nhắn hiện ngay trong list để đối soát)
  const [copied, setCopied] = useState(false)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(null)  // tỷ giá VND→tiền hiển thị (fetch), null khi chưa xong
  useEffect(() => { getDisplayRates().then(setRates).catch(() => setRates({ VND: 1 })) }, [])

  function copyCounter(addr) {
    navigator.clipboard.writeText(addr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  const walletAddr = localStorage.getItem('ez_wallet_addr')
  const contacts = loadContactMap()

  useEffect(() => {
    if (!selected?.hash) { setMemo(null); return }
    setMemo(null); setMemoLoading(true)
    getTxMemo(selected.hash).then(setMemo).catch(() => {}).finally(() => setMemoLoading(false))
  }, [selected])

  // Lời nhắn cho TỪNG DÒNG list (user yêu cầu: hiện memo ngay dưới tiêu đề để đối soát).
  // Fetch nền 30 tx đầu, mỗi tx 1 RPC đọc Memo event — testnet nhẹ, lỗi thì bỏ qua im lặng.
  useEffect(() => {
    txs.slice(0, 30).forEach(tx => {
      if (memos[tx.hash] !== undefined) return
      getTxMemo(tx.hash)
        .then(m => setMemos(prev => ({ ...prev, [tx.hash]: m || null })))
        .catch(() => setMemos(prev => ({ ...prev, [tx.hash]: null })))
    })
  }, [txs])

  const isSendTx = tx => tx.from?.toLowerCase() === walletAddr?.toLowerCase()
  const filtered = txs.filter(tx => filter === 'all' ? true : filter === 'send' ? isSendTx(tx) : !isSendTx(tx))
  const emptyMsg = filter === 'send' ? t('Chưa có giao dịch gửi') : filter === 'receive' ? t('Chưa có giao dịch nhận') : t('Chưa có giao dịch nào')

  useEffect(() => {
    if (!walletAddr) { setLoading(false); return }
    fetch(`${ARCSCAN}/api?module=account&action=tokentx&address=${walletAddr}&sort=desc&limit=50`)
      .then(r => r.json())
      .then(d => setTxs(d?.result || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddr])

  // Mở thẳng chi tiết khi tới từ thông báo (openHash)
  useEffect(() => {
    if (params?.openHash && txs.length) {
      const tx = txs.find(t => t.hash === params.openHash)
      if (tx) setSelected(tx)
    }
  }, [txs, params?.openHash])

  const d = selected ? txInfo(selected, walletAddr, contacts, rates) : null

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Lịch sử giao dịch')}
      </div>

      <div className="row-2-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', overflowY: 'auto', justifyContent: 'flex-start' }}>
        {loading ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>{t('Đang tải...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{emptyMsg}</div>
          </div>
        ) : (
          filtered.map(tx => <TxRow key={tx.hash} tx={tx} walletAddr={walletAddr} contacts={contacts} onClick={() => setSelected(tx)} cur={cur} rates={rates} memo={memos[tx.hash]} />)
        )}
      </div>

      <div style={{ gridRow: '9 / 11', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {/* Lọc bật = nền trắng + VIỀN XANH (không tô đặc) */}
        <button className="btn btn-secondary" style={{ flex: 1, ...(filter === 'send' ? activeFilter : {}) }}
          onClick={() => setFilter(f => f === 'send' ? 'all' : 'send')}>{t('Gửi')}</button>
        <button className="btn btn-secondary" style={{ flex: 1, ...(filter === 'receive' ? activeFilter : {}) }}
          onClick={() => setFilter(f => f === 'receive' ? 'all' : 'receive')}>{t('Nhận')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>

      {/* Popup chi tiết giao dịch */}
      {selected && d && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: 'var(--color-white)', borderRadius: 16, padding: 20 }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', marginBottom: 8 }}>{t('Chi tiết giao dịch')}</div>
            <DetailRow label={t('Loại')}>{d.isSend ? t('Đã gửi') : t('Đã nhận')} {d.symbol}</DetailRow>
            {d.name && <DetailRow label={d.isSend ? t('Người nhận') : t('Người gửi')}>{d.name}</DetailRow>}
            <DetailRow label={t('Địa chỉ ví')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {shortAddr(d.counter)}
                <button onClick={() => copyCounter(d.counter)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? 'var(--color-primary)' : 'var(--color-muted)'} />
                </button>
              </span>
            </DetailRow>
            <DetailRow label={t('Số tiền')}>
              <span className="num" style={{ color: d.isSend ? 'var(--color-error)' : 'var(--color-primary)' }}>
                {d.isSend ? '-' : '+'}{d.amount.toFixed(d.amount < 0.01 ? 6 : 2)} {d.symbol}
              </span>
            </DetailRow>
            <DetailRow label={t('Quy đổi')}><span className="num">{rates ? `${displaySymbol(cur)}${displayNum(d.vnd, cur, rates)}` : '…'}</span></DetailRow>
            <DetailRow label={t('Thời gian')}>{new Date(selected.timeStamp * 1000).toLocaleString('vi-VN')}</DetailRow>
            {memoLoading ? <DetailRow label={t('Nội dung')}>{t('Đang tải...')}</DetailRow> : memo ? <DetailRow label={t('Nội dung')}>{memo}</DetailRow> : null}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 14 }}
              onClick={() => window.open(`${ARCSCAN}/tx/${selected.hash}`, '_blank')}>
              {t('Xem trên ArcScan')}
            </button>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => setSelected(null)}>{t('Đóng')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
