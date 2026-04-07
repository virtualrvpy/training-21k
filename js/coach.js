// ============================================
// COACH.JS — Coach IA con datos de Strava
// ============================================

// Configuración GitHub — el usuario ingresa su token de repo (solo necesita scope 'repo')
// Se guarda en localStorage, NUNCA va al repo público
const GITHUB_REPO = 'virtualrvpy/training-21k';

let COACH_CONFIG = loadCoachConfig();

function loadCoachConfig() {
  try {
    const s = localStorage.getItem('coach_config');
    return s ? JSON.parse(s) : { githubToken: '' };
  } catch { return { githubToken: '' }; }
}

function saveCoachConfig() {
  localStorage.setItem('coach_config', JSON.stringify(COACH_CONFIG));
}

// ── Determinar sesión planificada para una fecha ──────────────────────────────

function getPlannedSessionForDate(dateStr) {
  const date = new Date(dateStr);
  const wi = getWeekIndex(date); // función de strava.js
  if (wi < 0 || wi >= PLAN.length) return null;

  const week = PLAN[wi];
  const dow = date.getDay(); // 0=dom,1=lun,2=mar...

  // Mapear DAY_OFFSET al día de la semana real
  // Mar=0 → martes(2), Mié=1 → miércoles(3), Vie=3 → viernes(5), Dom=5 → domingo(0)
  const dayMap = { 'Mar': 2, 'Mié': 3, 'Vie': 5, 'Dom': 0 };

  const session = week.sessions.find(s => dayMap[s.day] === dow);
  return session
    ? { ...session, weekNum: week.w, phase: week.phase, weekNote: week.note }
    : null;
}

// ── Disparar workflow vía GitHub API ─────────────────────────────────────────

async function triggerCoachWorkflow(activityId) {
  const token = COACH_CONFIG.githubToken;
  if (!token) throw new Error('Falta GitHub Token');

  const stravaConfig = loadStravaConfig(); // de strava.js
  const valid = await ensureValidToken();  // de strava.js
  if (!valid) throw new Error('Token de Strava inválido o expirado');

  // Obtener la actividad de la cache o fetchear para saber la fecha
  const activities = await fetchActivities();
  const act = activities.find(a => String(a.id) === String(activityId))
    || activities[0]; // fallback a la más reciente

  if (!act) throw new Error('No se encontró la actividad');

  const planned = getPlannedSessionForDate(act.start_date_local);

  // Contexto del plan que va al workflow
  const now = new Date();
  const currentWi = getWeekIndex(now);
  const currentWeekData = PLAN[currentWi] || PLAN[0];

  const planContext = {
    currentWeek: currentWeekData?.w,
    currentPhase: currentWeekData?.phase,
    totalWeeks: PLAN.length,
    raceDate: '30 agosto 2026',
    intermediateRace: '5 julio 2026',
    plannedSession: planned,
    paces: loadPaces(), // de paces.js
    vdot: localStorage.getItem('vdot') || '42-43',
  };

  const payload = {
    event_type: 'coach-analyze',
    client_payload: {
      access_token: stravaConfig.accessToken,
      activity_id: String(activityId),
      plan_context: planContext,
    },
  };

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub dispatch falló (${res.status}): ${err}`);
  }
}

// ── Polling: esperar que aparezca el resultado ────────────────────────────────

async function pollCoachResult(expectedAfter, onProgress, maxWaitMs = 600000) {
  const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/coach-latest.json`;
  const interval = 4000;  // check cada 6s
  const start = Date.now();
  let attempt = 0;

  return new Promise((resolve, reject) => {
    const check = async () => {
      attempt++;
      const elapsed = Math.round((Date.now() - start) / 1000);
      onProgress(`Analizando... ${elapsed}s`);

      if (Date.now() - start > maxWaitMs) {
        reject(new Error('Tiempo de espera agotado (3 min). Revisá GitHub Actions.'));
        return;
      }

      try {
        // Cache-bust para evitar que GitHub sirva versión vieja
        const res = await fetch(`${RAW_URL}?t=${Date.now()}`);
        if (!res.ok) { setTimeout(check, interval); return; }

        const data = await res.json();
        const fetchedAt = new Date(data.fetched_at).getTime();

        if (fetchedAt > expectedAfter) {
          resolve(data);
        } else {
          setTimeout(check, interval);
        }
      } catch {
        setTimeout(check, interval);
      }
    };

    setTimeout(check, 5000); // primer check después de 8s
  });
}

