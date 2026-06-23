import { useState } from 'react'
import logoLong from '../../logo-long.png'
import { useNav } from '../nav'

function TermsModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Điều khoản sử dụng</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 'var(--fs-label)', color: '#999999', lineHeight: 1.7 }}>
            Nội dung điều khoản sẽ được cập nhật sớm.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { navigate } = useNav()
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div className="screen">
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <div className="row-1-5 center col" style={{ gap: 12 }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
          Cách đơn giản nhất để dùng stablecoin
        </span>
      </div>

      <div className="row-9 center">
        <button
          className="btn btn-primary"
          style={{ width: '75%' }}
          onClick={() => navigate('EnterEmail')}
        >
          Đăng nhập với Email
        </button>
      </div>

      <div className="row-10 center">
        <span style={{ fontSize: 'var(--fs-label)', color: '#999999', textAlign: 'center', padding: '0 24px' }}>
          Đăng nhập đồng nghĩa bạn chấp nhận{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
            onClick={() => setShowTerms(true)}
          >
            điều khoản sử dụng
          </span>
        </span>
      </div>
    </div>
  )
}
