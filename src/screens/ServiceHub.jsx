import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { t } from '../i18n'

// ══ SERVICE HUB — trang chủ các dịch vụ (tab 1 navbar, thay tab Swap cũ) ══
// Swap không còn là 1 tab riêng mà là 1 Ô trong đây, đứng cạnh các dịch vụ sẽ làm sau.
// Thêm dịch vụ mới = thêm 1 dòng vào SERVICES, ĐỪNG copy khối JSX ra thành ô thứ 4 rời rạc.
//   screen : tên màn trong SCREENS (App.jsx). null = chưa làm → ô tự mờ + không bấm được.
const SERVICES = [
  { id: 'swap', icon: 'exchange', label: 'Đổi tiền',        screen: 'Swap' },
  { id: 'pig',  icon: 'pig',      label: 'Heo đất',         screen: null },
  { id: 'dca',  icon: 'dca',      label: 'Đầu tư định kỳ',  screen: null },
]

export default function ServiceHub() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Service Hub')}
      </div>

      {/* BOX XÁM hàng 2-9 + lưới 2 CỘT bên trong — ĐÚNG hình học màn Kho QR (user chốt 08-12
          "gần giống bố cục của QR Storage, 3 hình vuông kích cỡ như thế"): padding 10 = ô cách
          lề box 10px, gap 10 giữa các ô. Ô thứ 3 tự rớt xuống hàng dưới, đứng cột trái.
          ⚠️ minmax(0,1fr) chứ KHÔNG phải '1fr' trần: '1fr' để nội dung quyết min-width nên 1 ô
          nội dung to là banh cả cột (bài học 07-23c màn Kho QR).
          ⚠️ alignItems:'start' — mặc định grid là `stretch`, nó KÉO CAO ô theo hàng rồi
          aspectRatio 1 phình ngang theo => 2 cột lệch (đúng bug 07-23c). start = ô tự giữ vuông. */}
      <div style={{ gridRow: '2 / 10', background: 'var(--color-surface)', borderRadius: 20, padding: 10, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignContent: 'start', alignItems: 'start' }}>
          {SERVICES.map(({ id, icon, label, screen }) => {
            const soon = !screen   // chưa làm → mờ + không bấm được (chuẩn disabled của MenuScreen)
            return (
              // Ô VUÔNG NỔI = y hệt ô QR trong Kho QR: trắng + viền xám 1.5 (luật "bấm được trong
              // box xám") + drop shadow .25 như button. aspectRatio 1 → vuông theo bề ngang cột.
              <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
                style={{
                  minWidth: 0, aspectRatio: '1', border: '1.5px solid var(--color-gray)', borderRadius: 16,
                  background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 14, padding: 12, fontFamily: 'inherit',
                  opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
                }}>
                {/* Icon TO (48) — 3 icon này user vẽ ở khung 200×200 riêng cho cỡ lớn. Màu brand
                    xanh = ngôn ngữ icon dẫn đầu của menu-item (user chốt 07-17e). */}
                <Icon name={icon} size={48} color="var(--color-brand)" />
                {/* Nhãn 2 dòng được ("Dollar-Cost Averaging" dài) → KHÔNG whiteSpace:nowrap,
                    căn giữa + lineHeight chặt để 2 dòng vẫn gọn trong ô vuông. */}
                <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', textAlign: 'center', lineHeight: 1.15, maxWidth: '100%' }}>
                  {t(label)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <NavBar active="ServiceHub" />
    </div>
  )
}
