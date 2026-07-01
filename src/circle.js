import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'

let sdk = null

const VI = {
  enterPincode: {
    headline: 'Xác nhận giao dịch',
    headline2: '',
    subhead: 'Nhập mã PIN 6 chữ số của bạn',
    forgotPin: 'Quên PIN?',
  },
  newPincode: {
    headline: 'Tạo mã PIN',
    headline2: 'Xác nhận mã PIN',
    subhead: 'Mã PIN 6 chữ số bảo vệ ví của bạn',
  },
  recoverPincode: {
    headline: 'Khôi phục PIN',
    headline2: 'Trả lời câu hỏi bảo mật',
    subhead: 'Nhập câu trả lời để đặt lại PIN',
    answerInputHeader: 'Câu trả lời',
    answerInputPlaceholder: 'Nhập câu trả lời',
  },
  securityIntros: {
    headline: 'Thiết lập bảo mật',
    headline2: 'Bảo vệ tài khoản của bạn',
    description: 'Chọn câu hỏi bảo mật để khôi phục PIN khi cần',
    link: 'Tìm hiểu thêm',
  },
  securityQuestions: {
    title: 'Câu hỏi bảo mật',
    questionHeader: 'Câu hỏi',
    questionPlaceholder: 'Chọn câu hỏi',
    answerHeader: 'Câu trả lời',
    answerPlaceholder: 'Nhập câu trả lời',
    answerHintHeader: 'Gợi ý (tuỳ chọn)',
    answerHintPlaceholder: 'Nhập gợi ý',
  },
  securityConfirm: {
    title: 'Xác nhận bảo mật',
    headline: 'Xác nhận câu trả lời',
    inputHeadline: 'Nhập lại câu trả lời',
    inputPlaceholder: 'Xác nhận câu trả lời',
    inputMatch: 'Câu trả lời khớp ✓',
  },
  securitySummary: {
    title: 'Tóm tắt bảo mật',
    question: 'Câu hỏi',
  },
}

export function getSDK() {
  if (!sdk) {
    // ⚠️ TEST MODE: Circle SDK default THUẦN (English, zero customization).
    // Tách bạch xem flow gốc của Circle có chạy không — KHÔNG setLocalizations,
    // KHÔNG setCustomSecurityQuestions, KHÔNG setThemeColor. Nếu default vẫn fail
    // ở bước xác nhận câu trả lời → lỗi hoàn toàn phía Circle, không phải code mình.
    sdk = new W3SSdk({ appSettings: { appId: '518fec6a-4680-5175-9de6-0810fb3dfd04' } })
  }
  return sdk
}

export const GOOGLE_CLIENT_ID = '51031114717-f9chve1ge9bbo8j3kspj82qrga40342n.apps.googleusercontent.com'

export async function createSocialToken(deviceId) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'socialToken', deviceId }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function createSession(email) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function initializeWallet(userToken) {
  const res = await fetch('/api/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'initialize', userToken }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

// Đảm bảo có địa chỉ ví: nếu localStorage thiếu (Circle provision chậm lúc tạo ví),
// tự lấy lại từ userToken rồi lưu. Ví KHÔNG cần USDC vẫn có địa chỉ để nhận tiền.
export async function ensureWalletAddress() {
  let addr = localStorage.getItem('ez_wallet_addr')
  if (addr) return addr
  const userToken = localStorage.getItem('ez_user_token')
  if (!userToken) return null
  try {
    const info = await getWalletAddress(userToken)
    if (info?.address) {
      localStorage.setItem('ez_wallet_addr', info.address)
      if (info.walletId) localStorage.setItem('ez_wallet_id', info.walletId)
      return info.address
    }
  } catch {}
  return null
}

export async function getWalletAddress(userToken) {
  try {
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAddress', userToken }),
    })
    const data = await res.json()
    console.log('[getWalletAddress]', data)
    return data || null
  } catch (e) {
    console.error('[getWalletAddress error]', e)
    return null
  }
}

// userToken Circle chỉ sống ~1 tiếng — ngắn hơn nhiều phiên sử dụng thực tế của
// người dùng lớn tuổi (mở app, đi làm việc khác, quay lại gửi tiền). Token hết hạn
// khiến W3S SDK từ chối NGAY TRƯỚC KHI hiện màn PIN → "userToken had expired",
// người dùng chỉ thấy bị đá ra mà không hiểu vì sao. Gọi hàm này trước MỌI thao
// tác cần ký PIN (gửi tiền, đổi PIN) để luôn có token mới — Circle cho tạo token
// mới bất cứ lúc nào chỉ cần userId (= email), không cần mật khẩu.
export async function refreshSession() {
  const email = localStorage.getItem('ez_email')
  const fallback = { userToken: localStorage.getItem('ez_user_token'), encryptionKey: localStorage.getItem('ez_encryption_key') }
  if (!email) return fallback
  try {
    const { userToken, encryptionKey } = await createSession(email)
    localStorage.setItem('ez_user_token', userToken)
    localStorage.setItem('ez_encryption_key', encryptionKey)
    return { userToken, encryptionKey }
  } catch {
    return fallback   // refresh lỗi (mất mạng...) → dùng token cũ, để lỗi thật lộ ra ở bước execute
  }
}

// KIT_KEY di chuyển lên server-side (Cloudflare Worker env var)
// Browser chỉ gọi /api/swap, Worker xử lý Circle Stablecoin Kit API

export async function estimateSwap({ walletAddress, tokenIn, tokenOut, amountIn }) {
  const res = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'estimate', walletAddress, tokenIn, tokenOut, amountIn }),
  })
  return res.json()
}

export async function executeSwap({ walletId, walletAddress, tokenIn, tokenOut, amountIn }) {
  const userToken = localStorage.getItem('ez_user_token')
  const res = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'execute', userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn }),
  })
  return res.json()
}

export async function resetPinChallenge(userToken) {
  const res = await fetch('/api/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetPin', userToken }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.challengeId
}

// ⚠️ Mã lỗi Circle mà iframe GIỮ modal cho user nhập/sửa lại (KHÔNG đóng).
// Nếu ta reject promise ở các lỗi này rồi điều hướng đi → khi user nhập ĐÚNG lại,
// iframe (vẫn nổi trên cùng) bắn onComplete success NHƯNG promise đã reject → mất kết quả
// → user bị "văng ra ngoài" dù nhập đúng. Đây LÀ root cause bug PIN.
// → Bỏ qua các lỗi này (để iframe tự cho thử lại); CHỈ settle khi THÀNH CÔNG hoặc lỗi TERMINAL.
// (Nguồn: đọc source @circle-fin/w3s-pw-web-sdk messageHandler — onError KHÔNG remove iframe.)
const RETRYABLE_CODES = new Set([
  155112, // incorrectUserPin — nhập sai PIN, iframe cho nhập lại
  155703, // pinCodeNotMatched — 2 lần nhập PIN (tạo mới) không khớp
  155704, // insecurePinCode — PIN quá yếu, chọn lại
  155115, // incorrectSecurityAnswers — sai câu trả lời bảo mật
  155705, // hintsMatchAnswers — gợi ý trùng câu trả lời
])

export function executeChallenge(sdk, userToken, encryptionKey, challengeId) {
  return new Promise((resolve, reject) => {
    sdk.setAuthentication({ userToken, encryptionKey })
    sdk.execute(challengeId, (err, result) => {
      if (err) {
        if (RETRYABLE_CODES.has(err.code)) return   // để iframe cho user thử lại, đừng settle
        return reject(err)
      }
      resolve(result)
    })
  })
}
