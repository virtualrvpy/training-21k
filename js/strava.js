// ============================================
// STRAVA.JS — Integración con Strava API
// ============================================

// Strava OAuth + API config — usuario configura desde la UI
let STRAVA_CONFIG = loadStravaConfig();

function loadStravaConfig() {
  try {
    const s = localStorage.getItem('strava_config');
    return s ? JSON.parse(s) : { clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0 };
  } catch { return { clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0 }; }
}

function saveStravaConfig() {
  localStorage.setItem('strava_config', JSON.stringify(STRAVA_CONFIG));
}

// Cache de actividades
let ACTIVITIES_CACHE = loadActivitiesCache();

function loadActivitiesCache() {
  try {
    const s = localStorage.getItem('strava_activities');
    return s ? JSON.parse(s) : { data: [], lastFetch: 0 };
  } catch { return { data: [], lastFetch: 0 }; }
}

function saveActivitiesCache(data) {
  ACTIVITIES_CACHE = { data, lastFetch: Date.now() };
  localStorage.setItem('strava_activities', JSON.stringify(ACTIVITIES_CACHE));
}

// ---- OAUTH ----
function stravaAuthorize() {
  const cid = STRAVA_CONFIG.clientId;
  if (!cid) { showToast('Ingresá tu Client ID primero', 'error'); return; }
  const redirect = window.location.origin + window.location.pathname;
  const scope = 'read,activity:read_all';
  const url = `https://www.strava.com/oauth/authorize?client_id=${cid}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${scope}`;
  window.location.href = url;
}

async function handleStravaCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return false;
  // Exchange code for tokens
  try {
    showStravaLoading('Conectando con Strava...');
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) throw new Error('Token exchange failed');
    const data = await resp.json();
    STRAVA_CONFIG.accessToken  = data.access_token;
    STRAVA_CONFIG.refreshToken = data.refresh_token;
    STRAVA_CONFIG.expiresAt    = data.expires_at;
    saveStravaConfig();
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    showToast('✓ Strava conectado', 'success');
    return true;
  } catch (e) {
    showToast('Error al conectar Strava', 'error');
    return false;
  }
}

async function refreshStravaToken() {
  if (!STRAVA_CONFIG.refreshToken) return false;
  try {
    const resp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        refresh_token: STRAVA_CONFIG.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    STRAVA_CONFIG.accessToken  = data.access_token;
    STRAVA_CONFIG.refreshToken = data.refresh_token;
    STRAVA_CONFIG.expiresAt    = data.expires_at;
    saveStravaConfig();
    return true;
  } catch { return false; }
}

async function ensureValidToken() {
  if (!STRAVA_CONFIG.accessToken) return false;
  if (Date.now() / 1000 > STRAVA_CONFIG.expiresAt - 300) {
    return await refreshStravaToken();
  }
  return true;
}

