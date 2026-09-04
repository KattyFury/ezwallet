import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { saveImageToPhotos, brandedQrCanvas } from '../saveImage'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import NotifArea from '../components/NotifArea'
import { useNav } from '../nav'
import { getTokenBalances, cachedBalances } from '../chain'
import { ensureWalletAddress } from '../privy'
import { buildQR } from '../qr'

export default function HomeReceive() {
  const { navigate } = useNav()
  const [copied, setCopied] = useState(false)
  const [addrCopied, setAddrCopied] = useState(false)   // a copy state just for the button under the QR (separate from "Share")
  const qrRef = useRef(null)   // hidden canvas used to export the QR image for Share
  // Seed the total balance from cache → no "..." when switching screens. NO cache yet → null (NOT KNOWN YET),
  // NOT 0 - see the note about the same bug in MenuScreen (07-16: the screen drew "$0.00" while loading).
  const [totalUsd, setTotalUsd] = useState(() => { const c = cachedBalances(localStorage.getItem('ez_wallet_addr')); return c ? c.reduce((s, t) => s + t.usd, 0) : null })
  const [walletAddr, setWalletAddr] = useState(localStorage.getItem('ez_wallet_addr') || '')

  // Re-fetch the wallet address if missing (wallet created but Circle provisioning is slow)
  useEffect(() => {
    if (walletAddr) return
    ensureWalletAddress().then(a => { if (a) setWalletAddr(a) })
  }, [])

  useEffect(() => {
    if (!walletAddr) return
    // catch: on a failed read KEEP the old number, never let it collapse to 0 (getTokenBalances now throws instead of inventing 0)
    getTokenBalances(walletAddr).then(ts => setTotalUsd(ts.reduce((s, t) => s + t.usd, 0))).catch(() => {})
  }, [walletAddr])

  // Share = the QR IMAGE (with logo + the "Only Arc Testnet" label) **PLUS the WALLET ADDRESS AS TEXT** - user decision
  // 08-13: "as long as it shares 2 things, not 1".
  //
  // ⚠️ A KNOWN, ACCEPTED TRADE-OFF: including `text` makes iOS FILTER the apps offered in the share sheet
  // (Messages can disappear - exactly the bug reported on the morning of 08-13). The first fix dropped the text and DREW the
  // address onto the image; the user disliked it ("putting the address on the QR looks awful") and chose the text back. Do NOT drop `text`
  // again to "fix" the app list - that is the user's decision, not a bug.
  async function handleShare() {
    const qrCanvas = qrRef.current?.querySelector('canvas')
    if (!qrCanvas || !navigator.canShare) {
      // Device cannot share images → copy the address so the tap still does something
      await navigator.clipboard.writeText(walletAddr)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      return
    }
    saveImageToPhotos(await brandedQrCanvas(qrCanvas), 'ezwallet-qr.png', walletAddr)
  }

  async function handleCopyAddr() {
    await navigator.clipboard.writeText(walletAddr)
    setAddrCopied(true)
    setTimeout(() => setAddrCopied(false), 1500)
  }

  return (
    <div className="screen">
      <BalanceHeader totalUsd={totalUsd} loading={totalUsd === null} />

      {/* Hidden high-quality canvas so Share can export a PNG → "Save Image" into the photo library */}
      <div ref={qrRef} style={{ position: 'absolute', left: -9999, top: -9999 }} aria-hidden>
        <QRCodeCanvas value={walletAddr ? buildQR(walletAddr) : '0x'} size={512} level="M" includeMargin />
      </div>

      {/* ⚠️ THE QR NOW SITS ON A CARD (2026-09-05, Figma frame 7): a --color-surface rounded box at
          15.62dvh → 55dvh, the SAME box as the token list on the Send tab (frame 6 draws them at
          identical coordinates, x=19.97 w=350.06 y=131.87). Receive had no card at all before - the
          QR floated on white - so the two tabs did not read as the same screen with different
          contents. Positioned exactly as HomeSend's box; see the long note there for why the bottom
          stays on the shared 55dvh line rather than frame 7's own 55.55, AND why this is absolutely
          positioned rather than a grid item (a fixed-height grid item silently stretches the
          10-row grid it sits in).
          The QR stays CENTRED in the box (user decision 07-19: it was once rows 3-6 with a
          paddingBottom "making room" for the address line, which pushed it off-centre - the address
          button is absolute and overlaps nothing, so plain centring is correct). */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '15.62dvh', height: '39.38dvh',
        background: 'var(--color-surface)', borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0,
      }}>
        {/* ⚠️ No more bare `0x…` addresses (user decision 08-13) - EVM addresses are identical on EVERY
            chain, so a wallet on Ethereum/Base/BSC scanning it sends on the wrong chain and the money is GONE. buildQR wraps
            it in a private scheme + the Arc chainId; see src/qr.js.
            Anyone who needs the plain address (topping up from an exchange or another wallet) taps the copy button under the QR. */}
        {/* 283.45 square on the 390×844 board (Figma frame 7) = 33.58dvh / 72.68vw, up from
            min(30dvh, 78vw). ⚠️ ShowQR.jsx carries the SAME formula on purpose (HANDOFF §6: "the big
            QR = the same size as on the Receive screen") - change one, change both. */}
        <QRCodeSVG value={walletAddr ? buildQR(walletAddr) : '0x'} size={512} level="M" style={{ width: 'min(33.58dvh, 72.68vw)', height: 'min(33.58dvh, 72.68vw)' }} />
      </div>
      {/* Address + copy: absolutely positioned at top 55% = the SAME coordinates as the "Hold to show tokens" button on Send
          (user decision 07-17f "all the better") - switching between the 2 tabs, the secondary line stays in one place.
          07-19: the shortened address and separate copy icon were hidden, leaving one instruction line "tap to copy" -
          FULLY MATCHING the button style of ShowTokensButton (HomeSend.jsx) so the 2 tabs form a pair (user decision:
          same white pill with a grey border, same font size, so they read as a PAIR of buttons and not floating text). */}
      <button onClick={handleCopyAddr} style={{
        position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', zIndex: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40,
        // ⚠️ WIDTH HUGS THE TEXT (user decision 08-13) - the fixed 3/4-screen width from 07-29 was dropped. This button and
        // "Hold to show tokens" (HomeSend) are now UNEQUAL because the two sentences differ in length;
        // that is intended, do not "even them up". If you change one button, change the other to the same formula.
        maxWidth: 'min(92vw, calc(var(--screen-max) - 24px))', overflow: 'hidden', textOverflow: 'ellipsis',
        padding: '0 18px', borderRadius: 50, border: '1.5px solid var(--color-gray)', background: 'var(--color-white)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
        color: addrCopied ? 'var(--color-primary)' : 'var(--color-content)', fontFamily: 'var(--font-condensed)',
        fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-medium)', cursor: 'pointer', whiteSpace: 'nowrap',
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}>
        {addrCopied ? 'Copied!' : 'Tap to copy your wallet address'}
      </button>

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        {/* Each line = one COMPLETE SENTENCE whose underlined keyword is TAPPABLE → going where the button of the same name
            in row 9 goes (user decision 07-21). The order matches the button layout: QR Storage · Create QR · Share. */}
        {/* pollMs 5s (user decision 08-13): this is the screen where someone HAS JUST HELD OUT THEIR QR AND IS WAITING for the
            money → poll far more often than the Send screen (15s default). See NotifArea. */}
        <NotifArea pollMs={5000} hints={[
          { label: 'QR Storage', desc: 'Save your favorite QR codes', onClick: () => navigate('SavedQRList') },
          { label: 'Create QR', desc: 'Create a QR to receive money', onClick: () => navigate('CreateQR') },
          // "QR + address" (user fix 08-13) - describing EXACTLY the 2 things being sent: the QR IMAGE (with logo +
          // network label) and the ADDRESS as text. See handleShare above.
          { label: 'Share', desc: 'Share your QR + wallet address', onClick: handleShare },
        ]} />
      </div>

      {/* Button order 07-19 (user decision): QR Storage left · Create QR centre · Share RIGHT - most people are
          right-handed, so the most-used button (Share) sits on the right where it is easy to reach. */}
      <div className="row-9 action-grid">
        <button className="action-card" onClick={() => navigate('SavedQRList')}>
          <Icon name="download" size="var(--is-item)" />
          <span>QR Storage</span>
        </button>
        <button className="action-card primary" onClick={() => navigate('CreateQR')}>
          <Icon name="qr" size="var(--is-item)" color="var(--color-white)" />
          <span>Create QR</span>
        </button>
        <button className="action-card" onClick={handleShare}>
          <Icon name="share" size="var(--is-item)" />
          <span>{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      <NavBar active="HomeReceive" />
    </div>
  )
}
