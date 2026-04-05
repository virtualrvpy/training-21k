// ============================================
// APP.JS — Controlador principal
// ============================================

let currentTab = 'plan';
let stravaInitialized = false;

function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (btn) btn.classList.add('active');

  if (tab === 'strava' && !stravaInitialized) {
    stravaInitialized = true;
    renderStravaApp();
  }
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const overlay = document.getElementById('settingsOverlay');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    syncInputsToPaces();
    panel.classList.add('open');
    overlay.classList.add('open');
  }
}

function showToast(msg, type = '') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---- INIT ----
async function init() {
  // Check for Strava OAuth callback
  const params = new URLSearchParams(window.location.search);
  if (params.get('code') && params.get('scope')) {
    switchTab('strava', document.querySelectorAll('.tab-btn')[1]);
    await handleStravaCallback();
    renderStravaApp();
    return;
  }

  // Render plan
  renderPlanApp();
}

case 'coach': renderCoachApp(); break;

document.addEventListener('DOMContentLoaded', init);


