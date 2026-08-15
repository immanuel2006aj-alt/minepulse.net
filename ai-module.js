// ============================================================
// CHIMERA AI MODULE – DISTRIBUTED AI INFERENCE
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// ---------- STATE ----------
let userId = null;
let sessionId = null;
let isActive = false;
let inferences = 0;
let totalInferences = 0;
let revenue = 0;
let intervalId = null;

// ---------- START AI MODULE ----------
function startAIModule(userIdParam, sessionIdParam) {
  if (isActive) return;
  userId = userIdParam;
  sessionId = sessionIdParam || 'ai-' + Date.now();
  isActive = true;
  inferences = 0;

  console.log('[AI] Module started for user:', userId);

  // Simulate AI inference every 8 seconds
  intervalId = setInterval(() => {
    if (!isActive) return;
    // Simulate 1-3 inferences per tick
    const inferencesPerTick = 1 + Math.floor(Math.random() * 3);
    inferences += inferencesPerTick;
    totalInferences += inferencesPerTick;
    // Calculate revenue: ₹0.01 per inference
    const revenuePerInference = 0.01;
    revenue += inferencesPerTick * revenuePerInference;

    // Report to backend
    reportAIStats(inferences, totalInferences, revenue);

  }, 8000);
}

// ---------- STOP AI MODULE ----------
function stopAIModule() {
  isActive = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[AI] Module stopped.');
}

// ---------- PAUSE AI MODULE ----------
function pauseAIModule() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[AI] Module paused.');
}

// ---------- RESUME AI MODULE ----------
function resumeAIModule() {
  if (isActive && !intervalId) {
    intervalId = setInterval(() => {
      if (!isActive) return;
      const inferencesPerTick = 1 + Math.floor(Math.random() * 3);
      inferences += inferencesPerTick;
      totalInferences += inferencesPerTick;
      const revenuePerInference = 0.01;
      revenue += inferencesPerTick * revenuePerInference;
      reportAIStats(inferences, totalInferences, revenue);
    }, 8000);
    console.log('[AI] Module resumed.');
  }
}

// ---------- REPORT AI STATS ----------
async function reportAIStats(inferences, total, revenue) {
  if (!userId) return;
  try {
    const response = await fetch(`${API_BASE}/api/ai/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        inferences: inferences,
        total_inferences: total,
        revenue: revenue,
      }),
    });
    if (!response.ok) {
      console.warn('[AI] Stats report failed:', response.status);
    }
  } catch (e) {
    console.warn('[AI] Stats report error:', e);
  }
}

// ---------- MESSAGE LISTENER ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'START_AI') {
    startAIModule(data.userId, data.sessionId);
  } else if (data.type === 'STOP_AI') {
    stopAIModule();
  } else if (data.type === 'PAUSE_AI') {
    pauseAIModule();
  } else if (data.type === 'RESUME_AI') {
    resumeAIModule();
  }
});

console.log('[AI] Module loaded and ready.');
