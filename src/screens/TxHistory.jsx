import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { TOKENS, getTxMemo, getDisplayRates, isFaucetAddress } from '../chain'
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

// Style nút lọc đang bật: nền trắng + viền xanh thương hiệu + chữ xanh thương hiệu (không tô đặc)
const activeFilter = {
  borderColor: 'var(--color-brand)',
  color: 'var(--color-brand)',
  WebkitTextFillColor: 'var(--color-brand)',
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
  // Tiền từ faucet → hiện "Faucet" thay vì địa chỉ 0x lạ (user chốt 07-17). Ưu tiên tên danh bạ
  // nếu user tự đặt. Danh sách faucet tra từ ArcScan — xem chain.js.
  const isFaucet = !isSend && isFaucetAddress(counter)
  const who = name || (isFaucet ? 'Faucet' : shortAddr(counter))
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
        <Icon name={isSend ? 'up' : 'down'} size="var(--is-item)" color={isSend ? 'var(--color-info)' : 'var(--color-primary)'} />
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
          {!isSwap && !name && !isFaucet && counter && (   /* Faucet là máy phát tiền test, lưu vào danh bạ vô nghĩa */
            <span onClick={e => { e.stopPropagation(); onAdd(counter) }}
              style={{ flexShrink: 0, fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-medium)', color: 'var(--color-brand)', border: '1px solid var(--color-brand)', borderRadius: 6, padding: '1px 8px', whiteSpace: 'nowrap', background: 'var(--color-white)' }}>
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

// Gộp cặp swap (2 dòng in/out CÙNG hash) thành 1 dòng "Swapped 10 EURC → 13.58 USDC" (user chốt
// 07-19: trước đây mỗi swap hiện 2 dòng riêng, cả 2 đều ghi "Swapped" — rối, trùng lặp).
function SwapRow({ outLeg, inLeg, cur, rates, onClick }) {
  const amtOf = leg => parseFloat(leg.value) / Math.pow(10, parseInt(leg.tokenDecimal || 6))
  const symOf = leg => leg.tokenSymbol || TOKEN_MAP[leg.contractAddress?.toLowerCase()]?.symbol || '?'
  const amtOut = amtOf(outLeg), amtIn = amtOf(inLeg)
  const symOut = symOf(outLeg), symIn = symOf(inLeg)
  const usdIn = amtIn * (rates?.[symIn] ?? TOKEN_MAP[inLeg.contractAddress?.toLowerCase()]?.usdRate ?? 1)
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="swap" size="var(--is-item)" color="var(--color-brand)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="num" style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Swapped {amtOut.toFixed(amtOut < 0.01 ? 6 : 2)} {symOut} → {amtIn.toFixed(amtIn < 0.01 ? 6 : 2)} {symIn}
        </div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', marginTop: 3 }}>
          At <span className="num">{timeLabel(outLeg.timeStamp)}</span>
        </div>
      </div>
      <div className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', flexShrink: 0 }}>
        {rates ? `≈ ${displaySymbol(cur)}${displayNum(usdIn, cur, rates)}` : '…'}
      </div>
    </button>
  )
}

// Chưa có hoạt động nào trong 24h → thay vì để trống trơn, hiện Hint "cách dùng" (user chốt 07-19).
function HistoryHint() {
  const lines = [
    { label: t('Gửi'), desc: t('Chuyển tiền qua QR hoặc địa chỉ ví') },
    { label: t('Nhận'), desc: t('Hiện mã QR để nhận tiền') },
    { label: t('Đổi tiền'), desc: t('Đổi giữa USDC, EURC, cirBTC') },
  ]
  return (
    <div style={{ margin: '24px 4px', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon name="hint" size="var(--is-item)" color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-item)', color: 'var(--color-content)', textAlign: 'left' }}>
        {lines.map((h, i) => (
          <div key={i}><span style={{ fontWeight: 'var(--fw-medium)' }}>{h.label}</span>: {h.desc}</div>
        ))}
      </div>
    </div>
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
  useEffect(() => { getDisplayRates().then(setRates).catch(() => setRates({ USDC: 1, EURC: 1.08 })) }, [])

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

  // CHỈ GIỮ 24H (user chốt 07-19): lịch sử cũ hơn 24h không hiện nữa — hết hoạt động gần đây thì
  // hiện Hint "cách dùng" thay vì danh sách trống trơn.
  const recent = txs.filter(tx => (Date.now() / 1000 - parseInt(tx.timeStamp)) <= 86400)
  const isSendTx = tx => tx.from?.toLowerCase() === walletAddr?.toLowerCase()
  const filtered = recent.filter(tx => filter === 'all' ? true : filter === 'send' ? isSendTx(tx) : !isSendTx(tx))
  // Hash nào ví vừa GỬI vừa NHẬN (2 transfer cùng tx) = SWAP → dòng ghi "Swapped", không "từ [lạ]".
  const swapHashes = (() => {
    const dir = {}, lower = walletAddr?.toLowerCase()
    recent.forEach(tx => {
      const h = tx.hash; if (!dir[h]) dir[h] = { in: false, out: false }
      if (tx.from?.toLowerCase() === lower) dir[h].out = true
      if (tx.to?.toLowerCase() === lower) dir[h].in = true
    })
    const s = new Set(); for (const h in dir) if (dir[h].in && dir[h].out) s.add(h)
    return s
  })()
  // Gộp 2 dòng in/out cùng hash Swap thành 1 mục hiển thị duy nhất — CHỈ gộp khi CẢ 2 chiều còn
  // trong `filtered` (tab Gửi/Nhận lọc chỉ còn 1 chiều thì giữ dòng đơn như cũ).
  function buildDisplayList(list) {
    const seen = new Set()
    const out = []
    list.forEach(tx => {
      if (!swapHashes.has(tx.hash)) { out.push(tx); return }
      if (seen.has(tx.hash)) return
      const legs = list.filter(t => t.hash === tx.hash)
      if (legs.length < 2) { out.push(tx); return }
      seen.add(tx.hash)
      const lower = walletAddr?.toLowerCase()
      const outLeg = legs.find(t => t.from?.toLowerCase() === lower)
      const inLeg = legs.find(t => t.to?.toLowerCase() === lower)
      out.push({ isSwapGroup: true, hash: tx.hash, outLeg, inLeg, timeStamp: tx.timeStamp })
    })
    return out
  }
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

      {/* BOX XÁM chung bao cả lịch sử (user chốt 07-17f "phân ra ranh giới"). Mask mờ đáy nằm ở
          DIV TRONG — đặt lên box thì nền xám mờ theo, lem sang trắng. */}
      <div className="row-2-8" style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '4px 14px', alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' }}>
      <div className="scroll-thin" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', height: '100%', overflowY: 'auto',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
      }}>
        {loading ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>{t('Đang tải...')}</div>
        ) : recent.length === 0 ? (
          <HistoryHint />
        ) : filtered.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{emptyMsg}</div>
          </div>
        ) : (() => {
          // Nhóm theo ngày: chèn DateHeader mỗi khi ngày đổi (đã gộp cặp swap trước đó).
          const displayList = buildDisplayList(filtered)
          let last = null
          const nodes = []
          displayList.forEach((item, i) => {
            const dl = dateLabel(item.timeStamp)
            if (dl !== last) { nodes.push(<DateHeader key={`h-${dl}`} date={dl} first={i === 0} />); last = dl }
            if (item.isSwapGroup) {
              nodes.push(<SwapRow key={item.hash} outLeg={item.outLeg} inLeg={item.inLeg} cur={cur} rates={rates} onClick={() => setSelected(item.inLeg)} />)
            } else {
              nodes.push(<TxRow key={item.hash} tx={item} walletAddr={walletAddr} contacts={contacts} onClick={() => setSelected(item)} cur={cur} rates={rates} memo={memos[item.hash]} isSwap={swapHashes.has(item.hash)} onAdd={a => navigate('Contacts', { addAddress: a })} />)
            }
          })
          return nodes
        })()}
      </div>
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
                  <Icon name={copied ? 'check' : 'copy'} size="var(--is-item)" color={copied ? 'var(--color-primary)' : 'var(--color-muted)'} />
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
