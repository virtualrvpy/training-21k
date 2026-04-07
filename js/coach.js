// ============================================
// COACH.JS — Coach IA con datos de Strava
// ============================================

const GITHUB_REPO = 'virtualrvpy/training-21k';
const MAX_STORED_ANALYSES = 10;

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

// ── Historial local ───────────────────────────────────────────────────────────

function loadAnalysisHistory() {
  try {
    const s = localStorage.getItem('coach_history');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveAnalysisToHistory(result) {
  const history = loadAnalysisHistory();
  const filtered = history.filter(h => String(h.activity?.id) !== String(result.activity?.id));
  filtered.unshift(result);
  const trimmed = filtered.slice(0, MAX_STORED_ANALYSES);
  localStorage.setItem('coach_history', JSON.stringify(trimmed));
}

// ── Sesión planificada para fecha ─────────────────────────────────────────────

function getPlannedSessionForDate(dateStr) {
  const date = new Date(dateStr);
  const wi = getWeekIndex(date);
  if (wi < 0 || wi >= PLAN.length) return null;
  const week = PLAN[wi];
  const dow = date.getDay();
  const session = week.sessions.find(s => {
    const n = s.day === 'Mar' ? 2 : s.day === 'Mi\u00e9' ? 3 : s.day === 'Vie' ? 5 : s.day === 'Dom' ? 0 : -1;
    return n === dow;
  });
  return session ? { ...session, weekNum: week.w, phase: week.phase, weekNote: week.note } : null;
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

async function triggerCoachWorkflow(activityId) {
  const token = COACH_CONFIG.githubToken;
  if (!token) throw new Error('Falta GitHub Token');

  const stravaConfig = loadStravaConfig();
  const valid = await ensureValidToken();
  if (!valid) throw new Error('Token de Strava inv\u00e1lido o expirado');

  const activities = await fetchActivities();
  const act = activities.find(a => String(a.id) === String(activityId)) || activities[0];
  if (!act) throw new Error('No se encontr\u00f3 la actividad');

  const planned = getPlannedSessionForDate(act.start_date_local);
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
    paces: loadPaces(),
    vdot: localStorage.getItem('vdot') || '42-43',
  };

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'coach-analyze',
      client_payload: {
        access_token: stravaConfig.accessToken,
        activity_id: String(activityId),
        plan_context: planContext,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub dispatch fall\u00f3 (${res.status}): ${err}`);
  }
}

// ── Polling ───────────────────────────────────────────────────────────────────

async function pollCoachResult(expectedAfter, onProgress, maxWaitMs = 600000) {
  const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/coach-latest.json`;
  const interval = 4000;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      const elapsed = Math.round((Date.now() - start) / 1000);
      onProgress(`Analizando... ${elapsed}s`);
      if (Date.now() - start > maxWaitMs) {
        reject(new Error('Tiempo de espera agotado. Revisá GitHub Actions.'));
        return;
      }
      try {
        const res = await fetch(`${RAW_URL}?t=${Date.now()}`);
        if (!res.ok) { setTimeout(check, interval); return; }
        const data = await res.json();
        if (data._error) {
          reject(new Error(data.message || 'El análisis falló en el servidor.'));
          return;
        }
        if (new Date(data.fetched_at).getTime() > expectedAfter) {
          resolve(data);
        } else {
          setTimeout(check, interval);
        }
      } catch { setTimeout(check, interval); }
    };
    setTimeout(check, 5000);
  });
}
      try {
        const res = await fetch(`${RAW_URL}?t=${Date.now()}`);
        if (!res.ok) { setTimeout(check, interval); return; }
        const data = await res.json();
        if (new Date(data.fetched_at).getTime() > expectedAfter) {
          resolve(data);
        } else {
          setTimeout(check, interval);
        }
      } catch { setTimeout(check, interval); }
    };
    setTimeout(check, 5000);
  });
}

async function loadLatestCoachResult() {
  const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/coach-latest.json`;
  try {
    const res = await fetch(`${RAW_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data._empty) return null;
    return data;
  } catch { return null; }
}

// ── Render principal ──────────────────────────────────────────────────────────

