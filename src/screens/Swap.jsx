import { useState } from 'react'
import NavBar from '../components/NavBar'
import Numpad from '../components/Numpad'
import { TOKENS, fmtVND } from '../data'

const COLORS = { USDC: '#2775CA', EURC: '#1A56DB', cirBTC: '#F7931A' }

function TokenCard({ side, token, amount, est, balance, onToggle, showQuick, onQuick }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-gray)', borderRadius: 14,
      padding: '10px 14px', background: 'var(--color-white)',
      display: 'flex', flexDirection: 'column', gap: 6, height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: COLORS[token.symbol] || '#999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>{token.symbol.slice(0, 2)}</div>
          <div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{side}</div>
            <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', padding: 0 }}>
              {token.symbol} ▾
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {side === 'Từ' ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: amount ? 'var(--color-black)' : 'var(--color-gray)' }}>
              {amount || '0'}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-muted)' }}>{est || '~0'}</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư: {balance}</div>
            </div>
          )}
        </div>
      </div>
      {showQuick && (
        <div style={{ display: 'flex', gap: 6 }}>
          {['50%', '75%', 'Max'].map(v => (
            <button key={v} onClick={() => onQuick(v)}
              style={{ flex: 1, height: 24, border: '1px solid var(--color-gray)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 'var(--fs-label)', fontFamily: 'inherit' }}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Swap() {
  const [tab, setTab] = useState('Market')
  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(1)
  const [input, setInput] = useState('')

  const from = TOKENS[fromIdx]
  const to = TOKENS[toIdx]

  function handleKey(key) {
    if (key === 'BACK') { setInput(p => p.slice(0, -1)); return }
    if (key === ',' && input.includes(',')) return
    if (input.length >= 10) return
    setInput(p => p + key)
  }

  function swapDir() {
    setFromIdx(toIdx); setToIdx(fromIdx); setInput('')
  }

  function handleQuick(v) {
    const bal = from.amount
    if (v === '50%') setInput(String((bal * 0.5).toFixed(2)))
    if (v === '75%') setInput(String((bal * 0.75).toFixed(2)))
    if (v === 'Max') setInput(String(bal))
  }

  return (
    <div className="screen">
      {/* Row 1: tabs */}
      <div className="row-1" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-gray)', gap: 0 }}>
        {['Market', 'Limit'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              flex: 1, height: '100%', border: 'none', background: 'none', cursor: t === 'Limit' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 'var(--fs-label)', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--color-primary)' : 'var(--color-muted)',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              opacity: t === 'Limit' ? 0.4 : 1,
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Rows 2-3: FROM card */}
      <div className="row-2" style={{ padding: '8px 0 4px' }}>
        <TokenCard side="Từ" token={from} amount={input} showQuick onQuick={handleQuick} onToggle={() => {}} />
      </div>

      {/* Row 3-4: swap button */}
      <div className="row-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <button onClick={swapDir} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1.5px solid var(--color-gray)', background: 'var(--color-white)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18,
        }}>⇅</button>
      </div>

      {/* Rows 4-5: TO card */}
      <div className="row-4" style={{ padding: '4px 0 8px' }}>
        <TokenCard side="Đến" token={to} est={input ? `~${input}` : '~0'} balance={`${to.amount} ${to.symbol}`} showQuick={false} onToggle={() => {}} />
      </div>

      {/* Row 5: Fee info */}
      <div className="row-5 center" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
        <span>Phí</span><span>~0 USDC</span>
      </div>

      {/* Row 6: OK button */}
      <div className="row-6 center">
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={!input}>OK</button>
      </div>

      {/* Rows 7-9: numpad */}
      <div className="row-7-9">
        <Numpad onKey={handleKey} showComma />
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
