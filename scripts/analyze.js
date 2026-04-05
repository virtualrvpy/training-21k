// scripts/analyze.js
// Corre en GitHub Actions. Lee env vars, fetchea Strava, llama a Claude, escribe data/coach-latest.json

const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY;
const STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_ACTIVITY_ID  = process.env.STRAVA_ACTIVITY_ID;
const PLAN_CONTEXT        = JSON.parse(process.env.PLAN_CONTEXT || '{}');

// ── Helpers ──────────────────────────────────────────────────────────────────

function mpsToMinKm(mps) {
  if (!mps || mps <= 0) return null;
  const secs = 1000 / mps;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function secsToHms(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function metersToKm(m) {
  return (m / 1000).toFixed(2);
}

// ── Strava fetch ──────────────────────────────────────────────────────────────

async function fetchActivity(id) {
  const url = `https://www.strava.com/api/v3/activities/${id}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`);
  return res.json();
}

async function fetchStreams(id) {
  const keys = 'heartrate,velocity_smooth,cadence,watts';
  const url = `https://www.strava.com/api/v3/activities/${id}/streams?keys=${keys}&key_by_type=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` }
  });
  if (!res.ok) return null; // streams opcionales
  return res.json();
}

async function fetchRecentActivities() {
  // Últimas 10 runs para dar contexto histórico al coach
  const after = Math.floor(new Date(2026, 2, 31).getTime() / 1000);
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=10&page=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` }
  });
  if (!res.ok) return [];
  const all = await res.json();
  return all.filter(a => a.type === 'Run' || a.sport_type === 'Run');
}

// ── Parsear actividad ─────────────────────────────────────────────────────────

function parseActivity(act, streams) {
  const splits = (act.splits_metric || []).map((s, i) => ({
    km: i + 1,
    pace: mpsToMinKm(s.average_speed),
    hr: s.average_heartrate ? Math.round(s.average_heartrate) : null,
    elevation: s.elevation_difference ? Math.round(s.elevation_difference) : null,
  }));

  // Calcular drift de HR (diferencia entre primera y última mitad)
  let hrDrift = null;
  if (splits.length >= 4) {
    const half = Math.floor(splits.length / 2);
    const firstHalf = splits.slice(0, half).filter(s => s.hr);
    const secondHalf = splits.slice(half).filter(s => s.hr);
    if (firstHalf.length && secondHalf.length) {
      const avg1 = firstHalf.reduce((s, x) => s + x.hr, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((s, x) => s + x.hr, 0) / secondHalf.length;
      hrDrift = Math.round(avg2 - avg1);
    }
  }

  return {
    id: act.id,
    name: act.name,
    date: act.start_date_local,
    distance_km: parseFloat(metersToKm(act.distance)),
    duration: secsToHms(act.elapsed_time),
    moving_time: secsToHms(act.moving_time),
    avg_pace: mpsToMinKm(act.average_speed),
    max_pace: mpsToMinKm(act.max_speed),
    avg_hr: act.average_heartrate ? Math.round(act.average_heartrate) : null,
    max_hr: act.max_heartrate ? Math.round(act.max_heartrate) : null,
    hr_drift_bpm: hrDrift,
    avg_cadence: act.average_cadence ? Math.round(act.average_cadence * 2) : null, // Strava da pasos/min por pie
    elevation_gain: act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null,
    suffer_score: act.suffer_score || null,
    splits,
  };
}

function summarizeRecent(activities, currentId) {
  return activities
    .filter(a => String(a.id) !== String(currentId))
    .slice(0, 7)
    .map(a => ({
      date: a.start_date_local?.slice(0, 10),
      km: parseFloat(metersToKm(a.distance)),
      pace: mpsToMinKm(a.average_speed),
      hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      name: a.name,
    }));
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(session, recentHistory, planCtx) {
  const {
    currentWeek, currentPhase, plannedSession, paces, vdot,
    totalWeeks, raceDate, intermediateRace
  } = planCtx;

  const pacesStr = paces
    ? `Fácil: ${paces.easy}/km | Moderado: ${paces.mod}/km | Tempo: ${paces.tempo}/km | Intervalos: ${paces.interval}/km | Pace 21K: ${paces.race}/km`
    : 'VDOT 42–43: Fácil 6:35 | Moderado 6:00 | Tempo 5:15 | Intervalos 4:50 | Pace 21K 5:40';

  const historyStr = recentHistory.length
    ? recentHistory.map(r =>
        `  - ${r.date}: ${r.km}km a ${r.pace}/km${r.hr ? ` · ${r.hr}bpm` : ''} (${r.name})`
      ).join('\n')
    : '  Sin historial reciente disponible.';

  const splitsStr = session.splits.length
    ? session.splits.map(s =>
        `    Km ${s.km}: ${s.pace}/km${s.hr ? ` · ${s.hr}bpm` : ''}${s.elevation ? ` · ${s.elevation}m desnivel` : ''}`
      ).join('\n')
    : '    No disponibles.';

  const plannedStr = plannedSession
    ? `  Tipo: ${plannedSession.type} | Descripción: "${plannedSession.desc}" | Detalle: "${plannedSession.detail}"`
    : '  No se pudo determinar la sesión planificada para este día.';

  return `Sos el entrenador personal de Rodrigo, un corredor amateur de Asunción, Paraguay.

CONTEXTO DEL ATLETA:
- VDOT actual: ${vdot || '42–43'} | Metodología: Jack Daniels
- PRs: 5K 24:57 · 10K 53:30
- Objetivo: Sub 2:00 en 21K el ${raceDate || '30 agosto 2026'}
- Carrera intermedia: 10K el ${intermediateRace || '5 julio 2026'} (objetivo sub 51:00)
- Entrena 4 días/semana: mar/mié/vie/dom en la Costanera de Asunción
- Condiciones habituales: calor extremo (30–38°C), alta humedad
- Zapatillas: NB 1080v14 (fácil/largo), SC Trainer v3 (intervalos/tempo), Rebel v5 (rodaje), Vaporfly 3 (carrera)
- Max HR estimado: 195–198 bpm

PLAN ACTUAL:
- Semana ${currentWeek || '?'} de ${totalWeeks || 22} | Fase: ${currentPhase || 'base'}
- Zonas de ritmo: ${pacesStr}

SESIÓN PLANIFICADA:
${plannedStr}

SESIÓN EJECUTADA (datos COROS vía Strava):
  Fecha: ${session.date}
  Nombre: "${session.name}"
  Distancia: ${session.distance_km} km
  Tiempo total: ${session.duration} | Tiempo en movimiento: ${session.moving_time}
  Pace promedio: ${session.avg_pace || '—'}/km | Pace máximo: ${session.max_pace || '—'}/km
  FC promedio: ${session.avg_hr || '—'} bpm | FC máxima: ${session.max_hr || '—'} bpm
  Drift de FC: ${session.hr_drift_bpm !== null ? `+${session.hr_drift_bpm} bpm (primera vs segunda mitad)` : 'N/D'}
  Cadencia promedio: ${session.avg_cadence || '—'} pasos/min
  Desnivel: ${session.elevation_gain !== null ? `+${session.elevation_gain}m` : 'N/D'}
  Suffer Score: ${session.suffer_score || 'N/D'}

  Splits por kilómetro:
${splitsStr}

HISTORIAL RECIENTE (últimas sesiones del plan):
${historyStr}

INSTRUCCIONES DE ANÁLISIS:
Analizá esta sesión como entrenador experto en metodología Jack Daniels. Considerá especialmente:
1. Si el pace ejecutado está dentro de la zona correcta para el tipo de sesión
2. El drift de FC como indicador de fatiga o calor
3. Consistencia de los splits (¿empezó muy rápido? ¿frenó al final?)
4. Carga acumulada del historial reciente
5. El impacto del calor en Asunción (penalización estimada de 15–30s/km en días >32°C)

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones fuera del JSON:

{
  "cumplimiento": "ok" | "ajuste_menor" | "revision_necesaria",
  "emoji": "✅" | "⚠️" | "🔴",
  "titulo": "string corto tipo titular (max 60 chars)",
  "resumen": "string 2-3 oraciones, tono directo de entrenador, en español",
  "detalles": [
    "punto específico sobre pace/zonas",
    "punto sobre FC/esfuerzo",
    "punto sobre splits o consistencia",
    "punto sobre calor o condiciones si aplica"
  ],
  "ajustes_ritmos": {
    "aplicar": true | false,
    "razon": "string o null",
    "nuevos_paces": {
      "easy": "M:SS o null",
      "mod": "M:SS o null",
      "tempo": "M:SS o null",
      "interval": "M:SS o null",
      "race": "M:SS o null"
    }
  },
  "proxima_sesion": "string: qué hacer en el próximo entrenamiento, específico",
  "fatiga": {
    "detectada": true | false,
    "nivel": "leve" | "moderada" | "alta" | null,
    "senales": "string o null"
  },
  "generado_en": "${new Date().toISOString()}"
}`;
}

// ── Claude API ────────────────────────────────────────────────────────────────

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  // Limpiar posibles backticks de markdown
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`No se pudo parsear respuesta de Claude: ${clean.slice(0, 200)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Iniciando análisis de actividad ${STRAVA_ACTIVITY_ID}...`);

  if (!ANTHROPIC_API_KEY)  throw new Error('Falta ANTHROPIC_API_KEY');
  if (!STRAVA_ACCESS_TOKEN) throw new Error('Falta STRAVA_ACCESS_TOKEN');
  if (!STRAVA_ACTIVITY_ID)  throw new Error('Falta STRAVA_ACTIVITY_ID');

  // 1. Fetch actividad principal + streams + historial
  console.log('Fetching Strava...');
  const [activityRaw, streams, recentRaw] = await Promise.all([
    fetchActivity(STRAVA_ACTIVITY_ID),
    fetchStreams(STRAVA_ACTIVITY_ID),
    fetchRecentActivities(),
  ]);

  const session = parseActivity(activityRaw, streams);
  const recentHistory = summarizeRecent(recentRaw, STRAVA_ACTIVITY_ID);

  console.log(`Actividad: "${session.name}" — ${session.distance_km}km a ${session.avg_pace}/km`);

  // 2. Construir prompt y llamar a Claude
  console.log('Llamando a Claude...');
  const prompt = buildPrompt(session, recentHistory, PLAN_CONTEXT);
  const analysis = await callClaude(prompt);

  // 3. Armar resultado final
  const result = {
    activity: session,
    analysis,
    recent_history: recentHistory,
    plan_context: PLAN_CONTEXT,
    fetched_at: new Date().toISOString(),
  };

  // 4. Escribir archivo
  const outPath = path.join(process.cwd(), 'data', 'coach-latest.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`✓ Análisis guardado en data/coach-latest.json`);
  console.log(`  Cumplimiento: ${analysis.emoji} ${analysis.cumplimiento}`);
  console.log(`  Título: ${analysis.titulo}`);
}

main().catch(err => {
  console.error('Error en análisis:', err.message);
  process.exit(1);
});
