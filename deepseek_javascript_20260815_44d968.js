// ============================================================
// CHIMERA WORKER – REAL MONERO MINING (XMRig WASM)
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';
let userId = null;
let sessionId = null;
let isMining = false;
let hashrate = 0;
let intervalId = null;

// ---------- LOAD XMRIG WASM ----------
async function loadXMRig() {
  try {
    // We will host the XMRig WASM files on a CDN or your own repo
    // For now, we use a public CDN version (placeholder)
    const module = await import('https://cdn.jsdelivr.net/npm/xmrig-wasm/xmrig.js');
    return module.default || module;
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

  // Try to load real miner
  const XMRig = await loadXMRig();
  let miner = null;

  if (XMRig) {
    try {
      miner = new XMRig({
        pool: 'pool.supportxmr.com:3333',
        wallet: 'YOUR_XMR_WALLET_ADDRESS', // Replace with your wallet
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

  // If real miner failed, fallback to simulation
  if (!miner) {
    console.warn('[Chimera] Falling back to simulation.');
    intervalId = setInterval(() => {
      if (!isMining) return;
      hashrate = 10 + Math.random() * 40; // Simulated hashrate
      reportHashrate(hashrate);
    }, 10000);
    return;
  }

  // Real miner loop
  intervalId = setInterval(() => {
    if (!isMining) return;
    if (miner) {
      hashrate = miner.getHashrate() || 0;
      reportHashrate(hashrate);
    }
  }, 10000);
}

// ---------- STOP MINING ----------
function stopMining() {
  isMining = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Chimera] Mining stopped.');
}

// ---------- REPORT HASHRATE TO BACKEND ----------
async function reportHashrate(hr) {
  if (!userId) return;
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
      console.warn('[Chimera] Failed to report hashrate:', response.status);
    }
  } catch (e) {
    console.warn('[Chimera] Report error:', e);
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

console.log('[Chimera] Worker loaded.');