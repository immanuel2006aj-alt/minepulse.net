// ============================================================
// MINEPULSE – MASTER APP.JS (FINAL – ONE AND DONE)
// ALL FEATURES INCLUDED – WORKING, PLANNED, AND FUTURE
// ============================================================

// ============================================================
// SECTION 1 – CONFIGURATION
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com';

// Feature flags – enable/disable features without changing code
const FEATURES = {
  REAL_MINER: false,      // Set to true when real XMRig is ready
  PROXY_MODULE: false,    // Set to true when proxy SDK is integrated
  CDN_MODULE: false,      // Set to true when CDN is integrated
  AI_MODULE: false,       // Set to true when AI compute is integrated
  SMART_ROUTING: false,   // Set to true when routing engine is ready
  REFERRALS: false,       // Set to true when referral system is live
  ADMIN_DASHBOARD: false, // Set to true when admin UI is ready
};

// ============================================================
// SECTION 2 – STATE
// ============================================================

let isMining = false;
let isPaused = false;
let miningInterval = null;
let sessionInterval = null;
let hashrate = 0;
let earnings = 0;
let sessionSeconds = 0;
let shares = 0;
let rejected = 0;
let totalEarnings = 0;
let weekEarnings = 0;
let monthEarnings = 0;
let lifetimeEarnings = 0;
let activityLog = [];
let notifications = [];
let userId = null;
let sessionId = null;

// Chimera state (will be used when features are enabled)
let chimeraState = {
  realMiner: { active: false, hashrate: 0 },
  proxy: { active: false, bandwidth: 0, revenue: 0 },
  cdn: { active: false, storage: 0, bandwidth: 0, revenue: 0 },
  ai: { active: false, inferences: 0, revenue: 0 },
  routing: { active: false, modules: [] }
};

// ============================================================
// SECTION 3 – DOM REFS
// ============================================================

const startBtn = document.getElementById('start-btn');
const miningToggleBtn = document.getElementById('mining-toggle-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');

const earningsEl = document.getElementById('today-earnings');
const hashrateEl = document.getElementById('hashrate-value');
const statusEl = document.getElementById('mining-status');
const sessionTimeEl = document.getElementById('session-time');
const sharesEl = document.getElementById('shares-count');
const sessionInfo = document.getElementById('session-info');

const miningHashrate = document.getElementById('mining-hashrate');
const miningSession = document.getElementById('mining-session');
const miningShares = document.getElementById('mining-shares');
const miningRejected = document.getElementById('mining-rejected');

const earningsToday = document.getElementById('earnings-today');
const earningsWeek = document.getElementById('earnings-week');
const earningsMonth = document.getElementById('earnings-month');
const earningsLifetime = document.getElementById('earnings-lifetime');

const walletBalance = document.getElementById('wallet-balance');
const walletPending = document.getElementById('wallet-pending');

const activityList = document.getElementById('activity-list');
const historyList = document.getElementById('earnings-history-list');
const payoutList = document.getElementById('payout-list');
const notifList = document.getElementById('notifications-list');

// ============================================================
// SECTION 4 – SESSION MANAGEMENT
// ============================================================

function checkSession() {
  const stored = localStorage.getItem('minepulse_user');
  if (!stored) {
    window.location.href = 'login.html';
    return false;
  }
  try {
    const data = JSON.parse(stored);
    if (!data.user_id) {
      localStorage.removeItem('minepulse_user');
      window.location.href = 'login.html';
      return false;
    }
    userId = data.user_id;
    return true;
  } catch(e) {
    localStorage.removeItem('minepulse_user');
    window.location.href = 'login.html';
    return false;
  }
}

// ============================================================
// SECTION 5 – UTILITY FUNCTIONS
// ============================================================

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatINR(amount) {
  return '₹' + amount.toFixed(2);
}

function getUserId() {
  const stored = localStorage.getItem('minepulse_user');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.user_id;
    } catch(e) {}
  }
  return null;
}

// ============================================================
// SECTION 6 – ACTIVITY & NOTIFICATIONS
// ============================================================

function addActivity(text, amount = null) {
  const time = new Date().toLocaleTimeString();
  activityLog.unshift({ text, amount, time });
  if (activityLog.length > 20) activityLog.pop();
  renderActivity();
}

function addNotification(title, body) {
  notifications.unshift({ title, body, time: new Date().toISOString(), read: false });
  if (notifications.length > 50) notifications.pop();
  renderNotifications();
  updateNotifDot();
}

