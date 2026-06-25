import { useState } from 'react'
import logoLong from '../../logo-long.png'
import mailWhite from '../../mail-white.png'
import { useNav } from '../nav'

export default function Login() {
  const { navigate } = useNav()
  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: 12 }}>
        <img src={logoLong} alt="ezwallet" style={{ width: '50%' }} />
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
          Công nghệ mới, trải nghiệm quen thuộc
        </span>
      </div>

      <div className="row-9 center">
        <button
          className="btn btn-primary"
          style={{ width: '75%' }}
          onClick={() => navigate('EnterEmail')}
        >
          <img src={mailWhite} alt="" style={{ width: 18, height: 18, marginRight: 8, verticalAlign: 'middle' }} />
          Đăng nhập với Email
        </button>
      </div>    </div>
  )
}
