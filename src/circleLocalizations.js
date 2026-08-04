import { getLang } from './i18n'

// Bản dịch cho Circle W3S SDK (setLocalizations) — TÁCH RIÊNG file này để dễ thêm ngôn ngữ mới.
// THÊM NGÔN NGỮ: chỉ cần thêm 1 key vào CIRCLE_LOCALIZATIONS (vd `zh: {...}`) — applyCircleLocale()
// ở cuối file TỰ bám theo getLang(), KHÔNG phải sửa circle.js/Login.jsx nữa.
//
// PHẠM VI: chỉ các field Circle liệt kê trong docs Localizations (KHÔNG đoán bừa field không có
// trong docs). Đã tra 2 nguồn (2026-08-04):
// - github.com/circlefin/w3s-pw-web-sdk/blob/master/docs/customization.md
// - developers.circle.com/sdks/user-controlled/web-sdk-ui-customizations (bản đầy đủ hơn)
//
// CHƯA localize transactionRequest/contractInteraction/signatureRequest/emailOtp — không phải vì
// SDK không hỗ trợ (CÓ hỗ trợ), mà vì các field đó trộn lẫn nhãn tĩnh (vd fromLabel) với field
// giá trị động (vd amount, from, total — để undefined thì SDK tự điền đúng số liệu giao dịch
// thật, set nhầm vào sẽ đè giá trị thật bằng chữ tĩnh). Cần test kỹ trước khi động vào → làm sau,
// theo đúng tinh thần "xong 1 phần êm rồi mới thêm phần khác".
//
// KHÔNG có field nào cho chữ LỖI runtime (PIN sai, PIN khoá...) — đã grep hết docs, chỉ có
// `errorInfo` là ICON ảnh (trong Resources), không phải text. Phần đó vẫn tiếng Anh, không có
// cách nào đổi qua SDK (xem circle.js).
export const CIRCLE_LOCALIZATIONS = {
  vi: {
    common: {
      continue: 'Tiếp tục',
      showPin: 'Hiện mã PIN',
      hidePin: 'Ẩn mã PIN',
      confirm: 'Xác nhận',
      sign: 'Ký',
      retry: 'Thử lại',
    },
    // Xác nhận PIN sau khi TẠO ví lần đầu (nhập lại PIN vừa đặt)
    confirmInitPincode: {
      headline: 'Nhập lại {{pin}} để xác nhận',
      headline2: 'PIN',
      subhead: 'Nhập lại PIN vừa tạo',
    },
    // Xác nhận PIN sau khi ĐỔI PIN (nhập lại PIN mới)
    confirmNewPincode: {
      headline: 'Nhập lại {{pin}} để xác nhận',
      headline2: 'PIN',
      subhead: 'Nhập lại PIN vừa tạo',
    },
    // Màn mở ví / ký giao dịch (PinGate, gửi tiền, đổi tiền...)
    enterPincode: {
      headline: 'Nhập {{pin}} của bạn',
      headline2: 'PIN',
      subhead: 'Dùng PIN để tiếp tục',
      forgotPin: 'Quên PIN?',
    },
    // Tạo PIN lần đầu (lúc tạo ví)
    initPincode: {
      headline: 'Tạo {{pin}}',
      headline2: 'PIN',
      subhead: 'Tạo mã PIN gồm 6 số để bảo vệ ví của bạn',
    },
    // Nhập PIN mới (lúc đổi PIN)
    newPincode: {
      headline: 'Tạo {{pin}} mới',
      headline2: 'PIN',
      subhead: 'Nhập mã PIN mới gồm 6 số',
    },
    recoverPincode: {
      headline: 'Khôi phục {{pin}}',
      headline2: 'PIN',
      subhead: 'Trả lời câu hỏi bảo mật để đặt lại PIN',
      answerInputHeader: 'Câu trả lời',
      answerInputPlaceholder: 'Nhập câu trả lời của bạn',
    },
    // ✅ ĐÃ XÁC NHẬN 08-04 (test thật trên deploy): field `inputMatch` THẬT SỰ đổi được cụm từ SDK
    // validate — gõ "Tôi đồng ý" thì nút Tiếp tục sáng lên. Màn này KHÔNG phải nhập lại câu trả lời
    // bảo mật — nó bắt gõ ĐÚNG 1 cụm từ xác nhận đã đọc hiểu rủi ro (kiểu "gõ DELETE để xác nhận"),
    // tách biệt hoàn toàn với câu hỏi/trả lời đã đặt.
    securityConfirm: {
      title: 'Xác nhận bảo mật',
      headline: 'Gõ đúng cụm từ "Tôi đồng ý" bên dưới để xác nhận bạn đã hiểu rủi ro trên',
      inputHeadline: 'Gõ "Tôi đồng ý"',
      inputPlaceholder: 'Tôi đồng ý',
      inputMatch: 'Tôi đồng ý',
    },
    // ⚠️ SDK ghép thẳng headline + headline2 KHÔNG chèn dấu cách (đo thật 08-04:
    // "Thiết lậpkhôi phục tài khoản" dính liền — cùng bệnh với requiredMark bên dưới).
    // Đệm khoảng trắng vào đầu headline2 để tách ra.
    securityIntros: {
      headline: 'Thiết lập',
      headline2: ' khôi phục tài khoản',
      description: 'Trả lời vài câu hỏi bảo mật để có thể khôi phục ví nếu bạn quên PIN.',
      link: 'Tìm hiểu thêm',
    },
    // ✅ BẬT LẠI 08-04h: khối này CHƯA BAO GIỜ là thủ phạm làm rỗng màn (ảnh user chụp ở bản
    // f02cd86 — lúc chỉ có setLocalizations, chưa gọi setCustomSecurityQuestions — cho thấy màn
    // hiện ĐẦY ĐỦ dropdown + ô nhập, chỉ dính lỗi chữ "Câu hỏiBắt buộc"). Thủ phạm thật là gọi
    // SAI CHỮ KÝ setCustomSecurityQuestions (xem circle.js).
    securityQuestions: {
      title: 'Câu hỏi bảo mật',
      questionHeader: 'Câu hỏi',
      questionPlaceholder: 'Chọn một câu hỏi',
      // SDK ghép thẳng questionHeader/answerHeader + requiredMark, KHÔNG tự chèn dấu cách
      // (đo thật 08-04: "Câu hỏiBắt buộc" dính liền) — phải tự đệm khoảng trắng + ngoặc.
      requiredMark: ' (bắt buộc)',
      answerHeader: 'Câu trả lời',
      answerPlaceholder: 'Nhập câu trả lời của bạn',
      answerHintHeader: 'Gợi ý (không bắt buộc)',
      answerHintPlaceholder: 'Thêm gợi ý giúp bạn nhớ câu trả lời',
    },
    securitySummary: {
      title: 'Tóm tắt câu hỏi bảo mật',
      question: 'Câu hỏi {{ordinal}}',
    },
    // Màn xác nhận email lúc đăng nhập Google (SSO) — hạ tầng Google đang ẩn khỏi UI
    // (xem Login.jsx) nhưng vẫn set cho đồng bộ, phòng lúc bật lại.
    socialEmailConfirm: {
      title: 'Xác nhận email',
      headline: 'Kiểm tra email của bạn',
    },
  },
}

