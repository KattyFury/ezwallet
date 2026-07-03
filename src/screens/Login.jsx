import logoLong from '../../design/logo.svg'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import React, { useState, useEffect, useRef } from 'react'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID } from '../circle'
import { t } from '../i18n'

const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'
// Config cần cho SDK rehydrate sau redirect — lưu/xóa qua COOKIES (sống qua full page reload
// của OAuth redirect; sessionStorage KHÔNG sống → đó là root cause lỗi 155140, theo Circle support).
const COOKIE_KEYS = ['appId', 'google.clientId', 'deviceToken', 'deviceEncryptionKey']

export default function Login() {
  const { navigate } = useNav()
  const sdkRef = useRef(null)
  const [restoring, setRestoring] = useState(false)  // đang hoàn tất sau redirect
  const [googleErr, setGoogleErr] = useState('')

  // Khởi tạo SDK 1 lần lúc mount với config restore từ cookies + callback onLoginComplete.
  // Lần đầu (cookies rỗng) → vô hại. Sau redirect Google (cookies còn + URL có hash token)
  // → SDK constructor tự đọc hash và gọi onLoginComplete để hoàn tất đăng nhập.
  useEffect(() => {
    const onLoginComplete = async (error, result) => {
      COOKIE_KEYS.forEach(k => deleteCookie(k))   // deviceToken dùng 1 lần → dọn ngay
      if (error) { setGoogleErr(error.message || 'Google sign-in failed'); setRestoring(false); return }
      if (!result?.userToken) { setRestoring(false); return }
      try {
        const { userToken, encryptionKey } = result
        localStorage.setItem('ez_user_token', userToken)
        localStorage.setItem('ez_encryption_key', encryptionKey)
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

        navigate(localStorage.getItem('ez_onboarded') ? 'HomeSend' : 'Onboarding')
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
  }, [])

  async function handleGoogleLogin() {
    setGoogleErr('')
    try {
      const deviceId = crypto.randomUUID()
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)
      // Lưu config vào COOKIES để SDK rehydrate sau redirect (theo Circle Web quickstart 3.6)
      setCookie('appId', APP_ID)
      setCookie('google.clientId', GOOGLE_CLIENT_ID)
      setCookie('deviceToken', deviceToken)
      setCookie('deviceEncryptionKey', deviceEncryptionKey)

      const sdk = sdkRef.current
      sdk.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken, deviceEncryptionKey,
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin, selectAccountPrompt: true },
        },
      })
      sdk.performLogin('Google')  // = SocialLoginProvider.GOOGLE ('Google')
    } catch (e) {
      setGoogleErr(e.message || 'Google sign-in failed')
    }
  }

  const BUTTONS = [
    { icon: <Icon name="mail" size={22} />, label: 'Đăng nhập với Email', primary: true, onClick: () => navigate('EnterEmail'), disabled: false },
    { icon: <Icon name="google" size={22} />, label: 'Đăng nhập với Google', primary: false, onClick: handleGoogleLogin, disabled: false },
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
      </div>
    </div>
  )
}
