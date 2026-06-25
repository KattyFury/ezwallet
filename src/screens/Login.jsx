import logoLong from '../../logo-long.png'
import mailWhite from '../../mail-white.png'
import { useNav } from '../nav'
import { getSDK, createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID } from '../circle'

export default function Login() {
  const { navigate } = useNav()

  async function handleGoogleLogin() {
    try {
      const sdk = getSDK()

      // Lấy deviceId từ SDK
      const deviceId = sdk.getDeviceId ? sdk.getDeviceId() : crypto.randomUUID()

      // Lấy device token từ Circle
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)

      // Khởi tạo SDK với Google config
      sdk.init({
        appSettings: { appId: '518fec6a-4680-5175-9de6-0810fb3dfd04' },
        loginConfigs: {
          deviceToken,
          deviceEncryptionKey,
          google: {
            clientId: GOOGLE_CLIENT_ID,
            redirectUri: window.location.origin,
          },
        },
      }, async (err, result) => {
        if (err || !result?.userToken) return
        const { userToken, encryptionKey } = result

        localStorage.setItem('ez_user_token', userToken)
        localStorage.setItem('ez_encryption_key', encryptionKey)
        localStorage.removeItem('ez_wallet_addr')
        localStorage.removeItem('ez_wallet_id')

        // Khởi tạo ví
        const walletData = await initializeWallet(userToken)
        const challengeId = walletData?.data?.challengeId
        if (challengeId) await executeChallenge(sdk, userToken, encryptionKey, challengeId)

        // Lấy fresh token
        const freshResp = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'socialToken', deviceId }),
        })
        // Lấy wallet address
        let walletInfo = null
        for (let i = 0; i < 3; i++) {
          walletInfo = await getWalletAddress(userToken)
          if (walletInfo?.address) break
          await new Promise(r => setTimeout(r, 2000))
        }
        if (walletInfo?.address) localStorage.setItem('ez_wallet_addr', walletInfo.address)
        if (walletInfo?.walletId) localStorage.setItem('ez_wallet_id', walletInfo.walletId)

        navigate('HomeSend')
      })

      // Trigger Google OAuth
      sdk.performLogin('google')
    } catch (e) {
      console.error('Google login error:', e)
    }
  }

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: 12 }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
          Công nghệ mới, trải nghiệm quen thuộc
        </span>
      </div>

      <div className="row-9 center col" style={{ gap: 12 }}>
        <button className="btn btn-primary" style={{ width: '75%' }} onClick={() => navigate('EnterEmail')}>
          <img src={mailWhite} alt="" style={{ width: 18, height: 18, marginRight: 8, verticalAlign: 'middle' }} />
          Đăng nhập với Email
        </button>
        <button className="btn btn-secondary" style={{ width: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Đăng nhập với Google
        </button>
      </div>
    </div>
  )
}
