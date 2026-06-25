import logoLong from '../../logo-long.png'
import emailIcon from '../../email.png'
import googleIcon from '../../google.png'
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
          Tạo ví bằng email, gửi nhận tiền một cách dễ dàng
        </span>
      </div>

      <div className="row-9 center col" style={{ gap: 12 }}>
        {[
          { icon: emailIcon, label: 'Đăng nhập với Email', primary: true, onClick: () => navigate('EnterEmail') },
          { icon: googleIcon, label: 'Đăng nhập với Google', primary: false, onClick: handleGoogleLogin },
        ].map(({ icon, label, primary, onClick }) => (
          <button key={label} className={`btn ${primary ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={onClick}>
            <img src={icon} alt="" style={{ width: 18, height: 18 }} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
