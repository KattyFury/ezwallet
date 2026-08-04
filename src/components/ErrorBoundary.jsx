import { Component } from 'react'
import { t } from '../i18n'

// Bắt MỌI lỗi render (throw trong component) → thay vì trắng màn ("app nổ tung"), hiện màn
// khôi phục có nút Reload. Error boundary BẮT BUỘC là class component (React chưa có bản hook).
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ height: '100dvh', maxWidth: 430, margin: '0 auto', background: 'var(--color-white)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>{t('Có lỗi xảy ra')}</div>
        <div style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', maxWidth: 300 }}>
          {t('Ứng dụng gặp lỗi ngoài dự kiến. Ví và tiền của bạn vẫn an toàn. Vui lòng tải lại.')}
        </div>
        {/* Nút đứng một mình → 3/4 màn như .row10-single (user chốt 07-29). Màn này KHÔNG dùng
            .screen (không có --screen-max qua padding) nên viết thẳng công thức. */}
        <button className="btn btn-primary" style={{ width: 'min(75vw, calc(var(--screen-max) * 0.75))' }} onClick={() => window.location.reload()}>{t('Tải lại')}</button>
      </div>
    )
  }
}
