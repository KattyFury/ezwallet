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

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : ''
}

// Nhãn NGÀY cho ranh giới nhóm (vd "28 Jun 2026") + GIỜ chi tiết cho từng dòng (vd "14:32").
function dateLabel(ts) {
  return new Date(parseInt(ts) * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function timeLabel(ts) {
  return new Date(parseInt(ts) * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Ranh giới ngày giữa các nhóm giao dịch (user chốt: boundary hiện ngày tháng năm).
function DateHeader({ date, first }) {
  return (
    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)', padding: first ? '2px 2px 8px' : '18px 2px 8px' }}>
      {date}
    </div>
  )
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
  const usd = amount * (rates?.[symbol] ?? token?.usdRate ?? 1)
  const counter = isSend ? tx.to : tx.from
  const name = contacts[counter?.toLowerCase()] || null
  return { isSend, amount, symbol, usd, counter, name }
}

// Mỗi giao dịch = 1 khối, KHÔNG line xám ngăn cách (user chốt 2026-07-06). Cấu trúc "hàng" (hàng
// nhỏ TRONG box, không phải hàng màn hình):
//   [icon]  hàng1: Received from <tên/địa chỉ>              | +$5.00     (tiền hiển thị, chính)
//   (h1-2)  hàng2: At 14:32   [+ Add]  ← nút Add DỜI xuống  | 5.00 USDC  (token thật, xám — h1-2)
//           hàng3-4: Note: <memo> (nếu có, dài thì xuống dòng)
// Icon (trái) + cụm tiền (phải) neo Ở HÀNG 1-2 (top-align). Ranh giới NGÀY ở DateHeader.
function TxRow({ tx, walletAddr, contacts, onClick, cur, rates, memo, isSwap, onAdd }) {
  const { isSend, amount, symbol, usd, counter, name } = txInfo(tx, walletAddr, contacts, rates)
  const who = name || shortAddr(counter)
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
      padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      {/* Icon gửi/nhận — neo hàng 1-2 (top-align) */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isSend ? 'var(--color-info-soft)' : 'var(--color-primary-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={isSend ? 'up' : 'down'} size={22} color={isSend ? 'var(--color-info)' : 'var(--color-primary)'} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* hàng 1: ai — cỡ item, đậm (không còn chen [Add] nên để to rõ) */}
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSwap ? 'Swapped' : `${isSend ? 'Sent to' : 'Received from'} ${who}`}
        </div>
        {/* hàng 2: At <giờ> + nút [+ Add] (DỜI XUỐNG đây — trước ở hàng 1 nhìn xấu) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
            At <span className="num">{timeLabel(tx.timeStamp)}</span>
          </span>
          {!isSwap && !name && counter && (
            <span onClick={e => { e.stopPropagation(); onAdd(counter) }}
              style={{ flexShrink: 0, fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-medium)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 6, padding: '1px 8px', whiteSpace: 'nowrap' }}>
              Add to Contacts
            </span>
          )}
        </div>
        {/* hàng 3-4: Note (nếu có) — dài xuống dòng thoải mái */}
        {memo && (
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', marginTop: 3, lineHeight: 1.4, wordBreak: 'break-word' }}>
            Note: {memo}
          </div>
        )}
      </div>

      {/* Cụm tiền — neo hàng 1-2 (top-align). Chính: tiền hiển thị ($). Phụ: token thật, xám */}
      <div style={{ textAlign: 'right', flexShrink: 0, marginTop: 2 }}>
        <div className="num" style={{ fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)', color: isSend ? 'var(--color-error)' : 'var(--color-primary)' }}>
          {isSend ? '-' : '+'}{rates ? `${displaySymbol(cur)}${displayNum(usd, cur, rates)}` : '…'}
        </div>
        <div className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', marginTop: 2 }}>
          {amount.toFixed(amount < 0.01 ? 6 : 2)} {symbol}
        </div>
      </div>
    </button>
  )
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0' }}>
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
  const [rates, setRates] = useState(null)  // tỷ giá USD→tiền hiển thị (fetch), null khi chưa xong
  useEffect(() => { getDisplayRates().then(setRates).catch(() => setRates({ USDC: 1, EURC: 1.08, CNY: 0.14, VND: 0.0000395 })) }, [])

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
  // Hash nào ví vừa GỬI vừa NHẬN (2 transfer cùng tx) = SWAP → dòng ghi "Swapped", không "từ [lạ]".
  const swapHashes = (() => {
    const dir = {}, lower = walletAddr?.toLowerCase()
    txs.forEach(tx => {
      const h = tx.hash; if (!dir[h]) dir[h] = { in: false, out: false }
      if (tx.from?.toLowerCase() === lower) dir[h].out = true
      if (tx.to?.toLowerCase() === lower) dir[h].in = true
    })
    const s = new Set(); for (const h in dir) if (dir[h].in && dir[h].out) s.add(h)
    return s
  })()
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

      <div className="row-2-8 scroll-thin" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
      }}>
        {loading ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>{t('Đang tải...')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{emptyMsg}</div>
          </div>
        ) : (() => {
          // Nhóm theo ngày: chèn DateHeader mỗi khi ngày đổi (txs sort desc sẵn từ API).
          let last = null
          const nodes = []
          filtered.forEach((tx, i) => {
            const dl = dateLabel(tx.timeStamp)
            if (dl !== last) { nodes.push(<DateHeader key={`h-${dl}`} date={dl} first={i === 0} />); last = dl }
            nodes.push(<TxRow key={tx.hash} tx={tx} walletAddr={walletAddr} contacts={contacts} onClick={() => setSelected(tx)} cur={cur} rates={rates} memo={memos[tx.hash]} isSwap={swapHashes.has(tx.hash)} onAdd={a => navigate('Contacts', { addAddress: a })} />)
          })
          return nodes
        })()}
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
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          {/* display:block — DetailRow tự có padding+border nên KHÔNG dùng gap flex của .popup-card */}
          <div className="popup-card" style={{ display: 'block' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title" style={{ marginBottom: 8 }}>{t('Chi tiết giao dịch')}</div>
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
            <DetailRow label={t('Quy đổi')}><span className="num">{rates ? `${displaySymbol(cur)}${displayNum(d.usd, cur, rates)}` : '…'}</span></DetailRow>
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
