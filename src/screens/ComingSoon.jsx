import { useNav } from '../nav'

export default function ComingSoon({ title = 'Tính năng này' }) {
  const { navigate, params } = useNav()
  const label = params?.title || title

  return (
    <div className="screen">
      <div className="row-1 center" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-bold)' }}>
        {label}
      </div>

      <div className="row-2-8" style={{ gap: 12, textAlign: 'center' }}>
        <span style={{ fontSize: 32 }}>🔧</span>
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>Đang xây dựng</span>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Tính năng này sẽ sớm có trong bản cập nhật tiếp theo.
        </span>
      </div>

      <div className="row-9 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('MenuScreen')}>Quay lại</button>
      </div>
    </div>
  )
}
