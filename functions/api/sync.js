// ══════════════════════════════════════════════════════════════════════════════
// SAO LƯU DANH BẠ + KHO QR lên Cloudflare KV (2026-07-29, user chốt "làm KV tạm")
//
// VÌ SAO CẦN: `ez_contacts`/`ez_saved_qrs` chỉ nằm ở localStorage → mất khi đổi máy,
// đổi browser, xoá dữ liệu website, ĐỔI DOMAIN (vừa gặp khi sang ezwallet.cash), và
// Safari xoá localStorage sau 7 ngày không tương tác (PWA add-to-home-screen thì được miễn).
// Ví và tiền KHÔNG liên quan (nằm ở Circle + on-chain) — đây chỉ là sổ danh bạ.
//
// ══ AUTH = CHỮ KÝ PIN (2026-08-06) — đã TRẢ nợ kỹ thuật 07-29 ══
// BẢN CŨ dùng `userToken` của Circle làm cửa vào, mà `/api/session` cấp userToken CHỈ CẦN
// BIẾT EMAIL → ai biết email của một user là đọc/ghi được sổ danh bạ của họ. Đó là lý do
// tính năng này bị để TẮT suốt (chưa tạo KV binding) chứ không phải quên bật.
//
// BẢN NÀY bỏ userToken hẳn. Cửa vào là CHỮ KÝ của chính ví đó:
//   1. `nonce`   → server phát 1 nonce dùng-một-lần (TTL 5') + câu chữ cần ký.
//   2. PinGate   → user nhập PIN, Circle MPC ký câu đó (EIP-191, không gas, không lên chain).
//                  Đây là PIN user VẪN PHẢI nhập để mở app → KHÔNG thêm bước nào cho user.
//   3. `session` → server recover địa chỉ TỪ CHỮ KÝ (viem), tiêu nonce, cấp token phiên (TTL 24h).
//   4. pull/push → mang token phiên. Khoá KV vẫn là ĐỊA CHỈ VÍ nên KHÔNG đổi schema,
//                  dữ liệu đã sao lưu bằng bản cũ đọc lại được nguyên vẹn.
// Biết email giờ VÔ DỤNG: không có PIN thì Circle không ký, không ký thì không có địa chỉ.
// Địa chỉ cũng KHÔNG còn lấy qua Circle nữa — nó rơi ra từ chữ ký, không ai khai hộ được.
//
// GIỮ NGUYÊN từ v1 (vẫn cần):
//  1. WHITELIST field: chỉ ghi id/name/address (danh bạ) + id/amount/currency/name/createdAt
//     (QR). ẢNH AVATAR KHÔNG BAO GIỜ LÊN SERVER (ảnh thật của người trong gia đình = PII
//     nặng nhất, và cũng là phần nặng nhất về dung lượng) — avatar ở lại máy.
//  2. Chặn nhồi rác: giới hạn 128KB/tài khoản + 500 danh bạ + 200 QR.
//
// CHƯA TẠO KV BINDING thì endpoint trả 503 `sync-disabled` và client tự im lặng bỏ qua →
// app chạy y như cũ, KHÔNG lỗi. Tạo binding: Cloudflare → Workers & Pages → ezwallet →
// Settings → Bindings → KV namespace, Variable name = `EZ_SYNC`, RỒI DEPLOY LẠI
// (Pages chỉ áp binding cho deployment MỚI).
// ══════════════════════════════════════════════════════════════════════════════
import { recoverMessageAddress } from 'viem';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// 128KB là CHỐT CHẶN CUỐI, không phải mốc thường gặp: 500 danh bạ + 200 QR "sạch" chỉ ~95KB.
// Nó tồn tại vì `id` được giữ nguyên như client gửi (không ràng buộc kiểu) — nhồi chuỗi dài vào
// `id` là đường duy nhất làm phình KV. Có test khoá cả 2 hướng: test/sync.test.mjs.
const MAX_BYTES = 128 * 1024;
const MAX_CONTACTS = 500;
const MAX_QRS = 200;

// Nonce sống 5' (đủ cho người già gõ PIN chậm, ngắn để cửa sổ replay hẹp).
// Token phiên sống 24h ở server, nhưng client giữ trong sessionStorage nên thực tế chết
// cùng phiên app — mở app lại là qua PinGate, ký lại, token mới.
const NONCE_TTL = 300;
const SESSION_TTL = 86400;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// Câu chữ đem ký. LUÔN dựng lại ở server từ nonce — KHÔNG nhận chuỗi message do client gửi
// (nhận chuỗi client gửi = cho phép ký sẵn một câu khác rồi đem sang đây dùng lại).
// Giữ nguyên chữ "Unlock EZwallet" vì đây đúng là cái PIN đang mở khoá app.
const messageFor = (nonce) => `Unlock EZwallet. Nonce: ${nonce}`;

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

  let body; try { body = await ctx.request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action } = body;

  // ── 1. Phát nonce ──────────────────────────────────────────────────────────
  // Không cần auth: nonce một mình vô giá trị, phải có chữ ký của ví mới đổi ra được token.
  if (action === 'nonce') {
    const nonce = crypto.randomUUID();
    await kv.put(`nonce:${nonce}`, '1', { expirationTtl: NONCE_TTL });
    return json({ nonce, message: messageFor(nonce) });
  }

  // ── 2. Đổi chữ ký lấy token phiên ──────────────────────────────────────────
  if (action === 'session') {
    const { nonce, signature } = body;
    if (typeof nonce !== 'string' || typeof signature !== 'string') return json({ error: 'nonce + signature required' }, 400);

    // Nonce phải do CHÍNH server này phát và chưa ai tiêu. Tiêu xong xoá ngay → chữ ký cũ
    // bắt được cũng không dùng lại được lần hai.
    const pending = await kv.get(`nonce:${nonce}`);
    if (!pending) return json({ error: 'bad-nonce' }, 401);
    await kv.delete(`nonce:${nonce}`);

    let addr;
    try {
      addr = await recoverMessageAddress({ message: messageFor(nonce), signature });
    } catch {
      return json({ error: 'bad-signature' }, 401);
    }
    if (!addr) return json({ error: 'bad-signature' }, 401);

    const token = crypto.randomUUID();
    await kv.put(`sess:${token}`, addr.toLowerCase(), { expirationTtl: SESSION_TTL });
    // Trả kèm địa chỉ vừa recover (là ví của CHÍNH người gọi, không phải bí mật) để client tự
    // đối chiếu với `ez_wallet_addr`. Lệch nhau = chuẩn ký của Circle khác giả định EIP-191 ở đây
    // → client vứt token, sao lưu nằm im. Thà TẮT còn hơn ghi dữ liệu vào nhầm khoá.
    return json({ token, address: addr.toLowerCase(), expiresIn: SESSION_TTL });
  }

  // ── 3. Đọc/ghi, phải có token phiên ────────────────────────────────────────
  const { token } = body;
  if (typeof token !== 'string' || !token) return json({ error: 'token required' }, 400);
  const addr = await kv.get(`sess:${token}`);
  if (!addr) return json({ error: 'bad-token' }, 401);   // sai token hoặc phiên hết hạn → client ký lại
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
