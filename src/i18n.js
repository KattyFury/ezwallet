// i18n đơn giản: key = chuỗi tiếng Việt gốc. lang='vi' → trả nguyên; lang khác → tra EN.
// Đổi ngôn ngữ = reload (đọc lại LANG). Auto-detect theo trình duyệt nếu chưa chọn.
const EN = {
  // Login / EnterEmail
  // MỘT chuỗi liền, KHÔNG tách 2 key + <br /> như trước: ép ngắt dòng cứng thì câu dài/ngắn theo
  // ngôn ngữ + cỡ chữ đều xuống dòng sai chỗ. Để nguyên câu → CSS tự xuống dòng vừa bề ngang nút.
  'Tạo ví bằng email, gửi nhận tiền một cách dễ dàng': 'Create a wallet with email, send & receive money easily',
  'Đăng nhập với Email': 'Sign in with Email',
  'Đăng nhập với Google': 'Sign in with Google',
  'Tiếp tục': 'Continue',
  'Quay lại': 'Back',
  'Đang xử lý...': 'Processing...',
  'Có lỗi xảy ra': 'Something went wrong',
  // HomeSend
  'Đang tải...': 'Loading...',
  'Chưa có token nào': 'No tokens yet',
  'Danh bạ': 'Contacts',
  'Quét QR': 'Scan QR',
  'Dán để gửi': 'Paste',
  'Hết USDC để trả phí giao dịch': 'Out of USDC for transaction fees',
  'Bấm để nhận USDC testnet từ': 'Tap to get testnet USDC from',
  'Đổi tiền': 'Swap',
  // HomeReceive
  'Chia sẻ': 'Share',
  'Đã copy!': 'Copied!',
  'Tạo QR': 'Create QR',
  'Kho QR': 'QR Storage',
  'Bấm để copy địa chỉ ví của bạn': 'Tap to copy your wallet address',
  // NavBar
  'Gửi': 'Send',
  'Nhận': 'Receive',
  'Menu': 'Menu',
  // SendAmount / SendConfirm / SendReceipt
  'Gửi tiền': 'Send money',
  'Gửi cho:': 'Send to:',
  'Nội dung chuyển khoản (không bắt buộc)': 'Transfer note (optional)',
  'Số dư không đủ (khả dụng:': 'Insufficient balance (available:',
  'Chọn tiền tệ': 'Select currency',
  'Xác nhận giao dịch': 'Confirm transaction',
  'Gửi đến': 'Send to',
  'Địa chỉ': 'Address',
  'Số tiền': 'Amount',
  'Quy đổi': 'Converted',
  'Nội dung': 'Note',
  'Phí mạng': 'Network fee',
  'Đang tính...': 'Calculating...',
  'Giao dịch không thể hoàn tác sau khi xác nhận': 'This transaction cannot be undone once confirmed',
  'Đang mở xác nhận PIN...': 'Opening PIN confirmation...',
  'Sửa': 'Edit',
  'Xác nhận PIN': 'Confirm PIN',
  'Biên lai': 'Receipt',
  'Đã gửi thành công': 'Sent successfully',
  'Lưu biên lai': 'Save receipt',
  'Xong': 'Done',
  'Đã gửi': 'Sent',
  'Đã nhận': 'Received',
  'cho': 'to',
  'từ': 'from',
  'Gửi thất bại:': 'Send failed:',
  'có lỗi xảy ra': 'an error occurred',
  // PasteAddress
  'Dán địa chỉ để gửi': 'Paste address to send',
  'Địa chỉ không hợp lệ – bắt đầu bằng 0x, 42 ký tự': 'Invalid address – must start with 0x, 42 chars',
  'Đây là ví của bạn – không gửi cho chính mình được': "That's your own wallet – you can't send to yourself",
  'Dán': 'Paste',
  // Contacts
  'Chưa có danh bạ': 'No contacts yet',
  'Thêm danh bạ': 'Add contact',
  'Chỉnh ảnh': 'Adjust photo',
  'Tên': 'Name',
  'Hủy': 'Cancel',
  'Lưu': 'Save',
  'Thêm': 'Add',
  // QRScanner
  'Hướng camera vào mã QR': 'Point the camera at a QR code',
  'QR không hợp lệ, thử lại': 'Invalid QR, try again',
  'Đây là QR của bạn – quét QR người nhận': "That's your own QR – scan the recipient's QR",
  'Không truy cập được camera – chọn ảnh QR hoặc dán địa chỉ.': 'Cannot access camera – pick a QR image or paste an address.',
  'Không tìm thấy mã QR hợp lệ trong ảnh': 'No valid QR found in the image',
  'Không đọc được ảnh': 'Could not read the image',
  'Không đọc được ảnh QR': 'Could not read the QR image',
  'Ảnh QR': 'QR image',
  // CreateQR / ShowQR / SavedQRList
  'Tạo QR nhận tiền': 'Create receive QR',
  'Số tiền muốn nhận': 'Amount to receive',
  'Cho người gửi quét mã này': 'Have the sender scan this code',
  // TxHistory
  'Lịch sử giao dịch': 'Transaction history',
  'Chưa có giao dịch nào': 'No transactions yet',
  'Chưa có giao dịch gửi': 'No sent transactions',
  'Chưa có giao dịch nhận': 'No received transactions',
  'Chi tiết giao dịch': 'Transaction details',
  'Loại': 'Type',
  'Người nhận': 'Recipient',
  'Người gửi': 'Sender',
  'Địa chỉ ví': 'Wallet address',
  'Thời gian': 'Time',
  'Xem trên ArcScan': 'View on ArcScan',
  'Đóng': 'Close',
  // MenuScreen
  'Rút tiền': 'Withdraw',
  'Nạp tiền': 'Deposit',
  'Bảo mật': 'Security',
  'Đăng xuất': 'Sign out',
  // Language
  // Security
  'Email đăng nhập': 'Login email',
  'Đã sao chép': 'Copied',
  'Đổi PIN': 'Change PIN',
  'Đang chuẩn bị...': 'Preparing...',
  'Nhập PIN...': 'Enter PIN...',
  'Đổi PIN thành công!': 'PIN changed!',
  'Lỗi:': 'Error:',
  'thử lại': 'try again',
  // Lỗi Circle dịch theo mã (circle.js ERROR_BY_CODE) — chỉ áp cho lỗi TERMINAL bắn ra ngoài
  // iframe. Lỗi vẽ TRONG iframe (sai PIN, sai câu trả lời) là của Circle, không đổi được.
  'Bạn nhập sai PIN quá nhiều lần. Ví tạm khoá, vui lòng thử lại sau ít phút.': 'Too many incorrect PIN attempts. Your wallet is temporarily locked – please try again in a few minutes.',
  'Bạn trả lời sai quá nhiều lần. Tạm khoá, vui lòng thử lại sau ít phút.': 'Too many incorrect answers. Temporarily locked – please try again in a few minutes.',
  'Tài khoản đã bị vô hiệu hoá.': 'This account has been disabled.',
  'Không tìm thấy tài khoản này.': 'Account not found.',
  'Tài khoản chưa đặt mã PIN.': 'This account has no PIN set.',
  'Tài khoản chưa đặt câu hỏi bảo mật.': 'This account has no security questions set.',
  'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.': 'Your session has expired. Please sign in again.',
  'Mã OTP đã hết hạn. Vui lòng lấy mã mới.': 'The code has expired. Please request a new one.',
  'Mã OTP không hợp lệ.': 'Invalid code.',
  'Mã OTP không đúng.': 'Incorrect code.',
  'Mã OTP không khớp.': 'The code does not match.',
  'Lỗi mạng. Kiểm tra kết nối rồi thử lại.': 'Network error. Check your connection and try again.',
  // PinGate / Security
  'Mở khoá': 'Unlock',
  'Không dùng được với tài khoản Google': 'Not available for Google accounts',
  // Contacts / SavedQRList / SendAmount / CreateQR / Swap / QRScanner
  'Xoá danh bạ?': 'Delete contact?',
  'Không thể hoàn tác.': "This can't be undone.",
  'Xoá': 'Delete',
  'Lưu vào kho QR': 'Add to QR Storage',
  'Tên (không bắt buộc)': 'Name (optional)',
  'Xoá QR:': 'Delete QR:',
  'Xác nhận': 'Confirm',
  'Đặt lời nhắn mặc định': 'Set your default note',
  'Nhập tại đây': 'Type here',
  'Đặt tên cho QR': 'Name your QR',
  'Chọn token': 'Select token',
  'Chưa hỗ trợ QR ngoài đời thật': 'Real-life QR codes are not supported yet',
  'Chỉ quét QR ví crypto': 'Scan crypto wallet QRs only',
  // Language & Currency
  'Ngôn ngữ & Tiền tệ': 'Language & Currency',
  'Ngôn ngữ': 'Language',
  'Tiền tệ mặc định': 'Default currency',
  // ErrorBoundary
  'Tải lại': 'Reload',
  'Ứng dụng gặp lỗi ngoài dự kiến. Ví và tiền của bạn vẫn an toàn. Vui lòng tải lại.': 'The app hit an unexpected error. Your wallet and funds are safe. Please reload.',
  // About
  'About': 'About',
  'Ứng dụng': 'App',
  'Phiên bản': 'Version',
  'Mạng': 'Network',
  'Ví': 'Wallet',
  'Điều khoản sử dụng': 'Terms of use',
  'Chính sách bảo mật': 'Privacy policy',
}

