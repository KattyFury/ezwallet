import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession } from '../circle'
import { getTokenBalances } from '../chain'
import { spendableOf, GAS_RESERVE_USDC } from '../data'
import { t } from '../i18n'

// App khóa English (session 5) — chuỗi mới trong màn này hardcode English,
// t() chỉ giữ cho các key cũ đã có trong từ điển (Đổi tiền, Quay lại...).
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: 32, height: 32, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size={11} color="var(--color-muted)" />
    </button>
  )
}

// Popup chọn token — cùng kiểu popup tiền tệ của SendAmount (neo nửa trên)
function TokenPicker({ exclude, onSelect, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14dvh' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '70%', maxWidth: 300, background: 'var(--color-white)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', padding: '6px 0' }}>Select token</div>
        {SWAP_TOKENS.filter(s => s !== exclude).map(sym => (
          <button key={sym} onClick={() => { onSelect(sym); onClose() }} className="btn btn-secondary"
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
  const canSwap = amountNum > 0 && !overBalance && !loading

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
        const quote = res?.estimate?.quote
        if (quote?.estimatedAmount) { setEstAmt(quote.estimatedAmount); setError('') }
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
      setStatus('Swap submitted!')
      setInput(''); setEstAmt(null)
      setTimeout(() => { loadBalances(); setStatus('') }, 4000)
    } catch (e) {
      const msg = e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Swap failed')
      setError(msg); setStatus('')
    } finally { setLoading(false) }
  }

  const CARD = { border: '1.5px solid var(--color-gray)', borderRadius: 14, background: 'var(--color-white)', padding: '12px 14px' }

  return (
    <div className="screen">
      {picker && <TokenPicker exclude={picker === 'from' ? toSym : fromSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      <div className="row-2-6" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        {/* FROM */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <TokenRow sym={fromSym} onClick={() => setPicker('from')} />
            <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: overBalance ? 'var(--color-error)' : input ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {input || '0'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              Available: <span className="num">{(available).toFixed(decimalsFor(fromSym))}</span>
            </span>
            <button onClick={() => setInput(String(parseFloat(available.toFixed(decimalsFor(fromSym)))))}
              style={{ border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)', background: 'var(--color-white)', borderRadius: 8, padding: '3px 12px', fontSize: 'var(--fs-label)', fontFamily: 'inherit', cursor: 'pointer' }}>
              Max
            </button>
          </div>
        </div>

        {/* Đổi chiều */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
          <button onClick={swapDir}
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="trade" size={18} color="var(--color-content)" />
          </button>
        </div>

        {/* TO */}
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TokenRow sym={toSym} onClick={() => setPicker('to')} />
          <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: estAmt ? 'var(--color-content)' : 'var(--color-faint)' }}>
            {estAmt ? `≈${parseFloat(estAmt).toFixed(decimalsFor(toSym))}` : '0'}
          </span>
        </div>

        {/* Trạng thái / lỗi / ghi chú giữ phí */}
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-label)', minHeight: 22 }}>
          {error && <span style={{ color: 'var(--color-error)' }}>{error}</span>}
          {!error && status && <span style={{ color: 'var(--color-primary)' }}>{status}</span>}
          {!error && !status && fromSym === 'USDC' && (
            <span style={{ color: 'var(--color-muted)' }}>{GAS_RESERVE_USDC} USDC is kept for network fees</span>
          )}
        </div>
      </div>

      {/* Numpad + nút — main screen nên NavBar giữ hàng 10, numpad gói trong 7-9 */}
      <div className="row-7-9" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <button className="btn btn-primary" style={{ width: '66.67%', alignSelf: 'center', flexShrink: 0 }}
          disabled={!canSwap} onClick={handleSwap}>
          {loading ? 'Processing...' : 'Swap'}
        </button>
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