async function renderCoachApp() {
  const app = document.getElementById('coachApp');
  if (!app) return;

  if (!COACH_CONFIG.githubToken) { renderCoachSetup(app); return; }

  renderCoachLoading(app, 'Cargando...');

  const [latest, history] = await Promise.all([
    loadLatestCoachResult(),
    Promise.resolve(loadAnalysisHistory()),
  ]);

  if (latest) {
    saveAnalysisToHistory(latest);
    renderCoachDashboard(app, latest, null, loadAnalysisHistory());
  } else if (history.length > 0) {
    renderCoachDashboard(app, history[0], null, history);
  } else {
    renderCoachEmpty(app);
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function renderCoachSetup(app) {
  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>An\u00e1lisis inteligente de tus entrenamientos</p>
      </div>
      <div class="coach-setup">
        <div class="setup-card">
          <div class="setup-icon">\uD83E\uDD16</div>
          <h3>Configurar Coach IA</h3>
          <p>El coach analiza cada sesi\u00f3n contra tu plan usando Gemini 3 Flash.</p>
          <ol class="setup-steps">
            <li>And\u00e1 a <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens/new</a></li>
            <li>Scopes: \u2705 <strong>repo</strong> + \u2705 <strong>workflow</strong></li>
            <li>Gener\u00e1 y copi\u00e1 el token</li>
          </ol>
          <div class="setup-form">
            <div class="form-field">
              <label>GitHub Personal Access Token</label>
              <input type="password" id="cGithubToken" placeholder="ghp_..." />
              <small style="color:var(--text2);font-size:11px">Solo se guarda en este dispositivo.</small>
            </div>
            <button class="btn-coach" onclick="saveCoachToken()">Guardar y continuar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveCoachToken() {
  const token = document.getElementById('cGithubToken').value.trim();
  if (!token) { showToast('Ingres\u00e1 el token', 'error'); return; }
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

// ── Empty ─────────────────────────────────────────────────────────────────────

function renderCoachEmpty(app) {
  const next = getNextPlannedSession();
  const activities = ACTIVITIES_CACHE.data || [];
  const latestRun = activities[0];

  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>Analizá tu última sesión para empezar</p>
      </div>
      <div class="plan-section">
        <div class="section-label">Analizar sesi\u00f3n</div>
        ${latestRun ? `
          <div class="empty-run-card">
            <div class="empty-run-info">
              <strong>${latestRun.name}</strong>
              <span>${(latestRun.distance/1000).toFixed(1)}km \u00b7 ${new Date(latestRun.start_date_local).toLocaleDateString('es-PY',{day:'numeric',month:'short'})}</span>
            </div>
            <button class="btn-coach-sm" onclick="startAnalysis('${latestRun.id}')">Analizar \u25ba</button>
          </div>
        ` : `<p style="color:var(--text2);font-size:13px;padding:12px 0">Prim\u00e9ro conect\u00e1 Strava.</p>`}
      </div>
      <div class="plan-section" style="text-align:right">
        <button class="btn-secondary" onclick="resetCoachConfig()">Cambiar GitHub Token</button>
      </div>
    </div>
  `;
}

function renderNextSessionCard(next) {
  return `
    <div class="plan-section coach-next-session">
      <div class="section-label">Pr\u00f3ximo entrenamiento</div>
      <div class="next-session-card">
        <div class="next-sess-header">
          <span class="next-sess-when">${next.isToday ? '\uD83D\uDFE2 Hoy' : next.isTomorrow ? '\uD83D\uDFE1 Ma\u00f1ana' : next.dateStr}</span>
          <span class="next-sess-type t-${next.type}">${next.label}</span>
        </div>
        <div class="next-sess-desc">${applyPacesToText(next.desc)}</div>
        <div class="next-sess-detail">${next.detail}</div>
        <div class="next-sess-meta">Semana ${next.weekNum} \u00b7 ${next.phase}</div>
      </div>
    </div>
  `;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderCoachDashboard(app, data, progressMsg, history) {
  const { activity: act, analysis: a, plan_context: ctx, fetched_at } = data;
  const next = getNextPlannedSession();
  const activities = ACTIVITIES_CACHE.data || [];

  const actOptions = activities.slice(0, 10).map(x =>
    `<option value="${x.id}" ${String(x.id) === String(act?.id) ? 'selected' : ''}>
      ${new Date(x.start_date_local).toLocaleDateString('es-PY',{day:'numeric',month:'short'})} \u00b7 ${(x.distance/1000).toFixed(1)}km \u00b7 ${x.name}
    </option>`
  ).join('');

  const splitsHtml = (act?.splits || []).map(s => `
    <div class="split-row">
      <span class="split-km">Km ${s.km}</span>
      <span class="split-pace">${s.pace || '\u2014'}</span>
      <span class="split-hr">${s.hr ? s.hr + ' bpm' : '\u2014'}</span>
    </div>`).join('');

  const detallesHtml = (a?.detalles || []).map(d => `<li>${d}</li>`).join('');

  const cumplimientoClass = { 'ok':'status-ok','ajuste_menor':'status-warn','revision_necesaria':'status-alert' }[a?.cumplimiento] || 'status-ok';

  const fatigaHtml = a?.fatiga?.detectada ? `
    <div class="coach-fatiga">
      <span class="fatiga-badge nivel-${a.fatiga.nivel}">Fatiga ${a.fatiga.nivel}</span>
      <span>${a.fatiga.senales}</span>
    </div>` : '';

  const ajustesHtml = a?.ajustes_ritmos?.aplicar ? `
    <div class="coach-ajustes">
      <div class="ajustes-title">\u26a1 Ritmos sugeridos</div>
      <div class="ajustes-reason">${a.ajustes_ritmos.razon}</div>
      <div class="ajustes-grid">
        ${Object.entries(a.ajustes_ritmos.nuevos_paces||{}).filter(([,v])=>v)
          .map(([k,v])=>`<div class="ajuste-item"><span>${k}</span><strong>${v}/km</strong></div>`).join('')}
      </div>
      <button class="btn-apply-paces" onclick="applyCoachPaces(${JSON.stringify(a.ajustes_ritmos.nuevos_paces||{})})">Aplicar al plan</button>
    </div>` : '';

  const historyHtml = (history||[]).length > 1 ? `
    <div class="plan-section">
      <div class="section-label">An\u00e1lisis anteriores</div>
      <div class="analysis-history">
        ${(history||[]).slice(1,6).map(h=>`
          <div class="history-row" onclick="showHistoryItem('${h.activity?.id}')">
            <span class="hist-date">${new Date(h.fetched_at).toLocaleDateString('es-PY',{day:'numeric',month:'short'})}</span>
            <span class="hist-name">${h.activity?.name||'\u2014'}</span>
            <span class="hist-emoji">${h.analysis?.emoji||'\u2705'}</span>
            <span class="hist-km">${h.activity?.distance_km}km</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  app.innerHTML = `
    <div class="coach-page">
      <div class="page-header">
        <h2>COACH IA</h2>
        <p>An\u00e1lisis \u00b7 ${new Date(fetched_at).toLocaleString('es-PY',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
      </div>
      <div class="coach-content">

        <div class="coach-selector plan-section">
          <div class="section-label">Analizar sesi\u00f3n</div>
          <div class="selector-row">
            <select id="activitySelect" class="activity-select">
              ${actOptions||'<option>Conect\u00e1 Strava primero</option>'}
            </select>
            <button class="btn-coach-sm" onclick="startAnalysisFromSelect()">Analizar \u25ba</button>
          </div>
          ${progressMsg?`<div class="analyzing-inline"><div class="mini-spinner"></div><span>${progressMsg}</span></div>`:''}
        </div>

        <div class="coach-status plan-section">
          <div class="status-badge ${cumplimientoClass}">${a?.emoji||'\u2705'} ${a?.titulo||''}</div>
          ${fatigaHtml}
        </div>

        <div class="coach-resumen plan-section">
          <div class="section-label">An\u00e1lisis</div>
          <p class="coach-text">${a?.resumen||''}</p>
          ${detallesHtml?`<ul class="coach-detalles">${detallesHtml}</ul>`:''}
        </div>

        <div class="coach-proxima plan-section">
          <div class="section-label">Recomendaci\u00f3n</div>
          <p class="coach-text proxima">${a?.proxima_sesion||''}</p>
        </div>

        ${ajustesHtml}

        <div class="coach-session-data plan-section">
          <div class="section-label">Sesi\u00f3n analizada <span class="session-name">${act?.name||''}</span></div>
          <div class="stat-grid">
            <div class="stat-card"><div class="s-label">Distancia</div><div class="s-value">${act?.distance_km||'\u2014'}</div><div class="s-sub">km</div></div>
            <div class="stat-card"><div class="s-label">Pace</div><div class="s-value">${act?.avg_pace||'\u2014'}</div><div class="s-sub">/km</div></div>
            <div class="stat-card"><div class="s-label">FC media</div><div class="s-value">${act?.avg_hr||'\u2014'}</div><div class="s-sub">bpm</div></div>
            <div class="stat-card"><div class="s-label">Drift FC</div><div class="s-value">${act?.hr_drift_bpm!=null?(act.hr_drift_bpm>0?'+':'')+act.hr_drift_bpm:'\u2014'}</div><div class="s-sub">bpm</div></div>
          </div>
          ${splitsHtml?`<div class="splits-table"><div class="splits-header"><span>Km</span><span>Pace</span><span>FC</span></div>${splitsHtml}</div>`:''}
        </div>

        ${ctx?.plannedSession?`
        <div class="plan-section">
          <div class="section-label">Sesi\u00f3n planificada ese d\u00eda</div>
          <div class="ctx-planned">
            <strong>${ctx.plannedSession.label}</strong> \u00b7 ${ctx.plannedSession.desc}
            <div style="margin-top:4px;font-size:11px;color:var(--text2)">${ctx.plannedSession.detail}</div>
          </div>
        </div>`:''}

        ${historyHtml}

        <div class="plan-section" style="text-align:right">
          <button class="btn-secondary" onclick="resetCoachConfig()">Cambiar GitHub Token</button>
        </div>
      </div>
    </div>
  `;
}

function showHistoryItem(activityId) {
  const history = loadAnalysisHistory();
  const item = history.find(h => String(h.activity?.id) === String(activityId));
  if (!item) return;
  renderCoachDashboard(document.getElementById('coachApp'), item, null, history);
}

async function startAnalysis(activityId) {
  const app = document.getElementById('coachApp');
  const history = loadAnalysisHistory();

  renderCoachLoading(app, 'Iniciando...');

  const triggeredAt = Date.now();

  try {
    await triggerCoachWorkflow(activityId);
    showToast('\u2713 An\u00e1lisis iniciado \u2014 ~15 segundos', 'success');
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
    const h = loadAnalysisHistory();
    if (h.length > 0) renderCoachDashboard(app, h[0], null, h);
    else renderCoachEmpty(app);
    return;
  }

  try {
    const result = await pollCoachResult(triggeredAt, (msg) => {
      const a = document.getElementById('coachApp');
      if (!a) return;
      renderCoachLoading(a, msg);
    });
    saveAnalysisToHistory(result);
    renderCoachDashboard(app, result, null, loadAnalysisHistory());
    showToast('\u2713 An\u00e1lisis listo', 'success');
  } catch (e) {
    showToast(e.message, 'error');
    const h = loadAnalysisHistory();
    if (h.length > 0) renderCoachDashboard(app, h[0], null, h);
    else renderCoachEmpty(app);
  }
}

async function startAnalysisFromSelect() {
  const sel = document.getElementById('activitySelect');
  if (!sel || !sel.value) { showToast('Selecci\u00f3n una actividad', 'error'); return; }
  await startAnalysis(sel.value);
}

function applyCoachPaces(newPaces) {
  if (typeof applyPacesFromCoach === 'function') {
    applyPacesFromCoach(newPaces);
    showToast('\u2713 Ritmos actualizados en el plan', 'success');
  } else {
    showToast('Abr\u00ed la pesta\u00f1a Plan para editar los ritmos', 'info');
  }
}

function resetCoachConfig() {
  COACH_CONFIG = { githubToken: '' };
  saveCoachConfig();
  renderCoachApp();
}
