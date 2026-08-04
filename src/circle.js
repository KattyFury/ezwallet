import { MOCK, MOCK_RATES } from './mock'
import { CIRCLE_LOCALIZATIONS, CIRCLE_SECURITY_QUESTIONS, CIRCLE_SECURITY_CONFIRM_ITEMS } from './circleLocalizations'

let sdk = null

// ⚡ NẠP LƯỜI Circle SDK (2026-07-17) — ĐỪNG đổi lại thành `import { W3SSdk } from '...'` ở đầu file.
// Đo được (vite build tách chunk theo package): BẢN THÂN w3s-pw-web-sdk chỉ 31 KB, nhưng nó KÉO THEO
// firebase 262 KB + crypto-browserify 480 KB (elliptic/asn1/bn.js/diffie-hellman…, do polyfill
// `crypto` trong vite.config.js) = ~740 KB ≈ 60% bundle. Import TĨNH ở đây khiến mọi màn lỡ import
// circle.js (HomeSend chỉ cần ensureWalletAddress!) đều lôi cả 740 KB đó vào lần vẽ đầu → 2.7s màn
// trắng trên 4G. import() động → 740 KB chỉ tải khi THỰC SỰ cần ký PIN.
async function loadW3SSdk() {
  const m = await import('@circle-fin/w3s-pw-web-sdk')
  return m.W3SSdk
}

// ⚠️⚠️ QUYẾT ĐỊNH (2026-08-04, user chốt — ĐẢO quyết định 2026-07-01 cũ): BẬT setLocalizations
// tiếng Việt cho màn PIN + câu hỏi bảo mật. Quyết định cũ (English thuần, xem git log) dựa trên
// giả định SAI: đọc kỹ docs (customization.md + web-sdk-ui-customizations, tra 2026-08-04) thì
// Recovery Method + câu hỏi bảo mật ĐỀU localize được — không hardcode như tưởng. Cái ĐÚNG là
// giả định gốc: CHỮ LỖI runtime ("The PIN you entered is incorrect...", PIN bị khoá...) không có
// field nào trong Localizations → vẫn tiếng Anh, chấp nhận được vì hiếm khi hiện.
// Bản dịch nằm ở circleLocalizations.js (tách riêng để thêm ngôn ngữ khác sau — "êm rồi thêm").
// ⚠️ ASYNC (đổi 2026-07-17 khi nạp lười SDK) — MỌI chỗ gọi PHẢI `await getSDK()`.
// Quên await → truyền Promise vào chỗ chờ SDK thật → PIN chết câm. Đã sửa cả 6 chỗ gọi:
// EnterEmail(×3), PinGate, Security, SendConfirm, Swap.
export async function getSDK() {
  if (MOCK) return {}   // mock: không init SDK thật
  if (!sdk) {
    const W3SSdk = await loadW3SSdk()
    sdk = new W3SSdk({ appSettings: { appId: '518fec6a-4680-5175-9de6-0810fb3dfd04' } })
    sdk.setLocalizations(CIRCLE_LOCALIZATIONS.vi)
    // ⚠️ THAM SỐ VỊ TRÍ — (questions, requiredCount, securityConfirmItems). KHÔNG được gọi kiểu
    // object `{ questions, securityConfirmItems }`: đó chính là root cause bug "màn Câu hỏi bảo
    // mật RỖNG" 08-04 (object rơi vào chỗ mảng questions → danh sách hỏng; securityConfirmItems
    // không bao giờ tới nơi → 3 dòng cảnh báo giữ English). Xem chú thích đầy đủ ở
    // circleLocalizations.js:CIRCLE_SECURITY_QUESTIONS. requiredCount = 2 (mặc định của Circle).
    sdk.setCustomSecurityQuestions(CIRCLE_SECURITY_QUESTIONS.vi, 2, CIRCLE_SECURITY_CONFIRM_ITEMS.vi)
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

// Verify PIN để MỞ VÍ (khoá truy cập bằng chính PIN Circle — không tạo mã thứ 2). Tạo challenge
// ký 1 message rỗng; executeChallenge sẽ mở màn nhập PIN. Ký OK = PIN đúng = mở ví.
export async function signMessageChallenge(userToken, walletId, message = 'Unlock EZwallet') {
  const res = await fetch('/api/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'signMessage', userToken, walletId, message }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.challengeId
}

// Email OTP: gửi mã về email + trả { otpToken, deviceToken, deviceEncryptionKey } cho sdk.verifyOtp().
export async function createEmailToken(deviceId, email) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'emailToken', deviceId, email }),
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
// Đổi refreshToken (Circle trả lúc social login) lấy userToken mới. Dùng cho user Google —
// họ không có userId=email nên không tạo token mới bằng createSession được.
export async function refreshSocialToken(userToken, refreshToken, deviceId) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refreshSocial', userToken, refreshToken, deviceId }),
  })
  const data = await res.json()
  if (data.error) { console.error('[refreshSocialToken]', data.error, data.detail); throw new Error(data.error) }
  return data   // { userToken, encryptionKey, refreshToken }
}

