import { useState, useEffect, lazy, Suspense } from 'react'
import { NavContext } from './nav'
import ErrorBoundary from './components/ErrorBoundary'
import BugButton from './components/BugButton'

// NẠP LƯỜI TỪNG MÀN (2026-07-17) — user: "app cùi tại sao load lâu".
// Trước: App.jsx import TĨNH cả 22 màn → Vite gộp HẾT vào 1 file 1.668 KB, trình duyệt phải tải +
// parse + chạy XONG TOÀN BỘ rồi React mới vẽ được chữ đầu tiên → ĐO ĐƯỢC 2.7s MÀN TRẮNG trên 4G.
// Nặng nhất lại là thứ màn đầu KHÔNG CẦN: jsQR 130KB (chỉ màn quét QR), qrcode.react (chỉ màn QR).
// lazy() → mỗi màn 1 file riêng, chỉ tải khi user thực sự mở màn đó.
const Login       = lazy(() => import('./screens/Login'))
const HomeSend    = lazy(() => import('./screens/HomeSend'))
const HomeReceive = lazy(() => import('./screens/HomeReceive'))
const Swap        = lazy(() => import('./screens/Swap'))
const ServiceHub  = lazy(() => import('./screens/ServiceHub'))
const MenuScreen  = lazy(() => import('./screens/MenuScreen'))
const PasteAddress = lazy(() => import('./screens/PasteAddress'))
const SendAmount  = lazy(() => import('./screens/SendAmount'))
const SendConfirm = lazy(() => import('./screens/SendConfirm'))
const SendReceipt = lazy(() => import('./screens/SendReceipt'))
const EnterEmail  = lazy(() => import('./screens/EnterEmail'))
const CreateQR    = lazy(() => import('./screens/CreateQR'))
const ShowQR      = lazy(() => import('./screens/ShowQR'))
const SavedQRList = lazy(() => import('./screens/SavedQRList'))
const Contacts    = lazy(() => import('./screens/Contacts'))
const QRScanner   = lazy(() => import('./screens/QRScanner'))
const TxHistory   = lazy(() => import('./screens/TxHistory'))
const Currency    = lazy(() => import('./screens/Currency'))
const Security    = lazy(() => import('./screens/Security'))
const About       = lazy(() => import('./screens/About'))
const PinGate     = lazy(() => import('./screens/PinGate'))

const SCREENS = {
  Login,
  HomeSend, HomeReceive, Swap, ServiceHub, MenuScreen,
  PasteAddress, SendAmount, SendConfirm, SendReceipt,
  EnterEmail, CreateQR, ShowQR, SavedQRList,
  Contacts, QRScanner,
  TxHistory,
  Currency,
  Security,
  About,
  PinGate,
}