// ---- FETCH ACTIVITIES ----
async function fetchActivities(forceRefresh = false) {
  const cacheAge = (Date.now() - ACTIVITIES_CACHE.lastFetch) / 1000 / 60; // minutes
  if (!forceRefresh && ACTIVITIES_CACHE.data.length > 0 && cacheAge < 30) {
    return ACTIVITIES_CACHE.data;
  }

  const valid = await ensureValidToken();
  if (!valid) return [];

  try {
    // Fetch activities from plan start (31 Mar 2026) to 30 Aug 2026
    const after = Math.floor(new Date(2026, 2, 31).getTime() / 1000);
    const before = Math.floor(new Date(2026, 7, 31).getTime() / 1000);
    let page = 1, all = [];
    while (true) {
      const resp = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${STRAVA_CONFIG.accessToken}` } }
      );
      if (!resp.ok) break;
      const batch = await resp.json();
      if (!batch.length) break;
      all = all.concat(batch.filter(a => a.type === 'Run' || a.sport_type === 'Run'));
      if (batch.length < 100) break;
      page++;
    }
    saveActivitiesCache(all);
    return all;
  } catch { return ACTIVITIES_CACHE.data; }
}

// ---- GROUP BY WEEK ----
function groupByWeek(activities) {
  const byWeek = {};
  activities.forEach(act => {
    const d = new Date(act.start_date_local);
    const wi = getWeekIndex(d);
    if (wi < 0 || wi >= 22) return;
    if (!byWeek[wi]) byWeek[wi] = [];
    byWeek[wi].push(act);
  });
  return byWeek;
}

function mpsToMinKm(mps) {
  if (!mps || mps <= 0) return '—';
  const secs = 1000 / mps;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function metersToKm(m) { return (m / 1000).toFixed(1); }

function secsToHms(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

function showStravaLoading(msg = 'Cargando...') {
  const app = document.getElementById('stravaApp');
  if (app) app.innerHTML = `<div class="strava-loading"><div class="loading-spinner"></div><p>${msg}</p></div>`;
}

// ---- RENDER STRAVA APP ----
async function renderStravaApp() {
  const app = document.getElementById('stravaApp');
  if (!app) return;

  const isConnected = !!(STRAVA_CONFIG.accessToken);
  const hasCredentials = !!(STRAVA_CONFIG.clientId && STRAVA_CONFIG.clientSecret);

  if (!hasCredentials) {
    renderStravaSetup();
    return;
  }

  if (!isConnected) {
    renderStravaConnect();
    return;
  }

  showStravaLoading('Cargando actividades...');
  const activities = await fetchActivities();
  const byWeek = groupByWeek(activities);
  renderStravaMain(activities, byWeek);
}

function renderStravaSetup() {
  const app = document.getElementById('stravaApp');
  app.innerHTML = `
    <div class="strava-page">
      <div class="page-header">
        <h2>STRAVA</h2>
        <p>Configurá tu API para ver tus entrenamientos</p>
      </div>
      <div class="strava-setup">
        <div class="setup-card">
          <div class="setup-icon">🔗</div>
          <h3>Conectar con Strava</h3>
          <p>Para ver tus entrenamientos necesitás una app en Strava. Es un proceso de 2 minutos.</p>
          <ol class="setup-steps">
            <li>Andá a <a href="https://www.strava.com/settings/api" target="_blank">strava.com/settings/api</a></li>
            <li>Creá una aplicación con cualquier nombre</li>
            <li>Copiá el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
            <li>Pegá acá abajo y hacé click en Conectar</li>
          </ol>
          <div class="setup-form">
            <div class="form-field">
              <label>Client ID</label>
              <input type="text" id="sClientId" placeholder="12345" value="${STRAVA_CONFIG.clientId}">
            </div>
            <div class="form-field">
              <label>Client Secret</label>
              <input type="password" id="sClientSecret" placeholder="abcdef..." value="${STRAVA_CONFIG.clientSecret}">
            </div>
            <button class="btn-strava" onclick="saveAndAuthorize()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              Conectar con Strava
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveAndAuthorize() {
  STRAVA_CONFIG.clientId     = document.getElementById('sClientId').value.trim();
  STRAVA_CONFIG.clientSecret = document.getElementById('sClientSecret').value.trim();
  saveStravaConfig();
  stravaAuthorize();
}

function renderStravaConnect() {
  const app = document.getElementById('stravaApp');
  app.innerHTML = `
    <div class="strava-page">
      <div class="page-header">
        <h2>STRAVA</h2>
        <p>Credenciales guardadas — necesitás autorizar el acceso</p>
      </div>
      <div class="strava-setup">
        <div class="setup-card">
          <div class="setup-icon">🔑</div>
          <h3>Autorizar acceso</h3>
          <p>Tus credenciales están guardadas. Autorizá el acceso a tus actividades.</p>
          <button class="btn-strava" onclick="stravaAuthorize()" style="margin-top:20px">
            Autorizar Strava
          </button>
          <button class="btn-secondary" onclick="resetStravaConfig()" style="margin-top:10px;width:100%">
            Cambiar credenciales
          </button>
        </div>
      </div>
    </div>
  `;
}

function resetStravaConfig() {
  STRAVA_CONFIG = { clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: 0 };
  saveStravaConfig();
  renderStravaApp();
}

function renderStravaMain(activities, byWeek) {
  const app = document.getElementById('stravaApp');
  const totalKm = activities.reduce((s, a) => s + a.distance, 0) / 1000;
  const totalRuns = activities.length;
  const avgPace = activities.length
    ? mpsToMinKm(activities.reduce((s, a) => s + a.average_speed, 0) / activities.length)
    : '—';

  // Current week
  const now = new Date();
  const currWi = getWeekIndex(now);

  app.innerHTML = `
    <div class="strava-page">
      <div class="page-header">
        <h2>STRAVA</h2>
        <p>Entrenamientos del plan · ${totalRuns} sesiones registradas</p>
      </div>

      <div class="strava-main">
        <!-- SUMMARY STATS -->
        <div class="plan-section">
          <div class="section-label">Resumen del plan hasta hoy</div>
          <div class="stat-grid">
            <div class="stat-card"><div class="s-label">Total km</div><div class="s-value">${totalKm.toFixed(1)}</div><div class="s-sub">km acumulados</div></div>
            <div class="stat-card"><div class="s-label">Sesiones</div><div class="s-value">${totalRuns}</div><div class="s-sub">entrenamientos</div></div>
            <div class="stat-card"><div class="s-label">Pace medio</div><div class="s-value">${avgPace}</div><div class="s-sub">/km promedio</div></div>
            <div class="stat-card"><div class="s-label">Semana actual</div><div class="s-value">${currWi >= 0 && currWi < 22 ? currWi + 1 : '—'}</div><div class="s-sub">de 22</div></div>
          </div>
        </div>

        <!-- WEEKLY BREAKDOWN -->
        <div class="plan-section">
          <div class="section-label">
            Por semana
            <button class="refresh-btn" onclick="refreshActivities()">↻ Actualizar</button>
          </div>
          <div class="week-strava-list">
            ${renderWeeklyStrava(byWeek)}
          </div>
        </div>

        <!-- SETTINGS -->
        <div class="plan-section">
          <div class="section-label">Configuración</div>
          <div class="strava-settings-row">
            <span style="font-size:12px;color:var(--text2)">Conectado como atleta Strava</span>
            <button class="btn-secondary" onclick="resetStravaConfig()">Desconectar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWeeklyStrava(byWeek) {
  const now = new Date();
  const currWi = getWeekIndex(now);

  return PLAN.map((planWeek, i) => {
    const wi = planWeek.w - 1;
    const acts = byWeek[wi] || [];
    const isFuture = wi > currWi;
    const isCurrent = wi === currWi;

    const km = acts.reduce((s, a) => s + a.distance, 0) / 1000;
    const sessions = acts.length;
    const planKm = planWeek.km;
    const pct = planKm > 0 ? Math.min((km / planKm) * 100, 100) : 0;
    const avgPace = acts.length ? mpsToMinKm(acts.reduce((s,a) => s+a.average_speed,0)/acts.length) : null;

    const weekRange = getWeekRange(wi);

    let statusCls = '', statusLabel = '';
    if (isFuture) { statusCls = 'future'; statusLabel = 'Próxima'; }
    else if (isCurrent) { statusCls = 'current'; statusLabel = '● Actual'; }
    else if (sessions === 0) { statusCls = 'missed'; statusLabel = 'Sin datos'; }
    else if (pct >= 90) { statusCls = 'done'; statusLabel = '✓ Completada'; }
    else { statusCls = 'partial'; statusLabel = `${Math.round(pct)}%`; }

    return `
      <div class="sw-row ${isCurrent ? 'sw-current' : ''}" onclick="toggleStravaWeek(${wi})">
        <div class="sw-hd" data-swi="${wi}">
          <div class="sw-num">S${planWeek.w}</div>
          <div class="sw-range">${weekRange}</div>
          <div class="sw-status ${statusCls}">${statusLabel}</div>
          <div class="sw-bar-wrap">
            <div class="sw-bar" style="width:${isFuture ? 0 : pct}%"></div>
          </div>
          <div class="sw-km">${isFuture ? `${planKm} km plan` : `${km.toFixed(1)} / ${planKm} km`}</div>
          <div class="sw-toggle">+</div>
        </div>
        <div class="sw-sessions" id="sw-sessions-${wi}" style="display:none">
          ${acts.length === 0 && !isFuture ? '<div class="sw-empty">Sin actividades registradas esta semana</div>' : ''}
          ${acts.map(a => renderActivityRow(a)).join('')}
          ${avgPace ? `<div class="sw-footer">Pace medio: <strong>${avgPace}/km</strong> · ${secsToHms(acts.reduce((s,a)=>s+a.elapsed_time,0))} total</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderActivityRow(act) {
  const date = new Date(act.start_date_local).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' });
  const km = metersToKm(act.distance);
  const pace = mpsToMinKm(act.average_speed);
  const time = secsToHms(act.elapsed_time);
  const hr = act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '';

  return `
    <div class="act-row">
      <div class="act-info">
        <div class="act-name">${act.name}</div>
        <div class="act-date">${date}</div>
      </div>
      <div class="act-stats">
        <span class="act-km">${km} km</span>
        <span class="act-pace">${pace}/km</span>
        <span class="act-time">${time}</span>
        ${hr ? `<span class="act-hr">${hr}</span>` : ''}
      </div>
    </div>
  `;
}

function toggleStravaWeek(wi) {
  const el = document.getElementById(`sw-sessions-${wi}`);
  const hd = document.querySelector(`[data-swi="${wi}"]`);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if (hd) {
    const toggle = hd.querySelector('.sw-toggle');
    if (toggle) toggle.textContent = isOpen ? '+' : '−';
  }
}

async function refreshActivities() {
  showStravaLoading('Actualizando desde Strava...');
  const activities = await fetchActivities(true);
  const byWeek = groupByWeek(activities);
  renderStravaMain(activities, byWeek);
  showToast('✓ Actividades actualizadas', 'success');
}
