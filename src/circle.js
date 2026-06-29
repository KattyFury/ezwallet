import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'

let sdk = null

const VI = {
  common: {
    continue: 'Tiếp tục',
    confirm: 'Xác nhận',
    sign: 'Ký',
    retry: 'Thử lại',
    showPin: 'Hiện PIN',
    hidePin: 'Ẩn PIN',
  },
  // Tạo PIN lần đầu (khi khởi tạo ví)
  initPincode: {
    headline: 'Tạo mã PIN',
    headline2: '',
    subhead: 'Mã PIN 6 chữ số bảo vệ ví của bạn',
  },
  confirmInitPincode: {
    headline: 'Nhập lại mã PIN',
    headline2: '',
    subhead: 'Nhập lại để xác nhận',
  },
  // Đổi PIN (từ màn Bảo mật)
  newPincode: {
    headline: 'Tạo mã PIN mới',
    headline2: '',
    subhead: 'Mã PIN 6 chữ số bảo vệ ví của bạn',
  },
  confirmNewPincode: {
    headline: 'Nhập lại mã PIN mới',
    headline2: '',
    subhead: 'Nhập lại để xác nhận',
  },
  enterPincode: {
    headline: 'Xác nhận giao dịch',
    headline2: '',
    subhead: 'Nhập mã PIN 6 chữ số của bạn',
    forgotPin: 'Quên PIN?',
  },
  recoverPincode: {
    headline: 'Khôi phục PIN',
    headline2: '',
    subhead: 'Nhập câu trả lời bảo mật để đặt lại PIN',
    answerInputHeader: 'Câu trả lời',
    answerInputPlaceholder: 'Nhập câu trả lời',
  },
  securityIntros: {
    headline: 'Câu hỏi bảo mật',
    headline2: '',
    description: 'Dùng để khôi phục PIN nếu bạn quên. Ghi nhớ câu trả lời.',
    link: 'Tìm hiểu thêm',
  },
  securityQuestions: {
    title: 'Câu hỏi bảo mật',
    questionHeader: 'Câu hỏi',
    questionPlaceholder: 'Chọn câu hỏi',
    requiredMark: '*',
    answerHeader: 'Câu trả lời',
    answerPlaceholder: 'Nhập câu trả lời (nhớ viết hoa/thường đúng)',
    answerHintHeader: 'Gợi ý (tuỳ chọn)',
    answerHintPlaceholder: 'Ghi gợi ý để nhớ lại sau',
  },
  securityConfirm: {
    title: 'Xác nhận câu trả lời',
    headline: 'Nhập lại câu trả lời câu hỏi trên',
    inputHeadline: 'Câu trả lời',
    inputPlaceholder: 'Nhập lại y chang (phân biệt hoa/thường)',
    inputMatch: 'Khớp ✓',
  },
  securitySummary: {
    title: 'Hoàn tất',
    question: 'Câu hỏi',
  },
}


export function getSDK() {
  if (!sdk) {
    sdk = new W3SSdk({ appSettings: { appId: '518fec6a-4680-5175-9de6-0810fb3dfd04' } })
    sdk.setLocalizations(VI)
    // Đổi màu Circle SDK → xanh lá thay cho tím/xanh mặc định
    sdk.setThemeColor({
      mainBtnBg:         '#16A34A',
      mainBtnBgOnHover:  '#15803D',
      mainBtnBgDisabled: '#86EFAC',
      inputBorderFocused: '#16A34A',
      titleGradients:    ['#16A34A', '#16A34A'],  // bỏ gradient 7 màu
    })
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

export function executeChallenge(sdk, userToken, encryptionKey, challengeId) {
  return new Promise((resolve, reject) => {
    sdk.setAuthentication({ userToken, encryptionKey })
    sdk.execute(challengeId, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}
