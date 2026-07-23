import { useState, useRef } from 'react'
import { useNav } from '../nav'
import { QRCodeSVG } from 'qrcode.react'
import Icon from '../components/Icon'
import Numpad from '../components/Numpad'
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
  // LUẬT BÀN PHÍM (user chốt 07-23 hướng A): NHẬP TIỀN = numpad app, NHẬP CHỮ = bàn phím iPhone.
  // Ô Amount trong popup KHÔNG còn là <input> (bàn phím iPhone numpad thiếu dấu , theo locale +
  // lệch chuẩn app) → bấm vào mở SHEET numpad app (geometry y hệt sheet Swap). Back = hủy số vừa
  // gõ, Done/bấm ra ngoài = giữ.
  const [pad, setPad] = useState(false)
  const padPrev = useRef('')
  const walletAddr = localStorage.getItem('ez_wallet_addr') || ''

  const amountNum = parseFloat(amountStr || '0')

  function openPad() { padPrev.current = amountStr; setPad(true) }
  function cancelPad() { setAmountStr(padPrev.current); setPad(false) }
  // Phím numpad — logic giống SendAmount ('.' 1 lần, BACK xóa lùi, tối đa 12 ký tự)
  function handlePadKey(key) {
    if (key === 'BACK') { setAmountStr(d => d.slice(0, -1)); return }
    if (key === '.') { setAmountStr(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    setAmountStr(d => (d.length >= 12 ? d : d === '0' ? key : d + key))
  }

  // Bấm dấu × → MỞ POPUP xác nhận (không xóa ngay — chống bấm nhầm, như Delete contact)
  function askDelete(q, e) { e.stopPropagation(); setPendingDelete(q) }
  function confirmDelete() {
    const updated = list.filter(q => q.id !== pendingDelete.id)
    setList(updated); saveSavedQRs(updated); setPendingDelete(null)
  }

  function resetForm() { setAdding(false); setName(''); setAmountStr(''); setPad(false) }

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

      {/* Vùng QR = BOX XÁM lớn hàng 2-8 (user chốt 07-23, đồng bộ kiểu box History) · lưới 2 CỘT
          (trước 3 cột QR bé quá) → QR + chữ to lên cho bà già dễ đọc. Mỗi QR = box TRẮNG nổi trên
          nền xám: viền xám 1.5 (luật "bấm được trong box xám") + DROP SHADOW như button (07-22d,
          trắng = alpha .25). X xóa góc trên-phải. Nhiều thì scroll trong box. */}
      {/* Box xám NGOÀI (padding 10 = box trắng cách lề trái/phải/trên đúng 10px, user chốt 07-23b)
          + scroll TRONG bằng .scroll-hidden. ⚠️ ĐỪNG dùng .scroll-thin Ở TRONG box xám: class đó có
          margin-right -20px (mẹo cho list full-bleed) → nội dung tràn phải; PC có scrollbar-gutter
          bù nên nhìn ổn, iOS KHÔNG hỗ trợ → vỡ layout (bug mobile user báo 07-23b). */}
      <div style={{ gridRow: '2 / 9', background: 'var(--color-surface)', borderRadius: 20, padding: 10, overflow: 'hidden' }}>
      <div className="scroll-hidden" style={{ height: '100%' }}>
        {/* ⚠️ CỘT PHẢI minmax(0,1fr) — '1fr' trần cho content quyết min-width, box to kéo banh cột
            (đúng bài học .screen mục 6). Bug user chụp 07-23c: 3 QR → hàng 2 = [Blend | nút +],
            nút + aspectRatio 1 bị kéo cao bằng box Blend → PHÌNH NGANG theo → 2 cột lệch hẳn. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignContent: 'start' }}>
          {list.map(q => {
            const c = q.currency || 'USD'
            const label = fmtMoney(q.amount, c)
            return (
              // Xem QR đã lưu (không lưu lại), Back về Kho QR. Hiển thị: QR · Tên (đen) · số tiền (xám).
              <button key={q.id} onClick={() => navigate('ShowQR', { amount: q.amount, currency: c, name: q.name, fromStorage: true, saveToLibrary: false, back: 'SavedQRList' })}
                style={{ position: 'relative', minWidth: 0, border: '1.5px solid var(--color-gray)', borderRadius: 16, background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 10px 12px', fontFamily: 'inherit' }}>
                <span onClick={e => askDelete(q, e)} style={{ position: 'absolute', top: 8, right: 8, display: 'flex' }}><Icon name="x" size={16} color="var(--color-muted)" /></span>
                {/* QR CO GIÃN THEO BOX (user chốt 07-23b "đừng cố định, tùy theo xám"): khung vuông
                    aspectRatio 1 ăn hết bề ngang box (trừ 24px chừa lề + chỗ nút X), svg fill 100%
                    (viewBox tự scale, không méo); flexShrink 0 chống grid ép dẹp (bug méo cũ). */}
                <div style={{ alignSelf: 'stretch', margin: '0 12px', flexShrink: 0 }}>
                  {/* height auto = svg tự giữ vuông theo viewBox (ép height 100% từng lệch 3px) */}
                  <QRCodeSVG value={`ezwallet:${walletAddr}?amount=${q.amount}&cur=${c}`} size={104} level="M" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                {q.name && <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.name}</span>}
                <span className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{label}</span>
              </button>
            )
          })}
          {/* ô + → mở POPUP thêm QR (không sang màn mới). KHÔNG aspectRatio (xem note trên) —
              đứng cùng hàng với QR thì stretch cao theo, đứng một mình thì minHeight 140. */}
          <button onClick={() => setAdding(true)}
            style={{ minWidth: 0, minHeight: 140, border: '1.5px dashed var(--color-muted)', borderRadius: 16, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="add" size={40} color="var(--color-muted)" />
          </button>
        </div>
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
            <div className="popup-title">Add to QR Storage</div>
            <input className="address-input" placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} maxLength={30} style={{ fontSize: 'var(--fs-body)' }} />
            {/* Label kèm ký hiệu tiền tệ MẶC ĐỊNH của user (user chốt 07-20: USDC→$, EURC→€…) */}
            {/* Ô Amount = KHÔNG phải input (luật bàn phím 07-23) — bấm mở sheet numpad app; blur ô
                Name trước để bàn phím iPhone hạ xuống rồi numpad mới trồi lên (không chồng nhau).
                Caret _ nhấp nháy khi sheet đang mở (đồng bộ tín hiệu nhập tiền toàn app). */}
            <div className="address-input" onClick={() => { document.activeElement?.blur?.(); openPad() }}
              style={{ fontSize: 'var(--fs-body)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              {amountStr ? (
                <span className="num">{amountStr}{pad && <span className="caret">_</span>}</span>
              ) : pad ? (
                <span className="num"><span className="caret">_</span></span>   /* trống + đang nhập = CHỈ caret (chuẩn 07-20b) */
              ) : (
                <span style={{ color: 'var(--color-faint)' }}>{`Amount (${displaySymbol(getDisplayCurrency())})`}</span>
              )}
            </div>
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={resetForm}>{t('Hủy')}</button>
              <button className="btn btn-primary" disabled={!(amountNum > 0)} onClick={handleSave}>{t('Lưu')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet numpad nhập Amount — geometry Y HỆT sheet Swap (.sheet-overlay/.sheet numpad-gray,
          55→100dvh, overlay trong suốt). Render SAU popup → nổi trên popup (cùng z-index 100,
          DOM sau thắng); popup neo nửa trên nên không che nhau. */}
      {pad && (
        <div className="sheet-overlay" onClick={() => setPad(false)}>
          <div className="sheet numpad-gray" onClick={e => e.stopPropagation()}>
            <div style={{ flex: 5.5, minHeight: 0, paddingTop: 24 }}>
              <Numpad onKey={handlePadKey} showComma />
            </div>
            <div style={{ flex: 0.5 }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-secondary" style={{ width: '44%' }} onClick={cancelPad}>{t('Quay lại')}</button>
              <button className="btn btn-primary" style={{ width: '44%' }} onClick={() => setPad(false)}>{t('Xong')}</button>
            </div>
            <div style={{ flex: 1 }} />
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
