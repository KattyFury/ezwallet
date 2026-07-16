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

      <div className="row-3-5 center col" style={{ gap: 14 }}>
        <QRCodeSVG value={walletAddr || '0x'} size={200} level="M" />
        <button onClick={handleCopyAddr} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)' }}>
            {shortenAddr(walletAddr)}
          </span>
          <Icon name={addrCopied ? 'check' : 'copy'} size="var(--is-md-lg)" color={addrCopied ? 'var(--color-primary)' : 'var(--color-muted)'} />
        </button>
      </div>

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        {/* Chữ NGẮN để nằm trọn 1 dòng ở cỡ chung của vùng thông báo (NOTIF_FS) — câu dài cũ
            ("make a QR for the exact amount") tràn ô 350px, bị cắt "…" sẵn rồi. */}
        <NotifArea hints={[
          { label: 'Share', desc: 'send your address' },
          { label: 'Create QR', desc: 'QR for an amount' },
          { label: 'QR Library', desc: 'your saved QRs' },
        ]} />
      </div>

      <div className="row-9 action-grid">
        <button className="action-card" onClick={handleShare}>
          <Icon name="share" size="var(--is-item)" />
          <span>{copied ? t('Đã copy!') : t('Chia sẻ')}</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('CreateQR')}>
          <Icon name="qr" size="var(--is-item)" color="var(--color-white)" />
          <span>{t('Tạo QR')}</span>
        </button>
        <button className="action-card" onClick={() => navigate('SavedQRList')}>
          <Icon name="download" size="var(--is-item)" />
          <span>{t('Kho QR')}</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
