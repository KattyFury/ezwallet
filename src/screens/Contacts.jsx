import { useState } from 'react'
import { useNav } from '../nav'
import addWhiteIcon from '../../icon/add-white.png'

function loadContacts() {
  try { return JSON.parse(localStorage.getItem('ez_contacts') || '[]') } catch { return [] }
}

function saveContacts(list) {
  localStorage.setItem('ez_contacts', JSON.stringify(list))
}

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

function avatar(name) {
  const c = name?.trim()[0]?.toUpperCase() || '?'
  const colors = ['#16A34A', '#2775CA', '#F7931A', '#1A56DB', '#DC2626']
  const i = name.charCodeAt(0) % colors.length
  return { letter: c, color: colors[i] }
}

export default function Contacts() {
  const { navigate } = useNav()
  const [contacts, setContacts] = useState(loadContacts)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [addr, setAddr] = useState('')

  function handleAdd() {
    if (!name.trim() || !isValid(addr)) return
    const updated = [...contacts, { id: Date.now(), name: name.trim(), address: addr.trim() }]
    setContacts(updated); saveContacts(updated)
    setAdding(false); setName(''); setAddr('')
  }

  function handleDelete(id) {
    const updated = contacts.filter(c => c.id !== id)
    setContacts(updated); saveContacts(updated)
  }

  return (
    <div className="screen">
      <div className="row-1 center" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        Danh bạ
      </div>

      <div className="row-2-8" style={{ width: '100%', overflowY: 'auto', justifyContent: contacts.length ? 'flex-start' : 'center' }}>
        {contacts.length === 0 && !adding ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Chưa có danh bạ</span>
        ) : (
          contacts.map(c => {
            const av = avatar(c.name)
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 0', borderBottom: '1px solid var(--color-gray)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                  {av.letter}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)' }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{c.address.slice(0, 8)}...{c.address.slice(-6)}</div>
                </div>
                <button onClick={() => navigate('SendAmount', { address: c.address, name: c.name })}
                  className="btn btn-primary" style={{ height: 32, padding: '0 12px', fontSize: 'var(--fs-label)' }}>
                  Gửi
                </button>
                <button onClick={() => handleDelete(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-muted)', padding: '0 4px' }}>
                  ×
                </button>
              </div>
            )
          })
        )}

      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>Quay lại</button>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => setAdding(true)}>
          <img src={addWhiteIcon} alt="" style={{ width: 18, height: 18 }} />Thêm
        </button>
      </div>

      {/* Popup thêm danh bạ — neo ở nửa trên (hàng 1-5), tránh bàn phím iPhone che nửa dưới */}
      {adding && (
        <div
          onClick={() => setAdding(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12dvh' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '88%', maxWidth: 360, background: 'var(--color-white)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)', textAlign: 'center' }}>Thêm danh bạ</div>
            <input className="address-input" placeholder="Tên" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ fontSize: 'var(--fs-body)' }} />
            <input className="address-input" placeholder="0x..." value={addr} onChange={e => setAddr(e.target.value)} style={{ fontSize: 'var(--fs-body)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setAdding(false); setName(''); setAddr('') }}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!name.trim() || !isValid(addr)} onClick={handleAdd}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
