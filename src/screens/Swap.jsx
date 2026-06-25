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
        console.log('[swap estimate full]', JSON.stringify(res))
        if (res?.estimate?.estimatedOutput) {
          setEstAmt(res.estimate.estimatedOutput.amount)
          setFee(res.estimate.fees?.map(f => `${f.amount} ${f.token}`).join(' + ') || null)
          setError('')
        } else if (res?.error) {
          setEstAmt(null); setError(res.error)
        } else {
          console.warn('[swap estimate] unexpected structure:', res)
          setEstAmt(null)
        }
      } catch (e) { console.error('[swap estimate error]', e); setEstAmt(null); setError(e.message) }
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
      <div className="row-1 full-bleed" style={{ display: 'flex', borderBottom: '1px solid var(--color-gray)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--color-black)' }}>Market</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Limit</div>
      </div>

      {/* Rows 2-6: centered content */}
      <div className="row-2-6" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>

        {/* FROM card */}
        <div style={{ border: '1.5px solid var(--color-gray)', borderRadius: 14, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setPicker('from')} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS[fromSym], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{fromSym.slice(0, 2)}</div>
              <div>
                <div style={{ fontSize: 21, fontWeight: 700 }}>{fromSym} ▾</div>
                <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{(balances[fromSym] || 0).toFixed(2)}</div>
              </div>
            </button>
            <div style={{ fontSize: 31, fontWeight: 700, color: input ? 'var(--color-black)' : 'var(--color-gray)' }}>{input || '0'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['25%', '50%', '75%', 'Max'].map(v => (
              <button key={v} onClick={() => { const bal = balances[fromSym] || 0; const pct = v === 'Max' ? 1 : parseFloat(v) / 100; setInput(String((bal * pct).toFixed(6).replace(/\.?0+$/, ''))) }}
                style={{ flex: 1, padding: '4px 0', border: '1px solid var(--color-gray)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 'var(--fs-label)', fontFamily: 'inherit' }}>{v}</button>
            ))}
          </div>
        </div>

        {/* ⇅ swap button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={swapDir} style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid var(--color-gray)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 22 }}>⇅</button>
        </div>

        {/* TO card */}
        <div style={{ border: '1.5px solid var(--color-gray)', borderRadius: 14, background: '#fff', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setPicker('to')} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS[toSym], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{toSym.slice(0, 2)}</div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 700 }}>{toSym} ▾</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{(balances[toSym] || 0).toFixed(2)}</div>
            </div>
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 31, fontWeight: 700, color: estAmt ? 'var(--color-black)' : 'var(--color-gray)' }}>
              {loading ? '...' : estAmt ? `~${parseFloat(estAmt).toFixed(4)}` : '0'}
            </div>
            {fee && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>phí mạng: {fee.split(' + ').find(f => f.includes('USDC')) || fee}</div>}
          </div>
        </div>

        {/* Error/status */}
        {(error || status) && (
          <div style={{ textAlign: 'center', fontSize: 'var(--fs-label)' }}>
            {error && <span style={{ color: 'var(--color-error)' }}>{error}</span>}
            {status && <span style={{ color: 'var(--color-primary)' }}>{status}</span>}
          </div>
        )}
      </div>

      {/* Rows 7-9: confirm button + numpad */}
      <div className="row-7-9" style={{ display: 'flex', flexDirection: 'column' }}>
        <button className="btn btn-primary" style={{ width: '66.67%', alignSelf: 'center', height: 44, flexShrink: 0 }} disabled={!canSwap} onClick={handleSwap}>
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