// Tiếng Trung (giản thể)
const ZH = {
  'Tạo ví bằng email, gửi nhận tiền một cách dễ dàng': '用邮箱创建钱包，轻松收发资金',
  'Đăng nhập với Email': '用邮箱登录',
  'Đăng nhập với Google': '用 Google 登录',
  'Tiếp tục': '继续', 'Quay lại': '返回', 'Đang xử lý...': '处理中...', 'Có lỗi xảy ra': '出现错误',
  'Đang tải...': '加载中...', 'Chưa có token': '暂无代币', 'Chưa có token nào': '暂无代币', 'Bao gồm': '包含',
  'Danh bạ': '联系人', 'Quét QR': '扫码', 'Dán để gửi': '粘贴发送',
  'Nơi bạn lưu địa chỉ ví của người quen': '保存熟人的钱包地址',
  'Bấm để quét mã QR của người nhận': '点击扫描收款人二维码',
  'Bấm để dán địa chỉ ví của người nhận': '点击粘贴收款人钱包地址',
  'Đổi tiền': '兑换',
  'Hết USDC để trả phí giao dịch': 'USDC 不足以支付手续费',
  'Bấm để nhận USDC testnet từ': '点击领取测试网 USDC，来自',
  'QR mặc định': '默认二维码', 'Đây chính là địa chỉ ví của bạn': '这是您的钱包地址',
  'Chia sẻ': '分享', 'Đã copy!': '已复制！',
  'Bấm để chia sẻ địa chỉ ví của bạn': '点击分享您的钱包地址',
  'Tạo QR': '创建二维码', 'Tạo mã QR nhận đúng số tiền bạn muốn': '创建指定金额的收款二维码',
  'Kho QR': '二维码库', 'Nơi bạn lưu trữ những QR hay dùng': '存放常用二维码',
  'Gửi': '发送', 'Nhận': '接收', 'Menu': '菜单',
  'Gửi tiền': '转账', 'Gửi cho:': '发送给：',
  'Nội dung chuyển khoản (không bắt buộc)': '转账备注（可选）',
  'Số dư không đủ (khả dụng:': '余额不足（可用：',
  'Chọn tiền tệ': '选择货币', 'Xác nhận giao dịch': '确认交易',
  'Gửi đến': '发送至', 'Địa chỉ': '地址', 'Số tiền': '金额', 'Quy đổi': '折算',
  'Nội dung': '备注', 'Phí mạng': '网络费', 'Đang tính...': '计算中...',
  'Giao dịch không thể hoàn tác sau khi xác nhận': '交易确认后无法撤销',
  'Đang mở xác nhận PIN...': '正在打开 PIN 确认...', 'Sửa': '修改', 'Xác nhận PIN': '确认 PIN',
  'Lưu vào kho QR': '保存到二维码库',
  'Biên lai': '收据', 'Đã gửi thành công': '发送成功', 'Lưu biên lai': '保存收据', 'Xong': '完成',
  'Đã gửi': '已发送', 'Đã nhận': '已接收', 'cho': '给', 'từ': '来自', 'Đến': '至', 'Từ': '来自',
  'Gửi thất bại:': '发送失败：', 'có lỗi xảy ra': '出现错误',
  'Dán địa chỉ để gửi': '粘贴地址以发送',
  'Địa chỉ không hợp lệ – bắt đầu bằng 0x, 42 ký tự': '地址无效 – 以 0x 开头，42 个字符', 'Dán': '粘贴',
  'Chưa có danh bạ': '暂无联系人', 'Thêm danh bạ': '添加联系人', 'Chỉnh ảnh': '调整照片',
  'Tên': '姓名', 'Hủy': '取消', 'Lưu': '保存', 'Thêm': '添加',
  'Hướng camera vào mã QR': '将摄像头对准二维码', 'QR không hợp lệ, thử lại': '二维码无效，请重试',
  'Không truy cập được camera – chọn ảnh QR hoặc dán địa chỉ.': '无法访问摄像头 – 选择二维码图片或粘贴地址。',
  'Không tìm thấy mã QR hợp lệ trong ảnh': '图片中未找到有效二维码',
  'Không đọc được ảnh': '无法读取图片', 'Không đọc được ảnh QR': '无法读取二维码图片', 'Ảnh QR': '二维码图片',
  'Tạo QR nhận tiền': '创建收款二维码', 'Số tiền muốn nhận': '想收到的金额',
  'Tạo QR nhận đúng số tiền bạn muốn': '创建指定金额的收款二维码',
  'Cho người gửi quét mã này': '让付款人扫描此码', 'Lưu vào kho ảnh': '保存到相册', 'Lưu vào thư viện': '保存到库', 'Chưa có QR nào': '暂无二维码',
  'Lịch sử giao dịch': '交易记录', 'Chưa có giao dịch nào': '暂无交易',
  'Chưa có giao dịch gửi': '暂无发送交易', 'Chưa có giao dịch nhận': '暂无接收交易',
  'Chỉ gửi': '仅发送', 'Chỉ nhận': '仅接收', 'Chi tiết giao dịch': '交易详情',
  'Loại': '类型', 'Người nhận': '收款人', 'Người gửi': '付款人', 'Địa chỉ ví': '钱包地址',
  'Thời gian': '时间', 'Xem trên ArcScan': '在 ArcScan 查看', 'Đóng': '关闭',
  'vừa xong': '刚刚', 'phút trước': '分钟前', 'giờ trước': '小时前', 'ngày trước': '天前',
  'Rút tiền': '提现', 'Nạp tiền': '充值', 'Ngôn ngữ & tiền tệ': '语言与货币',
  'Bảo mật': '安全', 'Đăng xuất': '退出登录', 'Ngôn ngữ': '语言', 'Tiền tệ': '货币',
  'Nhân dân tệ': '人民币', 'Việt Nam Đồng': '越南盾', 'Chọn ngôn ngữ': '选择语言',
  'Email đăng nhập': '登录邮箱', 'Đã sao chép': '已复制', 'Đổi PIN': '修改 PIN',
  'Phương thức khôi phục': '恢复方式', 'Đang chuẩn bị...': '准备中...', 'Nhập PIN...': '输入 PIN...',
  'Đổi PIN thành công!': 'PIN 修改成功！', 'Lỗi:': '错误：', 'thử lại': '请重试',
  'About': '关于',
  'Ứng dụng': '应用', 'Phiên bản': '版本', 'Mạng': '网络', 'Ví': '钱包',
  'Điều khoản sử dụng': '使用条款', 'Chính sách bảo mật': '隐私政策',
  'Đang xây dựng': '建设中', 'Tính năng này sẽ sớm có trong bản cập nhật tiếp theo.': '此功能将在后续更新中推出。',
  'Tính năng này': '此功能',
}

