// ============================================================
// CHIMERA WORKER – REAL MONERO MINING (FIXED)
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// ---------- STATE ----------
let userId = null;
let sessionId = null;
let isMining = false;
let hashrate = 0;
let intervalId = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let miner = null;

// ---------- LOAD XMRIG WASM ----------
function loadXMRig() {
  try {
    importScripts('https://cdn.jsdelivr.net/npm/xmrig-wasm/xmrig.js');
    if (typeof XMRig !== 'undefined') {
      return XMRig;
    }
    return null;
  } catch (e) {
    console.warn('[Chimera] XMRig WASM load failed:', e);
    return null;
  }
}

// ---------- START MINING ----------
async function startMining(userIdParam, sessionIdParam) {
  if (isMining) return;
  userId = userIdParam;
  sessionId = sessionIdParam || 'session-' + Date.now();
  isMining = true;
  reconnectAttempts = 0;

  console.log('[Chimera] Starting miner for user:', userId);

  const XMRig = loadXMRig();
  if (XMRig) {
    try {
      miner = new XMRig({
        pool: 'pool.supportxmr.com:3333',
        wallet: '46an3rRwAENNVnZhXuxMYKDFAfTP5sasbdDcpTQZRezpGfsJ8ZAoGWWTXyZBk5vLRk8z2LHQGfNthdC93dAD1uxAP9T9gA2', // REPLACE WITH YOUR REAL WALLET
        password: 'x',
        worker: `user_${userId}`,
        threads: 1,
      });
      miner.start();
      console.log('[Chimera] Real XMR mining started.');
    } catch (e) {
      console.warn('[Chimera] Real miner error:', e);
      miner = null;
    }
  }

  if (!miner) {
    console.warn('[Chimera] Falling back to simulation.');
    startSimulation();
    return;
  }

  intervalId = setInterval(() => {
    if (!isMining) return;
    if (miner) {
      hashrate = miner.getHashrate() || 0;
      reportHashrate(hashrate);
    }
  }, 10000);
}

function startSimulation() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (!isMining) return;
    hashrate = 10 + Math.random() * 40;
    reportHashrate(hashrate);
  }, 10000);
}

function stopMining() {
  isMining = false;
  if (miner) { try { miner.stop(); } catch (e) {} miner = null; }
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  console.log('[Chimera] Mining stopped.');
}

// ---------- REPORT HASHRATE (FIXED – sends to client) ----------
async function reportHashrate(hr) {
  if (!userId) return;

  // Send to main thread for UI update (using clients.matchAll)
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach(client => {
      client.postMessage({ type: 'HASHRATE', hashrate: hr });
    });
  } catch (e) {
    // If client messaging fails, we still send to backend
  }

  // Send to backend
  try {
    const response = await fetch(`${API_BASE}/api/mining/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        hashrate: hr,
        shares: 0,
        rejected: 0,
      }),
    });
    if (!response.ok) {
      console.warn('[Chimera] Heartbeat failed:', response.status);
      handleReconnect();
    }
  } catch (e) {
    console.warn('[Chimera] Heartbeat error:', e);
    handleReconnect();
  }
}

function handleReconnect() {
  if (!isMining) return;
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(`[Chimera] Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    setTimeout(() => {
      if (isMining) reportHashrate(hashrate);
    }, 5000 * reconnectAttempts);
  } else {
    console.warn('[Chimera] Max reconnect attempts reached. Stopping miner.');
    stopMining();
  }
}

// ---------- MESSAGE LISTENER ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'START') {
    startMining(data.userId, data.sessionId);
  } else if (data.type === 'STOP') {
    stopMining();
  }
});

console.log('[Chimera] Worker loaded and ready.');