// ── Cargar resultado existente ────────────────────────────────────────────────

async function loadLatestCoachResult() {
  const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/coach-latest.json`;
  try {
    const res = await fetch(`${RAW_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Render principal ──────────────────────────────────────────────────────────

async function renderCoachApp() {
  const app = document.getElementById('coachApp');
  if (!app) return;

  if (!COACH_CONFIG.githubToken) {
    renderCoachSetup(app);
    return;
  }

  renderCoachLoading(app, 'Cargando último análisis...');

  const latest = await loadLatestCoachResult();
  if (latest) {
    renderCoachDashboard(app, latest, null);
  } else {
    renderCoachEmpty(app);
  }
}

function renderCoachSetup(app) {
  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>Análisis de tus entrenamientos con inteligencia artificial</p>
      </div>
      <div class="coach-setup">
        <div class="setup-card">
          <div class="setup-icon">🤖</div>
          <h3>Configurar Coach IA</h3>
          <p>El coach analiza cada sesión contra tu plan y te da feedback personalizado. Necesitás un GitHub Personal Access Token para disparar el análisis.</p>
          <ol class="setup-steps">
            <li>Andá a <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens/new</a></li>
            <li>Nombre: <code>training-21k-coach</code></li>
            <li>Scopes: ✅ <strong>repo</strong> (solo ese)</li>
            <li>Generá y copiá el token</li>
            <li>En GitHub → Settings del repo → Secrets → <strong>ANTHROPIC_API_KEY</strong> con tu clave de Claude</li>
          </ol>
          <div class="setup-form">
            <div class="form-field">
              <label>GitHub Personal Access Token</label>
              <input type="password" id="cGithubToken" placeholder="ghp_..." />
              <small style="color:var(--text2);font-size:11px">Se guarda solo en tu dispositivo. Nunca va al repo.</small>
            </div>
            <button class="btn-coach" onclick="saveCoachToken()">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveCoachToken() {
  const token = document.getElementById('cGithubToken').value.trim();
  if (!token) { showToast('Ingresá el token', 'error'); return; }
  COACH_CONFIG.githubToken = token;
  saveCoachConfig();
  renderCoachApp();
}

function renderCoachLoading(app, msg) {
  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header"><h2>COACH IA</h2></div>
      <div class="coach-analyzing">
        <div class="analyzing-ring"></div>
        <p class="analyzing-msg">${msg}</p>
      </div>
    </div>
  `;
}

function renderCoachEmpty(app) {
  const activities = ACTIVITIES_CACHE.data || [];
  const latestRun = activities[0];

  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>Sin análisis todavía — analizá tu última sesión</p>
      </div>
      <div class="coach-empty">
        <div class="empty-icon">🏃</div>
        <p>Todavía no hay ningún análisis guardado.</p>
        ${latestRun
          ? `<p style="margin-top:8px;font-size:13px;color:var(--text2)">Última sesión: <strong>${latestRun.name}</strong></p>`
          : ''}
        ${latestRun
          ? `<button class="btn-coach" style="margin-top:20px" onclick="startAnalysis('${latestRun.id}')">
               Analizar última sesión
             </button>`
          : `<p style="color:var(--text2);font-size:13px">Primero conectá Strava para ver tus actividades.</p>`}
      </div>
    </div>
  `;
}

function renderCoachDashboard(app, data, progressMsg) {
  const { activity: act, analysis: a, plan_context: ctx, fetched_at } = data;

  // Lista de actividades para el selector
  const activities = ACTIVITIES_CACHE.data || [];
  const actOptions = activities.slice(0, 10).map(x =>
    `<option value="${x.id}" ${String(x.id) === String(act?.id) ? 'selected' : ''}>
      ${new Date(x.start_date_local).toLocaleDateString('es-PY', {day:'numeric',month:'short'})} · ${(x.distance/1000).toFixed(1)}km · ${x.name}
    </option>`
  ).join('');

  const splitsHtml = (act?.splits || []).map(s => `
    <div class="split-row">
      <span class="split-km">Km ${s.km}</span>
      <span class="split-pace">${s.pace || '—'}</span>
      ${s.hr ? `<span class="split-hr">${s.hr} bpm</span>` : '<span class="split-hr">—</span>'}
    </div>
  `).join('');

  const detallesHtml = (a?.detalles || []).map(d =>
    `<li>${d}</li>`
  ).join('');

  const cumplimientoClass = {
    'ok': 'status-ok',
    'ajuste_menor': 'status-warn',
    'revision_necesaria': 'status-alert',
  }[a?.cumplimiento] || 'status-ok';

  const fatigaHtml = a?.fatiga?.detectada
    ? `<div class="coach-fatiga">
         <span class="fatiga-badge nivel-${a.fatiga.nivel}">Fatiga ${a.fatiga.nivel}</span>
         <span>${a.fatiga.senales}</span>
       </div>`
    : '';

  const ajustesHtml = a?.ajustes_ritmos?.aplicar
    ? `<div class="coach-ajustes">
         <div class="ajustes-title">⚡ Ritmos sugeridos</div>
         <div class="ajustes-reason">${a.ajustes_ritmos.razon}</div>
         <div class="ajustes-grid">
           ${Object.entries(a.ajustes_ritmos.nuevos_paces || {})
             .filter(([, v]) => v)
             .map(([k, v]) => `<div class="ajuste-item"><span>${k}</span><strong>${v}/km</strong></div>`)
             .join('')}
         </div>
         <button class="btn-apply-paces" onclick="applyCoachPaces(${JSON.stringify(a.ajustes_ritmos.nuevos_paces || {})})">
           Aplicar al plan
         </button>
       </div>`
    : '';

  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>Análisis · ${new Date(fetched_at).toLocaleString('es-PY', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
      </div>

      <div class="coach-content">

        <!-- Selector de actividad + botón analizar -->
        <div class="coach-selector plan-section">
          <div class="section-label">Analizar sesión</div>
          <div class="selector-row">
            <select id="activitySelect" class="activity-select">
              ${actOptions || '<option>Cargando actividades...</option>'}
            </select>
            <button class="btn-coach-sm" onclick="startAnalysisFromSelect()">
              Analizar ▶
            </button>
          </div>
          ${progressMsg ? `<div class="analyzing-inline"><div class="mini-spinner"></div><span>${progressMsg}</span></div>` : ''}
        </div>

        <!-- Status del análisis -->
        <div class="coach-status plan-section">
          <div class="status-badge ${cumplimientoClass}">
            ${a?.emoji || '✅'} ${a?.titulo || ''}
          </div>
          ${fatigaHtml}
        </div>

        <!-- Resumen del coach -->
        <div class="coach-resumen plan-section">
          <div class="section-label">Análisis del coach</div>
          <p class="coach-text">${a?.resumen || ''}</p>
          ${detallesHtml ? `<ul class="coach-detalles">${detallesHtml}</ul>` : ''}
        </div>

        <!-- Próxima sesión -->
        <div class="coach-proxima plan-section">
          <div class="section-label">Próxima sesión</div>
          <p class="coach-text proxima">${a?.proxima_sesion || ''}</p>
        </div>

        <!-- Ajustes de ritmo -->
        ${ajustesHtml}

        <!-- Datos de la sesión -->
        <div class="coach-session-data plan-section">
          <div class="section-label">
            Datos de la sesión
            <span class="session-name">${act?.name || ''}</span>
          </div>
          <div class="stat-grid">
            <div class="stat-card"><div class="s-label">Distancia</div><div class="s-value">${act?.distance_km || '—'}</div><div class="s-sub">km</div></div>
            <div class="stat-card"><div class="s-label">Pace medio</div><div class="s-value">${act?.avg_pace || '—'}</div><div class="s-sub">/km</div></div>
            <div class="stat-card"><div class="s-label">FC media</div><div class="s-value">${act?.avg_hr || '—'}</div><div class="s-sub">bpm</div></div>
            <div class="stat-card"><div class="s-label">Drift FC</div><div class="s-value">${act?.hr_drift_bpm !== null && act?.hr_drift_bpm !== undefined ? (act.hr_drift_bpm > 0 ? '+' : '') + act.hr_drift_bpm : '—'}</div><div class="s-sub">bpm</div></div>
          </div>

          ${splitsHtml ? `
            <div class="splits-table">
              <div class="splits-header">
                <span>Km</span><span>Pace</span><span>FC</span>
              </div>
              ${splitsHtml}
            </div>
          ` : ''}
        </div>

        <!-- Contexto del plan -->
        <div class="coach-plan-ctx plan-section">
          <div class="section-label">Contexto del plan</div>
          <div class="ctx-row">
            <span>Semana ${ctx?.currentWeek || '?'} de ${ctx?.totalWeeks || 22}</span>
            <span class="wk-phase ph-${ctx?.currentPhase}">${ctx?.currentPhase || ''}</span>
          </div>
          ${ctx?.plannedSession ? `
            <div class="ctx-planned">
              <strong>Planificado:</strong> ${ctx.plannedSession.desc}
            </div>
          ` : ''}
        </div>

        <!-- Botón reset config -->
        <div class="plan-section" style="text-align:right">
          <button class="btn-secondary" onclick="resetCoachConfig()">Cambiar GitHub Token</button>
        </div>

      </div>
    </div>
  `;
}

// ── Acciones ──────────────────────────────────────────────────────────────────

async function startAnalysis(activityId) {
  const app = document.getElementById('coachApp');
  renderCoachLoading(app, 'Enviando sesión al coach...');

  const triggeredAt = Date.now();

  try {
    await triggerCoachWorkflow(activityId);
    showToast('✓ Análisis iniciado — espera ~90 segundos', 'success');
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
    renderCoachEmpty(app);
    return;
  }

  // Cargar último resultado mientras esperamos (para mostrar algo)
  const prev = await loadLatestCoachResult();

  // Iniciar polling
  try {
    const result = await pollCoachResult(triggeredAt, (msg) => {
      const app = document.getElementById('coachApp');
      if (app) {
        if (prev) {
          renderCoachDashboard(app, prev, msg);
        } else {
          renderCoachLoading(app, msg);
        }
      }
    });
    renderCoachDashboard(app, result, null);
    showToast('✓ Análisis listo', 'success');
  } catch (e) {
    showToast(e.message, 'error');
    if (prev) renderCoachDashboard(app, prev, null);
    else renderCoachEmpty(app);
  }
}

async function startAnalysisFromSelect() {
  const sel = document.getElementById('activitySelect');
  if (!sel || !sel.value) { showToast('Seleccioná una actividad', 'error'); return; }
  await startAnalysis(sel.value);
}

function applyCoachPaces(newPaces) {
  // Integración con paces.js — actualiza las zonas si el coach sugiere cambios
  if (typeof applyPacesFromCoach === 'function') {
    applyPacesFromCoach(newPaces);
    showToast('✓ Ritmos actualizados en el plan', 'success');
  } else {
    showToast('Abrí la pestaña Plan para editar los ritmos', 'info');
  }
}

function resetCoachConfig() {
  COACH_CONFIG = { githubToken: '' };
  saveCoachConfig();
  renderCoachApp();
}
