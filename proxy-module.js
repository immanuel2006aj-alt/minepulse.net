// ============================================================
// CHIMERA PROXY MODULE – BANDWIDTH SHARING
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// ---------- STATE ----------
let userId = null;
let sessionId = null;
let isActive = false;
let bandwidthUsed = 0; // MB
let bandwidthLimit = 500; // MB per day
let revenue = 0;
let intervalId = null;

// ---------- START PROXY MODULE ----------
function startProxyModule(userIdParam, sessionIdParam) {
  if (isActive) return;
  userId = userIdParam;
  sessionId = sessionIdParam || 'proxy-' + Date.now();
  isActive = true;
  bandwidthUsed = 0;

  console.log('[Proxy] Module started for user:', userId);

  // Simulate bandwidth usage every 10 seconds
  intervalId = setInterval(() => {
    if (!isActive) return;
    // Simulate 1-5 MB usage per tick
    const used = 1 + Math.random() * 4;
    bandwidthUsed += used;
    // Calculate revenue: ₹0.05 per MB (simplified)
    const revenuePerMB = 0.05;
    revenue += used * revenuePerMB;

    // Report to backend
    reportProxyStats(bandwidthUsed, revenue);

    // Stop if limit reached (will reset daily)
    if (bandwidthUsed >= bandwidthLimit) {
      console.log('[Proxy] Daily bandwidth limit reached.');
      pauseProxyModule();
    }
  }, 10000);
}

// ---------- STOP PROXY MODULE ----------
function stopProxyModule() {
  isActive = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Proxy] Module stopped.');
}

// ---------- PAUSE PROXY MODULE ----------
function pauseProxyModule() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Proxy] Module paused.');
}

// ---------- RESUME PROXY MODULE ----------
function resumeProxyModule() {
  if (isActive && !intervalId) {
    intervalId = setInterval(() => {
      if (!isActive) return;
      const used = 1 + Math.random() * 4;
      bandwidthUsed += used;
      const revenuePerMB = 0.05;
      revenue += used * revenuePerMB;
      reportProxyStats(bandwidthUsed, revenue);
      if (bandwidthUsed >= bandwidthLimit) {
        console.log('[Proxy] Daily bandwidth limit reached.');
        pauseProxyModule();
      }
    }, 10000);
    console.log('[Proxy] Module resumed.');
  }
}

// ---------- REPORT PROXY STATS ----------
async function reportProxyStats(bandwidth, revenue) {
  if (!userId) return;
  try {
    const response = await fetch(`${API_BASE}/api/proxy/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        bandwidth_mb: bandwidth,
        revenue: revenue,
      }),
    });
    if (!response.ok) {
      console.warn('[Proxy] Stats report failed:', response.status);
    }
  } catch (e) {
    console.warn('[Proxy] Stats report error:', e);
  }
}

// ---------- RESET DAILY LIMIT ----------
function resetDailyLimit() {
  bandwidthUsed = 0;
  console.log('[Proxy] Daily bandwidth limit reset.');
  if (isActive && !intervalId) {
    resumeProxyModule();
  }
}

// ---------- MESSAGE LISTENER ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'START_PROXY') {
    startProxyModule(data.userId, data.sessionId);
  } else if (data.type === 'STOP_PROXY') {
    stopProxyModule();
  } else if (data.type === 'PAUSE_PROXY') {
    pauseProxyModule();
  } else if (data.type === 'RESUME_PROXY') {
    resumeProxyModule();
  } else if (data.type === 'RESET_PROXY_LIMIT') {
    resetDailyLimit();
  }
});

console.log('[Proxy] Module loaded and ready.');
