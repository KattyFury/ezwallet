import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import { accountId, passcodeStatus, passcodeSet, passcodeVerify, passcodeReset, getSDK, createEmailToken } from '../circle'

// KHOÁ MỞ VÍ (app passcode 4 số, lưu server). Bịt lỗ "gõ email người khác để soi tiền" — phải
// nhập passcode sau login, mọi máy. Quên → xác minh email qua OTP (Circle SMTP) → đặt lại.
// Ký giao dịch vẫn do Circle (PIN/Confirmation UI) — đây chỉ là lớp truy cập của app.
const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'

export default function Passcode() {
  const { navigate, params } = useNav()
  const next = params?.next || 'HomeSend'
  const uid = accountId()

  const [mode, setMode] = useState('loading')   // loading | enter | set | reset
  const [stage, setStage] = useState('first')    // set/reset: first → confirm
  const [code, setCode] = useState('')
  const [firstCode, setFirstCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) { finish(); return }
    passcodeStatus(uid).then(s => {
      if (s?.unavailable) { finish(); return }   // KV chưa cấu hình → fail-open (chưa khoá)
      setMode(s?.hasPasscode ? 'enter' : 'set')
    }).catch(() => finish())
  }, [])

  function finish() {
    sessionStorage.setItem('ez_passcode_ok', '1')
    navigate(next)
  }

  function onKey(k) {
    if (busy) return
    setError('')
    if (k === 'BACK') { setCode(c => c.slice(0, -1)); return }
    if (k === '.') return
    if (code.length >= 6) return
    const nc = code + k
    setCode(nc)
    if (nc.length === 6) submit(nc)
  }

  async function submit(nc) {
    setBusy(true)
    try {
      if (mode === 'enter') {
        const r = await passcodeVerify(uid, nc)
        if (r?.ok) return finish()
        setCode(''); setBusy(false)
        if (r?.locked) setError('Too many wrong tries. Locked for 30 minutes.')
        else setError(`Wrong passcode${r?.remaining != null ? ` · ${r.remaining} left` : ''}`)
        return
      }
      // set | reset
      if (stage === 'first') { setFirstCode(nc); setCode(''); setStage('confirm'); setBusy(false); return }
      if (nc !== firstCode) { resetEntry('Codes do not match, try again'); return }
      const r = mode === 'reset' ? await passcodeReset(uid, nc) : await passcodeSet(uid, nc)
      if (r?.ok) return finish()
      resetEntry(r?.error === 'already_set' ? 'Passcode already exists' : 'Could not save passcode')
    } catch (e) { resetEntry(e.message || 'Error') }
  }
  function resetEntry(msg) { setError(msg); setCode(''); setFirstCode(''); setStage('first'); setBusy(false) }

  // Quên passcode → xác minh EMAIL qua OTP (chứng minh chủ hòm thư) → cho đặt lại.
  async function handleForgot() {
    setError(''); setInfo('')
    try {
      const sdk = getSDK()
      const deviceId = await sdk.getDeviceId()
      const { otpToken, deviceToken, deviceEncryptionKey } = await createEmailToken(deviceId, uid)
      setInfo('Enter the code sent to your email to reset your passcode.')
      sdk.updateConfigs(
        { appSettings: { appId: APP_ID }, loginConfigs: { deviceToken, deviceEncryptionKey, otpToken } },
        (err, result) => {
          if (err) { if (err?.code !== 155701) setError(`${err?.message || 'OTP failed'}${err?.code ? ` (${err.code})` : ''}`); return }
          if (!result?.userToken) return
          // Email đã xác minh → chuyển sang đặt passcode MỚI (reset)
          setInfo(''); setMode('reset'); setStage('first'); setCode(''); setFirstCode('')
        }
      )
      sdk.verifyOtp()
    } catch (e) { setError(e.message || 'Error') }
  }

  const title = mode === 'enter' ? 'Enter passcode'
    : mode === 'reset' ? (stage === 'first' ? 'Set a new passcode' : 'Confirm new passcode')
    : (stage === 'first' ? 'Create a passcode' : 'Confirm passcode')
  const sub = mode === 'enter' ? 'Unlock your wallet'
    : stage === 'first' ? '6 digits · locks your wallet on every device' : 'Enter it again'

  if (mode === 'loading') return <div className="screen" />

  return (
    <div className="screen">
      <div className="row-2-3 center col" style={{ gap: 10 }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>{title}</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center', padding: '0 20px' }}>{sub}</div>
      </div>

      <div className="row-4 center">
        <div className="pin-dots">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={`pin-dot${i < code.length ? ' filled' : ''}${error ? ' error' : ''}`} />)}
        </div>
      </div>

      <div className="row-5 center" style={{ minHeight: 22, padding: '0 16px' }}>
        {error && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
        {!error && info && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>{info}</span>}
      </div>

      <div style={{ gridRow: '7 / 11', marginTop: '-5dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 2.5, minHeight: 0 }}><Numpad onKey={onKey} /></div>
        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mode === 'enter' && (
            <button className="btn btn-secondary" style={{ width: '50%' }} onClick={handleForgot}>Forgot?</button>
          )}
        </div>
      </div>
    </div>
  )
}