export default function App() {
  const [nav, setNav] = useState(() => {
    // Còn session → qua CỔNG PIN (khoá mở ví) trước HomeSend, trừ khi phiên này đã mở khoá
    // (ez_pin_ok — set sau khi verify PIN, hoặc sau khi vừa TẠO PIN ở login lần đầu). Chưa có session → Login.
    const hasSession = localStorage.getItem('ez_user_token')
    if (!hasSession) return { screen: 'Login', params: {} }
    const unlocked = sessionStorage.getItem('ez_pin_ok')
    return unlocked ? { screen: 'HomeSend', params: {} } : { screen: 'PinGate', params: { next: 'HomeSend' } }
  })

  function navigate(screen, params = {}) {
    setNav({ screen, params })
  }

  // iOS/Android: khi bàn phím mở, trình duyệt tự CUỘN trang để lộ ô nhập → màn/popup
  // "nhảy lên". Mọi ô nhập trong app đã thiết kế nằm NỬA TRÊN (trên vùng bàn phím che),
  // nên ta khóa cuộn trang về 0 → ô vẫn thấy mà màn không nhảy. (Chỉ khóa cuộn TRANG;
  // các list cuộn trong (overflow:auto của Danh bạ/Lịch sử) không bị ảnh hưởng.)
  useEffect(() => {
    const lock = () => { if (window.scrollY !== 0) window.scrollTo(0, 0) }
    window.addEventListener('scroll', lock, { passive: true })
    return () => window.removeEventListener('scroll', lock)
  }, [])

  // KÉO BẢN SAO LƯU danh bạ/kho QR về 1 lần lúc mở app (2026-07-29). Chạy nền, im lặng:
  // không có KV binding / mạng lỗi / MOCK → bỏ qua, app không hề biết. Đặt ở đây (mở app) chứ
  // KHÔNG đặt trong màn Contacts: lúc này user chắc chắn chưa mở màn nào đọc danh bạ nên ghi đè
  // local không giật UI. Chi tiết luật gộp: src/sync.js.
  // ⚠️ Từ 08-06 (auth chữ ký PIN): lượt kéo CHÍNH nằm ở PinGate, ngay sau khi user nhập PIN —
  // vì token phiên sync chỉ có sau bước ký. Chỗ này giờ chỉ còn ăn ở trường hợp RELOAD tab
  // (sessionStorage sống sót → đã có `ez_pin_ok` + `ez_sync_token`, không qua PinGate nữa).
  // Chưa có token thì `pullOnce` tự bỏ qua im lặng.
  useEffect(() => {
    if (!sessionStorage.getItem('ez_sync_token') || !localStorage.getItem('ez_wallet_addr')) return
    import('./sync').then(s => s.pullOnce()).catch(() => {})
  }, [])

  // PREFETCH lúc trình duyệt RẢNH (2026-07-22g — user: "app chưa mượt") → chuyển tab + bước PIN
  // MƯỢT hơn. KHÔNG đổi logic: chỉ "làm nóng" cache các chunk (import() động vẫn chạy y hệt khi
  // điều hướng thật). Các màn hay dùng nạp trước → đổi tab KHÔNG chớp trắng (Suspense fallback);
  // Circle SDK ~1MB (chỉ cần lúc ký PIN) nạp nền → bước PIN không khựng vì tải nguội. Chạy khi
  // trình duyệt rảnh nên KHÔNG tranh băng thông lúc mở app (không làm chậm màn đầu).
  useEffect(() => {
    const idle = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : cb => setTimeout(cb, 1600)
    const cancel = window.cancelIdleCallback ? window.cancelIdleCallback.bind(window) : clearTimeout
    const id = idle(() => {
      import('./screens/HomeSend'); import('./screens/HomeReceive')
      import('./screens/ServiceHub'); import('./screens/Swap'); import('./screens/MenuScreen')
      import('./screens/SendAmount'); import('./screens/Contacts'); import('./screens/TxHistory')
      if (import.meta.env.VITE_MOCK !== '1') import('@circle-fin/w3s-pw-web-sdk').catch(() => {})
    })
    return () => cancel(id)
  }, [])

  const Screen = SCREENS[nav.screen] || SCREENS['Login']

  return (
    <NavContext.Provider value={{ navigate, params: nav.params }}>
      <ErrorBoundary>
        {/* fallback = KHUNG MÀN TRẮNG TRỐNG, cố tình KHÔNG spinner/chữ "đang tải": màn tải trong
            <100ms, nhấp một cái spinner rồi biến còn khó chịu hơn là không có gì. Giữ nền trắng +
            đúng khung .screen → không giật layout khi màn thật hiện ra. */}
        {/* KHUNG NEO cho nút báo lỗi: cùng bề ngang + canh giữa y hệt .screen (max 430px), để
            nút bám mép PHẢI CỦA APP chứ không phải mép màn hình (trên desktop 2 chỗ đó cách nhau
            rất xa). .screen bên trong vẫn tự lo height/overflow của nó. */}
        <div style={{ position: 'relative', maxWidth: 'var(--screen-max)', margin: '0 auto' }}>
          <Suspense fallback={<div className="screen" />}>
            <Screen />
          </Suspense>
          {/* Nút báo lỗi hiện ở MỌI màn, kể cả Login/PinGate — lỗi hay xảy ra nhất là lúc chưa
              vào được app, chặn ở đó thì đúng ca cần báo nhất lại không báo được. */}
          <BugButton screen={nav.screen} />
        </div>
      </ErrorBoundary>
    </NavContext.Provider>
  )
}
