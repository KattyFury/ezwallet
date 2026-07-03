import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t } from '../i18n'

export default function ComingSoon({ title = 'Tính năng này' }) {
  const { navigate, params } = useNav()
  const label = params?.title || title

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t(label)}
      </div>

      <div className="row-2-8" style={{ gap: 12, textAlign: 'center' }}>
        <Icon name="shield" size={48} color="var(--color-faint)" />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{t('Đang xây dựng')}</span>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          {t('Tính năng này sẽ sớm có trong bản cập nhật tiếp theo.')}
        </span>
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-secondary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
