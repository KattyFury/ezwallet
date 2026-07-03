import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import { useNav } from '../nav'
import { getNotifs, dismissNotif, addNotif } from '../notif'
import { findContactName } from '../store'
import { t } from '../i18n'

// Phát hiện tiền vào (poll ArcScan) → tạo thông báo "đã nhận" (dùng chung mọi màn có NotifArea)
// Chống trùng: mỗi tx hash chỉ thông báo MỘT lần (lưu set hash đã thông báo).
function notifiedHashes() {
  try { return new Set(JSON.parse(localStorage.getItem('ez_notified_hashes') || '[]')) } catch { return new Set() }
}
function markNotified(hash) {
  const s = notifiedHashes(); s.add(hash)
  localStorage.setItem('ez_notified_hashes', JSON.stringify([...s].slice(-100)))
}

function pollIncoming(after) {
  const addr = localStorage.getItem('ez_wallet_addr')
  if (!addr) return
  fetch(`https://testnet.arcscan.app/api?module=account&action=tokentx&address=${addr}&sort=desc&limit=20`)
    .then(r => r.json()).then(d => {
      const recv = (d?.result || []).filter(tx => tx.to?.toLowerCase() === addr.toLowerCase())
      const lastSeen = parseInt(localStorage.getItem('ez_last_recv_ts') || '0')
      if (recv[0]) localStorage.setItem('ez_last_recv_ts', recv[0].timeStamp)
      if (lastSeen) {
        const seen = notifiedHashes()
        recv.filter(tx => parseInt(tx.timeStamp) > lastSeen && !seen.has(tx.hash)).reverse().forEach(tx => {
          const amt = (parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || 6))).toFixed(2)
          // Hiện TÊN DANH BẠ nếu địa chỉ người gửi đã lưu (đồng bộ với thông báo "Đã gửi cho <tên>")
          const fromName = findContactName(tx.from) || `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
          // dedupeKey theo hash — lớp phòng thủ thêm (ngoài seen-set) chống race khi StrictMode
          // chạy 2 fetch poll song song lúc dev.
          addNotif(`${t('Đã nhận')} ${amt} ${tx.tokenSymbol || 'USDC'} ${t('từ')} ${fromName}`, 'received', tx.hash, `recv-${tx.hash}`)
          markNotified(tx.hash)
        })
        after()
      }
    }).catch(() => {})
}

// Kiểu thông báo: NỀN MÀU NHẠT (iOS-style) + icon đậm màu, chữ đen
const STYLE = {
  received: { color: 'var(--color-primary)', bg: 'var(--color-primary-soft)', icon: 'down' },    // nhận = xanh lá
  sent:     { color: 'var(--color-info)',    bg: 'var(--color-info-soft)',    icon: 'up' },       // gửi = xanh dương
  error:    { color: 'var(--color-error)',   bg: 'var(--color-error-soft)',   icon: 'warning' },  // lỗi = đỏ
}

// 1 dòng — bắt buộc 1 hàng (không xuống dòng), cắt "..." nếu dài, để tối đa số thông báo
// hiện được trong vùng cố định (rows 7-8).
const ROW_TEXT = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

// Hint = MỘT thông báo dài nhiều dòng (không phải nhiều thông báo riêng), mức ưu tiên THẤP
// NHẤT, KHÔNG nút X, không bấm được — luôn tồn tại, bị thông báo thật đẩy lên rồi mờ dần
// (như 1 khối) khi hết chỗ hiển thị. Nền VÀNG theo đúng màu cảnh báo/hint quy định của app.
function HintBlock({ lines }) {
  return (
    <div style={{ background: 'var(--color-warning-soft)', borderRadius: 12, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 'var(--fs-label)', color: 'var(--color-content)', textAlign: 'left' }}>
      {lines.map((h, i) => (
        <div key={i} style={ROW_TEXT}><span style={{ fontWeight: 'var(--fw-medium)' }}>{h.label}</span> = {h.desc}</div>
      ))}
    </div>
  )
}

// hints: [{label, desc}] — render CHUNG thành 1 khối. warning: JSX | null — cảnh báo (vd hết
// USDC trả phí). Cả 2 giờ là ITEM trong CÙNG 1 stack với thông báo thật (không early-return
// thay thế nữa) — luôn cuộn+căn đáy+mờ đồng bộ, warning không đè mất hint.
export default function NotifArea({ hints = [], warning = null }) {
  const { navigate } = useNav()
  const [notifs, setNotifs] = useState(getNotifs())
  const scrollRef = useRef(null)
  useEffect(() => { pollIncoming(() => setNotifs(getNotifs())) }, [])
  // Mặc định cuộn tới ĐÁY (thông báo mới nhất) mỗi khi danh sách đổi — cũ hơn phải cuộn lên mới thấy.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [notifs])
  function clear(id, e) { e.stopPropagation(); dismissNotif(id); setNotifs(getNotifs()) }
  // Chỉ giao dịch (nhận/gửi) mới có gì để xem trong Lịch sử — thông báo lỗi không dẫn đi đâu cả.
  function open(n) {
    if (n.type !== 'received' && n.type !== 'sent') return
    navigate('TxHistory', n.hash ? { openHash: n.hash } : {})
  }

  // notifs lưu MỚI NHẤT ở ĐẦU (unshift trong notif.js). Hiển thị theo dòng thời gian, TẤT CẢ
  // CÙNG 1 STACK (không early-return thay thế nữa — đó là bug khiến warning "văng" lên đầu box
  // và đè mất hint): CŨ/ưu tiên thấp nhất ở TRÊN cùng (mờ/mất trước) → MỚI/ưu tiên cao ở DƯỚI
  // cùng (gần hàng nút, luôn thấy trước tiên). Thứ tự ưu tiên: hint (thấp nhất) → warning (vd hết
  // USDC) → thông báo thật (nhận/gửi/lỗi), mới nhất nằm đáy cùng.
  const items = [
    ...(hints.length ? [{ id: 'hint', type: 'hint', hints }] : []),
    ...(warning ? [{ id: 'warning', type: 'warning', node: warning }] : []),
    ...[...notifs].reverse(),
  ]

  return (
    // CUỘN ĐƯỢC (overflowY:auto, không phải hidden) — đầy thì kéo lên xem thêm. Mờ 1/3 hàng
    // (calc(100dvh/30)) ở mép TRÊN (ranh giới hàng 6/7) khi tiến sát nút "Show tokens" phía trên,
    // KHÔNG mờ quá nhiều kẻo mất chỗ đọc nội dung. Scrollbar mảnh (.scroll-thin) cho gọn layout.
    <div ref={scrollRef} className="scroll-thin" style={{
      flex: 1, minHeight: 0, width: '100%', overflowY: 'auto',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black calc(100dvh / 30))',
      maskImage: 'linear-gradient(to bottom, transparent 0, black calc(100dvh / 30))',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: '100%', justifyContent: 'flex-end' }}>
        {items.map(n => {
          if (n.type === 'hint') return <HintBlock key={n.id} lines={n.hints} />
          if (n.type === 'warning') return <div key={n.id}>{n.node}</div>
          const s = STYLE[n.type] || STYLE.sent
          const clickable = n.type === 'received' || n.type === 'sent'
          return (
            // Chiều cao = đúng nút "Gửi" trong Contacts.jsx (height 40, cố định) — đỡ tốn space,
            // hiện được nhiều thông báo hơn trong vùng cố định (hàng 7-8).
            <div key={n.id} onClick={() => open(n)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: s.bg, borderRadius: 12, height: 40, minHeight: 40, padding: '0 14px', cursor: clickable ? 'pointer' : 'default' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-label)', color: 'var(--color-content)', ...ROW_TEXT }}>
                <Icon name={s.icon} size={18} color={s.color} style={{ flexShrink: 0 }} />
                <span style={ROW_TEXT}>{n.text}</span>
              </span>
              <button onClick={e => clear(n.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: 2 }}><Icon name="x" size={14} color={s.color} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
