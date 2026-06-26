import logoLong from '../../design/logo-long.png'
import emailIcon from '../../icon/email.png'
import googleIcon from '../../icon/google.png'
import { useNav } from '../nav'
import React, { useState, useEffect } from 'react'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'
import { createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID } from '../circle'

const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'

export default function Login() {
  const { navigate } = useNav()

  // Restore Google OAuth sau redirect
  const [restoring, setRestoring] = useState(false)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token') && !hash.includes('id_token')) return
    const deviceToken = sessionStorage.getItem('ez_google_deviceToken')
    const deviceEncryptionKey = sessionStorage.getItem('ez_google_deviceEncKey')
    if (!deviceToken || !deviceEncryptionKey) return

    setRestoring(true)
    // Dùng đúng deviceToken gốc — Circle cần match token với session đã bắt đầu
    const googleSdk = new W3SSdk(
      {
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken, deviceEncryptionKey,
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin, selectAccountPrompt: true },
        },
      },
      async (err, result) => {
        sessionStorage.removeItem('ez_google_deviceId')
        sessionStorage.removeItem('ez_google_deviceToken')
        sessionStorage.removeItem('ez_google_deviceEncKey')
        if (err || !result?.userToken) { setRestoring(false); return }
        const { userToken, encryptionKey } = result
        localStorage.setItem('ez_user_token', userToken)
        localStorage.setItem('ez_encryption_key', encryptionKey)
        localStorage.removeItem('ez_wallet_addr')
        localStorage.removeItem('ez_wallet_id')
        const walletData = await initializeWallet(userToken)
        const challengeId = walletData?.data?.challengeId
        if (challengeId) await executeChallenge(googleSdk, userToken, encryptionKey, challengeId)
        const freshSession = await createSocialToken(sessionStorage.getItem('ez_google_deviceId') || crypto.randomUUID()).catch(() => null)
        let walletInfo = null
        for (let i = 0; i < 3; i++) {
          walletInfo = await getWalletAddress(userToken)
          if (walletInfo?.address) break
          await new Promise(r => setTimeout(r, 2000))
        }
        if (walletInfo?.address) localStorage.setItem('ez_wallet_addr', walletInfo.address)
        if (walletInfo?.walletId) localStorage.setItem('ez_wallet_id', walletInfo.walletId)
        navigate('HomeSend')
      }
    )
    // Sau redirect: SDK constructor tự gọi execSocialLoginStatusCheck() đọc hash + socialLoginProvider
    // từ localStorage → xử lý callback. KHÔNG gọi performLogin (sẽ tạo redirect mới).
  }, [])

  async function handleGoogleLogin() {
    try {
      const deviceId = crypto.randomUUID()

      // Lấy device token từ Circle backend
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)

      // Lưu vào sessionStorage để restore sau redirect
      sessionStorage.setItem('ez_google_deviceId', deviceId)
      sessionStorage.setItem('ez_google_deviceToken', deviceToken)
      sessionStorage.setItem('ez_google_deviceEncKey', deviceEncryptionKey)

      // Tạo SDK MỚI với loginConfigs trong constructor — đúng theo Circle docs
      const googleSdk = new W3SSdk(
        {
          appSettings: { appId: APP_ID },
          loginConfigs: {
            deviceToken,
            deviceEncryptionKey,
            google: {
              clientId: GOOGLE_CLIENT_ID,
              redirectUri: window.location.origin,
              selectAccountPrompt: true,
            },
          },
        },
        async (err, result) => {
          if (err) { console.error('Google login callback error:', err); return }
          if (!result?.userToken) return
          const { userToken, encryptionKey } = result

          localStorage.setItem('ez_user_token', userToken)
          localStorage.setItem('ez_encryption_key', encryptionKey)
          localStorage.removeItem('ez_wallet_addr')
          localStorage.removeItem('ez_wallet_id')

          const walletData = await initializeWallet(userToken)
          const challengeId = walletData?.data?.challengeId
          if (challengeId) await executeChallenge(googleSdk, userToken, encryptionKey, challengeId)

          const freshSession = await createSocialToken(deviceId).catch(() => null)
          const freshToken = freshSession ? freshSession.userToken || userToken : userToken

          let walletInfo = null
          for (let i = 0; i < 3; i++) {
            walletInfo = await getWalletAddress(userToken)
            if (walletInfo?.address) break
            await new Promise(r => setTimeout(r, 2000))
          }
          if (walletInfo?.address) localStorage.setItem('ez_wallet_addr', walletInfo.address)
          if (walletInfo?.walletId) localStorage.setItem('ez_wallet_id', walletInfo.walletId)
          navigate('HomeSend')
        }
      )

      // performLogin nhận 1 tham số = provider (theo SDK source: performLogin(provider))
      googleSdk.performLogin('Google')
    } catch (e) {
      console.error('Google login error:', e)
    }
  }

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: '3dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center' }}>
          Tạo ví bằng email, gửi nhận tiền<br />một cách dễ dàng
        </span>
      </div>

      <div style={{ gridRow: '6 / 11', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '2dvh', paddingBottom: '7dvh' }}>
        {[
          { icon: emailIcon, label: 'Đăng nhập với Email', primary: true, onClick: () => navigate('EnterEmail'), disabled: false },
          { icon: googleIcon, label: 'Đăng nhập với Google', primary: false, onClick: handleGoogleLogin, disabled: true },
        ].map(({ icon, label, primary, onClick, disabled }) => (
          <button key={label} className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '75%', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled}
            onClick={disabled ? undefined : onClick}>
            {/* inner-block width cố định theo nút dài nhất (Facebook) → icon + text thẳng cột */}
            <span style={{ display: 'grid', gridTemplateColumns: '18px 1fr', columnGap: 10, alignItems: 'center', width: 210, textAlign: 'left' }}>
              <img src={icon} alt="" style={{ width: 18, height: 18 }} />
              <span>{label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
