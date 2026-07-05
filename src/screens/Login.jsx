import logoLong from '../../design/logo.svg'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import React, { useState, useEffect, useRef } from 'react'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID } from '../circle'
import { t } from '../i18n'

const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'

// Dịch mã lỗi Circle → thông báo rõ nguyên nhân (thay vì chuỗi "Failed to validate..."
// khó hiểu). 155140 gần như luôn là redirect URI chưa được allowlist ở Circle Console
// hoặc origin chưa đăng ký ở Google Cloud Console — KHÔNG phải bug code (đã verify với
// SDK 1.1.11 source). Log full object để lần test trên deploy đọc được mã thật.
function googleErrMsg(error) {
  console.error('[GoogleLogin]', error?.code, error, JSON.stringify(error || {}))
  const code = error?.code
  if (code === 155140) return `Google sign-in bị Circle từ chối (mã 155140). Nguyên nhân gần như chắc chắn: origin "${window.location.origin}" chưa được thêm vào allowlist redirect URI ở Circle Console và/hoặc Authorized origins ở Google Cloud Console (clientId).`
  if (code === 155706) return 'Lỗi mạng khi xác thực với Circle (mã 155706). Thử lại.'
  return error?.message || 'Google sign-in failed'
}
// Config cần cho SDK rehydrate sau redirect — lưu/xóa qua COOKIES (sống qua full page reload
// của OAuth redirect; sessionStorage KHÔNG sống → đó là root cause lỗi 155140, theo Circle support).
const COOKIE_KEYS = ['appId', 'google.clientId', 'deviceToken', 'deviceEncryptionKey']

