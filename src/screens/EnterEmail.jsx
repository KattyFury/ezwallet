import { useState } from 'react'
import { useNav } from '../nav'
import { createSession, createEmailToken, getSDK, initializeWallet, executeChallenge, getWalletAddress } from '../circle'
import { t } from '../i18n'

const DOMAINS = ['@gmail.com', '@yahoo.com', '@icloud.com']
const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'
// ✅ Email OTP: đăng nhập phải nhập MÃ gửi về email → chỉ chủ hòm thư vào được (bịt lỗ "ai gõ
// email cũng vào"). Cần SMTP đã khai ở Circle Console (đã xong 2026-07-05). Tắt cờ = false → về
// luồng email trực tiếp cũ (PIN, KHÔNG xác minh email) nếu OTP có sự cố.
// ĐÃ TEST (2026-07-05): user OTP ký bằng Confirmation UI, KHÔNG có PIN → mất lớp chống-người-nhà +
// màn "Contract Interaction" khó hiểu với người già. → TẮT, về Email+PIN. Bật lại khi Circle cho
// social/OTP dùng PIN (hoặc customize confirm UI đẹp hơn). Code OTP giữ nguyên, chỉ đổi cờ này.
const EMAIL_OTP_ENABLED = false

function getEmailHistory() {
  try { return JSON.parse(localStorage.getItem('ez_email_history') || '[]') } catch { return [] }
}

function saveEmailHistory(email) {
  const hist = getEmailHistory().filter(e => e !== email)
  hist.unshift(email)
  localStorage.setItem('ez_email_history', JSON.stringify(hist.slice(0, 5)))
}

