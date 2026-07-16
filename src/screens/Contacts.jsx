import { useState, useRef, useEffect } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t } from '../i18n'
import { loadContacts, saveContacts } from '../store'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

const V = 220 // viewport ảnh tròn

// Cắt ảnh tròn: zoom bằng slider, di chuyển bằng kéo
function AvatarCropper({ src, onCancel, onDone }) {
  const imgRef = useRef(null)
  const [nat, setNat] = useState(null)        // { w, h }
  const [base, setBase] = useState(1)         // scale phủ kín viewport
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef(null)

  const scale = base * zoom
  const dispW = nat ? nat.w * scale : 0
  const dispH = nat ? nat.h * scale : 0

  function clamp(p, w, h) {
    return {
      x: Math.min(0, Math.max(V - w, p.x)),
      y: Math.min(0, Math.max(V - h, p.y)),
    }
  }

  function onLoad(e) {
    const w = e.target.naturalWidth, h = e.target.naturalHeight
    const b = Math.max(V / w, V / h)
    setNat({ w, h }); setBase(b); setZoom(1)
    setPos({ x: (V - w * b) / 2, y: (V - h * b) / 2 })
  }

  function onZoom(z) {
    const oldW = dispW || 1
    const newW = nat.w * base * z
    const newH = nat.h * base * z
    // giữ tâm
    const cx = V / 2 - (V / 2 - pos.x) * (newW / oldW)
    const cy = V / 2 - (V / 2 - pos.y) * (newH / (dispH || 1))
    setZoom(z); setPos(clamp({ x: cx, y: cy }, newW, newH))
  }

  function down(e) { e.target.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y } }
  function move(e) {
    if (!drag.current) return
    const nx = drag.current.px + (e.clientX - drag.current.x)
    const ny = drag.current.py + (e.clientY - drag.current.y)
    setPos(clamp({ x: nx, y: ny }, dispW, dispH))
  }
  function up() { drag.current = null }

  function finish() {
    const canvas = document.createElement('canvas')
    canvas.width = V; canvas.height = V
    const ctx = canvas.getContext('2d')
    const srcSize = V / scale
    const srcX = -pos.x / scale
    const srcY = -pos.y / scale
    ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, V, V)
    onDone(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>{t('Chỉnh ảnh')}</div>
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ width: V, height: V, borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#000', touchAction: 'none', cursor: 'grab' }}
      >
        <img ref={imgRef} src={src} alt="" draggable={false} onLoad={onLoad}
          style={{ position: 'absolute', left: pos.x, top: pos.y, width: dispW, height: dispH, userSelect: 'none' }} />
      </div>
      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => onZoom(parseFloat(e.target.value))} style={{ width: V }} />
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>{t('Hủy')}</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>{t('Xong')}</button>
      </div>
    </div>
  )
}

