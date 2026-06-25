import logoLong from '../../design/logo-long.png'
import emailIcon from '../../icon/email.png'
import googleIcon from '../../icon/google.png'
import { useNav } from '../nav'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'
import { createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID } from '../circle'

const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'

export default function Login() {
  const { navigate } = useNav()

  async function handleGoogleLogin() {
    try {
      const deviceId = crypto.randomUUID()

      // Lấy device token từ Circle backend
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)

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

      // Đúng theo Circle docs: performLogin nhận deviceToken + deviceEncryptionKey
      googleSdk.performLogin(deviceToken, deviceEncryptionKey)
    } catch (e) {
      console.error('Google login error:', e)
    }
  }

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: '4dvh' }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center' }}>
          Tạo ví bằng email, gửi nhận tiền<br />một cách dễ dàng
        </span>
      </div>

      <div className="row-9 center col" style={{ gap: '2dvh' }}>
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
