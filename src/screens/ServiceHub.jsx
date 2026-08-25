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
  { id: 'luckypot', icon: 'luckypot', label: 'LuckyPot',    screen: null },
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
      {/* marginBottom 2dvh = KHE trước NavBar (user báo 08-13: box xám ăn hết hàng 9 nên dính sát
          navbar). 2dvh là đúng luật chừa đáy đang dùng ở mọi màn khác (action-grid HomeSend/
          HomeReceive, khối nút màn Swap) — đừng chế số khác cho riêng màn này. */}
      <div style={{ gridRow: '2 / 10', marginBottom: '2dvh', background: 'var(--color-surface)', borderRadius: 20, padding: 10, minWidth: 0 }}>
        {/* gridAutoRows '1fr' = MỌI HÀNG CAO BẰNG NHAU, tự lấy theo ô cao nhất. Cần vì nhãn dài
            ngắn khác nhau ở cỡ chữ 30: "Swap" 1 dòng · "Piggy Bank" 2 dòng · "Dollar-Cost
            Averaging" 3 dòng → để mặc thì 3 ô cao 147/180/213, so le rất xấu (đo 08-13).
            KHÔNG dùng alignItems:'start' nữa — phải để `stretch` mặc định thì ô mới giãn đầy hàng.
            (Cặp aspectRatio + stretch mới là thứ gây bug phình ngang 07-23c; ở đây đã bỏ
            aspectRatio nên stretch an toàn.) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridAutoRows: '1fr', gap: 10, alignContent: 'start' }}>
          {SERVICES.map(({ id, icon, label, screen }) => {
            const soon = !screen   // chưa làm → mờ + không bấm được (chuẩn disabled của MenuScreen)
            return (
              // Ô NỔI = y hệt ô QR trong Kho QR: trắng + viền xám 1.5 (luật "bấm được trong box
              // xám") + drop shadow .25 như button.
              // ⚠️ KHÔNG còn aspectRatio 1 (bản đầu 08-12): chữ lên cỡ tiêu đề 30px thì
              // "Dollar-Cost Averaging" chiếm 2 dòng ≈ 70px, cộng icon 64 là vượt 160px bề ngang
              // cột ⇒ ép vuông là tràn chữ ra ngoài ô. minHeight theo bề ngang cột (aspect-ratio
              // của MIN chứ không phải của size) → ô nào chữ ngắn vẫn vuông, ô chữ dài tự cao thêm.
              <button key={id} disabled={soon} onClick={soon ? undefined : () => navigate(screen)}
                style={{
                  minWidth: 0, border: '1.5px solid var(--color-gray)', borderRadius: 16,
                  background: 'var(--color-white)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: '16px 10px', fontFamily: 'inherit',
                  opacity: soon ? 0.4 : 1, cursor: soon ? 'not-allowed' : 'pointer',
                }}>
                {/* Icon 56 — 3 icon này user vẽ ở khung 200×200 riêng cho cỡ lớn. Màu brand xanh =
                    ngôn ngữ icon dẫn đầu của menu-item (user chốt 07-17e).
                    ⚠️ CỠ ĐÃ CHỐT SAU 2 LẦN LỆCH (user 08-13): 48+chữ 17 = "nhỏ quá",
                    64+chữ 30 = "to quá" → chốt ở GIỮA: icon 56 + chữ 21. ĐỪNG đẩy lại 2 cực. */}
                <Icon name={icon} size={56} color="var(--color-brand)" />
                {/* Chữ = --fs-md-lg 21 = ĐÚNG cỡ chữ NÚT của app (mấy ô này vốn là button) → cân
                    với icon 56 mà vẫn to hơn hẳn bản 17 cũ. Nhãn dài xuống 2 dòng → KHÔNG
                    whiteSpace:nowrap; lineHeight 1.15 để 2 dòng vẫn gọn. */}
                <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', textAlign: 'center', lineHeight: 1.15, maxWidth: '100%' }}>
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
