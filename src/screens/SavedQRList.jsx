import { useState } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtMoney } from '../data'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function SavedQRList() {
  const { navigate } = useNav()
  const [list, setList] = useState(loadSavedQRs)
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  function handleDelete(id, e) {
    e.stopPropagation()
    const updated = list.filter(q => q.id !== id)
    setList(updated)
    saveSavedQRs(updated)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Kho QR')}
      </div>

      {/* Lưới 3 cột (hàng 2-7), ô cuối là "+" để thêm QR; nhiều thì scroll */}
      <div style={{ gridRow: '2 / 8', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignContent: 'start' }}>
          {list.map(q => {
            const c = q.currency || 'USD'
            const label = fmtMoney(q.amount, c)
            return (
              // Xem QR đã lưu: isNew=false (không lưu lại), Back về Kho QR
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, currency: c, isNew: false, back: 'SavedQRList' })}
                style={{ position: 'relative', aspectRatio: '1', border: '1.5px solid var(--color-gray)', borderRadius: 12, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, fontFamily: 'inherit' }}>
                <span onClick={e => handleDelete(q.id, e)} style={{ position: 'absolute', top: 6, right: 6, display: 'flex' }}><Icon name="x" size={14} color="var(--color-muted)" /></span>
                <QRCodeSVG value={`ezwallet:${walletAddr}?amount=${q.amount}&cur=${c}`} size={64} level="M" />
                <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{label}</span>
              </button>
            )
          })}
          {/* ô + thêm QR mới (from: SavedQRList → CreateQR biết đường về + auto-save) */}
          <button onClick={() => navigate('CreateQR', { from: 'SavedQRList' })}
            style={{ aspectRatio: '1', border: '1.5px dashed var(--color-muted)', borderRadius: 12, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={32} color="var(--color-muted)" />
          </button>
        </div>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('HomeReceive')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