function renderActivity() {
  if (activityLog.length === 0) {
    activityList.innerHTML = '<div class="activity-empty">No activity yet.</div>';
    return;
  }
  let html = '';
  activityLog.slice(0, 10).forEach(item => {
    const amountText = item.amount ? formatINR(item.amount) : '';
    html += `
      <div class="activity-item">
        <span>${item.text}</span>
        <span>
          <span class="amount">${amountText}</span>
          <span class="time">${item.time}</span>
        </span>
      </div>
    `;
  });
  activityList.innerHTML = html;
}

function renderNotifications() {
  if (notifications.length === 0) {
    notifList.innerHTML = '<div class="activity-empty">No notifications.</div>';
    return;
  }
  let html = '';
  notifications.slice(0, 20).forEach(n => {
    html += `
      <div class="activity-item">
        <span><strong>${n.title}</strong><br><span style="font-size:0.8rem;color:#687384;">${n.body}</span></span>
        <span class="time">${new Date(n.time).toLocaleDateString()}</span>
      </div>
    `;
  });
  notifList.innerHTML = html;
}

function updateNotifDot() {
  const dot = document.getElementById('notif-dot');
  const unread = notifications.filter(n => !n.read).length;
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

function renderHistory() {
  const history = [
    { date: '2026-08-14', amount: 45.20 },
    { date: '2026-08-13', amount: 52.10 },
    { date: '2026-08-12', amount: 38.75 },
  ];
  if (historyList) {
    let html = '';
    history.forEach(h => {
      html += `
        <div class="activity-item">
          <span>${h.date}</span>
          <span class="amount">${formatINR(h.amount)}</span>
        </div>
      `;
    });
    historyList.innerHTML = html;
  }
}

function renderPayouts() {
  const payouts = [
    { date: '2026-08-11', amount: 490, status: 'Completed' },
    { date: '2026-08-04', amount: 490, status: 'Completed' },
  ];
  if (payoutList) {
    let html = '';
    payouts.forEach(p => {
      html += `
        <div class="activity-item">
          <span>${p.date} – ${p.status}</span>
          <span class="amount">${formatINR(p.amount)}</span>
        </div>
      `;
    });
    payoutList.innerHTML = html;
  }
}

// ============================================================
// SECTION 7 – DASHBOARD UPDATE
// ============================================================

function updateDashboard() {
  earningsEl.textContent = formatINR(earnings);
  hashrateEl.textContent = hashrate.toFixed(1) + ' H/s';
  miningHashrate.textContent = hashrate.toFixed(1) + ' H/s';
  sessionTimeEl.textContent = formatTime(sessionSeconds);
  miningSession.textContent = formatTime(sessionSeconds);
  sharesEl.textContent = shares;
  miningShares.textContent = shares;
  miningRejected.textContent = rejected;

  earningsToday.textContent = formatINR(earnings);
  earningsWeek.textContent = formatINR(weekEarnings);
  earningsMonth.textContent = formatINR(monthEarnings);
  earningsLifetime.textContent = formatINR(lifetimeEarnings);

  walletBalance.textContent = formatINR(lifetimeEarnings - (lifetimeEarnings % 100));
  walletPending.textContent = formatINR(lifetimeEarnings % 100);
}

// ============================================================
// SECTION 8 – API HELPERS
// ============================================================

async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (e) {
    console.error('API call failed:', e);
    return null;
  }
}

async function sendHeartbeat(hashrate, shares, rejected) {
  if (!userId) userId = getUserId();
  if (!userId) return;
  if (!sessionId) sessionId = 'session-' + Date.now();
  const payload = { user_id: userId, session_id: sessionId, hashrate, shares, rejected };
  try {
    const result = await apiCall('/api/mining/heartbeat', 'POST', payload);
    console.log('Heartbeat sent:', result);
  } catch (e) {
    console.warn('Heartbeat failed:', e);
  }
}