export async function refreshSession() {
  if (MOCK) return { userToken: 'mock-token', encryptionKey: 'mock-key' }
  const email = localStorage.getItem('ez_email')
  const fallback = { userToken: localStorage.getItem('ez_user_token'), encryptionKey: localStorage.getItem('ez_encryption_key') }

  // Luồng EMAIL: tạo token mới bằng userId = email (Circle cho tạo bất cứ lúc nào).
  if (email) {
    try {
      const { userToken, encryptionKey } = await createSession(email)
      localStorage.setItem('ez_user_token', userToken)
      localStorage.setItem('ez_encryption_key', encryptionKey)
      return { userToken, encryptionKey }
    } catch {
      return fallback
    }
  }

  // Luồng GOOGLE (không có email → dùng refreshToken + deviceId đã lưu lúc login).
  // Đây là fix gốc lỗi "Đổi PIN: Forbidden": userToken PIN sống 60' mà trước đây user Google
  // không có cách làm mới → hết hạn → 403. Giờ đổi refreshToken lấy token mới trước khi ký PIN.
  const refreshToken = localStorage.getItem('ez_refresh_token')
  const deviceId = localStorage.getItem('ez_google_deviceId')
  if (refreshToken && deviceId) {
    try {
      const r = await refreshSocialToken(fallback.userToken, refreshToken, deviceId)
      if (r?.userToken) {
        localStorage.setItem('ez_user_token', r.userToken)
        if (r.encryptionKey) localStorage.setItem('ez_encryption_key', r.encryptionKey)
        if (r.refreshToken) localStorage.setItem('ez_refresh_token', r.refreshToken)  // Circle rotate → lưu bản mới
        return { userToken: r.userToken, encryptionKey: r.encryptionKey || fallback.encryptionKey }
      }
    } catch {
      // refreshToken hết hạn (14 ngày) / lỗi mạng → dùng token cũ, để lỗi thật lộ ra ở bước execute
    }
  }
  return fallback
}

// Mint token MỚI có ĐẢM BẢO — KHÁC refreshSession (hàm kia im lặng trả token cũ khi createSession
// lỗi → gốc lỗi 155104). Dùng để THỬ LẠI khi Circle báo token hết hạn. Mint hỏng → throw ra ngoài
// (để caller cho đăng nhập lại), KHÔNG nuốt lỗi.
export async function forceFreshSession() {
  if (MOCK) return { userToken: 'mock-token', encryptionKey: 'mock-key' }
  const email = localStorage.getItem('ez_email')
  let s
  if (email) {
    s = await createSession(email)   // { userToken, encryptionKey } — throw nếu lỗi
  } else {
    const refreshToken = localStorage.getItem('ez_refresh_token')
    const deviceId = localStorage.getItem('ez_google_deviceId')
    if (!refreshToken || !deviceId) throw new Error('no-session')   // thiếu dữ liệu mint → đăng nhập lại
    const r = await refreshSocialToken(localStorage.getItem('ez_user_token'), refreshToken, deviceId)
    if (r.refreshToken) localStorage.setItem('ez_refresh_token', r.refreshToken)
    s = { userToken: r.userToken, encryptionKey: r.encryptionKey }
  }
  localStorage.setItem('ez_user_token', s.userToken)
  localStorage.setItem('ez_encryption_key', s.encryptionKey)
  return s
}

// Circle báo token phiên hết hạn/không hợp lệ: 155103 (không thấy token), 155104 (hết hạn),
// 155105 (không hợp lệ). Lỗi từ SDK có .code (số); lỗi từ /api/* ném new Error(message) → dò chữ.
export function isTokenExpiredError(e) {
  const code = e?.code ?? e?.error?.code
  if ([155103, 155104, 155105].includes(code)) return true
  const msg = (e?.message || e?.error?.message || (typeof e === 'string' ? e : '')).toLowerCase()
  return /155103|155104|155105|token had expired|usertoken is invalid/.test(msg)
}

// KIT_KEY di chuyển lên server-side (Cloudflare Worker env var)
// Browser chỉ gọi /api/swap, Worker xử lý Circle Stablecoin Kit API

// MOCK: quy đổi ước tính theo MOCK_RATES (USD mỗi 1 đơn vị): amountOut = amountIn·rateIn/rateOut
function mockSwapOut(tokenIn, tokenOut, amountIn) {
  const rIn = MOCK_RATES[tokenIn] ?? 1, rOut = MOCK_RATES[tokenOut] ?? 1
  return String((Number(amountIn) * rIn / rOut).toFixed(6))
}

export async function estimateSwap({ walletAddress, tokenIn, tokenOut, amountIn }) {
  if (MOCK) return { amountOut: mockSwapOut(tokenIn, tokenOut, amountIn) }
  const res = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'estimate', walletAddress, tokenIn, tokenOut, amountIn }),
  })
  return res.json()
}

// userToken truyền vào từ refreshSession() (đừng đọc thẳng localStorage — token 60' có thể chết)
export async function executeSwap({ userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn }) {
  if (MOCK) return { challengeId: 'mock-challenge', amountOut: mockSwapOut(tokenIn, tokenOut, amountIn) }
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
  if (data.error) {
    console.error('[resetPinChallenge]', data.error, data.detail)
    throw new Error(data.error)
  }
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
  if (MOCK) return Promise.resolve()   // mock: bỏ qua bước ký PIN, coi như thành công
  return new Promise((resolve, reject) => {
    sdk.setAuthentication({ userToken, encryptionKey })
    sdk.execute(challengeId, (err, result) => {
      if (err) {
        if (RETRYABLE_CODES.has(err.code)) return   // để iframe cho user thử lại, đừng settle
        // PIN bị KHOÁ (sai quá số lần cho phép) → Circle trả message tiếng Anh dài, đáng sợ.
        // Thay bằng 1 câu ngắn gọn thân thiện; app vẫn về trạng thái ổn (caller setLoading(false)).
        const raw = err?.message || err?.error?.message || ''
        if (/lock/i.test(raw)) {
          return reject(Object.assign(new Error('Wrong PIN too many times. It is locked for a while — please try again later.'), { code: err.code, locked: true }))
        }
        return reject(err)
      }
      resolve(result)
    })
  })
}
