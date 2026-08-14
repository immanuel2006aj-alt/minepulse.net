// ============================================================
// MINEPULSE – APP.JS (Base)
// ============================================================

console.log('MinePulse loaded.');

// Simple page navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM ready.');
  showPage('page-dashboard');
});
