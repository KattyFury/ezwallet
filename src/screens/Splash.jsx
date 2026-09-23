import logoLockup from '../../design/logo-lockup.svg'
import { GRADIENT } from '../brandBg'

// SPLASH - Figma node 1:169. The loading screen: it appears while the app is still coming up, so it
// carries NO TEXT AT ALL, only the logo (user, 2026-09-23: "trong splash sẽ ko có chữ gì cả chỉ có logo").
// Nothing here waits or navigates - App.jsx decides what to render; this is purely what "not ready yet"
// looks like.
//
// Coordinates are that node's own numbers converted the same way as every other screen
// (x = px/390 as %, y = px/844 as dvh): the lockup is 199.795x70.021 at y=172, centred but nudged
// +1.9px right of the true centre, which is how the frame draws it.
export default function Splash() {
  return (
    <div className="screen" style={{ background: GRADIENT }}>
      <img
        src={logoLockup} alt="ezwallet"
        style={{
          position: 'absolute', left: 'calc(50% + 1.9px)', top: '20.38dvh',
          transform: 'translateX(-50%)',
          width: '51.23%', height: '8.30dvh',
        }} />
    </div>
  )
}
