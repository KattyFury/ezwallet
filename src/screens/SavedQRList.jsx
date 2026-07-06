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
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  const amountNum = parseFloat(amountStr || '0')

  function handleDelete(id, e) {
    e.stopPropagation()
    const updated = list.filter(q => q.id !== id)
    setList(updated)
    saveSavedQRs(updated)
  }

  function resetForm() { setAdding(false); setName(''); setAmountStr('') }

  // Save = TẠO QR vào KHO (không show QR cho scan — đó là tính năng Create QR). currency mặc định USD.
  function handleSave() {
    if (!(amountNum > 0)) return
    const updated = [...list, { id: Date.now(), amount: amountNum, currency: 'USD', name: name.trim(), createdAt: new Date().toISOString() }]
    setList(updated); saveSavedQRs(updated)
    resetForm()
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
              // Xem QR đã lưu (không lưu lại), Back về Kho QR. Hiển thị: QR · Tên (đen) · số tiền (xám).
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, currency: c, saveToLibrary: false, back: 'SavedQRList' })}
                style={{ position: 'relative', border: '1.5px solid var(--color-gray)', borderRadius: 12, background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px 10px', fontFamily: 'inherit' }}>
                <span onClick={e => handleDelete(q.id, e)} style={{ position: 'absolute', top: 6, right: 6, display: 'flex' }}><Icon name="x" size={14} color="var(--color-muted)" /></span>
                <QRCodeSVG value={`ezwallet:${walletAddr}?amount=${q.amount}&cur=${c}`} size={58} level="M" />
                {q.name && <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span>}
                <span className="num" style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>{label}</span>
              </button>
            )
          })}
          {/* ô + → mở POPUP thêm QR (không sang màn mới) */}
          <button onClick={() => setAdding(true)}
            style={{ aspectRatio: '1', border: '1.5px dashed var(--color-muted)', borderRadius: 12, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={32} color="var(--color-muted)" />
          </button>
        </div>
      </div>

      {/* Back = xanh (primary) + neo BÊN PHẢI cho thuận tay (ngón cái) */}
      <div style={{ gridRow: '9 / 11', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" style={{ width: '44%' }} onClick={() => navigate('HomeReceive')}>{t('Quay lại')}</button>
      </div>

      {/* Popup thêm QR — đồng bộ style popup Thêm danh bạ (neo nửa trên, tránh bàn phím). */}
      {adding && (
        <div onClick={resetForm}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '88%', maxWidth: 360, background: 'var(--color-white)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center' }}>Add to library</div>
            <input className="address-input" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} maxLength={30} style={{ fontSize: 'var(--fs-body)' }} />
            <input className="address-input" placeholder="Amount" inputMode="decimal" value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^\d.]/g, ''))} style={{ fontSize: 'var(--fs-body)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={resetForm}>{t('Hủy')}</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!(amountNum > 0)} onClick={handleSave}>{t('Lưu')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
