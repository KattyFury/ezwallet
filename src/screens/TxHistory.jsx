import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { getDisplayCurrency, displayNum, displaySymbol } from '../data'
import { TOKENS, getTxMemo, getDisplayRates, isFaucetAddress } from '../chain'
import Icon from '../components/Icon'
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

// DATE label for the group boundary (e.g. "28 Jun 2026") + the exact TIME on each row (e.g. "14:32").
function dateLabel(ts) {
  return new Date(parseInt(ts) * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function timeLabel(ts) {
  return new Date(parseInt(ts) * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// The date boundary between transaction groups (user decision: the boundary shows day, month and year).
function DateHeader({ date, first }) {
  return (
    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)', padding: first ? '2px 2px 8px' : '18px 2px 8px' }}>
      {date}
    </div>
  )
}

// Style of an active filter button: white background + brand blue border + brand blue text (not a solid fill)
const activeFilter = {
  borderColor: 'var(--color-brand)',
  color: 'var(--color-brand)',
  WebkitTextFillColor: 'var(--color-brand)',
}

// Compute the shared facts of one transaction. VND is converted from the SAME rates SOURCE as the display column
// (it used to use the cached token.vndRate from a different source → 1 USDC showed as $0.95 - user bug report).
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

// Each transaction = one block, with NO grey separator line (user decision 2026-07-06). The "row" structure (small
// rows INSIDE the box, not screen rows):
//   [icon]  row 1: Received from <name/address>             | +$5.00     (display money, primary)
//   (r1-2)  row 2: At 14:32   [+ Add]  ← the Add button moved here | 5.00 USDC  (the real token, grey - r1-2)
//           rows 3-4: Note: <memo> (if any, wrapping when long)
// The icon (left) and the money block (right) are anchored to ROWS 1-2 (top-aligned). The DATE boundary lives in DateHeader.
function TxRow({ tx, walletAddr, contacts, onClick, cur, rates, memo, isSwap, swapInfo, onAdd }) {
  const { isSend, amount, symbol, usd, counter, name } = txInfo(tx, walletAddr, contacts, rates)
  // Swap: the title states the DIRECTION explicitly, "Swapped <amount> <token out> to <token in>" (user decision 07-20d - it
  // used to say just "Swapped", which told you nothing). It needs swapInfo (both legs) from TxHistory; without it, fall back to "Swapped".
  const swapTitle = swapInfo ? `Swapped ${swapInfo.outAmt.toFixed(swapInfo.outAmt < 0.01 ? 6 : 2)} ${swapInfo.outSym} to ${swapInfo.inSym}` : 'Swapped'
  // Money from the faucet → show "Faucet" instead of an unfamiliar 0x address (user decision 07-17). A contact name wins
  // if the user saved one. The faucet list is looked up from ArcScan - see chain.js.
  const isFaucet = !isSend && isFaucetAddress(counter)
  // Sending to yourself → say "yourself" plainly, do not make an older person compare 0x1234…5678 against
  // their own wallet address (07-31, the same bug as swapHashes above).
  const isSelf = counter && walletAddr && counter.toLowerCase() === walletAddr.toLowerCase()
  const who = isSelf ? 'yourself' : name || (isFaucet ? 'Faucet' : shortAddr(counter))
  // Font sizes REDUCED so the full information fits a phone screen (user decision 07-20): icon 40→34, the money on the right
  // fs-num 24→fs-md-lg 21, the secondary token fs-label→fs-tiny, vertical padding 14→11, gap 12→10.
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
      padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      {/* Sent/received icon - anchored to rows 1-2 (top-aligned) */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isSend ? 'var(--color-info-soft)' : 'var(--color-primary-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={isSend ? 'up' : 'down'} size="var(--is-label)" color={isSend ? 'var(--color-info)' : 'var(--color-primary)'} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* row 1: who - item size, bold */}
        <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSwap ? swapTitle : `${isSend ? 'Sent to' : 'Received from'} ${who}`}
        </div>
        {/* row 2: status/time + the [+ Add] button. Swap → "Swap completed · At <time>" (user decision 07-20d) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>
            {isSwap ? 'Swap completed · ' : ''}At <span className="num">{timeLabel(tx.timeStamp)}</span>
          </span>
          {!isSwap && !name && !isFaucet && counter && (   /* the faucet is a test-money machine, saving it as a contact is pointless */
            <span onClick={e => { e.stopPropagation(); onAdd(counter) }}
              style={{ flexShrink: 0, fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-medium)', color: 'var(--color-brand)', border: '1px solid var(--color-brand)', borderRadius: 6, padding: '1px 8px', whiteSpace: 'nowrap', background: 'var(--color-white)' }}>
              Add to Contacts
            </span>
          )}
        </div>
        {/* rows 3-4: Note (if any) - free to wrap when long */}
        {memo && (
          <div style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>
            Note: {memo}
          </div>
        )}
      </div>

      {/* The money block - anchored to rows 1-2 (top-aligned). Primary: display money ($). Secondary: the real token, grey */}
      <div style={{ textAlign: 'right', flexShrink: 0, marginTop: 2 }}>
        <div className="num" style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: isSend ? 'var(--color-error)' : 'var(--color-primary)', whiteSpace: 'nowrap' }}>
          {isSend ? '-' : '+'}{rates ? `${displaySymbol(cur)}${displayNum(usd, cur, rates)}` : '…'}
        </div>
        <div className="num" style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
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
  const [memos, setMemos] = useState({})   // hash → memo text (the message shown inline in the list for reconciliation)
  const [copied, setCopied] = useState(false)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(null)  // USD→display-currency rates (fetched), null until they arrive
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

  // The message for EACH ROW of the list (user request: show the memo right under the title for reconciliation).
  // Fetches the first 30 txs in the background, one RPC read of the Memo event each - light on testnet, and errors are ignored silently.
  useEffect(() => {
    txs.slice(0, 30).forEach(tx => {
      if (memos[tx.hash] !== undefined) return
      getTxMemo(tx.hash)
        .then(m => setMemos(prev => ({ ...prev, [tx.hash]: m || null })))
        .catch(() => setMemos(prev => ({ ...prev, [tx.hash]: null })))
    })
  }, [txs])

  // HISTORY IS ALWAYS SHOWN IN FULL (user decision 07-20: only NOTIFICATIONS are limited to a day,
  // transaction history is the reconciliation ledger - no 24h cut-off, no hints).
  const isSendTx = tx => tx.from?.toLowerCase() === walletAddr?.toLowerCase()
  const filtered = txs.filter(tx => filter === 'all' ? true : filter === 'send' ? isSendTx(tx) : !isSendTx(tx))
  // A hash the wallet both SENT and RECEIVED (2 transfers in one tx) = a SWAP → the row says "Swapped", not "from [stranger]".
  const swapHashes = (() => {
    const dir = {}, lower = walletAddr?.toLowerCase()
    txs.forEach(tx => {
      const h = tx.hash; if (!dir[h]) dir[h] = { in: false, out: false }
      const out = tx.from?.toLowerCase() === lower
      const inc = tx.to?.toLowerCase() === lower
      // ⚠️ SENDING TO YOURSELF (from == to on the SAME ROW) IS NOT A SWAP - user bug report 07-31:
      // after accidentally sending to their own wallet, that row was labelled "Swapped 5.00 USDC to USDC", so searching for
      // "Sent" found nothing → it looked like the transaction had VANISHED from history. A REAL swap always has 2 SEPARATE ROWS
      // (one out leg + one in leg); a self-send row is skipped here and takes the normal "Sent to" branch.
      if (out && inc) return
      if (out) dir[h].out = true
      if (inc) dir[h].in = true
    })
    const s = new Set(); for (const h in dir) if (dir[h].in && dir[h].out) s.add(h)
    return s
  })()
  // Swap-pair info for the "Swapped <outAmt> <outSym> to <inSym>" title: each swap hash has an OUT leg
  // (from=wallet) + an IN leg (to=wallet). Both rows of one swap SHARE this string (only the ± amount on the
  // right differs). Derived from `txs` (not `filtered`) so the Sent/Received tabs still have both directions available.
  const swapPairs = (() => {
    const m = {}, lower = walletAddr?.toLowerCase()
    const amtOf = leg => parseFloat(leg.value) / Math.pow(10, parseInt(leg.tokenDecimal || 6))
    const symOf = leg => leg.tokenSymbol || TOKEN_MAP[leg.contractAddress?.toLowerCase()]?.symbol || '?'
    swapHashes.forEach(h => {
      const legs = txs.filter(t => t.hash === h)
      const outLeg = legs.find(t => t.from?.toLowerCase() === lower)
      const inLeg = legs.find(t => t.to?.toLowerCase() === lower)
      if (outLeg && inLeg) m[h] = { outAmt: amtOf(outLeg), outSym: symOf(outLeg), inSym: symOf(inLeg) }
    })
    return m
  })()
  const emptyMsg = filter === 'send' ? 'No sent transactions' : filter === 'receive' ? 'No received transactions' : 'No transactions yet'

  useEffect(() => {
    if (!walletAddr) { setLoading(false); return }
    // ⚠️ PAGINATION: ArcScan (Blockscout) **IGNORES `limit`** - only `page` + `offset` work.
    // Measured for real 07-31 on a busy wallet: `limit=50` → returned **10,000 rows / 11.7s** (i.e. it downloads the
    // wallet's ENTIRE history before drawing anything); `page=1&offset=1000` → 1,000 rows / 1.7s.
    // 1000 was chosen (not 50) to KEEP the rule "history is the ledger, never truncated" (HANDOFF section 6):
    // a real user's wallet has nowhere near 1000 transactions, so they still see everything, without dragging down 10k rows.
    // ArcScan DOES honour `sort=desc` (measured) - the list renders straight in API order, without re-sorting.
    fetch(`${ARCSCAN}/api?module=account&action=tokentx&address=${walletAddr}&sort=desc&page=1&offset=1000`)
      .then(r => r.json())
      // SORT IT OURSELVES, DO NOT TRUST THE API ORDER (07-31). ArcScan currently honours `sort=desc` (measured), but the
      // list renders STRAIGHT from the array order: if the API ever changes behaviour or returns something skewed, (a) new
      // transactions land in the middle, (b) DATE labels repeat → two DateHeaders with the same key → React warns about
      // "duplicated and/or omitted" and may DROP rows. Sorting on the client is the cheapest possible guard.
      .then(d => (d?.result || []).slice().sort((a, b) => Number(b.timeStamp) - Number(a.timeStamp)))
      .then(setTxs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [walletAddr])

  // Open the detail popup straight away when arriving from a notification (openHash)
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
        Transaction history
      </div>

      {/* SHARED GREY BOX around the whole history (user decision 07-17f "mark the boundary"). The bottom fade mask lives on the
          INNER DIV - putting it on the box would fade the grey background too and smear it into the white. */}
      <div className="row-2-8" style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '4px 14px', alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' }}>
      <div className="scroll-thin" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', height: '100%', overflowY: 'auto',
        WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
      }}>
        {loading ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40, color: 'var(--color-muted)', fontSize: 'var(--fs-label)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{emptyMsg}</div>
          </div>
        ) : (() => {
          // Group by day: insert a DateHeader whenever the day changes. Swap pairs are NOT merged (user decision 07-20:
          // a swap stays 2 STEPS - the out leg "-1 EURC" + the in leg "+1.4 USDC"; merging would lose both numbers on
          // the right-hand side). Each swap leg still says "Swapped" in its title (isSwap), with its full amount on the right.
          let last = null
          const nodes = []
          filtered.forEach((tx, i) => {
            const dl = dateLabel(tx.timeStamp)
            // The key includes an INDEX: the same day can appear as several groups (if the data order is skewed) →
            // a bare `h-<day>` would COLLIDE, and React can drop the later group (a real warning was seen 07-31).
            if (dl !== last) { nodes.push(<DateHeader key={`h-${dl}-${i}`} date={dl} first={i === 0} />); last = dl }
            nodes.push(<TxRow key={`${tx.hash}-${tx.from}-${tx.to}-${i}`} tx={tx} walletAddr={walletAddr} contacts={contacts} onClick={() => setSelected(tx)} cur={cur} rates={rates} memo={memos[tx.hash]} isSwap={swapHashes.has(tx.hash)} swapInfo={swapPairs[tx.hash]} onAdd={a => navigate('Contacts', { addAddress: a })} />)
          })
          return nodes
        })()}
      </div>
      </div>

      <div style={{ gridRow: '9 / 11', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {/* An active filter = white background + BLUE BORDER (no solid fill) */}
        <button className="btn btn-secondary" style={{ flex: 1, ...(filter === 'send' ? activeFilter : {}) }}
          onClick={() => setFilter(f => f === 'send' ? 'all' : 'send')}>Send</button>
        <button className="btn btn-secondary" style={{ flex: 1, ...(filter === 'receive' ? activeFilter : {}) }}
          onClick={() => setFilter(f => f === 'receive' ? 'all' : 'receive')}>Receive</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('MenuScreen')}>Back</button>
      </div>

      {/* Transaction detail popup */}
      {selected && d && (
        <div className="popup-overlay" onClick={() => setSelected(null)}>
          {/* display:block - DetailRow brings its own padding+border, so the flex gap of .popup-card is NOT used */}
          <div className="popup-card" style={{ display: 'block' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title" style={{ marginBottom: 8 }}>Transaction details</div>
            <DetailRow label={'Type'}>{d.isSend ? 'Sent' : 'Received'} {d.symbol}</DetailRow>
            {d.name && <DetailRow label={d.isSend ? 'Recipient' : 'Sender'}>{d.name}</DetailRow>}
            <DetailRow label={'Wallet address'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {shortAddr(d.counter)}
                <button onClick={() => copyCounter(d.counter)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <Icon name={copied ? 'check' : 'copy'} size="var(--is-item)" color={copied ? 'var(--color-primary)' : 'var(--color-muted)'} />
                </button>
              </span>
            </DetailRow>
            <DetailRow label={'Amount'}>
              <span className="num" style={{ color: d.isSend ? 'var(--color-error)' : 'var(--color-primary)' }}>
                {d.isSend ? '-' : '+'}{d.amount.toFixed(d.amount < 0.01 ? 6 : 2)} {d.symbol}
              </span>
            </DetailRow>
            <DetailRow label={'Converted'}><span className="num">{rates ? `${displaySymbol(cur)}${displayNum(d.usd, cur, rates)}` : '…'}</span></DetailRow>
            <DetailRow label={'Time'}>{new Date(selected.timeStamp * 1000).toLocaleString('vi-VN')}</DetailRow>
            {memoLoading ? <DetailRow label={'Note'}>Loading...</DetailRow> : memo ? <DetailRow label={'Note'}>{memo}</DetailRow> : null}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 14 }}
              onClick={() => window.open(`${ARCSCAN}/tx/${selected.hash}`, '_blank')}>
              View on ArcScan
            </button>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
