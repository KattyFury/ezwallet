import { useState } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtVND } from '../data'

function loadQRs() {
  try { return JSON.parse(localStorage.getItem('ez_saved_qrs') || '[]') } catch { return [] }
}

export default function SavedQRList() {
  const { navigate } = useNav()
  const [list, setList] = useState(loadQRs)
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  function handleDelete(id, e) {
    e.stopPropagation()
    const updated = list.filter(q => q.id !== id)
    setList(updated)
    localStorage.setItem('ez_saved_qrs', JSON.stringify(updated))
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Kho QR
      </div>

      {/* Lưới 3 cột, tối đa 9 ô hiện (hàng 2-7), nhiều hơn thì scroll */}
      <div style={{ gridRow: '2 / 8', overflowY: 'auto' }}>
        {list.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
            Chưa có QR nào
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignContent: 'start' }}>
            {list.map(q => (
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, from: 'SavedQRList' })}
                style={{ position: 'relative', aspectRatio: '1', border: '1.5px solid var(--color-gray)', borderRadius: 12, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, fontFamily: 'inherit' }}>
                <span onClick={e => handleDelete(q.id, e)} style={{ position: 'absolute', top: 6, right: 6, display: 'flex' }}><Icon name="x" size={14} color="var(--color-muted)" /></span>
                <QRCodeSVG value={`ezwallet:${walletAddr}?amount=${q.amount}`} size={64} level="M" />
                <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', color: 'var(--color-content)' }}>{fmtVND(q.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('HomeReceive')}>Quay lại</button>
      </div>
    </div>
  )
}
