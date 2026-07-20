import { useState } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '../components/Icon'
import { fmtMoney, getDisplayCurrency, displaySymbol } from '../data'
import { t } from '../i18n'
import { loadSavedQRs, saveSavedQRs } from '../store'

export default function SavedQRList() {
  const { navigate } = useNav()
  const [list, setList] = useState(loadSavedQRs)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)   // QR đang chờ xác nhận xóa (user chốt 07-20e)
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  const amountNum = parseFloat(amountStr || '0')

  // Bấm dấu × → MỞ POPUP xác nhận (không xóa ngay — chống bấm nhầm, như Delete contact)
  function askDelete(q, e) { e.stopPropagation(); setPendingDelete(q) }
  function confirmDelete() {
    const updated = list.filter(q => q.id !== pendingDelete.id)
    setList(updated); saveSavedQRs(updated); setPendingDelete(null)
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
      <div className="scroll-thin" style={{ gridRow: '2 / 8' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignContent: 'start' }}>
          {list.map(q => {
            const c = q.currency || 'USD'
            const label = fmtMoney(q.amount, c)
            return (
              // Xem QR đã lưu (không lưu lại), Back về Kho QR. Hiển thị: QR · Tên (đen) · số tiền (xám).
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, currency: c, name: q.name, fromStorage: true, saveToLibrary: false, back: 'SavedQRList' })}
                style={{ position: 'relative', border: 'none', borderRadius: 20, background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px 10px', fontFamily: 'inherit' }}>
                <span onClick={e => askDelete(q, e)} style={{ position: 'absolute', top: 6, right: 6, display: 'flex' }}><Icon name="x" size={14} color="var(--color-muted)" /></span>
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

      {/* Back = xanh (primary), căn GIỮA màn hình theo chuẩn .row10-single (user chốt 2026-07-15) */}
      <div className="row10-single">
        <button className="btn btn-primary" onClick={() => navigate('HomeReceive')}>{t('Quay lại')}</button>
      </div>

      {/* Popup thêm QR — chuẩn .popup-card (tâm vùng hàng 2-5, chừa bàn phím nửa dưới) */}
      {adding && (
        <div className="popup-overlay" onClick={resetForm}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Add to library</div>
            <input className="address-input" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} maxLength={30} style={{ fontSize: 'var(--fs-body)' }} />
            {/* Label kèm ký hiệu tiền tệ MẶC ĐỊNH của user (user chốt 07-20: USDC→$, EURC→€…) */}
            <input className="address-input" placeholder={`Amount (${displaySymbol(getDisplayCurrency())})`} inputMode="decimal" value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^\d.]/g, ''))} style={{ fontSize: 'var(--fs-body)' }} />
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={resetForm}>{t('Hủy')}</button>
              <button className="btn btn-primary" disabled={!(amountNum > 0)} onClick={handleSave}>{t('Lưu')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận xóa QR — chuẩn popup (tâm vùng hàng 1-6). "Delete QR: <tên>" (không tên → số tiền) */}
      {pendingDelete && (
        <div className="popup-overlay" onClick={() => setPendingDelete(null)}>
          <div className="popup-card" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title">Delete QR: {pendingDelete.name || fmtMoney(pendingDelete.amount, pendingDelete.currency || 'USD')}</div>
            <div className="popup-actions" style={{ marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setPendingDelete(null)}>{t('Quay lại')}</button>
              <button className="btn btn-error" onClick={confirmDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