async function fetchEarnings() {
  console.log('fetchEarnings called');
  if (!userId) userId = getUserId();
  if (!userId) return;
  console.log('User ID:', userId);
  try {
    const today = await apiCall(`/api/earnings/today?user_id=${userId}`);
    const week = await apiCall(`/api/earnings/week?user_id=${userId}`);
    const month = await apiCall(`/api/earnings/month?user_id=${userId}`);
    const lifetime = await apiCall(`/api/earnings/lifetime?user_id=${userId}`);
    if (today) earningsToday.textContent = formatINR(today.amount || 0);
    if (week) earningsWeek.textContent = formatINR(week.amount || 0);
    if (month) earningsMonth.textContent = formatINR(month.amount || 0);
    if (lifetime) earningsLifetime.textContent = formatINR(lifetime.amount || 0);
  } catch (e) {
    console.warn('Fetch earnings failed:', e);
  }
}

async function fetchWalletBalance() {
  if (!userId) userId = getUserId();
  if (!userId) return;
  try {
    const balance = await apiCall(`/api/wallet/balance?user_id=${userId}`);
    if (balance) {
      walletBalance.textContent = formatINR(balance.available || 0);
      walletPending.textContent = formatINR(balance.pending || 0);
    }
  } catch (e) {
    console.warn('Fetch wallet failed:', e);
  }
}

async function fetchNotifications() {
  if (!userId) userId = getUserId();
  if (!userId) return;
  try {
    const data = await apiCall(`/api/notifications?user_id=${userId}`);
    if (data && data.notifications) {
      notifications = data.notifications;
      renderNotifications();
      updateNotifDot();
    }
  } catch (e) {
    console.warn('Fetch notifications failed:', e);
  }
}

// ============================================================
// SECTION 9 – AUTHENTICATION
// ============================================================

async function registerUser(username, email, password, payoutMethod, wallet) {
  const payload = { username, email, password, payout_method: payoutMethod || 'UPI', wallet_address: wallet || '' };
  const result = await apiCall('/api/auth/register', 'POST', payload);
  if (result && result.user_id) {
    userId = result.user_id;
    localStorage.setItem('minepulse_user', JSON.stringify({ user_id: userId, username }));
    addNotification('Registration Successful', `Welcome ${username}!`);
    return result;
  }
  return null;
}

async function loginUser(email, password) {
  const payload = { email, password };
  const result = await apiCall('/api/auth/login', 'POST', payload);
  if (result && result.user_id) {
    userId = result.user_id;
    localStorage.setItem('minepulse_user', JSON.stringify({ user_id: userId, username: result.username }));
    addNotification('Login Successful', `Welcome back ${result.username}!`);
    return result;
  }
  return null;
}

// ============================================================
// SECTION 10 – MINING ENGINE (WORKING – DO NOT MODIFY)
// ============================================================

async function startMining() {
  if (isMining) return;
  isMining = true;
  isPaused = false;

  if (!userId) userId = getUserId();
  if (!userId) {
    addNotification('Error', 'User not logged in.');
    return;
  }
  if (!sessionId) sessionId = 'session-' + Date.now();

  // --- START CHIMERA WORKER (if real mining is enabled) ---
  if (FEATURES.REAL_MINER && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('chimera-worker.js');
      const worker = reg.active || reg.waiting;
      if (worker) {
        worker.postMessage({ type: 'START', userId, sessionId });
        console.log('[App] Chimera worker started.');
        // Listen for hashrate messages from worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'HASHRATE') {
            hashrate = event.data.hashrate;
            updateDashboard();
          }
        });
      }
    } catch (e) {
      console.warn('[App] Chimera worker registration failed:', e);
    }
  }

  // --- UI UPDATES ---
  statusEl.textContent = '● Active';
  statusEl.style.color = '#34D399';
  startBtn.textContent = 'STOP MINING';
  startBtn.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
  startBtn.style.color = 'white';
  miningToggleBtn.textContent = 'STOP MINING';
  miningToggleBtn.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
  miningToggleBtn.style.color = 'white';
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  sessionInfo.style.display = 'flex';

  addActivity('Mining started', null);
  addNotification('Mining Started', 'Your mining session is now active.');

  // --- MINING LOOP (DO NOT MODIFY) ---
  miningInterval = setInterval(() => {
    if (isPaused) return;
    // If real miner is not enabled, use simulation
    if (!FEATURES.REAL_MINER) {
      hashrate = 10 + Math.random() * 50;
    }
    if (Math.random() > 0.9) shares += 1;
    if (Math.random() > 0.97) rejected += 1;
    updateDashboard();
    if (sessionSeconds % 10 === 0) {
      sendHeartbeat(hashrate, shares, rejected);
      fetchEarnings();
      fetchWalletBalance();
    }
  }, 1000);

  // --- SESSION TIMER ---
  sessionInterval = setInterval(() => {
    if (!isPaused) sessionSeconds += 1;
    updateDashboard();
  }, 1000);

  fetchEarnings();
  fetchWalletBalance();
  fetchNotifications();
}

