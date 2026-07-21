import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { saveImageToPhotos } from '../saveImage'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import NotifArea from '../components/NotifArea'
import { useNav } from '../nav'
import { getTokenBalances, cachedBalances } from '../chain'
import { ensureWalletAddress } from '../circle'
import { t } from '../i18n'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [addrCopied, setAddrCopied] = useState(false)   // copy riêng cho nút dưới QR (khác nút "Chia sẻ")
  const qrRef = useRef(null)   // canvas ẩn để xuất ảnh QR khi Share
  // Seed tổng số dư từ cache → không "..." khi chuyển màn. CHƯA có cache → null (CHƯA BIẾT),
  // KHÔNG phải 0 — xem chú thích cùng bug ở MenuScreen (07-16: màn vẽ "$0.00" lúc đang tải).
  const [totalUsd, setTotalUsd] = useState(() => { const c = cachedBalances(localStorage.getItem('ez_wallet_addr')); return c ? c.reduce((s, t) => s + t.usd, 0) : null })
  const [walletAddr, setWalletAddr] = useState(localStorage.getItem('ez_wallet_addr') || '')

  // Lấy lại địa chỉ ví nếu thiếu (tạo ví xong nhưng Circle provision chậm)
  useEffect(() => {
    if (walletAddr) return
    ensureWalletAddress().then(a => { if (a) setWalletAddr(a) })
  }, [])

  useEffect(() => {
    if (!walletAddr) return
    // catch: đọc hỏng thì GIỮ số cũ, đừng để văng thành 0 (getTokenBalances giờ ném lỗi thay vì bịa 0)
    getTokenBalances(walletAddr).then(ts => setTotalUsd(ts.reduce((s, t) => s + t.usd, 0))).catch(() => {})
  }, [walletAddr])

  // Share = chia sẻ ẢNH QR (PNG) kèm text địa chỉ → sheet iOS có "Save Image" (lưu vào kho ảnh) +
  // vẫn mang địa chỉ ví. (Muốn copy riêng địa chỉ thì bấm vào địa chỉ dưới QR — handleCopyAddr.)
  async function handleShare() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (canvas && navigator.canShare) { saveImageToPhotos(canvas, 'ezwallet-qr.png', walletAddr); return }
    // Fallback (không hỗ trợ share ảnh): copy địa chỉ
    await navigator.clipboard.writeText(walletAddr)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyAddr() {
    await navigator.clipboard.writeText(walletAddr)
    setAddrCopied(true)
    setTimeout(() => setAddrCopied(false), 1500)
  }

  return (
    <div className="screen">
      <BalanceHeader totalUsd={totalUsd} loading={totalUsd === null} />

      {/* Canvas ẩn (chất lượng cao) để Share xuất ra PNG → "Save Image" vào kho ảnh */}
      <div ref={qrRef} style={{ position: 'absolute', left: -9999, top: -9999 }} aria-hidden>
        <QRCodeCanvas value={walletAddr || '0x'} size={512} level="M" includeMargin />
      </div>

      {/* QR neo ĐÚNG hàng 3-5 (user chốt 07-19: trước để 3-6 + paddingBottom "nhường chỗ" cho dòng
          địa chỉ ở hàng 6 → QR bị đẩy lệch tâm khỏi khối 3 hàng. Giờ hàng 6 dành riêng cho
          nút địa chỉ, không chồng lấn nữa nên QR canh giữa thẳng trong đúng 3 hàng). */}
      <div style={{ gridRow: '3 / 6', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={512} level="M" style={{ width: 'min(30dvh, 78vw)', height: 'min(30dvh, 78vw)' }} />
      </div>
      {/* Địa chỉ + copy: neo absolute top 55% = TRÙNG toạ độ nút "Hold to show tokens" màn Gửi
          (user chốt 07-17f "càng tốt") — qua lại 2 tab, dòng phụ nằm đúng 1 chỗ.
          07-19: ẩn địa chỉ rút gọn + icon copy riêng, chỉ còn 1 dòng hướng dẫn "bấm để copy" —
          ĐỒNG BỘ hẳn kiểu nút với ShowTokensButton (HomeSend.jsx) cho khớp cặp 2 tab (user chốt:
          cùng pill trắng viền xám, cùng cỡ chữ, để nhìn như 1 CẶP nút chứ không phải chữ trôi nổi). */}
      <button onClick={handleCopyAddr} style={{
        position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', zIndex: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40,
        padding: '0 22px', borderRadius: 50, border: '1.5px solid var(--color-gray)', background: 'var(--color-white)',
        color: addrCopied ? 'var(--color-primary)' : 'var(--color-muted)', fontFamily: 'var(--font-condensed)',
        fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', cursor: 'pointer', whiteSpace: 'nowrap',
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}>
        {addrCopied ? t('Đã copy!') : t('Bấm để copy địa chỉ ví của bạn')}
      </button>

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        {/* Mỗi dòng = 1 CÂU đủ nghĩa, từ khoá gạch chân BẤM ĐƯỢC → đi đúng nơi nút cùng tên ở
            hàng 9 dẫn tới (user chốt 07-21). Thứ tự khớp layout nút: QR Storage · Create QR · Share. */}
        <NotifArea hints={[
          { label: 'QR Storage', desc: 'Keep your most frequently used QR codes', onClick: () => navigate('SavedQRList') },
          { label: 'Create QR', desc: 'Create a QR code to receive the exact amount', onClick: () => navigate('CreateQR') },
          // "via many ways" SAI ngữ pháp (via đã nghĩa là "qua/bằng") → "in many ways"
          { label: 'Share', desc: 'Share your wallet address in many ways', onClick: handleShare },
        ]} />
      </div>

      {/* Thứ tự nút 07-19 (user chốt): QR Storage trái · Create QR giữa · Share PHẢI — đa số thuận
          tay phải, nút bấm nhiều nhất (Share) nên nằm bên phải dễ với. */}
      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('SavedQRList')}>
          <Icon name="download" size="var(--is-item)" />
          <span>{t('Kho QR')}</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('CreateQR')}>
          <Icon name="qr" size="var(--is-item)" color="var(--color-white)" />
          <span>{t('Tạo QR')}</span>
        </button>
        <button className="action-card" onClick={handleShare}>
          <Icon name="share" size="var(--is-item)" />
          <span>{copied ? t('Đã copy!') : t('Chia sẻ')}</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
