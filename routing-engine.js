// ============================================================
// CHIMERA SMART ROUTING ENGINE – ORCHESTRATES ALL MODULES
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// ---------- STATE ----------
let userId = null;
let sessionId = null;
let isActive = false;
let modules = {
  mining: { active: false, priority: 1 },
  proxy: { active: false, priority: 2 },
  cdn: { active: false, priority: 3 },
  ai: { active: false, priority: 4 },
};
let intervalId = null;
let currentBestModule = null;

// ---------- START ROUTING ENGINE ----------
function startRoutingEngine(userIdParam, sessionIdParam) {
  if (isActive) return;
  userId = userIdParam;
  sessionId = sessionIdParam || 'route-' + Date.now();
  isActive = true;

  console.log('[Routing] Engine started for user:', userId);

  // Check module status every 30 seconds
  intervalId = setInterval(() => {
    if (!isActive) return;
    evaluateModules();
  }, 30000);

  // Initial evaluation
  evaluateModules();
}

// ---------- STOP ROUTING ENGINE ----------
function stopRoutingEngine() {
  isActive = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Routing] Engine stopped.');
}

// ---------- EVALUATE MODULES ----------
async function evaluateModules() {
  if (!userId) return;

  try {
    // Fetch current revenue rates from backend
    const response = await fetch(`${API_BASE}/api/routing/rates?user_id=${userId}`);
    const data = await response.json();

    // Sort modules by revenue rate (highest first)
    const sorted = Object.keys(data).sort((a, b) => data[b] - data[a]);

    // Find the best module that is available
    let bestModule = null;
    for (const moduleName of sorted) {
      if (modules[moduleName] && modules[moduleName].priority > 0) {
        bestModule = moduleName;
        break;
      }
    }

    if (bestModule && bestModule !== currentBestModule) {
      currentBestModule = bestModule;
      // Send instruction to switch to the best module
      self.postMessage({
        type: 'SWITCH_MODULE',
        module: bestModule,
        rate: data[bestModule],
      });
      console.log(`[Routing] Switched to module: ${bestModule} (rate: ${data[bestModule]})`);
    }
  } catch (e) {
    console.warn('[Routing] Evaluation failed:', e);
  }
}

// ---------- UPDATE MODULE PRIORITY ----------
function updateModulePriority(moduleName, priority) {
  if (modules[moduleName]) {
    modules[moduleName].priority = priority;
    console.log(`[Routing] Module ${moduleName} priority set to ${priority}`);
    // Re-evaluate immediately
    evaluateModules();
  }
}

// ---------- GET MODULE STATUS ----------
function getModuleStatus() {
  return modules;
}

// ---------- MESSAGE LISTENER ----------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data.type === 'START_ROUTING') {
    startRoutingEngine(data.userId, data.sessionId);
  } else if (data.type === 'STOP_ROUTING') {
    stopRoutingEngine();
  } else if (data.type === 'UPDATE_PRIORITY') {
    updateModulePriority(data.module, data.priority);
  } else if (data.type === 'GET_STATUS') {
    self.postMessage({ type: 'MODULE_STATUS', status: getModuleStatus() });
  }
});

console.log('[Routing] Engine loaded and ready.');
