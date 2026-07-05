const CIRCLE_API = 'https://api.circle.com/v1/w3s';

async function circleReq(method, path, body, apiKey, userToken) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (userToken) headers['X-User-Token'] = userToken;
  const res = await fetch(`${CIRCLE_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Trả kèm HTTP status — message Circle kiểu "Forbidden" một mình vô dụng khi debug.
  let data; try { data = await res.json(); } catch { data = { message: `non-JSON response (HTTP ${res.status})` }; }
  return { status: res.status, data };
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// Lấy ví trên Arc Testnet (fallback ví đầu tiên nếu không tìm thấy)
function pickArcWallet(wallets) {
  const list = wallets?.data?.wallets || [];
  return list.find(w => w.blockchain === 'ARC-TESTNET') || list[0] || null;
}

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY;
  const body = await ctx.request.json();
  const { action, userToken } = body;

  if (!userToken) {
    return new Response(JSON.stringify({ error: 'userToken required' }), { status: 400, headers: JSON_HEADERS });
  }

  // Verify PIN để MỞ VÍ (đăng nhập lần 2+ / mở lại app): ký 1 message EIP-191 rỗng — user nhập PIN,
  // Circle xác thực + ký (KHÔNG tốn gas, KHÔNG lên chain). Ký thành công = PIN đúng = cho vào ví.
  // Ví EOA nên ký message được ngay (không dính lazy-deploy của SCA).
  if (action === 'signMessage') {
    const { status, data } = await circleReq('POST', '/user/sign/message',
      { walletId: body.walletId, message: body.message || 'Unlock EZwallet', idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
    const challengeId = data?.data?.challengeId;
    if (!challengeId) {
      console.error('[signMessage] no challengeId:', status, JSON.stringify(data));
      const msg = `${data?.message || data?.error?.message || 'no challengeId'} (HTTP ${status}${data?.code ? `, code ${data.code}` : ''})`;
      return new Response(JSON.stringify({ error: msg, detail: data }), { status: 500, headers: JSON_HEADERS });
    }
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS });
  }

  if (action === 'initialize') {
    const { data } = await circleReq('POST', '/user/initialize', {
      idempotencyKey: crypto.randomUUID(),
      accountType: 'EOA',
      blockchains: ['ARC-TESTNET'],
    }, apiKey, userToken);
    return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
  }

  if (action === 'resetPin') {
    // Circle có 3 endpoint PIN RIÊNG BIỆT (đã VERIFY BẰNG GỌI THẬT 2026-07-03, không đoán):
    // - POST /user/pin         = đặt PIN LẦN ĐẦU — user có ví rồi thì "already been initialized".
    // - PUT  /user/pin         = ĐỔI PIN (update-user-pin-challenge): challenge bắt nhập PIN CŨ
    //   rồi PIN mới → tự xác thực. Test thật với user email: 201 + challengeId. ĐÂY là endpoint
    //   đúng cho nút "Đổi PIN". (Session 9 sửa PUT→POST là đọc nhầm doc create ≠ update.)
    // - POST /user/pin/restore = QUÊN PIN (bỏ qua PIN cũ, xác minh bằng câu hỏi bảo mật).
    //   User SSO (Google) bị Circle trả 403 Forbidden ở endpoint này kể cả token tươi —
    //   hợp lý về bảo mật: bypass PIN đòi tin cậy cao hơn token 60'. ĐỪNG dùng cho Đổi PIN.
    const { status, data } = await circleReq('PUT', '/user/pin', { idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
    const challengeId = data?.data?.challengeId;
    if (!challengeId) {
      // Lộ NGUYÊN VĂN lỗi Circle (HTTP status + code + message) — "Forbidden" trần trụi đã làm
      // tốn 3 session debug. Screenshot lỗi giờ phải tự nói được nó là gì.
      console.error('[resetPin] không trả challengeId:', status, JSON.stringify(data));
      const msg = `${data?.message || data?.error?.message || 'no challengeId'} (HTTP ${status}${data?.code ? `, code ${data.code}` : ''})`;
      return new Response(JSON.stringify({ error: msg, detail: data }), { status: 500, headers: JSON_HEADERS });
    }
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS });
  }

  if (action === 'getAddress') {
    // Đúng endpoint: GET /v1/w3s/wallets (X-User-Token), KHÔNG phải /user/wallets
    const { data: wallets } = await circleReq('GET', '/wallets', undefined, apiKey, userToken);
    const wallet = pickArcWallet(wallets);
    return new Response(JSON.stringify({
      address: wallet?.address || null,
      walletId: wallet?.id || null,
      blockchain: wallet?.blockchain || null,
    }), { headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: JSON_HEADERS });
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
