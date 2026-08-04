#!/usr/bin/env node
// Kiểm tra ĐỘ PHỦ NGÔN NGỮ trước khi thêm 1 mã vào READY_LANGS (src/i18n.js).
//
// Luật của dự án (user chốt 2026-08-04): "ĐÃ VIỆT THÌ VIỆT ALL, ĐÃ ANH THÌ ANH ALL" +
// "một ngôn ngữ = một lượt build kỹ". Script này là cái gác cổng cho luật đó — chạy nó thay vì
// soát mắt, vì chuỗi nằm rải khắp 20+ file và lần nào soát tay cũng sót (đã sót thật 2 lần: thẻ
// hành động màn Trang chủ và nhãn "You pay/You receive" màn Swap).
//
//   node scripts/check-lang.js zh      → đo độ phủ tiếng Trung
//   node scripts/check-lang.js         → liệt kê mọi ngôn ngữ đang có
//
// Điều kiện để 1 ngôn ngữ được vào READY_LANGS: PHẢI ĐỦ CẢ HAI
//   1. Từ điển app phủ 100% key t() (script này đo)
//   2. Có bản dịch Circle trong circleLocalizations.js (script này cũng kiểm)
// Thiếu (2) thì app dịch xong nhưng màn PIN/câu hỏi bảo mật vẫn tiếng Anh → vẫn vi phạm luật.
const fs = require('fs'), path = require('path')

const ROOT = path.join(__dirname, '..')
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')

// ── gom mọi key t('...') đang dùng trong src ──
const files = []
;(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/\.(jsx|js)$/.test(p)) files.push(p)
  }
})(path.join(ROOT, 'src'))

const usedKeys = new Set()
for (const f of files) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    usedKeys.add(m[1].replace(/\\'/g, "'"))
  }
}

// ── đọc từ điển trong i18n.js ──
const i18n = read('src/i18n.js')
function dictKeys(name) {
  const parts = i18n.split(`const ${name} = {`)
  if (parts.length < 2) return null
  const out = new Set()
  for (const m of parts[1].split('\n}')[0].matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) {
    out.add(m[1].replace(/\\'/g, "'"))
  }
  return out
}

const DICT_OF = { en: 'EN', zh: 'ZH' }   // 'vi' = ngôn ngữ gốc (key chính là bản tiếng Việt)
const circle = read('src/circleLocalizations.js')
const hasCircle = code =>
  ['CIRCLE_LOCALIZATIONS', 'CIRCLE_SECURITY_QUESTIONS', 'CIRCLE_SECURITY_CONFIRM_ITEMS']
    .every(n => new RegExp(`${n} = \\{[\\s\\S]*?\\n  ${code}:`).test(circle))

const readyLangs = (i18n.match(/READY_LANGS = \[([^\]]*)\]/) || [, ''])[1]
  .split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean)

function report(code) {
  console.log(`\n══ ${code} ${readyLangs.includes(code) ? '(đang MỞ)' : '(đang KHOÁ)'} ══`)
  let appOk
  if (code === 'vi') {
    appOk = true
    console.log(`  từ điển app : 100%  (tiếng Việt là ngôn ngữ gốc, key chính là bản dịch)`)
  } else {
    const d = dictKeys(DICT_OF[code])
    if (!d) { console.log(`  từ điển app : KHÔNG CÓ (thiếu \`const ${DICT_OF[code] || code.toUpperCase()}\` trong i18n.js)`); appOk = false }
    else {
      const missing = [...usedKeys].filter(k => !d.has(k))
      appOk = missing.length === 0
      const pct = Math.round((usedKeys.size - missing.length) / usedKeys.size * 100)
      console.log(`  từ điển app : ${pct}%  (${usedKeys.size - missing.length}/${usedKeys.size}, thiếu ${missing.length})`)
      missing.slice(0, 10).forEach(k => console.log(`      thiếu: ${k}`))
      if (missing.length > 10) console.log(`      ... và ${missing.length - 10} chuỗi nữa`)
    }
  }
  // 'en' MIỄN yêu cầu bản dịch Circle: English chính là mặc định sẵn có của Circle, nên
  // applyCircleLocale() cố ý KHÔNG gọi setLocalizations cho 'en' (xem circleLocalizations.js).
  const cOk = code === 'en' ? true : hasCircle(code)
  console.log(`  bản dịch Circle: ${code === 'en' ? 'không cần (English là mặc định của Circle)' : cOk ? 'CÓ' : 'KHÔNG (màn PIN sẽ rơi về tiếng Anh)'}`)
  const ok = appOk && cOk
  console.log(`  → ${ok ? 'ĐỦ ĐIỀU KIỆN vào READY_LANGS' : 'CHƯA đủ điều kiện, đừng mở khoá'}`)
  return ok
}

const arg = process.argv[2]
const codes = arg ? [arg] : ['vi', 'en', 'zh']
let allOk = true
for (const c of codes) allOk = report(c) && allOk
console.log()
process.exit(arg && !allOk ? 1 : 0)
