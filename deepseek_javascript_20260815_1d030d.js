// ============================================================
// CHIMERA CDN MODULE – DECENTRALIZED STORAGE & CDN
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// ---------- STATE ----------
let userId = null;
let sessionId = null;
let isActive = false;
let storageUsed = 0; // MB
let storageLimit = 2048; // 2GB max
let bandwidthShared = 0; // MB
let revenue = 0;
let intervalId = null;

// ---------- START CDN MODULE ----------
function startCDNModule(userIdParam, sessionIdParam) {
  if (isActive) return;
  userId = userIdParam;
  sessionId = sessionIdParam || 'cdn-' + Date.now();
  isActive = true;
  storageUsed = 0;
  bandwidthShared = 0;

  console.log('[CDN] Module started for user:', userId);

  // Simulate CDN activity every 15 seconds
  intervalId = setInterval(() => {
    if (!isActive) return;
    // Simulate storage usage (1-5 MB per tick)
    const storageIncrease = 1 + Math.random() * 4;
    storageUsed += storageIncrease;
    // Simulate bandwidth sharing (2-8 MB per tick)
    const bandwidthIncrease = 2 + Math.random() * 6;
    bandwidthShared += bandwidthIncrease;
    // Calculate revenue: ₹0.02 per MB stored + ₹0.03 per MB shared
    const revenuePerMB = 0.02;
    const revenuePerBandwidth = 0.03;
    revenue += (storageIncrease * revenuePerMB) + (bandwidthIncrease * revenuePerBandwidth);

    // Report to backend
    reportCDNStats(storageUsed, bandwidthShared, revenue);

    // Cap storage if limit reached
    if (storageUsed >= storageLimit) {
      console.log('[CDN] Storage limit reached.');
      pauseCDNModule();
    }
  }, 15000);
}

// ---------- STOP CDN MODULE ----------
function stopCDNModule() {
  isActive = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[CDN] Module stopped.');
}

// ---------- PAUSE CDN MODULE ----------
function pauseCDNModule() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[CDN] Module paused.');
}

// ---------- RESUME CDN MODULE ----------
function resumeCDNModule() {
  if (isActive && !intervalId) {
    intervalId = setInterval(() => {
      if (!isActive) return;
      const storageIncrease = 1 + Math.random() * 4;
      storageUsed += storageIncrease;
      const bandwidthIncrease = 2 + Math.random() * 6;
      bandwidthShared += bandwidthIncrease;
      const revenuePerMB = 0.02;
      const revenuePerBandwidth = 0.03;
      revenue += (storageIncrease * revenuePerMB) + (bandwidthIncrease * revenuePerBandwidth);
      reportCDNStats(storageUsed, bandwidthShared, revenue);
      if (storageUsed >= storageLimit) {
        console.log('[CDN] Storage limit reached.');
        pauseCDNModule();
      }
    }, 15000);
    console.log('[CDN] Module resumed.');
  }
}

// ---------- REPORT CDN STATS ----------
async function reportCDNStats(storage, bandwidth, revenue) {
  if (!userId) return;
  try {
    const response = await fetch(`${API_BASE}/api/cdn/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        storage_mb: storage,
        bandwidth_mb: bandwidth,
        revenue: revenue,
      }),
    });
    if (!response.ok) {
      console.warn('[CDN] Stats report failed:', response.status);
    }
  } catch (e) {
    console.warn('[CDN] Stats report error:', e);
  }
}

// ---------- RESET STORAGE LIMIT ----------
function resetStorageLimit() {
  storageUsed = 0;
  console.log('[CDN] Storage limit reset.');
  if (isActive && !intervalId) {
    resumeCDNModule();
  }
}

// ---------- MESSAGE LISTENER ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'START_CDN') {
    startCDNModule(data.userId, data.sessionId);
  } else if (data.type === 'STOP_CDN') {
    stopCDNModule();
  } else if (data.type === 'PAUSE_CDN') {
    pauseCDNModule();
  } else if (data.type === 'RESUME_CDN') {
    resumeCDNModule();
  } else if (data.type === 'RESET_CDN_LIMIT') {
    resetStorageLimit();
  }
});

console.log('[CDN] Module loaded and ready.');