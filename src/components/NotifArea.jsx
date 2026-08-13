import { useState, useEffect, useRef } from 'react'
import Icon from './Icon'
import { useNav } from '../nav'
import { getNotifs, dismissNotif, addNotif } from '../notif'
import { isFaucetAddress } from '../chain'
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

// Chống chồng lệnh: mạng chậm mà nhịp hỏi tới thì bỏ qua nhịp đó, đừng bắn 2 request song song.
let polling = false

function pollIncoming(after) {
  const addr = localStorage.getItem('ez_wallet_addr')
  if (!addr || polling) return
  polling = true
  fetch(`https://testnet.arcscan.app/api?module=account&action=tokentx&address=${addr}&sort=desc&limit=20`)
    .then(r => r.json()).then(d => {
      const all = d?.result || []
      const lower = addr.toLowerCase()
      // Hash nào ví vừa GỬI ĐI (from = ví) VÀ nhận về = giao dịch SWAP (đổi token, cùng 1 tx).
      // → thông báo tiền-vào của swap phải nói "đổi tiền xong", KHÔNG phải "nhận từ người lạ"
      // (người bán rau nhìn địa chỉ contract lạ sẽ hoang mang). Vẫn giữ 2 thông báo riêng.
      const outHashes = new Set(all.filter(tx => tx.from?.toLowerCase() === lower).map(tx => tx.hash))
      const recv = all.filter(tx => tx.to?.toLowerCase() === lower)
      const lastSeen = parseInt(localStorage.getItem('ez_last_recv_ts') || '0')
      if (recv[0]) localStorage.setItem('ez_last_recv_ts', recv[0].timeStamp)
      if (lastSeen) {
        const seen = notifiedHashes()
        recv.filter(tx => parseInt(tx.timeStamp) > lastSeen && !seen.has(tx.hash)).reverse().forEach(tx => {
          const amt = (parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || 6))).toFixed(2)
          const symbol = tx.tokenSymbol || 'USDC'
          // FAUCET — 2 cách nhận biết, ưu tiên cách chắc chắn:
          // 1) Địa chỉ gửi NẰM TRONG danh sách faucet đã tra từ ArcScan (chain.js) — chắc ăn, không
          //    phụ thuộc user có bấm nút Faucet trong app hay không, không hết hạn.
          // 2) Cờ ez_faucet_pending (user vừa bấm nút Faucet ở HomeSend, trong 1h) — lưới vớt cho
          //    faucet MỚI chưa có trong danh sách.
          // ⚠️ 2 BUG CŨ đã sửa (user báo 07-17: "Received 20.00 EURC from 0xd4c0…daae" thay vì
          //    "Faucet successful"):
          //    - Cũ chặn `symbol === 'USDC'` → faucet Circle phát 1 LƯỢT CẢ BA token (USDC 20 +
          //      EURC 20 + cirBTC dust) nên EURC/cirBTC rớt xuống nhánh "nhận từ 0x…lạ".
          //    - Cũ `removeItem('ez_faucet_pending')` ngay sau token ĐẦU TIÊN → 2 token còn lại của
          //      cùng lượt faucet đó mất cờ. Giờ KHÔNG xoá trong vòng lặp (cờ tự hết hạn sau 1h).
          const faucetPending = parseInt(localStorage.getItem('ez_faucet_pending') || '0')
          const isFaucet = isFaucetAddress(tx.from) || (faucetPending && Date.now() - faucetPending < 3600000)
          if (outHashes.has(tx.hash)) {
            // Leg VÀO của swap: KHÔNG thêm thông báo nhận riêng (user chốt 07-20 gộp 2 thông báo swap
            // làm 1) — màn Swap đã bắn "Swapped X to ~Y (complete)". Vẫn markNotified để không lặp.
          } else if (isFaucet) {
            addNotif(`Faucet successful · received ${amt} ${symbol}`, 'received', tx.hash, `recv-${tx.hash}`)
          } else {
            // Hiện TÊN DANH BẠ nếu địa chỉ người gửi đã lưu (đồng bộ thông báo "Đã gửi cho <tên>")
            const fromName = findContactName(tx.from) || `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
            addNotif(`${t('Đã nhận')} ${amt} ${symbol} ${t('từ')} ${fromName}`, 'received', tx.hash, `recv-${tx.hash}`)
          }
          markNotified(tx.hash)
        })
        after()
      }
    }).catch(() => {}).finally(() => { polling = false })
}

// Kiểu thông báo: NỀN MÀU NHẠT (iOS-style) + icon đậm màu, chữ đen
const STYLE = {
  received: { color: 'var(--color-primary)', bg: 'var(--color-primary-soft)', icon: 'down' },    // nhận = xanh lá
  sent:     { color: 'var(--color-info)',    bg: 'var(--color-info-soft)',    icon: 'up' },       // gửi = xanh dương
  error:    { color: 'var(--color-error)',   bg: 'var(--color-error-soft)',   icon: 'warning' },  // lỗi = đỏ
}

// 1 dòng — bắt buộc 1 hàng (không xuống dòng), cắt "..." nếu dài, để tối đa số thông báo
// hiện được trong vùng cố định (rows 7-8).
// minWidth:0 BẮT BUỘC: đây là flex item, mặc định min-width:auto = KHÔNG co dưới bề rộng chữ →
// nowrap sẽ ĐẨY RỘNG cả hàng thay vì cắt "…" (chính là thứ làm phình cột grid, lệch cả màn).
const ROW_TEXT = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }

// MỘT CỠ CHỮ DUY NHẤT cho cả vùng thông báo (hint / cảnh báo / thông báo thật) — trước đây hint và
// cảnh báo dùng --fs-label (15) còn thông báo dùng --fs-body (19) → cùng 1 chỗ mà cái to cái nhỏ.
// Chọn --fs-item 17 (user chốt 2026-07-16): đủ to cho người già, mà câu thông báo dài (vd
// "Faucet successful · received 20.00 EURC") vẫn nằm gần trọn 1 dòng — 19px thì cắt "…" mất SỐ TIỀN.
// Icon trong vùng này lấy cặp --is-item.
export const NOTIF_FS = 'var(--fs-item)'

// Hint = MỘT thông báo dài nhiều dòng (không phải nhiều thông báo riêng), mức ưu tiên THẤP
// NHẤT, KHÔNG nút X, không bấm được — luôn tồn tại, bị thông báo thật đẩy lên rồi mờ dần
// (như 1 khối) khi hết chỗ hiển thị. HINT CHUẨN TOÀN APP (user chốt 07-22d): nền TRẮNG + VIỀN
// XANH brand + chữ XANH (đồng bộ chip gợi ý số tiền Swap + chip sign-in) — KHÔNG nền vàng,
// KHÔNG icon bóng đèn (user chốt 07-22e: bỏ icon hint.svg cho giống mọi hint khác — chỉ chữ + viền).
// Format (user chốt 07-21): mỗi dòng là 1 CÂU HOÀN CHỈNH, từ khoá đầu câu = medium + BẤM ĐƯỢC
// (đi đúng nơi mà nút cùng tên ở hàng 9 dẫn tới). Câu dài → cho XUỐNG DÒNG
// (không nowrap/ellipsis như thông báo thật, kẻo cắt mất nghĩa).
// DÒNG ĐẦU = GIỚI HẠN MẠNG (user chốt 08-13). Đặt CỨNG ở đây, KHÔNG truyền prop từ 2 màn:
// HomeSend và HomeReceive phải nói y hệt nhau, tách ra 2 chỗ là sớm muộn cũng lệch câu.
// ⚠️ MÀU: dùng --color-error (#DC2626, đỏ) chứ KHÔNG dùng --color-warning (#F59E0B, vàng) —
// vàng trên nền TRẮNG chỉ tương phản ~2.1:1, người lớn tuổi đọc không ra (đúng bài học đã ghi ở
// mục 5 HANDOFF về chữ trắng trên vàng). Đỏ trên trắng ~4.8:1, vẫn là màu "quan trọng" của app.
function HintBlock({ lines }) {
  return (
    // padding/gap NÉN LẠI 08-13 (từ '8px 14px' + gap 4): thêm dòng cảnh báo là khối thành 4 dòng,
    // đo được cao 122px trong khi vùng thông báo (hàng 7-8) chỉ 120px → mép trên bị mặt nạ mờ liếm
    // vào chữ. Nén còn 6px/12px + gap 3 để 4 dòng nằm gọn. ĐỪNG nới lại nếu chưa bỏ bớt dòng.
    <div style={{ background: 'var(--color-white)', border: '1.5px solid var(--color-brand)', borderRadius: 12, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 3, fontSize: NOTIF_FS, color: 'var(--color-brand)', textAlign: 'left' }}>
      <div style={{ minWidth: 0, lineHeight: 1.35, color: 'var(--color-error)', fontWeight: 'var(--fw-semibold)' }}>
        {t('Ví hiện chỉ hỗ trợ Arc Testnet')}
      </div>
      {lines.map((h, i) => (
        <div key={i} style={{ minWidth: 0, lineHeight: 1.35 }}>
          <span
            onClick={h.onClick ? e => { e.stopPropagation(); h.onClick() } : undefined}
            style={{ fontWeight: 'var(--fw-medium)', cursor: h.onClick ? 'pointer' : 'default' }}
          >{h.label}</span>{h.desc ? `: ${h.desc}` : ''}
        </div>
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
  // ⚠️ BUG USER BÁO 08-13: "thông báo nhận tiền xuất hiện rất lâu".
  // GỐC: hàm tên `pollIncoming` (poll = hỏi LẶP LẠI) nhưng trước đây gọi ĐÚNG MỘT LẦN lúc mở màn
  // (`useEffect(..., [])`) và TOÀN APP KHÔNG CÓ setInterval nào. Ngồi yên ở màn Gửi/Nhận thì tiền
  // về cũng không ai hỏi lại → thông báo chỉ hiện khi user vô tình chuyển tab qua lại (remount).
  // Gửi tiền thì hiện NGAY vì màn Biên lai tự `addNotif` tại chỗ, không phải hỏi mạng — nên chỉ
  // chiều NHẬN bị chậm, đúng như user mô tả.
  // VÌ SAO PHẢI SỬA: app cho người lớn tuổi. Người ta được báo "đã chuyển tiền rồi" mà mở app ra
  // không thấy gì thì LO, rồi gọi điện hỏi, rồi bấm lung tung. Im lặng ở đây không phải lỗi nhỏ.
  //
  // 15s: Arc chốt khối dưới 1s, phần trễ còn lại là ArcScan lập chỉ mục. 15s đủ nhanh để người ta
  // không kịp lo, mà không dội API. ĐỪNG hạ xuống vài giây — mỗi nhịp là 1 request cho MỌI máy.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') pollIncoming(() => setNotifs(getNotifs())) }
    tick()                                   // hỏi ngay lúc mở màn (giữ nguyên hành vi cũ)
    const id = setInterval(tick, 15000)
    // Quay lại app thì hỏi NGAY, không đợi hết nhịp: kịch bản thường gặp nhất là "được báo đã
    // chuyển tiền" → mở app lên → phải thấy liền. Cũng là lý do tick() bỏ qua khi tab đang ẩn:
    // chạy nền chỉ tốn pin/dữ liệu vì user có nhìn đâu mà thấy.
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  // Mặc định cuộn tới ĐÁY (thông báo mới nhất) mỗi khi danh sách đổi — cũ hơn phải cuộn lên mới thấy.
  // BUG đã sửa: thiếu `warning` trong dependency → khi warning xuất hiện SAU (vd sau khi tải xong
  // số dư token, async, trễ hơn lần render đầu) thì effect không chạy lại, để scroll bị "kẹt" giữa
  // chừng thay vì tụt xuống đáy mới — khiến cả 2 thông báo không cái nào hiện trọn.
  // Dùng !!warning (boolean) + hints.length (number) — KHÔNG dùng thẳng object/array (warning/hints
  // là JSX/array MỚI mỗi lần cha re-render, vd lúc giữ nút "Show tokens" — nếu dùng reference sẽ
  // kéo cuộn về đáy MỌI LẦN re-render không liên quan, làm gián đoạn người đang đọc thông báo cũ).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [notifs, !!warning, hints.length])
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
    <div ref={scrollRef} className="scroll-hidden" style={{
      flex: 1, minHeight: 0, width: '100%',
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: NOTIF_FS, color: 'var(--color-content)', ...ROW_TEXT }}>
                <Icon name={s.icon} size="var(--is-item)" color={s.color} style={{ flexShrink: 0 }} />
                <span style={ROW_TEXT}>{n.text}</span>
              </span>
              <button onClick={e => clear(n.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: 2 }}><Icon name="x" size="var(--is-label)" color={s.color} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