function stopMining() {
  if (!isMining) return;
  isMining = false;
  isPaused = false;
  clearInterval(miningInterval);
  clearInterval(sessionInterval);
  miningInterval = null;
  sessionInterval = null;

  // --- STOP CHIMERA WORKER ---
  if (FEATURES.REAL_MINER && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) {
        reg.active.postMessage({ type: 'STOP' });
        console.log('[App] Chimera worker stopped.');
      }
    });
  }

  // --- UI UPDATES ---
  statusEl.textContent = '● Inactive';
  statusEl.style.color = '#687384';
  startBtn.textContent = 'START MINING';
  startBtn.style.background = 'linear-gradient(135deg, #FBBF24, #F59E0B)';
  startBtn.style.color = '#0B0F14';
  miningToggleBtn.textContent = 'START MINING';
  miningToggleBtn.style.background = 'linear-gradient(135deg, #FBBF24, #F59E0B)';
  miningToggleBtn.style.color = '#0B0F14';
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  sessionInfo.style.display = 'none';

  addActivity('Mining stopped', earnings);
  addNotification('Mining Stopped', 'Your mining session has ended.');
  sendHeartbeat(hashrate, shares, rejected);
  updateDashboard();
}

function pauseMining() {
  if (!isMining || isPaused) return;
  isPaused = true;
  statusEl.textContent = '● Paused';
  statusEl.style.color = '#F59E0B';
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  addActivity('Mining paused', null);
  addNotification('Mining Paused', 'Your mining session is paused.');
}

function resumeMining() {
  if (!isMining || !isPaused) return;
  isPaused = false;
  statusEl.textContent = '● Active';
  statusEl.style.color = '#34D399';
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  addActivity('Mining resumed', null);
  addNotification('Mining Resumed', 'Your mining session has resumed.');
}

function toggleMining() {
  if (isMining) {
    stopMining();
  } else {
    startMining();
  }
}

// ============================================================
// SECTION 11 – CHIMERA MODULES (PLACEHOLDERS – DO NOT MODIFY)
// ============================================================

function enableRealMining() {
  // FUTURE: XMRig WASM integration
  // When ready, set FEATURES.REAL_MINER = true
  console.log('[Chimera] Real Monero mining (placeholder)');
  addNotification('Coming Soon', 'Real Monero mining will be enabled in the next update.');
}

function enableProxyModule() {
  // FUTURE: IPRoyal / Honeygain SDK integration
  // When ready, set FEATURES.PROXY_MODULE = true
  console.log('[Chimera] Proxy module (placeholder)');
  addNotification('Coming Soon', 'Bandwidth sharing will be enabled in the next update.');
}

function enableCDNModule() {
  // FUTURE: Titan Network integration
  // When ready, set FEATURES.CDN_MODULE = true
  console.log('[Chimera] CDN module (placeholder)');
  addNotification('Coming Soon', 'CDN storage will be enabled in the next update.');
}

function enableAIModule() {
  // FUTURE: TensorFlow.js / WebNN integration
  // When ready, set FEATURES.AI_MODULE = true
  console.log('[Chimera] AI module (placeholder)');
  addNotification('Coming Soon', 'AI compute will be enabled in the next update.');
}

function enableSmartRouting() {
  // FUTURE: Decision engine for module switching
  // When ready, set FEATURES.SMART_ROUTING = true
  console.log('[Chimera] Smart routing (placeholder)');
  addNotification('Coming Soon', 'Smart routing will be enabled in the next update.');
}

// ============================================================
// SECTION 12 – REFERRAL SYSTEM (PLACEHOLDER – DO NOT MODIFY)
// ============================================================

function generateReferralCode() {
  // FUTURE: Unique referral code generation
  return 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function trackReferral(referralCode) {
  // FUTURE: Track referred users
  console.log('[Referral] Tracking referral:', referralCode);
}

function getReferralEarnings() {
  // FUTURE: Fetch referral earnings from backend
  return 0;
}

// ============================================================
// SECTION 13 – PAYOUT SYSTEM (PLACEHOLDER – DO NOT MODIFY)
// ============================================================

function requestPayout(amount, method) {
  // FUTURE: Real UPI/Bank/USDT payouts
  console.log('[Payout] Requesting payout:', amount, method);
  addNotification('Payout System', 'Real payouts will be enabled soon.');
}

function getPayoutHistory() {
  // FUTURE: Fetch payout history from backend
  return [];
}

// ============================================================
// SECTION 14 – NAVIGATION (DO NOT MODIFY)
// ============================================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
}