// Bộ câu hỏi bảo mật tiếng Việt — thay bộ mặc định của Circle (English, kiểu "What is your
// father's middle name?" — không hợp văn hoá VN). Chọn câu quen thuộc, KHÔNG đổi theo thời gian
// (né "món ăn/màu yêu thích hiện tại" — dễ đổi ý, khó nhớ lại đúng).
// type: 'TEXT' — enum QuestionType của SDK là string enum ('TEXT'/'DATE'), để nguyên chuỗi cho
// khỏi phải import package SDK tĩnh vào file này (xem lý do nạp lười ở circle.js).
//
// ⚠️ CÁCH TRUYỀN — ĐỌC KỸ, ĐÂY LÀ ROOT CAUSE CỦA BUG "MÀN RỖNG" 08-04:
// setCustomSecurityQuestions nhận THAM SỐ VỊ TRÍ, KHÔNG phải object:
//   setCustomSecurityQuestions(questions?, requiredCount = 2, securityConfirmItems?)
// (verify bằng đọc `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts:91` + phần thân
// hàm ở `index.js:254` — nó gán thẳng `this.securityQuestions = questions`, không destructure.)
// Gọi kiểu object `setCustomSecurityQuestions({ questions, securityConfirmItems })` → SDK nhận
// nguyên object vào chỗ MẢNG questions → danh sách câu hỏi hỏng → MÀN RỖNG, chặn cả luồng tạo ví;
// đồng thời securityConfirmItems (tham số thứ 3) KHÔNG BAO GIỜ tới nơi → 3 dòng cảnh báo giữ
// nguyên English. Cả 2 triệu chứng từng gặp đều từ đúng 1 lỗi này. ĐỪNG gọi kiểu object nữa.
export const CIRCLE_SECURITY_QUESTIONS = {
  vi: [
    { question: 'Tên con vật nuôi đầu tiên của bạn là gì?', type: 'TEXT' },
    { question: 'Bạn sinh ra ở tỉnh/thành nào?', type: 'TEXT' },
    { question: 'Tên trường tiểu học của bạn là gì?', type: 'TEXT' },
    { question: 'Tên người bạn thân nhất thời đi học là gì?', type: 'TEXT' },
    { question: 'Biệt danh hồi nhỏ của bạn là gì?', type: 'TEXT' },
    { question: 'Tên con đường bạn sống lúc nhỏ là gì?', type: 'TEXT' },
    { question: 'Tên giáo viên bạn yêu thích nhất là gì?', type: 'TEXT' },
    { question: 'Tên người anh/chị/em lớn tuổi nhất trong nhà là gì?', type: 'TEXT' },
  ],
}

