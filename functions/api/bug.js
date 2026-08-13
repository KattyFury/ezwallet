// ══════════════════════════════════════════════════════════════════════════════
// BÁO LỖI → TELEGRAM (2026-08-13, user chốt)
//
// Nút 🐛 ở góc phải hàng 1 (mọi màn) → popup gõ mô tả → POST vào đây → bắn thẳng vào
// Telegram của chủ dự án.
//
// ⚠️ BOT KHÔNG CHẠY NỀN, KHÔNG CẦN VPS. Nó không nghe, không poll, không có webhook —
// chỉ là một DANH TÍNH để gửi tin. Mỗi lần có người bấm nút, hàm này gọi ĐÚNG 1 lệnh
// fetch tới api.telegram.org rồi kết thúc. (Khác hẳn mấy bot TemBro trên VPS phải bật 24/7.)
//
// ⚠️ KHÔNG DÙNG parse_mode. Nội dung do user gõ tự do — bật Markdown/HTML là chữ của họ
// thành cú pháp định dạng, gãy tin nhắn (dấu * _ ` < >) hoặc chèn được thẻ. Text thuần thì
// không phải escape gì cả, cũng không có đường chèn.
//
// ⚠️ WHITELIST FIELD (giống luật của sync.js): chỉ đọc đúng mấy field liệt kê dưới đây từ
// body. TUYỆT ĐỐI không có đường nào để token/khoá lọt ra — client cũng KHÔNG được gom
// localStorage gửi lên. `ez_user_token` / `ez_encryption_key` / `ez_refresh_token` /
// `ez_sync_token` mà ra ngoài là MẤT VÍ.
//
// CHƯA CẤU HÌNH TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID → trả 503 `bug-report-disabled`,
// client hiện "chưa cấu hình" và app chạy bình thường — y hệt cách sync.js xử lý khi
// chưa có KV binding. Đặt biến: Cloudflare → Workers & Pages → ezwallet → Settings →
// Variables (đánh dấu Encrypt), RỒI DEPLOY LẠI.
// ══════════════════════════════════════════════════════════════════════════════

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// Cắt độ dài + ép kiểu chuỗi. Telegram giới hạn 4096 ký tự/tin; cắt sớm ở đây để một
// người không nhồi được cả quyển sách vào Telegram của chủ dự án.
const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Chặn dội tin: mỗi IP tối đa 5 lần/giờ. Dùng KV EZ_SYNC đã có sẵn.
// ⚠️ CHƯA CÓ KV thì BỎ QUA việc chặn chứ KHÔNG chặn hết — thà nhận spam còn hơn khoá nhầm
// người đang thật sự cần báo lỗi (đây là kênh duy nhất họ kêu cứu được).
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

  // ── CHỈ 5 FIELD NÀY, không hơn ──
  const screen = clip(body.screen, 40) || '?';
  const wallet = /^0x[0-9a-fA-F]{40}$/.test(body.wallet || '') ? body.wallet : '(chưa đăng nhập)';
  const device = clip(body.device, 200) || '?';
  const version = clip(body.version, 40) || '?';

  // ⚠️ Locale 'en-GB' CHỨ KHÔNG PHẢI 'vi-VN': cả hai đều ra ngày/tháng/năm, nhưng vi-VN đặt GIỜ
  // TRƯỚC NGÀY ("15:14:44 13/8/2026" — đọc rất ngược). en-GB cho "13/08/2026, 15:14" đúng thứ tự
  // quen thuộc. Múi giờ vẫn ghim Việt Nam vì server Cloudflare chạy ở đâu cũng có thể.
  const when = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', '');
  const text = [
    '🐛 EZwallet bug report',
    '',
    `Màn:  ${screen}`,
    `Ví:   ${wallet}`,
    `Máy:  ${device}`,
    `Bản:  ${version}`,
    `Lúc:  ${when}`,
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
    // Telegram trả 200 kèm ok:false khi sai chat_id / bot bị chặn — phải đọc `ok`, đừng tin mỗi status.
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
