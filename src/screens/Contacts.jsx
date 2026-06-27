import { useState, useRef, useEffect } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'

function loadContacts() {
  try { return JSON.parse(localStorage.getItem('ez_contacts') || '[]') } catch { return [] }
}

function saveContacts(list) {
  localStorage.setItem('ez_contacts', JSON.stringify(list))
}

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

function avatar(name) {
  const c = name?.trim()[0]?.toUpperCase() || '?'
  const colors = ['var(--color-primary)', '#2775CA', '#F7931A', '#1A56DB', 'var(--color-error)']
  const i = name.charCodeAt(0) % colors.length
  return { letter: c, color: colors[i] }
}

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
      <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>Chỉnh ảnh</div>
      <div
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ width: V, height: V, borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#000', touchAction: 'none', cursor: 'grab' }}
      >
        <img ref={imgRef} src={src} alt="" draggable={false} onLoad={onLoad}
          style={{ position: 'absolute', left: pos.x, top: pos.y, width: dispW, height: dispH, userSelect: 'none' }} />
      </div>
      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => onZoom(parseFloat(e.target.value))} style={{ width: V }} />
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Hủy</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>Xong</button>
      </div>
    </div>
  )
}

export default function Contacts() {
  const { navigate } = useNav()
  const [contacts, setContacts] = useState(loadContacts)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [addr, setAddr] = useState('')
  const [pfp, setPfp] = useState(null)        // ảnh đã cắt
  const [picked, setPicked] = useState(null)  // ảnh thô đang chỉnh
  const fileRef = useRef(null)

  function resetForm() { setAdding(false); setName(''); setAddr(''); setPfp(null); setPicked(null) }

  function handleAdd() {
    if (!name.trim() || !isValid(addr)) return
    const updated = [...contacts, { id: Date.now(), name: name.trim(), address: addr.trim(), avatar: pfp }]
    setContacts(updated); saveContacts(updated)
    resetForm()
  }

  function handleDelete(id) {
    const updated = contacts.filter(c => c.id !== id)
    setContacts(updated); saveContacts(updated)
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
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Danh bạ
      </div>

      <div className="row-2-8" style={{ width: '100%', overflowY: 'auto', justifyContent: contacts.length ? 'flex-start' : 'center' }}>
        {contacts.length === 0 ? (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>Chưa có danh bạ</span>
        ) : (
          contacts.map(c => {
            const av = avatar(c.name)
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 0' }}>
                {c.avatar ? (
                  <img src={c.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                    {av.letter}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 'var(--fw-medium)' }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)' }}>{c.address.slice(0, 8)}...{c.address.slice(-6)}</div>
                </div>
                <button onClick={() => navigate('SendAmount', { address: c.address, name: c.name })}
                  className="btn btn-primary" style={{ height: 40, minHeight: 40, padding: '0 22px', fontSize: 'var(--fs-item)' }}>
                  Gửi
                </button>
                <button onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0, display: 'flex' }}>
                  <Icon name="x" size={18} color="var(--color-muted)" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Quay lại</button>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setAdding(true)}>
          <Icon name="add" size={22} color="var(--color-white)" />Thêm
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />

      {/* Popup thêm danh bạ — neo ở nửa trên (hàng 1-5), tránh bàn phím iPhone che nửa dưới */}
      {adding && (
        <div
          onClick={resetForm}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8dvh' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '88%', maxWidth: 360, background: 'var(--color-white)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {picked ? (
              <AvatarCropper src={picked} onCancel={() => setPicked(null)} onDone={d => { setPfp(d); setPicked(null) }} />
            ) : (
              <>
                <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', textAlign: 'center' }}>Thêm danh bạ</div>
                <button onClick={() => fileRef.current?.click()}
                  style={{ alignSelf: 'center', width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer', overflow: 'hidden', background: pfp ? 'transparent' : 'var(--color-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  {pfp
                    ? <img src={pfp} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="add" size={30} color="var(--color-white)" />}
                </button>
                <input className="address-input" placeholder="Tên" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ fontSize: 'var(--fs-body)' }} />
                <input className="address-input" placeholder="0x..." value={addr} onChange={e => setAddr(e.target.value)} style={{ fontSize: 'var(--fs-body)' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={resetForm}>Hủy</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!name.trim() || !isValid(addr)} onClick={handleAdd}>Lưu</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
