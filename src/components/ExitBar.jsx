// EXIT BAR - the footer action on every gradient+ScreenSheet(no tab) sub-screen reached from Menu
// (Exchange 1:65, Security 58:335, About 58:427 - all the identical node: 22px semibold white, centred,
// sitting in the gradient reveal zone below the white sheet). Replaces the pre-redesign red-text
// `.row-10` Exit (Swap.jsx) now that the shell itself changed from plain-white to gradient+sheet.
export default function ExitBar({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', left: 0, right: 0, top: '95.9dvh', transform: 'translateY(-50%)',
      border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 22, fontWeight: 'var(--fw-semibold)', color: 'var(--color-white)',
    }}>
      Exit
    </button>
  )
}
