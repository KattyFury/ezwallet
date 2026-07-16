import { useState, useEffect, lazy, Suspense } from 'react'
import { NavContext } from './nav'
import ErrorBoundary from './components/ErrorBoundary'

// NẠP LƯỜI TỪNG MÀN (2026-07-17) — user: "app cùi tại sao load lâu".
// Trước: App.jsx import TĨNH cả 22 màn → Vite gộp HẾT vào 1 file 1.668 KB, trình duyệt phải tải +
// parse + chạy XONG TOÀN BỘ rồi React mới vẽ được chữ đầu tiên → ĐO ĐƯỢC 2.7s MÀN TRẮNG trên 4G.
// Nặng nhất lại là thứ màn đầu KHÔNG CẦN: jsQR 130KB (chỉ màn quét QR), qrcode.react (chỉ màn QR).
// lazy() → mỗi màn 1 file riêng, chỉ tải khi user thực sự mở màn đó.
const Login       = lazy(() => import('./screens/Login'))
const HomeSend    = lazy(() => import('./screens/HomeSend'))
const HomeReceive = lazy(() => import('./screens/HomeReceive'))
const Swap        = lazy(() => import('./screens/Swap'))
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
const ComingSoon  = lazy(() => import('./screens/ComingSoon'))
const TxHistory   = lazy(() => import('./screens/TxHistory'))
const Language    = lazy(() => import('./screens/Language'))
const Security    = lazy(() => import('./screens/Security'))
const About       = lazy(() => import('./screens/About'))
const Onboarding  = lazy(() => import('./screens/Onboarding'))
const PinGate     = lazy(() => import('./screens/PinGate'))

const SCREENS = {
  Login,
  HomeSend, HomeReceive, Swap, MenuScreen,
  PasteAddress, SendAmount, SendConfirm, SendReceipt,
  EnterEmail, CreateQR, ShowQR, SavedQRList,
  Contacts, QRScanner,
  TxHistory,
  Language,
  Security,
  About,
  ComingSoon,
  Onboarding,
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

  const Screen = SCREENS[nav.screen] || SCREENS['Login']

  return (
    <NavContext.Provider value={{ navigate, params: nav.params }}>
      <ErrorBoundary>
        {/* fallback = KHUNG MÀN TRẮNG TRỐNG, cố tình KHÔNG spinner/chữ "đang tải": màn tải trong
            <100ms, nhấp một cái spinner rồi biến còn khó chịu hơn là không có gì. Giữ nền trắng +
            đúng khung .screen → không giật layout khi màn thật hiện ra. */}
        <Suspense fallback={<div className="screen" />}>
          <Screen />
        </Suspense>
      </ErrorBoundary>
    </NavContext.Provider>
  )
}
