import backIcon from '../../icon/back.png'
import { useState } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import { fmtVND } from '../data'

const WALLET_ADDR = localStorage.getItem('ez_wallet_addr') || ''

function loadQRs() {
  try { return JSON.parse(localStorage.getItem('ez_saved_qrs') || '[]') } catch { return [] }
}

export default function SavedQRList() {
  const { navigate } = useNav()
  const [list, setList] = useState(loadQRs)

  function handleDelete(id) {
    const updated = list.filter(q => q.id !== id)
    setList(updated)
    localStorage.setItem('ez_saved_qrs', JSON.stringify(updated))
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title">
        <button className="back-btn" onClick={() => navigate('HomeReceive')}><img src={backIcon} alt='‹' style={{ width: 18, height: 18 }} /></button>
        <span>QR đã lưu</span>
      </div>

      <div className="row-2-9" style={{ overflowY: 'auto', padding: '8px 0' }}>
        {list.length === 0 ? (
          <div className="tip-box" style={{ margin: '16px 0' }}>
            Chưa có QR nào được lưu
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {list.map(q => (
              <div key={q.id} style={{
                border: '1px solid var(--color-gray)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
              }}>
                <button
                  onClick={() => handleDelete(q.id)}
                  style={{
                    position: 'absolute', top: 6, right: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 16, color: 'var(--color-gray)', lineHeight: 1,
                  }}
                >×</button>
                <QRCodeSVG value={`ezwallet:${WALLET_ADDR}?amount=${q.amount}`} size={80} level="M" />
                <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', textAlign: 'center' }}>
                  {fmtVND(q.amount)}
                </span>
              </div>
            ))}
            <button
              onClick={() => navigate('CreateQR')}
              style={{
                border: '1.5px dashed var(--color-gray)',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                cursor: 'pointer',
                minHeight: 120,
              }}
            >
              <span style={{ fontSize: 28, color: 'var(--color-gray)', lineHeight: 1 }}>+</span>
            </button>
          </div>
        )}
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('HomeReceive')}>
          Quay lại
        </button>
      </div>
    </div>
  )
}