export default function Login() {
  const { navigate } = useNav()
  const sdkRef = useRef(null)
  const [restoring, setRestoring] = useState(false)  // đang hoàn tất sau redirect
  const [googleErr, setGoogleErr] = useState('')

  // deviceId PHẢI lấy qua sdk.getDeviceId() (Circle tự fingerprint qua iframe riêng) — KHÔNG
  // được tự bịa (vd crypto.randomUUID()), vì Circle backend không biết tới ID tự chế → lỗi
  // "Provided device ID is not found in the system" khi performLogin. Theo đúng mẫu Circle Web
  // quickstart 3.4: gọi 1 lần, cache vào localStorage để không phải xin lại mỗi lần bấm nút.
  async function ensureDeviceId(sdk) {
    let id = localStorage.getItem('ez_google_deviceId')
    if (id) return id
    id = await sdk.getDeviceId()
    localStorage.setItem('ez_google_deviceId', id)
    return id
  }

  // Khởi tạo SDK 1 lần lúc mount với config restore từ cookies + callback onLoginComplete.
  // Lần đầu (cookies rỗng) → vô hại. Sau redirect Google (cookies còn + URL có hash token)
  // → SDK constructor tự đọc hash và gọi onLoginComplete để hoàn tất đăng nhập.
  useEffect(() => {
    const onLoginComplete = async (error, result) => {
      COOKIE_KEYS.forEach(k => deleteCookie(k))   // deviceToken dùng 1 lần → dọn ngay
      if (error) { setGoogleErr(googleErrMsg(error)); setRestoring(false); return }
      if (!result?.userToken) { setRestoring(false); return }
      try {
        const { userToken, encryptionKey, refreshToken, oAuthInfo } = result
        localStorage.setItem('ez_user_token', userToken)
        localStorage.setItem('ez_encryption_key', encryptionKey)
        // ⚠️ userToken Circle chỉ sống 60 PHÚT (dùng cho challenge PIN). User Google KHÔNG có
        // ez_email nên refreshSession() cũ KHÔNG làm mới được → sau 1h mọi thao tác PIN (Đổi PIN,
        // gửi tiền) trả 403 Forbidden. FIX: LƯU refreshToken (Circle trả sẵn) → refreshSession()
        // đổi lấy userToken mới qua POST /users/token/refresh. ĐỪNG vứt refreshToken nữa.
        if (refreshToken) localStorage.setItem('ez_refresh_token', refreshToken)
        localStorage.setItem('ez_login_method', 'google')
        // Circle CÓ trả email Google trong oAuthInfo.socialUserInfo.email — lưu RIÊNG (KHÔNG ghi
        // vào ez_email, vì ez_email điều khiển luồng refresh email-login = danh tính KHÁC). Chỉ để
        // hiển thị "Login email" thay vì "…".
        const gEmail = oAuthInfo?.socialUserInfo?.email
        if (gEmail) localStorage.setItem('ez_google_email', gEmail)
        localStorage.removeItem('ez_wallet_addr')
        localStorage.removeItem('ez_wallet_id')

        // Tạo ví (nếu chưa có) → challenge đặt PIN lần đầu
        const walletData = await initializeWallet(userToken)
        const challengeId = walletData?.data?.challengeId
        if (challengeId) await executeChallenge(sdkRef.current, userToken, encryptionKey, challengeId)

        // Địa chỉ ví có thể provision chậm → thử vài lần
        let info = null
        for (let i = 0; i < 3 && !info?.address; i++) {
          info = await getWalletAddress(userToken)
          if (!info?.address) await new Promise(r => setTimeout(r, 2000))
        }
        if (info?.address) localStorage.setItem('ez_wallet_addr', info.address)
        if (info?.walletId) localStorage.setItem('ez_wallet_id', info.walletId)

        sessionStorage.setItem('ez_pin_ok', '1')   // user Google không có PIN → bỏ qua cổng PIN
        navigate('HomeSend')
      } catch (e) {
        setGoogleErr(e.message || t('Có lỗi xảy ra')); setRestoring(false)
      }
    }

    const sdk = new W3SSdk({
      appSettings: { appId: getCookie('appId') || APP_ID },
      loginConfigs: {
        deviceToken: getCookie('deviceToken') || '',
        deviceEncryptionKey: getCookie('deviceEncryptionKey') || '',
        google: {
          clientId: getCookie('google.clientId') || GOOGLE_CLIENT_ID,
          redirectUri: window.location.origin,
          selectAccountPrompt: true,
        },
      },
    }, onLoginComplete)
    sdkRef.current = sdk

    // Đang quay lại từ redirect (URL có token) → hiện trạng thái "đang đăng nhập"
    if (/access_token|id_token|code=/.test(window.location.hash + window.location.search)) setRestoring(true)
    else ensureDeviceId(sdk).catch(() => {})   // xin trước cho đỡ trễ lúc bấm nút (không phải lúc restore)
  }, [])

  async function handleGoogleLogin() {
    setGoogleErr('')
    try {
      const sdk = sdkRef.current
      const deviceId = await ensureDeviceId(sdk)
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)
      // Lưu config vào COOKIES để SDK rehydrate sau redirect (theo Circle Web quickstart 3.6)
      setCookie('appId', APP_ID)
      setCookie('google.clientId', GOOGLE_CLIENT_ID)
      setCookie('deviceToken', deviceToken)
      setCookie('deviceEncryptionKey', deviceEncryptionKey)

      sdk.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken, deviceEncryptionKey,
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin, selectAccountPrompt: true },
        },
      })
      sdk.performLogin('Google')  // = SocialLoginProvider.GOOGLE ('Google')
    } catch (e) {
      setGoogleErr(googleErrMsg(e))
    }
  }

  // ⚠️ Google login DISABLED (2026-07-03, user chốt sau session 10). Bản thân login CHẠY ĐƯỢC
  // (OAuth redirect + tạo ví SSO + PIN đều ok), nhưng Circle CHẶN đổi PIN cho user SSO ở tầng
  // platform: PUT /user/pin → 403 code 3 dù token tươi + pinStatus ENABLED (verify bằng gọi API
  // thật). User quyết định tắt tới khi có hướng xử lý (hoặc Circle mở, hoặc chuyển kiến trúc
  // lấy email từ Google Identity Services rồi đi luồng email — xem HANDOFF session 8).
  // Bật lại: disabled: true → false. TOÀN BỘ hạ tầng (cookies, deviceId, refreshToken) giữ nguyên.
  const BUTTONS = [
    { icon: <Icon name="mail" size={22} />, label: 'Đăng nhập với Email', primary: true, onClick: () => navigate('EnterEmail'), disabled: false },
    { icon: <Icon name="google" size={22} />, label: 'Đăng nhập với Google', primary: false, onClick: handleGoogleLogin, disabled: true },
  ]

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: '3dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center' }}>
          {t('Tạo ví bằng email, gửi nhận tiền')}<br />{t('một cách dễ dàng')}
        </span>
      </div>

      <div style={{ gridRow: '6 / 11', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '2dvh', paddingBottom: '7dvh' }}>
        {restoring && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{t('Đang xử lý...')}</span>
        )}
        {googleErr && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center', maxWidth: '80%' }}>{googleErr}</span>
        )}
        {BUTTONS.map(({ icon, label, primary, onClick, disabled }) => (
          <button key={label} className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '80%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled}
            onClick={disabled ? undefined : onClick}>
            {icon}
            <span style={{ whiteSpace: 'nowrap' }}>{t(label)}</span>
          </button>
        ))}
        <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)', textAlign: 'center', maxWidth: '85%' }}>
          Google sign-in is temporarily unavailable.
        </span>
      </div>
    </div>
  )
}
