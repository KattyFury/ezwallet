// ══════════════════════════════════════════════════════════════════════════════
// BUG REPORT → TELEGRAM (2026-08-13, user decision)
//
// The 🐛 button in the top-right of row 1 (every screen) → a popup to describe the problem → POST here → straight into
// the project owner's Telegram.
//
// ⚠️ THE BOT DOES NOT RUN IN THE BACKGROUND AND NEEDS NO VPS. It does not listen, poll, or have a webhook -
// it is only an IDENTITY for sending messages. Each time someone taps the button, this function makes EXACTLY 1
// fetch to api.telegram.org and ends. (Completely unlike the TemBro bots on the VPS that must run 24/7.)
//
// ⚠️ DO NOT USE parse_mode. The content is typed freely by the user - turning on Markdown/HTML makes their words
// into formatting syntax, breaking the message (* _ ` < >) or allowing tags to be injected. Plain text needs
// no escaping and offers no injection path.
//
// ⚠️ FIELD WHITELIST (the same rule as sync.js): only the fields listed below are read from the
// body. There is ABSOLUTELY no path for a token/key to leak - and the client must NOT collect
// localStorage and send it either. `ez_user_token` / `ez_encryption_key` / `ez_refresh_token` /
// `ez_sync_token` getting out means LOSING THE WALLET.
//
// WITHOUT TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID configured → returns 503 `bug-report-disabled`,
// the client shows "not configured" and the app runs normally - exactly how sync.js behaves when
// there is no KV binding. To set them: Cloudflare → Workers & Pages → ezwallet → Settings →
// Variables (tick Encrypt), THEN REDEPLOY.
// ══════════════════════════════════════════════════════════════════════════════

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// Truncate and coerce to string. Telegram allows 4096 characters per message; truncating early here stops one
// person from dumping a whole book into the owner's Telegram.
const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Flood guard: at most 5 reports per IP per hour, using the KV EZ_SYNC that already exists.
// ⚠️ WITH NO KV, SKIP the guard rather than blocking everything - better to take spam than to lock out
// someone who genuinely needs to report a bug (this is their only way to shout for help).
const RATE_MAX = 5, RATE_WINDOW = 3600;

async function overRateLimit(kv, ip) {
  if (!kv || !ip) return false;
  const key = `bugrl:${ip}`;
  const n = parseInt((await kv.get(key)) || '0', 10);
  if (n >= RATE_MAX) return true;
  await kv.put(key, String(n + 1), { expirationTtl: RATE_WINDOW });
  return false;
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return new Response(JSON.stringify({ error: 'bug-report-disabled' }), { status: 503, headers: JSON_HEADERS });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const message = clip(body.message, 1000);
  if (!message) {
    return new Response(JSON.stringify({ error: 'empty-message' }), { status: 400, headers: JSON_HEADERS });
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await overRateLimit(env.EZ_SYNC, ip)) {
    return new Response(JSON.stringify({ error: 'rate-limited' }), { status: 429, headers: JSON_HEADERS });
  }

  // ── THESE 5 FIELDS ONLY, nothing more ──
  const screen = clip(body.screen, 40) || '?';
  const wallet = /^0x[0-9a-fA-F]{40}$/.test(body.wallet || '') ? body.wallet : '(not signed in)';
  const device = clip(body.device, 200) || '?';
  const version = clip(body.version, 40) || '?';

  // ⚠️ Locale 'en-GB' AND NOT 'vi-VN': both give day/month/year, but vi-VN puts the TIME
  // BEFORE THE DATE ("15:14:44 13/8/2026" - reads backwards). en-GB gives "13/08/2026, 15:14" in the familiar
  // order. The timezone stays pinned to Vietnam because a Cloudflare server can be anywhere.
  const when = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', '');
  const text = [
    '🐛 EZwallet bug report',
    '',
    `Screen:  ${screen}`,
    `Wallet:  ${wallet}`,
    `Device:  ${device}`,
    `Version: ${version}`,
    `Time:    ${when}`,
    '',
    '─────────────',
    message,
  ].join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const d = await r.json();
    // Telegram returns 200 with ok:false for a wrong chat_id / a blocked bot - you must read `ok`, never trust the status alone.
    if (!d.ok) {
      return new Response(JSON.stringify({ error: 'telegram-failed', detail: d.description || '' }), { status: 502, headers: JSON_HEADERS });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'telegram-unreachable' }), { status: 502, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
