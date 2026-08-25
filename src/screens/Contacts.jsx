import { useState, useRef, useEffect } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { loadContacts, saveContacts } from '../store'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

const V = 220 // circular image viewport

// Circular image cropper: zoom with the slider, reposition by dragging
function AvatarCropper({ src, onCancel, onDone }) {
  const imgRef = useRef(null)
  const [nat, setNat] = useState(null)        // { w, h }
  const [base, setBase] = useState(1)         // scale that fills the viewport
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
    // keep the centre
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
      <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>Adjust photo</div>
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ width: V, height: V, borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#000', touchAction: 'none', cursor: 'grab' }}
      >
        <img ref={imgRef} src={src} alt="" draggable={false} onLoad={onLoad}
          style={{ position: 'absolute', left: pos.x, top: pos.y, width: dispW, height: dispH, userSelect: 'none' }} />
      </div>
      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => onZoom(parseFloat(e.target.value))} style={{ width: V }} />
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>Done</button>
      </div>
    </div>
  )
}

export default function Contacts() {
  const { navigate, params } = useNav()
  const [contacts, setContacts] = useState(loadContacts)
  // form = null (closed) | { id?, name, addr, pfp }. With an id = EDIT; without = ADD.
  const [form, setForm] = useState(null)
  const [picked, setPicked] = useState(null)     // the raw image being cropped
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const fileRef = useRef(null)

  // Arrived from TxHistory [Add] → open the Add form with the address prefilled
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
        Contacts
      </div>

      {/* SHARED GREY BOX around the whole list (user decision 07-17f: "mark the area clearly so people can see it
          is one box"). The box's horizontal padding = an EVEN margin on both sides for every row (rows used to be
          full-bleed: the PFP touched the left edge while the options button was inset 4px + the scrollbar gutter → the user called it "off to the left"). */}
      <div className="row-2-8" style={{ width: '100%', ...(contacts.length ? { background: 'var(--color-surface)', borderRadius: 20, padding: '4px 16px', alignItems: 'stretch', justifyContent: 'flex-start', overflow: 'hidden' } : {}) }}>
        {contacts.length === 0 ? (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>No contacts yet</span>
        ) : (
          <div className="scroll-thin" style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {contacts.map(c => {
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0' }}>
                {c.avatar ? (
                  <img src={c.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  // No picture yet → a WHITE circle with a GREY BORDER (it sits inside the grey box → follows the
                  // white-chip rule of 07-17f), a muted "+", tap it to add an avatar
                  <button onClick={() => openEdit(c)}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-white)', border: '1.5px solid var(--color-gray)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="add" size={24} color="var(--color-muted)" />
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
                  Send
                </button>
                <button onClick={() => openEdit(c)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0, display: 'flex' }}>
                  <Icon name="option" size={20} color="var(--color-muted)" />
                </button>
              </div>
            )
          })}
          </div>
        )}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Back</button>
        {/* TEXT ONLY, no icon (user decision 07-29): every Back/<action> button pair in the app is plain text -
            an icon on just this one looked out of place. */}
        <button className="btn btn-primary" onClick={openAdd}>Add</button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />

      {/* ADD/EDIT contact popup - anchored to the top half (clear of the keyboard). Edit mode has a red "Delete contact". */}
      {form && (
        <div className="popup-overlay" onClick={closeForm}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            {picked ? (
              <AvatarCropper src={picked} onCancel={() => setPicked(null)} onDone={d => { setForm(f => ({ ...f, pfp: d })); setPicked(null) }} />
            ) : (
              <>
                <div className="popup-title">{form.id ? 'Edit contact' : 'Add contact'}</div>
                {/* The add-PFP circle uses the SAME surface grey as the field below it (the user caught this 07-17f:
                    two grey areas in different greys - it was --color-gray #E5E5EA vs surface #F2F2F7) */}
                <button onClick={() => fileRef.current?.click()}
                  style={{ alignSelf: 'center', width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer', overflow: 'hidden', background: form.pfp ? 'transparent' : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {form.pfp
                    ? <img src={form.pfp} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="add" size={30} color="var(--color-muted)" />}
                </button>
                <input className="address-input" placeholder={'Name'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 'var(--fs-body)' }} />
                <input className="address-input" placeholder="0x..." value={form.addr} onChange={e => setForm(f => ({ ...f, addr: e.target.value }))} style={{ fontSize: 'var(--fs-body)' }} />
                {/* EDIT: a red "Delete contact" line (not a button - avoids ending up with 3 buttons), tapping it → confirm.
                    14px vertical margin (user decision 07-20: keep it away from the address field above and the Back/Save
                    pair below so nobody taps it by accident - popup-card gap 12px + 14px = ~26px each side). The popup still
                    centres itself over rows 1-6 thanks to top:30dvh + translateY(-50%). */}
                {form.id && (
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)', fontFamily: 'inherit', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', padding: '2px 0', margin: '14px 0', textAlign: 'center' }}>
                    Delete contact
                  </button>
                )}
                <div className="popup-actions">
                  <button className="btn btn-secondary" onClick={closeForm}>Back</button>
                  <button className="btn btn-primary" disabled={!formValid} onClick={handleSave}>Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation - guards against a mis-tap (z-index 110: sits above the open form popup) */}
      {confirmDelete && (
        <div className="popup-overlay" style={{ zIndex: 110 }} onClick={() => setConfirmDelete(false)}>
          <div className="popup-card" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="popup-title">Delete contact?</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>This can't be undone.</div>
            <div className="popup-actions" style={{ marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Back</button>
              <button className="btn btn-error" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
