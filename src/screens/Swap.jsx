import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Numpad from '../components/Numpad'
import { estimateSwap, executeSwap, getSDK, executeChallenge } from '../circle'
import { getTokenBalances } from '../chain'

const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const COLORS = { USDC: '#2775CA', EURC: '#1A56DB', cirBTC: '#F7931A' }

function TokenPicker({ exclude, onSelect, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 430, margin: '0 auto', borderRadius: '16px 16px 0 0', padding: 20 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-bold)', marginBottom: 16 }}>Chọn token</div>
        {SWAP_TOKENS.filter(t => t !== exclude).map(sym => (
          <button key={sym} onClick={() => { onSelect(sym); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-gray)', fontFamily: 'inherit' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS[sym], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {sym.slice(0, 2)}
            </div>
            <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{sym}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Swap() {
  const [fromSym, setFromSym] = useState('USDC')
  const [toSym, setToSym] = useState('EURC')
  const [input, setInput] = useState('')
  const [estAmt, setEstAmt] = useState(null)
  const [fee, setFee] = useState(null)
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [picker, setPicker] = useState(null)
  const debounceRef = useRef(null)

  const walletAddress = localStorage.getItem('ez_wallet_addr')
  const walletId = localStorage.getItem('ez_wallet_id')
  const amountNum = parseFloat(input.replace(',', '.') || '0')
  const canSwap = amountNum > 0 && !loading

  useEffect(() => {
    if (!walletAddress) return
    getTokenBalances(walletAddress).then(ts => {
      const map = {}; ts.forEach(t => { map[t.symbol] = t.amount }); setBalances(map)
    })
  }, [walletAddress])

  // Auto-estimate on input change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!amountNum || amountNum <= 0) { setEstAmt(null); setFee(null); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await estimateSwap({ walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
        if (res?.estimate) {
          setEstAmt(res.estimate.estimatedOutput?.amount || null)
          setFee(res.estimate.fees?.map(f => `${f.amount} ${f.token}`).join(' + ') || null)
          setError('')
        } else if (res?.error) {
          setEstAmt(null); setError(res.error)
        }
      } catch { setEstAmt(null) }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [input, fromSym, toSym])

  function handleKey(key) {
    if (key === 'BACK') { setInput(p => p.slice(0, -1)); return }
    if (key === ',' && input.includes(',')) return
    if (input.length >= 10) return
    setInput(p => p + key)
  }

  function swapDir() { setFromSym(toSym); setToSym(fromSym); setInput(''); setEstAmt(null) }

  function selectToken(side, sym) {
    if (side === 'from') { if (sym === toSym) setToSym(fromSym); setFromSym(sym) }
    else { if (sym === fromSym) setFromSym(toSym); setToSym(sym) }
    setInput(''); setEstAmt(null)
  }

  async function handleSwap() {
    setLoading(true); setError(''); setStatus('Đang chuẩn bị...')
    try {
      const res = await executeSwap({ walletId, walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
      if (res.error) throw new Error(res.error)
      setStatus('Xác nhận PIN...')
      const userToken = localStorage.getItem('ez_user_token')
      const encryptionKey = localStorage.getItem('ez_encryption_key')
      await executeChallenge(getSDK(), userToken, encryptionKey, res.challengeId)
      setStatus('Swap thành công!')
      setInput(''); setEstAmt(null)
    } catch (e) { setError(e.message); setStatus('') }
    finally { setLoading(false) }
  }

  return (
    <div className="screen">
      {picker && <TokenPicker exclude={picker === 'from' ? toSym : fromSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      {/* Row 1: tabs */}
      <div className="row-1" style={{ display: 'flex', borderBottom: '1px solid var(--color-gray)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '2px solid var(--color-primary)', color: 'var(--color-primary)', fontSize: 'var(--fs-label)', fontWeight: 700 }}>Market</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-label)', color: 'var(--color-muted)', opacity: 0.4 }}>Limit</div>
      </div>

      {/* Rows 2-3: FROM card */}
      <div className="row-2-3" style={{ border: '1.5px solid var(--color-gray)', borderRadius: 14, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 14px' }}>
        {/* Token selector + quick select */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setPicker('from')} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[fromSym], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{fromSym.slice(0, 2)}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 'var(--fs-item)', fontWeight: 700 }}>{fromSym} ▾</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{(balances[fromSym] || 0).toFixed(2)}</div>
            </div>
          </button>
          <div style={{ display: 'flex', gap: 5 }}>
            {['25%', '50%', '75%', 'Max'].map(v => (
              <button key={v} onClick={() => { const bal = balances[fromSym] || 0; const pct = v === 'Max' ? 1 : parseFloat(v) / 100; setInput(String((bal * pct).toFixed(6).replace(/\.?0+$/, ''))) }}
                style={{ padding: '2px 6px', border: '1px solid var(--color-gray)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>{v}</button>
            ))}
          </div>
        </div>
        {/* Big amount */}
        <div style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', color: input ? 'var(--color-black)' : 'var(--color-gray)', lineHeight: 1.2 }}>
          {input || '0'}
        </div>
      </div>

      {/* Row 4: swap button + TO card header */}
      <div className="row-4" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={swapDir} style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--color-gray)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, zIndex: 1 }}>⇅</button>
        <div style={{ border: '1.5px solid var(--color-gray)', borderRadius: 14, background: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
          <button onClick={() => setPicker('to')} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[toSym], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{toSym.slice(0, 2)}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 'var(--fs-item)', fontWeight: 700 }}>{toSym} ▾</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{(balances[toSym] || 0).toFixed(2)}</div>
            </div>
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: estAmt ? 'var(--color-black)' : 'var(--color-gray)' }}>
              {loading ? '...' : estAmt ? `~${parseFloat(estAmt).toFixed(4)}` : '0'}
            </div>
            {fee && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>phí: {fee}</div>}
          </div>
        </div>
      </div>

      {/* Rows 5-6: error/status */}
      <div className="row-5-6 center" style={{ flexDirection: 'column', gap: 4 }}>
        {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
        {status && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-primary)' }}>{status}</span>}
      </div>

      {/* Rows 7-9: confirm button + numpad */}
      <div className="row-7-9" style={{ display: 'flex', flexDirection: 'column' }}>
        <button className="btn btn-primary" style={{ width: '100%', height: 44, flexShrink: 0 }} disabled={!canSwap} onClick={handleSwap}>
          {loading ? 'Đang xử lý...' : 'Xác nhận giao dịch'}
        </button>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
