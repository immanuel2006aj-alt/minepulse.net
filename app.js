// ============================================================
// MINEPULSE – APP.JS (BACKEND CONNECTED)
// ============================================================

const API_BASE = 'https://minepulse-net.onrender.com'; // Your Render URL

// ---------- STATE ----------
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

// ---------- DOM REFS ----------
// ... (keep all existing DOM refs)

// ---------- UTILITY ----------
function getUserId() {
  // Try to get user ID from localStorage (set during login)
  const stored = localStorage.getItem('minepulse_user');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.user_id;
    } catch(e) {}
  }
  // Fallback: use a generated ID for demo
  return 'demo-user-' + Date.now();
}

// ---------- API HELPERS ----------
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (e) {
    console.error('API call failed:', e);
    return null;
  }
}

// ---------- SEND MINING HEARTBEAT ----------
async function sendHeartbeat(hashrate, shares, rejected) {
  if (!userId) userId = getUserId();
  if (!sessionId) {
    sessionId = 'session-' + Date.now();
  }
  const payload = {
    user_id: userId,
    session_id: sessionId,
    hashrate: hashrate,
    shares: shares,
    rejected: rejected
  };
  try {
    const result = await apiCall('/api/mining/heartbeat', 'POST', payload);
    console.log('Heartbeat sent:', result);
  } catch (e) {
    console.warn('Heartbeat failed:', e);
  }
}

// ---------- FETCH EARNINGS ----------
async function fetchEarnings() {
  if (!userId) userId = getUserId();
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

// ---------- FETCH WALLET BALANCE ----------
async function fetchWalletBalance() {
  if (!userId) userId = getUserId();
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

// ---------- FETCH NOTIFICATIONS ----------
async function fetchNotifications() {
  if (!userId) userId = getUserId();
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

// ---------- MINING ENGINE (UPDATED) ----------
function startMining() {
  if (isMining) return;
  isMining = true;
  isPaused = false;
  
  // Set user ID from login or generate one
  if (!userId) userId = getUserId();
  if (!sessionId) sessionId = 'session-' + Date.now();
  
  // Save user ID
  localStorage.setItem('minepulse_user', JSON.stringify({ user_id: userId }));

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

  // Mining loop
  miningInterval = setInterval(() => {
    if (isPaused) return;
    hashrate = 10 + Math.random() * 50;
    const increment = 0.05 + Math.random() * 0.15;
    earnings += increment;
    totalEarnings += increment;
    weekEarnings += increment;
    monthEarnings += increment;
    lifetimeEarnings += increment;
    if (Math.random() > 0.9) shares += 1;
    if (Math.random() > 0.97) rejected += 1;
    updateDashboard();
    
    // Send heartbeat every 10 seconds
    if (Math.floor(sessionSeconds) % 10 === 0) {
      sendHeartbeat(hashrate, shares, rejected);
    }
  }, 1000);

  // Session timer
  sessionInterval = setInterval(() => {
    if (!isPaused) sessionSeconds += 1;
    updateDashboard();
  }, 1000);

  // Fetch initial data
  fetchEarnings();
  fetchWalletBalance();
  fetchNotifications();
}

// ---------- STOP MINING (UPDATED) ----------
function stopMining() {
  if (!isMining) return;
  isMining = false;
  isPaused = false;
  clearInterval(miningInterval);
  clearInterval(sessionInterval);
  miningInterval = null;
  sessionInterval = null;
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
  
  // Send final heartbeat
  sendHeartbeat(hashrate, shares, rejected);
  updateDashboard();
}

// ---------- UPDATE DASHBOARD (same as before) ----------
function updateDashboard() {
  earningsEl.textContent = formatINR(earnings);
  hashrateEl.textContent = hashrate.toFixed(1) + ' H/s';
  miningHashrate.textContent = hashrate.toFixed(1) + ' H/s';
  sessionTimeEl.textContent = formatTime(sessionSeconds);
  miningSession.textContent = formatTime(sessionSeconds);
  sharesEl.textContent = shares;
  miningShares.textContent = shares;
  miningRejected.textContent = rejected;
}

// ---------- REGISTER / LOGIN (NEW) ----------
async function registerUser(username, email, password, payoutMethod, wallet) {
  const payload = {
    username: username,
    email: email,
    password: password,
    payout_method: payoutMethod || 'UPI',
    wallet_address: wallet || ''
  };
  const result = await apiCall('/api/auth/register', 'POST', payload);
  if (result && result.user_id) {
    userId = result.user_id;
    localStorage.setItem('minepulse_user', JSON.stringify({ user_id: userId, username: username }));
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

// ---------- BOOTSTRAP ----------
document.addEventListener('DOMContentLoaded', function() {
  // Load theme
  loadTheme();
  
  // Check if user is already logged in
  const stored = localStorage.getItem('minepulse_user');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      userId = data.user_id;
      // Fetch data on load
      fetchEarnings();
      fetchWalletBalance();
      fetchNotifications();
    } catch(e) {}
  }

  // ... (keep all existing event listeners)
  
  // Mock registration for demo (if no user, register a demo user)
  if (!userId) {
    const demoEmail = 'demo@minepulse.com';
    const demoPassword = 'demo123';
    registerUser('demouser', demoEmail, demoPassword, 'UPI', 'demo_wallet');
  }
});
