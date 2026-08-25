import { useState } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import { getSDK, executeChallenge, resetPinChallenge, refreshSession, circleErrorMessage } from '../circle'

export default function Security() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  // ⚠️ pinErr là CỜ RIÊNG, đừng quay lại dò chữ đầu câu (`/^(Error|Lỗi)/`) như bản cũ: chữ đổi
  // theo ngôn ngữ nên dò chữ là hỏng tô màu ngay khi dịch sang tiếng khác (bug suýt dính 08-04).
  const [pinStatus, setPinStatus] = useState('')
  const [pinErr, setPinErr] = useState(false)
  function showStatus(msg, isErr = false) { setPinStatus(msg); setPinErr(isErr) }

  async function handleResetPin() {
    // User Google (SSO, không có ez_email): Circle chặn PUT /user/pin ở tầng platform
    // (403 code 3 dù token tươi + PIN tồn tại — verify session 10). Không gọi cho đỡ tốn 1 vòng lỗi.
    if (!localStorage.getItem('ez_email')) {
      showStatus('Not available for Google accounts', true)
      setTimeout(() => showStatus(''), 3000)
      return
    }
    showStatus('Preparing...')
    try {
      // Làm mới userToken trước — tránh "userToken had expired" (Circle token ~1h).
      const { userToken, encryptionKey } = await refreshSession()
      const challengeId = await resetPinChallenge(userToken)
      showStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, challengeId)
      showStatus('PIN changed!')
      setTimeout(() => showStatus(''), 2000)
    } catch (e) {
      showStatus(circleErrorMessage(e), true)
    }
  }

  const email = localStorage.getItem('ez_email') || localStorage.getItem('ez_google_email') || '…'
  const walletAddr = localStorage.getItem('ez_wallet_addr') || '…'
  const shortAddr = walletAddr !== '…' ? walletAddr.slice(0, 10) + '...' + walletAddr.slice(-6) : '…'

  function copyAddr() {
    navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  // VALUE lên fs-item 17 (user 07-17f: "nội dung hơi nhỏ" — trước fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-all' }
  // (Trạng thái đổi PIN: LỖI phải ĐỎ cho bật — user 07-17f. Cờ pinErr khai ở trên.)

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Security
      </div>

      {/* BOX XÁM chung hàng 2-4 (tách Language & Currency ra màn riêng 08-04 — xem Language.jsx);
          trong box KHÔNG line xám ngăn cách (luật cũ giữ). Đổi PIN vẫn dùng CHEVRON PHẢI right2
          (user chốt: nó là hàng đi tiếp, không phải dropdown). */}
      <div style={{ gridRow: '2 / 5', background: 'var(--color-surface)', borderRadius: 20, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        <div className="menu-item">
          <span style={LABEL}>Login email</span>
          <span style={VALUE}>{email}</span>
        </div>
        <button className="menu-item" onClick={copyAddr}>
          <span style={LABEL}>Wallet address</span>
          <span style={{ ...VALUE, color: copied ? 'var(--color-primary)' : 'var(--color-muted)' }}>{copied ? 'Copied' : shortAddr}</span>
          <Icon name="copy" size="var(--is-item)" color="var(--color-brand)" />
        </button>
        <button className="menu-item" onClick={handleResetPin}>
          <span style={LABEL}>Change PIN</span>
          {pinStatus
            ? <span style={{ fontSize: 'var(--fs-item)', color: pinErr ? 'var(--color-error)' : 'var(--color-primary)' }}>{pinStatus}</span>
            : <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
        </button>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
