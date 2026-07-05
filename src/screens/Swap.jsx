import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession } from '../circle'
import { getTokenBalances } from '../chain'
import { spendableOf, GAS_RESERVE_USDC } from '../data'
import { addNotif } from '../notif'
import { t } from '../i18n'

// ✅ SWAP execute qua ADAPTER.execute(intent có chữ ký) — đúng cách, adapter settlement ghi
// có USDC về ví (xem HANDOFF mục SWAP + functions/api/_swapCore.js). VERIFY bằng eth_simulateV1
// (verify-swap.mjs, 2026-07-04): 2 EURC→USDC, số dư USDC ví TĂNG +3.12254 = khớp Kit estimate.
// Tắt lại nếu cần: đổi SWAP_ENABLED = false.
const SWAP_ENABLED = true

// App khóa English (session 5) — chuỗi mới trong màn này hardcode English,
// t() chỉ giữ cho các key cũ đã có trong từ điển (Đổi tiền, Quay lại...).
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick, big }) {
  const d = big ? 44 : 32
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: big ? 10 : 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: d, height: d, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: big ? 26 : 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size={big ? 14 : 11} color="var(--color-muted)" />
    </button>
  )
}

// Popup chọn token — cùng kiểu popup tiền tệ của SendAmount (neo nửa trên).
// Hiện ĐỦ 3 token (user chốt: đừng ẩn token đang ở phía kia — chọn trùng phía kia
// thì 2 phía tự đảo cho nhau, selectToken đã xử lý).
function TokenPicker({ current, onSelect, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14dvh' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '70%', maxWidth: 300, background: 'var(--color-white)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', padding: '6px 0' }}>Select token</div>
        {SWAP_TOKENS.map(sym => (
          <button key={sym} onClick={() => { onSelect(sym); onClose() }} className={`btn ${sym === current ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src={`/tokens/${sym.toLowerCase()}.png`} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Swap() {
  const [fromSym, setFromSym] = useState('EURC') // mặc định: cứu cánh "hết USDC" → đổi token khác VỀ USDC
  const [toSym, setToSym] = useState('USDC')
  const [input, setInput] = useState('')
  const [estAmt, setEstAmt] = useState(null)
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [picker, setPicker] = useState(null)
  const debounceRef = useRef(null)

  const walletAddress = localStorage.getItem('ez_wallet_addr')
  const walletId = localStorage.getItem('ez_wallet_id')
  const amountNum = parseFloat(input || '0')
  // Khả dụng: USDC chừa lại 1 làm phí mạng (gas Arc = USDC) — không cho swap hết
  const available = spendableOf(fromSym, balances[fromSym])
  const overBalance = amountNum > available
  const canSwap = SWAP_ENABLED && amountNum > 0 && !overBalance && !loading

  function loadBalances() {
    if (!walletAddress) return
    getTokenBalances(walletAddress).then(ts => {
      const map = {}; ts.forEach(tk => { map[tk.symbol] = tk.amount }); setBalances(map)
    }).catch(() => {})
  }
  useEffect(loadBalances, [walletAddress])

  // Ước tính tự động khi gõ (debounce 600ms)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!amountNum || amountNum <= 0) { setEstAmt(null); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await estimateSwap({ walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
        // amountOut = decimal token thật (server đã quy từ base units — estimatedAmount thô là base units, ĐỪNG hiện thẳng)
        if (res?.amountOut) { setEstAmt(res.amountOut); setError('') }
        else if (res?.error) { setEstAmt(null); setError(res.error) }
        else setEstAmt(null)
      } catch (e) { setEstAmt(null); setError(e.message) }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [input, fromSym, toSym])

  function handleKey(key) {
    if (key === 'BACK') { setInput(d => d.slice(0, -1)); return }
    if (key === '.') { setInput(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (input.length >= 12) return
    if (input === '0') { setInput(key); return }
    setInput(d => d + key)
  }

  function swapDir() { setFromSym(toSym); setToSym(fromSym); setInput(''); setEstAmt(null); setError('') }

  function selectToken(side, sym) {
    if (side === 'from') { if (sym === toSym) setToSym(fromSym); setFromSym(sym) }
    else { if (sym === fromSym) setFromSym(toSym); setToSym(sym) }
    setInput(''); setEstAmt(null); setError('')
  }

  async function handleSwap() {
    setLoading(true); setError(''); setStatus('Preparing...')
    try {
      // Token 60' có thể đã hết hạn giữa phiên → làm mới TRƯỚC khi tạo challenge cần PIN
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeSwap({ userToken, walletId, walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
      if (res.error) throw new Error(res.error)
      setStatus('Enter PIN to confirm...')
      await executeChallenge(getSDK(), userToken, encryptionKey, res.challengeId)
      const outTxt = res.amountOut ? ` to ~${parseFloat(res.amountOut).toFixed(decimalsFor(toSym))} ${toSym}` : ` to ${toSym}`
      const msg = `Swapped ${amountNum} ${fromSym}${outTxt}`
      addNotif(msg, 'sent', null, `swap-${Date.now()}`)   // hiện ở NotifArea (HomeSend/HomeReceive)
      setStatus('Swap submitted!')
      setInput(''); setEstAmt(null)
      setTimeout(() => { loadBalances(); setStatus('') }, 4000)
    } catch (e) {
      if (e?.code === 155701) { setStatus(''); setLoading(false); return }  // user tự hủy PIN → im lặng
      const msg = e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Swap failed')
      setError(msg); setStatus('')
    } finally { setLoading(false) }
  }

  const CARD = { border: '1.5px solid var(--color-gray)', borderRadius: 14, background: 'var(--color-white)', padding: '14px 16px' }
  // Số trong card = cỡ cố định vừa phải (không dùng fs-amount 40px — to & thô). Đồng bộ 2 card.
  const AMT = { fontSize: 28, fontWeight: 'var(--fw-semibold)', lineHeight: 1 }
  // FROM to hơn (chiếm 2 hàng) để nổi bật "đang đổi TỪ cái gì"; TO giữ AMT thường.
  const AMT_BIG = { fontSize: 40, fontWeight: 'var(--fw-semibold)', lineHeight: 1 }

  return (
    <div className="screen">
      {picker && <TokenPicker current={picker === 'from' ? fromSym : toSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      {/* Cụm FROM↔TO — LIỀN LẠC (nút đổi chiều đè lên ranh giới 2 card), canh giữa vùng hàng 2-4. */}
      <div style={{ gridRow: '2 / 5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          {/* FROM */}
          <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <TokenRow sym={fromSym} big onClick={() => setPicker('from')} />
              <span className="num" style={{ ...AMT_BIG, color: overBalance ? 'var(--color-error)' : input ? 'var(--color-content)' : 'var(--color-faint)' }}>
                {input || '0'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                Available: <span className="num">{(available).toFixed(decimalsFor(fromSym))}</span>
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['50%', 0.5], ['100%', 1]].map(([label, pct]) => (
                  <button key={label} onClick={() => setInput(String(parseFloat((available * pct).toFixed(decimalsFor(fromSym)))))}
                    style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', background: 'var(--color-white)', borderRadius: 8, padding: '3px 12px', fontSize: 'var(--fs-label)', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nút đổi chiều — ĐÈ lên ranh giới 2 card (viền trắng như "đục lỗ") → cụm liền lạc */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-16px 0', position: 'relative', zIndex: 3 }}>
            <button onClick={swapDir}
              style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-white)', background: 'var(--color-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="trade" size={18} color="var(--color-content)" />
            </button>
          </div>

          {/* TO */}
          <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <TokenRow sym={toSym} onClick={() => setPicker('to')} />
            <span className="num" style={{ ...AMT, color: estAmt ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {estAmt ? `~${parseFloat(estAmt).toFixed(decimalsFor(toSym))}` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Nút Swap + trạng thái — ở ranh giới hàng 5/6 (giữa cụm trên & numpad) */}
      <div style={{ gridRow: '5 / 6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <button className="btn btn-primary" style={{ width: '66.67%' }} disabled={!canSwap} onClick={handleSwap}>
          {loading ? 'Processing...' : SWAP_ENABLED ? 'Swap' : 'Swap (under repair)'}
        </button>
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-tiny)', minHeight: 14 }}>
          {!SWAP_ENABLED && <span style={{ color: 'var(--color-muted)' }}>Swap is temporarily disabled while we fix settlement</span>}
          {SWAP_ENABLED && error && <span style={{ color: 'var(--color-error)' }}>{error}</span>}
          {SWAP_ENABLED && !error && status && <span style={{ color: 'var(--color-primary)' }}>{status}</span>}
          {SWAP_ENABLED && !error && !status && fromSym === 'USDC' && (
            <span style={{ color: 'var(--color-muted)' }}>{GAS_RESERVE_USDC} USDC is kept for network fees</span>
          )}
        </div>
      </div>

      {/* Numpad ĐỒNG BỘ 6.5-8.5 (gridRow 6/9: spacer 0.5 + numpad 2.5), như SendAmount/CreateQR */}
      <div style={{ gridRow: '6 / 9', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 0.5 }} />
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