export default function Contacts() {
  const { navigate, params } = useNav()
  const [contacts, setContacts] = useState(loadContacts)
  // form = null (đóng) | { id?, name, addr, pfp }. Có id = SỬA; không id = THÊM.
  const [form, setForm] = useState(null)
  const [picked, setPicked] = useState(null)     // ảnh thô đang chỉnh
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const fileRef = useRef(null)

  // Tới từ TxHistory [Add] → mở form Thêm với địa chỉ điền sẵn
  useEffect(() => { if (params?.addAddress) setForm({ name: '', addr: params.addAddress, pfp: null }) }, [])

  function copyAddr(c) {
    navigator.clipboard?.writeText(c.address).catch(() => {})
    setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1200)
  }

  function openAdd() { setForm({ name: '', addr: '', pfp: null }) }
  function openEdit(c) { setForm({ id: c.id, name: c.name, addr: c.address, pfp: c.avatar || null }) }
  function closeForm() { setForm(null); setPicked(null); setConfirmDelete(false) }
  const formValid = form && form.name.trim() && isValid(form.addr)

  function handleSave() {
    if (!formValid) return
    const updated = form.id
      ? contacts.map(c => c.id === form.id ? { ...c, name: form.name.trim(), address: form.addr.trim(), avatar: form.pfp } : c)
      : [...contacts, { id: Date.now(), name: form.name.trim(), address: form.addr.trim(), avatar: form.pfp }]
    setContacts(updated); saveContacts(updated); closeForm()
  }

  function handleDelete() {
    const updated = contacts.filter(c => c.id !== form.id)
    setContacts(updated); saveContacts(updated); closeForm()
  }

  function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPicked(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Danh bạ')}
      </div>

      <div className="row-2-8 scroll-thin" style={{ width: '100%', justifyContent: contacts.length ? 'flex-start' : 'center' }}>
        {contacts.length === 0 ? (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{t('Chưa có danh bạ')}</span>
        ) : (
          contacts.map(c => {
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0' }}>
                {c.avatar ? (
                  <img src={c.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  // Chưa có ảnh → vòng xám + dấu "+" trắng, bấm vào để thêm avatar
                  <button onClick={() => openEdit(c)}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-gray)', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="add" size={24} color="var(--color-white)" />
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 'var(--fw-medium)' }}>{c.name}</div>
                  <button onClick={() => copyAddr(c)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)' }}>
                      {c.address.slice(0, 6)}...{c.address.slice(-4)}
                    </span>
                    <Icon name={copiedId === c.id ? 'check' : 'copy'} size="var(--is-label)" color={copiedId === c.id ? 'var(--color-primary)' : 'var(--color-muted)'} />
                  </button>
                </div>
                <button onClick={() => navigate('SendAmount', { address: c.address, name: c.name })}
                  className="btn btn-primary" style={{ height: 40, minHeight: 40, padding: '0 22px', fontSize: 'var(--fs-item)' }}>
                  {t('Gửi')}
                </button>
                <button onClick={() => openEdit(c)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0, display: 'flex' }}>
                  <Icon name="option" size={20} color="var(--color-muted)" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={openAdd}>
          <Icon name="add" size="var(--is-md-lg)" color="var(--color-white)" />{t('Thêm')}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />

      {/* Popup THÊM/SỬA danh bạ — neo nửa trên (tránh bàn phím). Sửa: có "Delete contact" đỏ. */}
      {form && (
        <div className="popup-overlay" onClick={closeForm}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            {picked ? (
              <AvatarCropper src={picked} onCancel={() => setPicked(null)} onDone={d => { setForm(f => ({ ...f, pfp: d })); setPicked(null) }} />
            ) : (
              <>
                <div className="popup-title">{form.id ? 'Edit contact' : t('Thêm danh bạ')}</div>
                <button onClick={() => fileRef.current?.click()}
                  style={{ alignSelf: 'center', width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer', overflow: 'hidden', background: form.pfp ? 'transparent' : 'var(--color-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {form.pfp
                    ? <img src={form.pfp} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="add" size={30} color="var(--color-white)" />}
                </button>
                <input className="address-input" placeholder={t('Tên')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 'var(--fs-body)' }} />
                <input className="address-input" placeholder="0x..." value={form.addr} onChange={e => setForm(f => ({ ...f, addr: e.target.value }))} style={{ fontSize: 'var(--fs-body)' }} />
                {/* SỬA: dòng chữ đỏ "Delete contact" (không phải nút — tránh lòi 3 nút), bấm → confirm */}
                {form.id && (
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)', fontFamily: 'inherit', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', padding: '2px 0', textAlign: 'center' }}>
                    Delete contact
                  </button>
                )}
                <div className="popup-actions">
                  <button className="btn btn-secondary" onClick={closeForm}>{t('Quay lại')}</button>
                  <button className="btn btn-primary" disabled={!formValid} onClick={handleSave}>{t('Lưu')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Xác nhận xóa — chống bấm nhầm (z-index 110: đè lên popup form đang mở) */}
      {confirmDelete && (
        <div className="popup-overlay" style={{ zIndex: 110 }} onClick={() => setConfirmDelete(false)}>
          <div className="popup-card" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title">Delete contact?</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>This can't be undone.</div>
            <div className="popup-actions" style={{ marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>{t('Quay lại')}</button>
              <button className="btn btn-error" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
