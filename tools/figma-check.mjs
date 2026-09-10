// FIGMA ↔ APP PIXEL CHECK
//
// Why this exists: on 2026-09-10 three rounds of "it looks right" were wrong. Comparing screenshots by
// eye missed a balance rendering at 28px instead of 50px, a missing grey card, a 12px offset on a button
// row and a navbar cell that had been deleted outright. Every one of them fell out immediately once the
// app render and the Figma render were overlaid and specific pixels were read. Do not skip this step.
//
// SETUP (playwright is deliberately NOT a project dependency - it pulls a browser):
//   npm i --no-save playwright && npx playwright install chromium
//
// USE:
//   npm run mock                                   # dev server on :5173 with fake balances
//   node tools/figma-check.mjs HomeSend ref.png    # → figma-check/diff_HomeSend.png (app | diff | figma)
//   node tools/figma-check.mjs HomeSend ref.png --probe 195,374 195,412 48,774
//
// Get ref.png from the Figma MCP: get_screenshot on the frame's node id, then curl the returned URL.
// The 3-panel output: LEFT = the app, MIDDLE = difference-blend (black = identical; bright = drift),
// RIGHT = Figma. Ignore glyph-edge ghosting - the app uses the system font, Figma draws Inter.
//
// ⚠️ The middle panel is for FINDING drift, the probes are for PROVING it is gone. Read actual numbers
// before saying a screen is done.

import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const [screen, refPath, ...rest] = process.argv.slice(2)
if (!screen || !refPath) {
  console.error('usage: node tools/figma-check.mjs <ScreenName> <figma-ref.png> [--probe x,y ...]')
  process.exit(1)
}
const probeIdx = rest.indexOf('--probe')
const probes = probeIdx === -1 ? [] : rest.slice(probeIdx + 1).map(p => p.split(',').map(Number))
const outDir = 'figma-check'
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
// A wallet address + token so the screen renders its real content instead of an empty state.
await page.addInitScript(() => {
  localStorage.setItem('ez_wallet_addr', '0x1234567890123456789012345678901234567890')
  localStorage.setItem('ez_user_token', 'mock')
  sessionStorage.setItem('ez_pin_ok', '1')
})
await page.goto(`http://localhost:5173/?screen=${screen}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const appShot = (await page.screenshot()).toString('base64')
const refShot = readFileSync(refPath).toString('base64')

const viewer = await browser.newPage({ viewport: { width: 1200, height: 900 } })
await viewer.setContent(`<body style="margin:0;background:#222;display:flex;gap:8px">
  <img src="data:image/png;base64,${appShot}" style="width:390px;height:844px">
  <div style="position:relative;width:390px;height:844px;background:#000">
    <img src="data:image/png;base64,${appShot}" style="position:absolute;inset:0;width:390px;height:844px">
    <img src="data:image/png;base64,${refShot}" style="position:absolute;inset:0;width:390px;height:844px;mix-blend-mode:difference">
  </div>
  <img src="data:image/png;base64,${refShot}" style="width:390px;height:844px">
</body>`)
await viewer.waitForTimeout(300)
const outFile = path.join(outDir, `diff_${screen}.png`)
await viewer.screenshot({ path: outFile, clip: { x: 0, y: 0, width: 1186, height: 844 } })
console.log('wrote ' + outFile)

if (probes.length) {
  const rows = await viewer.evaluate(async ({ a, b, pts }) => {
    const read = async (src) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
      return (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return `${d[0]},${d[1]},${d[2]}` }
    }
    const [pa, pb] = [await read(a), await read(b)]
    return pts.map(([x, y]) => ({ at: `${x},${y}`, app: pa(x, y), figma: pb(x, y) }))
  }, { a: appShot, b: refShot, pts: probes })
  console.table(rows)
}
await browser.close()
