// ══════════════════════════════════════════════════════════════════════════════
// SAO LƯU DANH BẠ + KHO QR lên Cloudflare KV (2026-07-29, user chốt "làm KV tạm")
//
// VÌ SAO CẦN: `ez_contacts`/`ez_saved_qrs` chỉ nằm ở localStorage → mất khi đổi máy,
// đổi browser, xoá dữ liệu website, ĐỔI DOMAIN (vừa gặp khi sang ezwallet.cash), và
// Safari xoá localStorage sau 7 ngày không tương tác (PWA add-to-home-screen thì được miễn).
// Ví và tiền KHÔNG liên quan (nằm ở Circle + on-chain) — đây chỉ là sổ danh bạ.
//
// ⚠️ MỨC AN TOÀN HIỆN TẠI = TẠM (nợ kỹ thuật user đã biết và đồng ý 07-29):
// Cửa vào là `userToken` của Circle, mà `/api/session` cấp userToken CHỈ CẦN BIẾT EMAIL
// (userId = email, Email OTP tắt). → Ai biết email của một user thì đọc/ghi được sổ danh bạ
// của họ. TIỀN VẪN AN TOÀN (mọi lệnh chuyển tiền phải qua PIN, KV không giữ khoá gì).
// KHÔNG sửa được bằng cách bật Email OTP: Circle chỉ cho PIN đi với luồng userId=email;
// user OTP/SSO KHÔNG có PIN (xem HANDOFF mục 7) → bật OTP là mất PIN, mất luôn UX của app.
// ĐƯỜNG SỬA DUY NHẤT (khi lên mainnet / có user thật): auth bằng CHỮ KÝ PIN —
// server phát nonce → PinGate ký (PIN user đã nhập sẵn lúc mở app) → server verify chữ ký
// bằng viem `verifyMessage` → cấp session ngắn hạn. Khoá KV giữ nguyên là ĐỊA CHỈ VÍ nên
// đổi auth KHÔNG phải đổi schema, không mất dữ liệu.
//
// GIẢM THIỆT HẠI ngay từ v1:
//  1. Identity KHÔNG tin client: server tự hỏi Circle `GET /wallets` bằng userToken để lấy
//     địa chỉ ví → dùng làm khoá. Client không thể khai bừa "tôi là ví X".
//  2. WHITELIST field: chỉ ghi id/name/address (danh bạ) + id/amount/currency/name/createdAt
//     (QR). ẢNH AVATAR KHÔNG BAO GIỜ LÊN SERVER (ảnh thật của người trong gia đình = PII
//     nặng nhất, và cũng là phần nặng nhất về dung lượng) — avatar ở lại máy.
//  3. Chặn nhồi rác: giới hạn 128KB/tài khoản + 500 danh bạ + 200 QR.
//
// CHƯA TẠO KV BINDING thì endpoint trả 503 `sync-disabled` và client tự im lặng bỏ qua →
// app chạy y như cũ, KHÔNG lỗi. Tạo binding: Cloudflare → Workers & Pages → ezwallet →
// Settings → Bindings → KV namespace, Variable name = `EZ_SYNC`.
// ══════════════════════════════════════════════════════════════════════════════

const CIRCLE_API = 'https://api.circle.com/v1/w3s';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// 128KB là CHỐT CHẶN CUỐI, không phải mốc thường gặp: 500 danh bạ + 200 QR "sạch" chỉ ~95KB.
// Nó tồn tại vì `id` được giữ nguyên như client gửi (không ràng buộc kiểu) — nhồi chuỗi dài vào
// `id` là đường duy nhất làm phình KV. Có test khoá cả 2 hướng: test/sync.test.mjs.
const MAX_BYTES = 128 * 1024;
const MAX_CONTACTS = 500;
const MAX_QRS = 200;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// Địa chỉ ví = IDENTITY, lấy TỪ CIRCLE bằng userToken (không lấy từ body client gửi).
// Cùng endpoint mà action 'getAddress' của wallet.js đang dùng: GET /v1/w3s/wallets + X-User-Token.
async function addressFromToken(userToken, apiKey) {
  const res = await fetch(`${CIRCLE_API}/wallets`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken },
  });
  let data; try { data = await res.json(); } catch { return null; }
  const list = data?.data?.wallets || [];
  const w = list.find(x => x.blockchain === 'ARC-TESTNET') || list[0];
  return w?.address ? w.address.toLowerCase() : null;
}

// Chỉ giữ ĐÚNG các field cần thiết — chặn client (kể cả bản sau này) đẩy avatar/field lạ lên KV.
function clean(payload) {
  const contacts = (Array.isArray(payload?.contacts) ? payload.contacts : [])
    .slice(0, MAX_CONTACTS)
    .filter(c => typeof c?.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(c.address.trim()))
    .map(c => ({ id: c.id, name: String(c.name || '').slice(0, 60), address: c.address.trim() }));
  const savedQrs = (Array.isArray(payload?.savedQrs) ? payload.savedQrs : [])
    .slice(0, MAX_QRS)
    .map(q => ({
      id: q.id,
      amount: Number(q.amount) || 0,
      currency: String(q.currency || 'USD').slice(0, 8),
      name: String(q.name || '').slice(0, 60),
      createdAt: q.createdAt,
    }));
  return { v: 1, updatedAt: Number(payload?.updatedAt) || Date.now(), contacts, savedQrs };
}

export async function onRequestPost(ctx) {
  const kv = ctx.env.EZ_SYNC;
  if (!kv) return json({ error: 'sync-disabled' }, 503);   // chưa tạo KV binding → app bỏ qua, không lỗi

  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY;
  let body; try { body = await ctx.request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action, userToken } = body;
  if (!userToken) return json({ error: 'userToken required' }, 400);

  const addr = await addressFromToken(userToken, apiKey);
  if (!addr) return json({ error: 'invalid userToken' }, 401);
  const key = `bak:${addr}`;

  if (action === 'pull') {
    const raw = await kv.get(key);
    return json({ data: raw ? JSON.parse(raw) : null });
  }

  if (action === 'push') {
    const doc = clean(body.payload);
    const text = JSON.stringify(doc);
    if (text.length > MAX_BYTES) return json({ error: 'payload too large' }, 413);
    await kv.put(key, text);
    return json({ ok: true, updatedAt: doc.updatedAt, contacts: doc.contacts.length, savedQrs: doc.savedQrs.length });
  }

  return json({ error: 'unknown action' }, 400);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