const DICTS = { en: EN, zh: ZH }

// Ưu tiên lựa chọn user đã lưu; chưa chọn thì đoán theo ngôn ngữ trình duyệt.
function detect() {
  const stored = localStorage.getItem('ez_lang')
  if (stored) return stored
  const b = (navigator.language || '').toLowerCase()
  if (b.startsWith('vi')) return 'vi'
  if (b.startsWith('zh')) return 'zh'
  return 'en'
}

// ✅ ĐÃ MỞ KHOÁ 2026-08-04 (user chốt) — trước đây ghim cứng 'en' vì "Circle SDK chỉ tiếng Anh".
// Lý do đó KHÔNG CÒN ĐÚNG: Circle CÓ localize được qua setLocalizations (xem circleLocalizations.js).
// ⚠️ Màn Circle bám theo ĐÚNG biến LANG này (circle.js/Login.jsx đọc getLang()) — ngôn ngữ nào chưa
// có bản dịch Circle thì tự rơi về English mặc định của Circle. ĐỪNG hardcode `.vi` cho Circle nữa,
// sẽ thành app tiếng Anh + màn PIN tiếng Việt.
let LANG = detect()

export function getLang() { return LANG }
export function setLang(l) { localStorage.setItem('ez_lang', l); window.location.reload() }
// t(viString) → bản dịch theo LANG (vi = nguyên gốc; zh/en = tra dict; thiếu → EN → gốc)
export function t(s) {
  if (LANG === 'vi') return s
  return (DICTS[LANG] && DICTS[LANG][s]) || DICTS.en[s] || s
}
