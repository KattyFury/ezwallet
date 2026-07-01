import { useState, useEffect } from 'react'
import Icon from './Icon'

// Banner lỗi nổi tạm thời — dùng cho màn KHÔNG có NotifArea (vd SendAmount) khi bị
// điều hướng về kèm lỗi (PIN sai, gửi thất bại...). Không có nó, người dùng chỉ
// thấy "tự nhiên bị đá về" mà không rõ vì sao. Tự ẩn sau vài giây hoặc bấm X.
export default function ErrorToast({ message }) {
  const [visible, setVisible] = useState(!!message)

  useEffect(() => {
    setVisible(!!message)
    if (!message) return
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [message])

  if (!visible || !message) return null

  return (
    <div style={{
      position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 30px)', maxWidth: 400, zIndex: 200,
      background: 'var(--color-error-soft)', borderRadius: 12, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <Icon name="warning" size={18} color="var(--color-error)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 'var(--fs-label)', color: 'var(--color-content)' }}>{message}</span>
      <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: 2 }}>
        <Icon name="x" size={14} color="var(--color-error)" />
      </button>
    </div>
  )
}