export default function EnterEmail() {
  const { navigate } = useNav()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const showDomains = email.length > 0 && !email.includes('@')
  const history = getEmailHistory()
  const suggestions = email.length === 0
    ? history
    : history.filter(e => e.toLowerCase().startsWith(email.toLowerCase()) && e !== email)

  function applyDomain(d) { setEmail(e => e + d); setError('') }

  // Sau khi có userToken (từ OTP): tạo ví (nếu chưa) → challenge (PIN hoặc Approve tuỳ Circle) →
  // lấy địa chỉ → vào Home. User OTP làm mới token bằng refreshToken (như Google), KHÔNG set ez_email.
  async function finishOtpLogin(result, emailStr, deviceId) {
    const { userToken, encryptionKey, refreshToken } = result
    localStorage.setItem('ez_user_token', userToken)
    localStorage.setItem('ez_encryption_key', encryptionKey)
    if (refreshToken) localStorage.setItem('ez_refresh_token', refreshToken)
    localStorage.setItem('ez_google_deviceId', deviceId)   // fingerprint máy — dùng cho refreshSocial
    localStorage.setItem('ez_google_email', emailStr)      // hiển thị "Login email"
    localStorage.setItem('ez_login_method', 'email')
    localStorage.removeItem('ez_email')                    // tránh nhánh PIN-createSession (sai cho user OTP)
    localStorage.removeItem('ez_wallet_addr'); localStorage.removeItem('ez_wallet_id')

    const walletData = await initializeWallet(userToken)
    const challengeId = walletData?.data?.challengeId
    if (challengeId) await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)

    let info = null
    for (let i = 0; i < 3 && !info?.address; i++) {
      info = await getWalletAddress(userToken)
      if (!info?.address) await new Promise(r => setTimeout(r, 2000))
    }
    if (info?.address) localStorage.setItem('ez_wallet_addr', info.address)
    if (info?.walletId) localStorage.setItem('ez_wallet_id', info.walletId)
    saveEmailHistory(emailStr)
    sessionStorage.setItem('ez_pin_ok', '1')   // user OTP không có PIN → bỏ qua cổng PIN
    navigate('HomeSend')
  }

  async function handleSubmit() {
    if (!valid || loading) return
    setLoading(true); setError('')

    if (EMAIL_OTP_ENABLED) {
      const em = email.trim()
      try {
        const sdk = await getSDK()
        const deviceId = await sdk.getDeviceId()
        const { otpToken, deviceToken, deviceEncryptionKey } = await createEmailToken(deviceId, em)
        // Set config + callback rồi mở màn nhập OTP hosted của Circle.
        sdk.updateConfigs(
          { appSettings: { appId: APP_ID }, loginConfigs: { deviceToken, deviceEncryptionKey, otpToken } },
          async (error, result) => {
            if (error) {
              if (error?.code === 155701) { setLoading(false); return }   // user tự hủy → im lặng
              setError(`${error?.message || 'OTP failed'}${error?.code ? ` (${error.code})` : ''}`); setLoading(false); return
            }
            if (!result?.userToken) { setLoading(false); return }
            try { await finishOtpLogin(result, em, deviceId) }
            catch (e) { setError(e.message || t('Có lỗi xảy ra')); setLoading(false) }
          }
        )
        sdk.verifyOtp()   // giữ loading=true; callback ở trên sẽ điều hướng hoặc bật lỗi
      } catch (e) {
        setError(e.message || t('Có lỗi xảy ra')); setLoading(false)
      }
      return
    }

    // ── Luồng cũ (cờ tắt): email trực tiếp + PIN, KHÔNG xác minh email ──
    try {
      localStorage.removeItem('ez_wallet_addr')
      localStorage.removeItem('ez_wallet_id')
      const { userToken, encryptionKey } = await createSession(email.trim())
      localStorage.setItem('ez_user_token', userToken)
      localStorage.setItem('ez_encryption_key', encryptionKey)
      localStorage.setItem('ez_email', email.trim())
      const sdk = await getSDK()
      const walletData = await initializeWallet(userToken)
      const challengeId = walletData?.data?.challengeId
      if (challengeId) await executeChallenge(sdk, userToken, encryptionKey, challengeId)

      const freshSession = await createSession(email.trim())
      const freshToken = freshSession.userToken
      localStorage.setItem('ez_user_token', freshToken)
      localStorage.setItem('ez_encryption_key', freshSession.encryptionKey)

      let walletInfo = null
      for (let i = 0; i < 3; i++) {
        walletInfo = await getWalletAddress(freshToken)
        if (walletInfo?.address) break
        await new Promise(r => setTimeout(r, 2000))
      }
      if (walletInfo?.address) localStorage.setItem('ez_wallet_addr', walletInfo.address)
      if (walletInfo?.walletId) localStorage.setItem('ez_wallet_id', walletInfo.walletId)

      saveEmailHistory(email.trim())
      // Lần 1 = vừa TẠO PIN (có challengeId) → đã xác thực → vào thẳng. Lần 2+ (không challengeId) → cổng PIN.
      if (challengeId) { sessionStorage.setItem('ez_pin_ok', '1'); navigate('HomeSend') }
      else navigate('PinGate', { next: 'HomeSend' })
    } catch (e) {
      setError(e.message || t('Có lỗi xảy ra'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đăng nhập với Email')}
      </div>

      <div className="row-3" style={{ position: 'relative' }}>
        {/* Input khóa vị trí giữa row-5 */}
        <input
          type="email"
          className="address-input"
          placeholder="email@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 52, fontSize: 'var(--fs-md-lg)' }}
        />

        {/* Suggestions hiện absolute bên dưới input — không đẩy input */}
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => { setEmail(s); setError('') }}
                style={{
                  // Trắng + viền xám = tín hiệu BẤM ĐƯỢC (user chốt 07-21; nền xám cũ trông như lõm,
                  // không ai biết bấm được). Bỏ opacity 0.8 cho chữ rõ hẳn.
                  textAlign: 'left', padding: '6px 12px',
                  border: '1.5px solid var(--color-gray)', borderRadius: 10,
                  background: 'var(--color-white)', cursor: 'pointer',
                  fontSize: 'var(--fs-md-lg)', fontFamily: 'inherit', color: 'var(--color-content)',
                  alignSelf: 'flex-start', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Domain suggestions khi gõ phần trước @ */}
        {showDomains && suggestions.length === 0 && (
          // flexWrap: 3 chip @gmail/@yahoo/@icloud ở cỡ chữ 21 KHÔNG đủ chỗ trên 1 hàng (350px) →
          // trước đây tràn khỏi mép phải màn. Cho xuống dòng thay vì cắt/tràn.
          <div style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, right: 0, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {DOMAINS.map(d => (
              <button key={d} onClick={() => applyDomain(d)}
                style={{
                  // Trắng + viền xám = bấm được (đồng bộ với gợi ý email ở trên)
                  padding: '6px 12px', border: '1.5px solid var(--color-gray)', borderRadius: 10,
                  background: 'var(--color-white)', cursor: 'pointer',
                  fontSize: 'var(--fs-md-lg)', fontFamily: 'inherit', color: 'var(--color-content)',
                }}>
                {d}
              </button>
            ))}
          </div>
        )}

        {error && <span style={{ position: 'absolute', top: 'calc(50% + 32px)', left: 0, marginTop: 8, fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('Login')}>{t('Quay lại')}</button>
        <button className="btn btn-primary" disabled={!valid || loading} onClick={handleSubmit}>
          {loading ? t('Đang xử lý...') : t('Tiếp tục')}
        </button>
      </div>
    </div>
  )
}
