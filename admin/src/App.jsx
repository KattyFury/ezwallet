import { useEffect, useState } from 'react'
import { NETWORKS } from '../../src/network.js'

// ezwallet admin (admin/SPEC.md). Read-only views + email to one user. Every /api call is behind Cloudflare Access
// AND the server's own ticket check (functions/_middleware.js) - this page holds no secrets.

const TABS = ['Health', 'Stats', 'Users', 'Lookup', 'Announce', 'Mail', 'Log']

async function api(path, opts) {
  const res = await fetch(path, opts)
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { throw new Error(text.slice(0, 200) || `HTTP ${res.status}`) }
  if (!res.ok || body.error) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

function useApi(path, deps) {
  const [state, set] = useState({ loading: true })
  const load = () => {
    set({ loading: true })
    api(path).then(data => set({ data }), e => set({ error: e.message }))
  }
  useEffect(load, deps)
  return [state, load]
}

const fmtTime = t => (t ? new Date(t).toLocaleString() : '')
const short = a => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export default function App() {
  const [net, setNet] = useState('testnet')
  const [tab, setTab] = useState('Health')
  const [lookupQ, setLookupQ] = useState('')   // set by clicking an email in Users
  const openLookup = q => { setLookupQ(q); setTab('Lookup') }

  function pickNet(n) {
    if (n === net) return
    if (n === 'mainnet' && !confirm('Switch to MAINNET - real users and real money?')) return
    setNet(n)
  }

  return (
    <>
      <header className={net}>
        <h1>ezwallet admin</h1>
        <nav>{TABS.map(t => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <div className="seg">
          {['testnet', 'mainnet'].map(n => <button key={n} className={`${n} ${n === net ? 'on' : ''}`} onClick={() => pickNet(n)}>{n}</button>)}
        </div>
      </header>
      <main>
        {tab === 'Health' && <Health net={net} />}
        {tab === 'Stats' && <Stats net={net} />}
        {tab === 'Users' && <Users net={net} onOpen={openLookup} />}
        {tab === 'Lookup' && <Lookup net={net} key={net + lookupQ} initial={lookupQ} />}
        {tab === 'Announce' && <Announce net={net} key={net} />}
        {tab === 'Mail' && <Mail net={net} key={net} />}
        {tab === 'Log' && <Log />}
      </main>
    </>
  )
}

function Status({ ok }) {
  if (ok === true) return <span className="ok">● OK</span>
  if (ok === null) return <span className="warn">● unknown</span>
  return <span className="bad">● problem</span>
}

function Health({ net }) {
  const [s, reload] = useApi(`/api/health?net=${net}`, [net])
  if (s.loading) return <p className="muted">Checking…</p>
  if (s.error) return <p className="err">{s.error}</p>
  const h = s.data
  const rows = [
    ['App (/api/health)', h.site, h.site.detail?.problems?.join('; ')],
    ['Circle API', h.circle],
    ['Arc chain (RPC)', h.chain, h.chain.block ? `block ${h.chain.block}, ${h.chain.ageSec}s ago` : ''],
    ['Email (Resend)', h.mail, h.mail.status],
  ]
  return (
    <div className="card">
      <h2>System health - {net} <button className="btn ghost" onClick={reload}>Re-check</button></h2>
      <table><tbody>
        {rows.map(([name, r, extra]) => (
          <tr key={name}><td>{name}</td><td><Status ok={r.ok} /></td><td className="muted" style={{ whiteSpace: 'normal' }}>{[r.error, extra].filter(Boolean).join(' · ')}</td></tr>
        ))}
      </tbody></table>
      <p className="muted">Checked {fmtTime(h.checkedAt)}</p>
    </div>
  )
}

function Bars({ data }) {
  const max = Math.max(1, ...Object.values(data))
  return (
    <table><tbody>
      {Object.entries(data).map(([k, v]) => (
        <tr key={k}><td className="mono">{k}</td><td style={{ width: '70%' }}><span className="bar" style={{ width: `${(v / max) * 100}%` }} /></td><td>{v}</td></tr>
      ))}
    </tbody></table>
  )
}

function Stats({ net }) {
  const [s, reload] = useApi(`/api/stats?net=${net}`, [net])
  if (s.loading) return <p className="muted">Counting users…</p>
  if (s.error) return <p className="err">{s.error}</p>
  const d = s.data
  const tiles = [['Users', d.total], ['PIN set', d.pinSet], ['Signed up, no PIN', d.pinNotSet], ['Security questions set', d.securityQuestionSet]]
  return (
    <>
      {d.truncated && <p className="err">Only the first {d.total} users were counted (request limit). The real numbers are higher.</p>}
      <div className="card">
        <h2>Users - {net} <button className="btn ghost" onClick={reload}>Refresh</button></h2>
        <div className="grid">{tiles.map(([k, v]) => <div key={k}><div className="num">{v}</div><div className="muted">{k}</div></div>)}</div>
      </div>
      <div className="card"><h2>New users per day (last 14 days)</h2><Bars data={d.byDay} /></div>
      <div className="card"><h2>New users per week (week starting Monday)</h2><Bars data={d.byWeek} /></div>
    </>
  )
}

function Lookup({ net, initial }) {
  const [q, setQ] = useState(initial || '')
  const [s, set] = useState({})
  const explorer = NETWORKS[net].explorer

  function lookup(query) {
    if (!query.trim()) return
    set({ loading: true })
    api(`/api/lookup?net=${net}&q=${encodeURIComponent(query.trim())}`).then(data => set({ data }), err => set({ error: err.message }))
  }
  function run(e) { e.preventDefault(); lookup(q) }
  useEffect(() => { if (initial) lookup(initial) }, [])

  const d = s.data
  return (
    <>
      <form className="row" onSubmit={run}>
        <input placeholder="Email or 0x wallet address" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" disabled={s.loading}>Look up</button>
      </form>
      {s.loading && <p className="muted">Looking up…</p>}
      {s.error && <p className="err">{s.error}</p>}
      {d?.notFound && <p>No {net} user with email <b>{d.email}</b>.</p>}
      {d?.user && (
        <div className="card">
          <h2>{d.email}</h2>
          <table><tbody>
            <tr><td>Created</td><td>{fmtTime(d.user.createDate)}</td></tr>
            <tr><td>Status</td><td>{d.user.status}</td></tr>
            <tr><td>PIN</td><td>{d.user.pinStatus} · wrong attempts: {d.user.pinDetails?.failedAttempts ?? 0}</td></tr>
            <tr><td>Security questions</td><td>{d.user.securityQuestionStatus} · wrong attempts: {d.user.securityQuestionDetails?.failedAttempts ?? 0}</td></tr>
          </tbody></table>
        </div>
      )}
      {d?.kind === 'address' && <p className="muted">Looked up by address - Circle cannot tell which email owns an address.</p>}
      {d?.wallets?.map(w => (
        <div className="card" key={w.address}>
          <h2>Wallet <a className="mono" href={`${explorer}/address/${w.address}`} target="_blank" rel="noreferrer">{w.address}</a></h2>
          <p>{Object.entries(w.balances).map(([sym, v]) => <span key={sym} style={{ marginRight: 24 }}><b>{v ?? '?'}</b> {sym}</span>)}</p>
          {w.transfers?.error ? <p className="err">Transfers: {w.transfers.error}</p> : (
            <table>
              <thead><tr><th>Time</th><th>In/out</th><th>Amount</th><th>Other side</th><th>Tx</th></tr></thead>
              <tbody>{w.transfers.map(t => (
                <tr key={t.hash + t.direction + t.amount}>
                  <td>{fmtTime(t.time)}</td><td>{t.direction === 'in' ? '← in' : '→ out'}</td><td>{t.amount} {t.token}</td>
                  <td className="mono">{short(t.counterparty)}</td>
                  <td><a className="mono" href={`${explorer}/tx/${t.hash}`} target="_blank" rel="noreferrer">{short(t.hash)}</a></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {w.transfers?.length === 0 && <p className="muted">No token transfers.</p>}
        </div>
      ))}
      {d?.user && d.wallets.length === 0 && <p className="muted">This user has no {net} wallet yet.</p>}
      {d?.circleTx?.length > 0 && (
        <div className="card">
          <h2>Circle transactions (latest 20, includes failed/pending)</h2>
          <table>
            <thead><tr><th>Time</th><th>State</th><th>Type</th><th>Fee</th><th>Tx</th></tr></thead>
            <tbody>{d.circleTx.map((t, i) => (
              <tr key={i}>
                <td>{fmtTime(t.time)}</td><td className={t.state === 'COMPLETE' ? 'ok' : t.state === 'FAILED' ? 'bad' : ''}>{t.state}</td>
                <td>{t.type} {t.operation}</td><td>{t.fee}</td>
                <td>{t.hash && <a className="mono" href={`${explorer}/tx/${t.hash}`} target="_blank" rel="noreferrer">{short(t.hash)}</a>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Users({ net, onOpen }) {
  const [s, reload] = useApi(`/api/users?net=${net}`, [net])
  const [filter, setFilter] = useState('')
  if (s.loading) return <p className="muted">Loading users…</p>
  if (s.error) return <p className="err">{s.error}</p>
  const f = filter.trim().toLowerCase()
  const list = s.data.users.filter(u => !f || u.email.toLowerCase().includes(f))
  return (
    <div className="card">
      <h2>{s.data.users.length} {net} users (newest first) <button className="btn ghost" onClick={reload}>Refresh</button></h2>
      {s.data.truncated && <p className="err">Only the first {s.data.users.length} users could be loaded (request limit).</p>}
      <div className="row"><input placeholder="Filter by email" value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <table>
        <thead><tr><th>Email</th><th>Signed up</th><th>PIN</th><th>Wrong PIN</th><th>Security questions</th><th>Status</th></tr></thead>
        <tbody>{list.map(u => (
          <tr key={u.email}>
            <td><a href="#" onClick={e => { e.preventDefault(); onOpen(u.email) }}>{u.email}</a></td>
            <td>{fmtTime(u.created)}</td>
            <td className={u.pin === 'ENABLED' ? 'ok' : 'warn'}>{u.pin === 'ENABLED' ? 'set' : 'not set'}</td>
            <td className={u.pinFails ? 'bad' : ''}>{u.pinFails}</td>
            <td>{u.securityQuestions === 'ENABLED' ? 'set' : 'not set'}</td>
            <td>{u.status}</td>
          </tr>
        ))}</tbody>
      </table>
      {list.length === 0 && <p className="muted">No match.</p>}
    </div>
  )
}

// Broadcast to every user's in-app notification area. ≤ 200 characters, no links (the server enforces both).
function Announce({ net }) {
  const [list, reload] = useApi(`/api/announce?net=${net}`, [net])
  const [text, setText] = useState('')
  const [s, set] = useState({})
  const post = body => api('/api/announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ net, ...body }) })

  function submit(confirmed) {
    set({ ...s, busy: true, error: null })
    post({ action: 'add', text, confirm: confirmed }).then(
      r => { if (confirmed) { set({ sent: true }); setText(''); reload() } else set({ preview: r.preview }) },
      e => set({ ...s, busy: false, error: e.message }))
  }
  function remove(m) {
    if (!confirm(`Take down this announcement?

"${m.text}"

Phones that already received it keep it until it expires (24h) or the user closes it.`)) return
    post({ action: 'remove', id: m.id }).then(reload, e => alert(e.message))
  }

  return (
    <>
      <div className="card">
        <h2>Announce to every {net} user</h2>
        <div className="row"><textarea style={{ minHeight: 90 }} placeholder="Short plain text, no links (e.g. Sending is paused for 10 minutes tonight for maintenance.)" value={text}
          onChange={e => { setText(e.target.value); set({}) }} /></div>
        <p className={text.length > 200 ? 'err' : 'muted'}>{text.length}/200</p>
        {s.error && <p className="err">{s.error}</p>}
        {s.sent && <p className="ok">Published. Open apps pick it up within 5 minutes.</p>}
        {!s.preview && <button className="btn" disabled={s.busy || !text.trim()} onClick={() => submit(false)}>Preview</button>}
        {s.preview && (
          <>
            <p className="muted">How it looks in the app, for <b>{s.preview.to}</b>:</p>
            <div className="preview" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--brand)', background: '#fff', borderStyle: 'solid', borderRadius: 16 }}>
              <span style={{ fontWeight: 700 }}>ⓘ</span><span>{s.preview.text}</span>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className={`btn ${net === 'mainnet' ? 'danger' : ''}`} disabled={s.busy} onClick={() => submit(true)}>Publish to every {net} user</button>
              <button className="btn ghost" disabled={s.busy} onClick={() => set({})}>Edit</button>
            </div>
          </>
        )}
      </div>
      <div className="card">
        <h2>Active announcements (kept 7 days) <button className="btn ghost" onClick={reload}>Refresh</button></h2>
        {list.loading ? <p className="muted">Loading…</p> : list.error ? <p className="err">{list.error}</p> :
          list.data.messages.length === 0 ? <p className="muted">None.</p> : (
            <table><tbody>{list.data.messages.map(m => (
              <tr key={m.id}><td>{fmtTime(m.ts)}</td><td style={{ whiteSpace: 'normal' }}>{m.text}</td><td className="muted">until {fmtTime(m.exp)}</td>
                <td><button className="btn ghost" onClick={() => remove(m)}>Take down</button></td></tr>
            ))}</tbody></table>
          )}
      </div>
    </>
  )
}

function Mail({ net }) {
  const [form, setForm] = useState({ to: '', subject: '', text: '' })
  const [s, set] = useState({})
  const edit = k => e => { setForm({ ...form, [k]: e.target.value }); set({}) }

  function send(confirmed) {
    set({ ...s, busy: true, error: null })
    api('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ net, ...form, confirm: confirmed }) })
      .then(r => set(confirmed ? { sent: true } : { preview: r.preview }), e => set({ ...s, busy: false, error: e.message }))
  }

  if (s.sent) return (
    <div className="card"><p className="ok">Sent to {form.to}.</p>
      <button className="btn ghost" onClick={() => { setForm({ to: '', subject: '', text: '' }); set({}) }}>Write another</button></div>
  )
  return (
    <div className="card">
      <h2>Email one {net} user</h2>
      <div className="row"><input placeholder="Recipient email (must be an ezwallet user)" value={form.to} onChange={edit('to')} /></div>
      <div className="row"><input placeholder="Subject" value={form.subject} onChange={edit('subject')} /></div>
      <div className="row"><textarea placeholder="Message (plain text; a blank line starts a new paragraph)" value={form.text} onChange={edit('text')} /></div>
      {s.error && <p className="err">{s.error}</p>}
      {!s.preview && <button className="btn" disabled={s.busy} onClick={() => send(false)}>Preview</button>}
      {s.preview && (
        <>
          <p className="muted">From {s.preview.from} · to <b>{s.preview.to}</b> · subject <b>{s.preview.subject}</b></p>
          {/* Exactly the HTML that will be emailed. Built by renderMail() on the server, which escapes every input. */}
          <div className="preview" dangerouslySetInnerHTML={{ __html: s.preview.html }} />
          <div className="row" style={{ marginTop: 12 }}>
            <button className={`btn ${net === 'mainnet' ? 'danger' : ''}`} disabled={s.busy} onClick={() => send(true)}>Send to {s.preview.to}</button>
            <button className="btn ghost" disabled={s.busy} onClick={() => set({})}>Edit</button>
          </div>
        </>
      )}
    </div>
  )
}

function Log() {
  const [s, reload] = useApi('/api/log', [])
  if (s.loading) return <p className="muted">Loading…</p>
  if (s.error) return <p className="err">{s.error}</p>
  return (
    <div className="card">
      <h2>Admin actions (latest 50) <button className="btn ghost" onClick={reload}>Refresh</button></h2>
      {s.data.entries.length === 0 ? <p className="muted">Nothing yet.</p> : (
        <table>
          <thead><tr><th>Time</th><th>By</th><th>Action</th><th>Network</th><th>To</th><th>Subject</th><th>Result</th></tr></thead>
          <tbody>{s.data.entries.map((e, i) => (
            <tr key={i}><td>{fmtTime(e.at)}</td><td>{e.by}</td><td>{e.action}</td><td>{e.net}</td><td>{e.to}</td><td>{e.subject}</td>
              <td className={e.ok ? 'ok' : 'bad'}>{e.ok ? 'sent' : e.error}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}
