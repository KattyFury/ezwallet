// Bản dịch cho Circle W3S SDK (setLocalizations) — TÁCH RIÊNG file này để dễ thêm ngôn ngữ mới
// (user chốt 2026-08-04: bật tiếng Việt trước, êm rồi thêm ngôn ngữ khác — chỉ cần thêm 1 key
// nữa vào CIRCLE_LOCALIZATIONS, vd `zh: {...}`, rồi đổi getSDK()/Login.jsx dùng đúng key đó).
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
    // ⚠️ Màn này KHÔNG phải nhập lại câu trả lời bảo mật — nó bắt gõ ĐÚNG 1 cụm từ xác nhận đã
    // đọc hiểu rủi ro (kiểu "gõ DELETE để xác nhận"), tách biệt hoàn toàn với câu hỏi/trả lời đã
    // đặt. Bản gốc English bắt gõ "I agree" — CHƯA XÁC NHẬN được field `inputMatch` có thật sự
    // đổi được cụm từ phải gõ hay không (docs Circle không ghi rõ, SDK là iframe cross-origin
    // không đọc được source để kiểm chứng). Set thử 'Tôi đồng ý' ở đây — NẾU sau khi deploy gõ
    // "Tôi đồng ý" mà nút Tiếp tục KHÔNG sáng lên, tức field này chỉ là chữ hiển thị chứ không
    // đổi được cụm từ thật (vẫn phải gõ "I agree" tiếng Anh) → quay lại đổi headline/inputPlaceholder
    // bên dưới thành hướng dẫn gõ "I agree" (giữ inputMatch không đổi được gì thì thôi kệ nó).
    securityConfirm: {
      title: 'Xác nhận bảo mật',
      headline: 'Gõ đúng cụm từ "Tôi đồng ý" bên dưới để xác nhận bạn đã hiểu rủi ro trên',
      inputHeadline: 'Gõ "Tôi đồng ý"',
      inputPlaceholder: 'Tôi đồng ý',
      inputMatch: 'Tôi đồng ý',
    },
    securityIntros: {
      headline: 'Thiết lập',
      headline2: 'khôi phục tài khoản',
      description: 'Trả lời vài câu hỏi bảo mật để có thể khôi phục ví nếu bạn quên PIN.',
      link: 'Tìm hiểu thêm',
    },
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

// 3 dòng cảnh báo ở màn Xác nhận bảo mật (setCustomSecurityQuestions({ securityConfirmItems })) —
// KHÁC METHOD với setLocalizations, không nằm trong Localizations object nên phải gọi riêng.
// Bản gốc English (đo thật 08-04, chưa gọi method này nên SDK tự rơi về mặc định):
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
