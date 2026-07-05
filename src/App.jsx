import { useState, useEffect } from 'react'
import { NavContext } from './nav'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './screens/Login'
import HomeSend from './screens/HomeSend'
import HomeReceive from './screens/HomeReceive'
import Swap from './screens/Swap'
import MenuScreen from './screens/MenuScreen'
import PasteAddress from './screens/PasteAddress'
import SendAmount from './screens/SendAmount'
import SendConfirm from './screens/SendConfirm'
import SendReceipt from './screens/SendReceipt'
import EnterEmail from './screens/EnterEmail'
import CreateQR from './screens/CreateQR'
import ShowQR from './screens/ShowQR'
import SavedQRList from './screens/SavedQRList'
import Contacts from './screens/Contacts'
import QRScanner from './screens/QRScanner'
import ComingSoon from './screens/ComingSoon'
import TxHistory from './screens/TxHistory'
import Language from './screens/Language'
import Security from './screens/Security'
import About from './screens/About'
import Onboarding from './screens/Onboarding'
import PinGate from './screens/PinGate'

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
        <Screen />
      </ErrorBoundary>
    </NavContext.Provider>
  )
}
