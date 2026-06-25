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
  return res.json();
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// Lấy ví trên Arc Testnet (fallback ví đầu tiên nếu không tìm thấy)
function pickArcWallet(wallets) {
  const list = wallets?.data?.wallets || [];
  return list.find(w => w.blockchain === 'ARC-TESTNET') || list[0] || null;
}

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY;
  const { action, userToken } = await ctx.request.json();

  if (!userToken) {
    return new Response(JSON.stringify({ error: 'userToken required' }), { status: 400, headers: JSON_HEADERS });
  }

  if (action === 'initialize') {
    const data = await circleReq('POST', '/user/initialize', {
      idempotencyKey: crypto.randomUUID(),
      accountType: 'EOA',
      blockchains: ['ARC-TESTNET'],
    }, apiKey, userToken);
    return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
  }

  if (action === 'resetPin') {
    const data = await circleReq('PUT', '/user/pin', { idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
    const challengeId = data?.data?.challengeId;
    if (!challengeId) return new Response(JSON.stringify({ error: 'no challengeId', detail: data }), { status: 500, headers: JSON_HEADERS });
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS });
  }

  if (action === 'getAddress') {
    // Đúng endpoint: GET /v1/w3s/wallets (X-User-Token), KHÔNG phải /user/wallets
    const wallets = await circleReq('GET', '/wallets', undefined, apiKey, userToken);
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