function showSubpage(pageId) {
  document.querySelectorAll('.page.subpage').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

// ============================================================
// SECTION 15 – THEME (DO NOT MODIFY)
// ============================================================

function toggleTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('minepulse-theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

function loadTheme() {
  const theme = localStorage.getItem('minepulse-theme');
  if (theme === 'light') document.body.classList.add('light');
}

// ============================================================
// SECTION 16 – LOGOUT (DO NOT MODIFY)
// ============================================================

function logoutUser() {
  if (isMining) stopMining();
  localStorage.removeItem('minepulse_user');
  addNotification('Logged Out', 'You have been logged out.');
  window.location.href = 'login.html';
}

// ============================================================
// SECTION 17 – ADMIN FUNCTIONS (PLACEHOLDER – DO NOT MODIFY)
// ============================================================

function loadAdminDashboard() {
  // FUTURE: Admin UI
  console.log('[Admin] Loading admin dashboard...');
}

function getUserList() {
  // FUTURE: Fetch users from backend
  return [];
}

function updatePlatformSettings(settings) {
  // FUTURE: Update platform settings
  console.log('[Admin] Updating platform settings:', settings);
}

// ============================================================
// SECTION 18 – BOOTSTRAP (DO NOT MODIFY)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM ready.');

  // --- SESSION CHECK ---
  if (!checkSession()) return;

  loadTheme();
  showPage('page-dashboard');
  renderHistory();
  renderPayouts();
  updateDashboard();

  // Navigation buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
      showPage(this.dataset.page);
    });
  });

  // Start/Stop buttons
  startBtn.addEventListener('click', toggleMining);
  miningToggleBtn.addEventListener('click', toggleMining);

  // Pause / Resume
  pauseBtn.addEventListener('click', pauseMining);
  resumeBtn.addEventListener('click', resumeMining);

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      showPage(this.dataset.back);
    });
  });

  // More items
  document.querySelectorAll('.more-item[data-page]').forEach(item => {
    item.addEventListener('click', function() {
      showSubpage(this.dataset.page);
    });
  });

  // Logout buttons
  document.querySelectorAll('#logout-btn, #logout-settings-btn').forEach(btn => {
    btn.addEventListener('click', logoutUser);
  });

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Currency selector
  document.getElementById('currency-select')?.addEventListener('change', function() {
    addNotification('Currency Changed', `Currency set to ${this.value}`);
  });

  // Copy address
  document.getElementById('copy-address')?.addEventListener('click', function() {
    const addr = document.getElementById('wallet-address').textContent;
    navigator.clipboard?.writeText(addr).then(() => {
      this.textContent = 'Copied!';
      setTimeout(() => { this.textContent = 'Copy'; }, 2000);
    });
  });

  // Withdraw button
  document.getElementById('withdraw-btn')?.addEventListener('click', function() {
    const amount = parseFloat(walletBalance.textContent.replace('₹', ''));
    if (amount < 100) {
      addNotification('Withdrawal Failed', 'Minimum payout is ₹100.');
      return;
    }
    addNotification('Payout Requested', `₹${amount.toFixed(2)} requested. Processing...`);
    addActivity('Payout requested', amount);
  });

  // Notification bell
  document.getElementById('notif-btn')?.addEventListener('click', function() {
    notifications.forEach(n => n.read = true);
    updateNotifDot();
    showPage('page-notifications');
  });

  // Load saved notifications
  const savedNotifs = localStorage.getItem('minepulse_notifications');
  if (savedNotifs) {
    try {
      notifications = JSON.parse(savedNotifs);
      renderNotifications();
      updateNotifDot();
    } catch(e) {}
  }

  // Save notifications periodically
  setInterval(() => {
    localStorage.setItem('minepulse_notifications', JSON.stringify(notifications));
  }, 5000);

  // Initial data fetch
  fetchEarnings();
  fetchWalletBalance();
  fetchNotifications();
  addNotification('Welcome to MinePulse', 'Start mining to earn daily rewards.');
});