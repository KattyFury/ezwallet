// Cụm số dư dùng chung cho HomeSend / HomeReceive / MenuScreen — chiếm 2 hàng (row-1-2),
// con số là phần to nổi bật.
export default function BalanceHeader({ totalVND, loading }) {
  const num = loading ? '...' : (totalVND || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (
    <div className="row-1-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Số dư căn giữa tuyệt đối; VND treo bên phải (absolute) + căn giữa dọc → không kéo lệch tâm */}
      <span style={{ position: 'relative', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', lineHeight: 1 }}>
        {num}
        <span style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10, fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-normal)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>VND</span>
      </span>
    </div>
  )
}
