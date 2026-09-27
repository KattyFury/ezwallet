import { netFrom, netError, JSON_CORS } from './_net.js';

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
  // Include the HTTP status - a Circle message like "Forbidden" on its own is useless when debugging.
  let data; try { data = await res.json(); } catch { data = { message: `non-JSON response (HTTP ${res.status})` }; }
  return { status: res.status, data };
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// The wallet on THIS network's chain - and nothing else. The old `|| list[0]` fallback is gone
// (MAINNET-AUDIT.md C2): a wallet from another chain would sign on the wrong network.
function pickArcWallet(wallets, circleBlockchain) {
  const list = wallets?.data?.wallets || [];
  return list.find(w => w.blockchain === circleBlockchain) || null;
}

export async function onRequestPost(ctx) {
  let net;
  try { net = netFrom(ctx); } catch (e) { return netError(e); }
  // Circle does not (yet) support this network for user-controlled wallets → refuse everything, fail closed.
  if (!net.circleBlockchain) {
    return new Response(JSON.stringify({ error: `Circle wallets are not available on ${net.label} yet` }), { status: 503, headers: JSON_CORS });
  }
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY;
  const body = await ctx.request.json();
  const { action, userToken } = body;

  if (!userToken) {
    return new Response(JSON.stringify({ error: 'userToken required' }), { status: 400, headers: JSON_HEADERS });
  }

  // Verify the PIN to UNLOCK THE WALLET (second and later logins / reopening the app): sign an empty EIP-191 message - the user enters
  // their PIN, Circle authenticates and signs (NO gas, NEVER on chain). A successful signature = correct PIN = access granted.
  // The wallet is an EOA, so it can sign messages immediately (no SCA lazy-deploy problem).
  if (action === 'signMessage') {
    const { status, data } = await circleReq('POST', '/user/sign/message',
      { walletId: body.walletId, message: body.message || 'Unlock ezwallet', idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
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
      blockchains: [net.circleBlockchain],
    }, apiKey, userToken);
    return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
  }

  if (action === 'resetPin') {
    // Circle has 3 SEPARATE PIN endpoints (VERIFIED BY REAL CALLS 2026-07-03, not guessed):
    // - POST /user/pin         = set the FIRST PIN - a user who already has a wallet gets "already been initialized".
    // - PUT  /user/pin         = CHANGE THE PIN (update-user-pin-challenge): the challenge asks for the OLD PIN
    //   then the new one → self-authenticating. Tested for real with an email user: 201 + challengeId. THIS is the correct
    //   endpoint for the "Change PIN" button. (Session 9 changing PUT→POST came from misreading the create doc as the update one.)
    // - POST /user/pin/restore = FORGOT PIN (skips the old PIN, verifying with the security questions).
    //   SSO (Google) users get 403 Forbidden from Circle on this endpoint even with a fresh token -
    //   which is reasonable security: bypassing the PIN demands more trust than a 60' token. Do NOT use it for Change PIN.
    const { status, data } = await circleReq('PUT', '/user/pin', { idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
    const challengeId = data?.data?.challengeId;
    if (!challengeId) {
      // Surface Circle's error VERBATIM (HTTP status + code + message) - a bare "Forbidden" already cost
      // 3 debugging sessions. A screenshot of an error now has to explain itself.
      console.error('[resetPin] no challengeId returned:', status, JSON.stringify(data));
      const msg = `${data?.message || data?.error?.message || 'no challengeId'} (HTTP ${status}${data?.code ? `, code ${data.code}` : ''})`;
      return new Response(JSON.stringify({ error: msg, detail: data }), { status: 500, headers: JSON_HEADERS });
    }
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS });
  }

  if (action === 'restorePin') {
    // FORGOT PIN - the 3rd of the 3 endpoints described in the comment above `resetPin`. Skips the old PIN
    // entirely: Circle verifies the user's SECURITY QUESTIONS instead, then lets them set a new PIN - all inside
    // the ONE challenge/iframe below (Circle's own hosted UI asks the questions, then the new PIN, in sequence).
    // Same 403-for-Google-users caveat as resetPin - guarded client-side in ForgotPin.jsx before this is ever called.
    const { status, data } = await circleReq('POST', '/user/pin/restore', { idempotencyKey: crypto.randomUUID() }, apiKey, userToken);
    const challengeId = data?.data?.challengeId;
    if (!challengeId) {
      console.error('[restorePin] no challengeId returned:', status, JSON.stringify(data));
      const msg = `${data?.message || data?.error?.message || 'no challengeId'} (HTTP ${status}${data?.code ? `, code ${data.code}` : ''})`;
      return new Response(JSON.stringify({ error: msg, detail: data }), { status: 500, headers: JSON_HEADERS });
    }
    return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS });
  }

  // Find the transaction this app created with `refId` and report its REAL state (MAINNET-AUDIT C3/C4).
  // Circle API (verified against the API reference 2026-09-27): contractExecution accepts `refId`, and
  // GET /v1/w3s/transactions (X-User-Token; filters walletIds/from/pageSize) returns refId/state/txHash per item.
  // There is no refId filter, so list the wallet's recent transactions (since the attempt started) and match here.
  if (action === 'txByRef') {
    const { walletId, refId, since } = body;
    if (!walletId || !refId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refId)) {
      return new Response(JSON.stringify({ error: 'walletId + refId required' }), { status: 400, headers: JSON_CORS });
    }
    const qs = new URLSearchParams({ walletIds: walletId, pageSize: '50' });
    if (since && !Number.isNaN(Date.parse(since))) qs.set('from', new Date(since).toISOString());
    const { status, data } = await circleReq('GET', `/transactions?${qs}`, undefined, apiKey, userToken);
    if (status >= 400) {
      return new Response(JSON.stringify({ error: data?.message || `Circle HTTP ${status}` }), { status: 502, headers: JSON_CORS });
    }
    const tx = (data?.data?.transactions || []).find(t => t.refId === refId);
    return new Response(JSON.stringify(tx
      ? { found: true, id: tx.id, state: tx.state, txHash: tx.txHash || null, errorReason: tx.errorReason || null }
      : { found: false }), { headers: JSON_CORS });
  }

  if (action === 'getAddress') {
    // The correct endpoint: GET /v1/w3s/wallets (X-User-Token), NOT /user/wallets
    const { data: wallets } = await circleReq('GET', '/wallets', undefined, apiKey, userToken);
    const wallet = pickArcWallet(wallets, net.circleBlockchain);
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
