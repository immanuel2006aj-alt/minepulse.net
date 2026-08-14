// ============================================================
// MINEPULSE – COMPLETE APP LOGIC
// ============================================================

console.log('MinePulse loaded.');

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

// ---------- DOM REFS ----------
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

// ---------- UTILITY ----------
function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatINR(amount) {
  return '₹' + amount.toFixed(2);
}

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

// ---------- RENDER FUNCTIONS ----------
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
  // Simulate some history entries
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

// ---------- UPDATE DASHBOARD ----------
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

// ---------- MINING ENGINE ----------
function startMining() {
  if (isMining) return;
  isMining = true;
  isPaused = false;
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
  }, 1000);

  // Session timer
  sessionInterval = setInterval(() => {
    if (!isPaused) sessionSeconds += 1;
    updateDashboard();
  }, 1000);
}

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

// ---------- NAVIGATION ----------
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  // Show target page
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
}

function showSubpage(pageId, parentId) {
  // Hide all subpages
  document.querySelectorAll('.page.subpage').forEach(p => {
    p.classList.remove('active');
  });
  // Show target subpage
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }
}

// ---------- SETTINGS ----------
function toggleTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('minepulse-theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

function loadTheme() {
  const theme = localStorage.getItem('minepulse-theme');
  if (theme === 'light') {
    document.body.classList.add('light');
  }
}

// ---------- EVENT LISTENERS ----------
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM ready.');
  loadTheme();

  // Show default page
  showPage('page-dashboard');
  renderHistory();
  renderPayouts();
  updateDashboard();

  // Navigation buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const pageId = this.dataset.page;
      showPage(pageId);
    });
  });

  // Start/Stop button (Dashboard)
  startBtn.addEventListener('click', toggleMining);

  // Start/Stop button (Mining page)
  miningToggleBtn.addEventListener('click', toggleMining);

  // Pause / Resume
  pauseBtn.addEventListener('click', pauseMining);
  resumeBtn.addEventListener('click', resumeMining);

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const backTo = this.dataset.back;
      showPage(backTo);
    });
  });

  // More items
  document.querySelectorAll('.more-item[data-page]').forEach(item => {
    item.addEventListener('click', function() {
      const pageId = this.dataset.page;
      showSubpage(pageId);
    });
  });

  // Logout
  document.querySelectorAll('#logout-btn, #logout-settings-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (isMining) stopMining();
      addNotification('Logged Out', 'You have been logged out.');
      showPage('page-dashboard');
    });
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

  // Load notifications from storage
  const savedNotifs = localStorage.getItem('minepulse_notifications');
  if (savedNotifs) {
    try {
      notifications = JSON.parse(savedNotifs);
      renderNotifications();
      updateNotifDot();
    } catch(e) {}
  }

  // Save notifications on change
  setInterval(() => {
    localStorage.setItem('minepulse_notifications', JSON.stringify(notifications));
  }, 5000);

  // Auto-start mining if it was running (simulate)
  addNotification('Welcome to MinePulse', 'Start mining to earn daily rewards.');
});
