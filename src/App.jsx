import { useState } from 'react'
import { NavContext } from './nav'
import Login from './screens/Login'
import CreatePin from './screens/CreatePin'
import Recovery from './screens/Recovery'
import EnterPin from './screens/EnterPin'
import PinLocked from './screens/PinLocked'
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

const SCREENS = {
  Login, CreatePin, Recovery,
  EnterPin, PinLocked,
  HomeSend, HomeReceive, Swap, MenuScreen,
  PasteAddress, SendAmount, SendConfirm, SendReceipt,
  EnterEmail, CreateQR, ShowQR, SavedQRList,
  Contacts, QRScanner,
  TxHistory: ComingSoon,
  Language: ComingSoon,
  Security: ComingSoon,
  About: ComingSoon,
}

export default function App() {
  const [nav, setNav] = useState(() => ({
    screen: localStorage.getItem('ez_pin') ? 'EnterPin' : 'Login',
    params: {},
  }))

  function navigate(screen, params = {}) {
    setNav({ screen, params })
  }

  const Screen = SCREENS[nav.screen] || SCREENS['Login']

  return (
    <NavContext.Provider value={{ navigate, params: nav.params }}>
      <Screen />
    </NavContext.Provider>
  )
}
