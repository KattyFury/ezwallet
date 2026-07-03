import { useState, useEffect } from 'react'
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
          addNotif(`${t('Đã nhận')} ${amt} ${tx.tokenSymbol || 'USDC'} ${t('từ')} ${fromName}`, 'received', tx.hash)
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

// Hint = thông báo có mức ưu tiên THẤP NHẤT, KHÔNG nút X, không bấm được — luôn tồn tại,
// bị các thông báo thật (nhận/gửi/lỗi) đẩy lên trên rồi mờ dần khi hết chỗ hiển thị.
function HintRow({ label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-gray)', borderRadius: 12, padding: '12px 14px', fontSize: 'var(--fs-label)', color: 'var(--color-muted)', ...ROW_TEXT }}>
      <span style={{ fontWeight: 'var(--fw-medium)' }}>{label}</span>&nbsp;=&nbsp;{desc}
    </div>
  )
}

// hints: [{label, desc}] — luôn hiện (không phải fallback nữa). warning: JSX | null — cảnh báo
// ưu tiên cao (vd hết USDC trả phí); giữ đúng logic CŨ = chỉ hiện khi CHƯA có thông báo thật nào,
// để không đổi hành vi đã có (user không yêu cầu đổi phần này).
export default function NotifArea({ hints = [], warning = null }) {
  const { navigate } = useNav()
  const [notifs, setNotifs] = useState(getNotifs())
  useEffect(() => { pollIncoming(() => setNotifs(getNotifs())) }, [])
  function clear(id, e) { e.stopPropagation(); dismissNotif(id); setNotifs(getNotifs()) }
  // Chỉ giao dịch (nhận/gửi) mới có gì để xem trong Lịch sử — thông báo lỗi không dẫn đi đâu cả.
  function open(n) {
    if (n.type !== 'received' && n.type !== 'sent') return
    navigate('TxHistory', n.hash ? { openHash: n.hash } : {})
  }

  if (notifs.length === 0 && warning) return warning

  // notifs lưu MỚI NHẤT ở ĐẦU (unshift trong notif.js). Hiển thị theo dòng thời gian: CŨ (hint)
  // ở TRÊN cùng — mờ/mất trước — MỚI NHẤT ở DƯỚI cùng (gần hàng nút, luôn thấy trước tiên).
  const items = [...hints.map((h, i) => ({ ...h, id: `hint-${i}`, type: 'hint' })), ...[...notifs].reverse()]

  return (
    // overflow:hidden + mask fade ở mép TRÊN (biên hàng 6/7) — thông báo bị đẩy lên quá cao
    // mờ dần rồi biến mất, thay vì lấn/đè lên nút "Show tokens" phía trên.
    <div style={{
      flex: 1, minHeight: 0, width: '100%', overflow: 'hidden',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 28px)',
      maskImage: 'linear-gradient(to bottom, transparent 0, black 28px)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: '100%', justifyContent: 'flex-end' }}>
        {items.map(n => {
          if (n.type === 'hint') return <HintRow key={n.id} label={n.label} desc={n.desc} />
          const s = STYLE[n.type] || STYLE.sent
          const clickable = n.type === 'received' || n.type === 'sent'
          return (
            <div key={n.id} onClick={() => open(n)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: s.bg, borderRadius: 12, padding: '12px 14px', cursor: clickable ? 'pointer' : 'default' }}>
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