// 3 dòng cảnh báo ở màn Xác nhận bảo mật — là THAM SỐ THỨ 3 của setCustomSecurityQuestions
// (KHÁC METHOD với setLocalizations, không nằm trong Localizations object). Xem cảnh báo cách
// truyền tham số vị trí ở CIRCLE_SECURITY_QUESTIONS bên trên.
// Bản gốc English (đo thật 08-04, lúc tham số này chưa tới nơi được vì gọi sai chữ ký):
// 1. "This is the only way to recover my account access."
// 2. "Circle won't store my answers so it's my responsibility to remember them."
// 3. "I will lose access to my wallet and my digital assets if I forget my answers."
export const CIRCLE_SECURITY_CONFIRM_ITEMS = {
  vi: [
    'Đây là cách DUY NHẤT để khôi phục quyền truy cập vào tài khoản của tôi.',
    'Circle không lưu trữ câu trả lời của tôi, nên tôi phải tự ghi nhớ.',
    'Tôi sẽ mất quyền truy cập vào ví và tài sản số nếu quên câu trả lời.',
  ],
}

// Áp bản dịch cho 1 instance SDK, BÁM THEO NGÔN NGỮ APP (getLang()) — dùng chung cho cả 3 chỗ
// dựng SDK (circle.js:getSDK + Login.jsx ×2) để 3 chỗ không bao giờ lệch nhau.
// Ngôn ngữ CHƯA có bản dịch (vd 'zh', 'en') → KHÔNG gọi gì cả → Circle tự dùng English mặc định.
// Đó là hành vi ĐÚNG: app tiếng Anh thì màn PIN cũng tiếng Anh, không lệch nửa nọ nửa kia.
export function applyCircleLocale(sdk) {
  const lang = getLang()
  const loc = CIRCLE_LOCALIZATIONS[lang]
  if (loc) sdk.setLocalizations(loc)

  // ⚠️ THAM SỐ VỊ TRÍ — (questions, requiredCount, securityConfirmItems). TUYỆT ĐỐI KHÔNG gọi kiểu
  // object `{ questions, securityConfirmItems }`: đó là root cause bug "màn Câu hỏi bảo mật RỖNG"
  // 08-04 (object rơi vào chỗ mảng questions → danh sách hỏng, chặn cả luồng tạo ví; đồng thời
  // securityConfirmItems không bao giờ tới nơi → 3 dòng cảnh báo giữ English).
  // Chữ ký thật: node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts:91
  const questions = CIRCLE_SECURITY_QUESTIONS[lang]
  const confirmItems = CIRCLE_SECURITY_CONFIRM_ITEMS[lang]
  if (questions || confirmItems) {
    sdk.setCustomSecurityQuestions(questions, 2, confirmItems)   // requiredCount 2 = mặc định Circle
  }
}
