// scripts/analyze.js
// Corre en GitHub Actions. Lee env vars, fetchea Strava, llama a Gemini, escribe data/coach-latest.json

const fs = require('fs');
const path = require('path');

const GEM_API_KEY         = process.env.GEM_API_KEY;
const STRAVA_ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const STRAVA_ACTIVITY_ID  = process.env.STRAVA_ACTIVITY_ID;
const PLAN_CONTEXT        = JSON.parse(process.env.PLAN_CONTEXT || '{}');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEM_API_KEY}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function fetchRecentActivities() {
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

function parseActivity(act) {
  const splits = (act.splits_metric || []).map((s, i) => ({
    km: i + 1,
    pace: mpsToMinKm(s.average_speed),
    hr: s.average_heartrate ? Math.round(s.average_heartrate) : null,
    elevation: s.elevation_difference ? Math.round(s.elevation_difference) : null,
  }));

  let hrDrift = null;
  if (splits.length >= 4) {
    const half = Math.floor(splits.length / 2);
    const firstHalf  = splits.slice(0, half).filter(s => s.hr);
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
    avg_cadence: act.average_cadence ? Math.round(act.average_cadence * 2) : null,
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
  const { currentWeek, currentPhase, plannedSession, paces, vdot, totalWeeks, raceDate, intermediateRace } = planCtx;

  const pacesStr = paces
    ? `Fácil: ${paces.easy}/km | Moderado: ${paces.mod}/km | Tempo: ${paces.tempo}/km | Intervalos: ${paces.interval}/km | Pace 21K: ${paces.race}/km`
    : 'VDOT 42-43: Fácil 6:35 | Moderado 6:00 | Tempo 5:15 | Intervalos 4:50 | Pace 21K 5:40';

  const historyStr = recentHistory.length
    ? recentHistory.map(r => `  - ${r.date}: ${r.km}km a ${r.pace}/km${r.hr ? ` - ${r.hr}bpm` : ''} (${r.name})`).join('\n')
    : '  Sin historial reciente disponible.';

  const splitsStr = session.splits.length
    ? session.splits.map(s => `    Km ${s.km}: ${s.pace}/km${s.hr ? ` - ${s.hr}bpm` : ''}${s.elevation ? ` - ${s.elevation}m desnivel` : ''}`).join('\n')
    : '    No disponibles.';

  const plannedStr = plannedSession
    ? `  Tipo: ${plannedSession.type} | Descripcion: "${plannedSession.desc}" | Detalle: "${plannedSession.detail}"`
    : '  No se pudo determinar la sesion planificada para este dia.';

  return `Sos el entrenador personal de Rodrigo, un corredor amateur de Asuncion, Paraguay.

CONTEXTO DEL ATLETA:
- VDOT actual: ${vdot || '42-43'} | Metodologia: Jack Daniels
- PRs: 5K 24:57 - 10K 53:30
- Objetivo: Sub 2:00 en 21K el ${raceDate || '30 agosto 2026'}
- Carrera intermedia: 10K el ${intermediateRace || '5 julio 2026'} (objetivo sub 51:00)
- Entrena 4 dias/semana: mar/mie/vie/dom en la Costanera de Asuncion
- Condiciones habituales: calor extremo (30-38C), alta humedad
- Max HR estimado: 195-198 bpm

PLAN ACTUAL:
- Semana ${currentWeek || '?'} de ${totalWeeks || 22} | Fase: ${currentPhase || 'base'}
- Zonas de ritmo: ${pacesStr}

SESION PLANIFICADA:
${plannedStr}

SESION EJECUTADA (datos COROS via Strava):
  Fecha: ${session.date}
  Nombre: "${session.name}"
  Distancia: ${session.distance_km} km
  Tiempo total: ${session.duration} | Tiempo en movimiento: ${session.moving_time}
  Pace promedio: ${session.avg_pace || '-'}/km | Pace maximo: ${session.max_pace || '-'}/km
  FC promedio: ${session.avg_hr || '-'} bpm | FC maxima: ${session.max_hr || '-'} bpm
  Drift de FC: ${session.hr_drift_bpm !== null ? `+${session.hr_drift_bpm} bpm (primera vs segunda mitad)` : 'N/D'}
  Cadencia promedio: ${session.avg_cadence || '-'} pasos/min
  Desnivel: ${session.elevation_gain !== null ? `+${session.elevation_gain}m` : 'N/D'}

  Splits por kilometro:
${splitsStr}

HISTORIAL RECIENTE:
${historyStr}

INSTRUCCIONES:
Analiza esta sesion como entrenador experto en metodologia Jack Daniels. Considera:
1. Si el pace ejecutado esta dentro de la zona correcta para el tipo de sesion
2. El drift de FC como indicador de fatiga o calor
3. Consistencia de los splits
4. Carga acumulada del historial reciente
5. El impacto del calor (penalizacion estimada de 15-30s/km en dias >32C)

Devuelve UNICAMENTE un JSON puro sin ningun texto antes ni despues, sin bloques de codigo, sin backticks:
{"cumplimiento":"ok","emoji":"OK","titulo":"titulo corto","resumen":"2-3 oraciones de analisis","detalles":["punto 1","punto 2","punto 3","punto 4"],"ajustes_ritmos":{"aplicar":false,"razon":null,"nuevos_paces":{"easy":null,"mod":null,"tempo":null,"interval":null,"race":null}},"proxima_sesion":"recomendacion especifica","fatiga":{"detectada":false,"nivel":null,"senales":null},"generado_en":"TIMESTAMP"}

REGLAS ESTRICTAS:
- "cumplimiento" debe ser exactamente uno de: ok, ajuste_menor, revision_necesaria
- "emoji" debe ser exactamente uno de: OK, WARN, ALERT (no usar emojis Unicode, los reemplazare en el frontend)
- "nivel" de fatiga debe ser exactamente uno de: leve, moderada, alta, o null
- Responde en espanol rioplatense
- Reemplaza TIMESTAMP con la fecha actual ISO`;
}

// ── Gemini API ────────────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Verificar si Gemini bloqueó la respuesta
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    throw new Error(`Gemini bloqueó la respuesta: ${finishReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Gemini devolvio respuesta vacia');

  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(clean);
    // Mapear emojis de texto a Unicode (para evitar problemas de encoding en el workflow)
    const emojiMap = { 'OK': '✅', 'WARN': '⚠️', 'ALERT': '🔴' };
    if (parsed.emoji && emojiMap[parsed.emoji]) parsed.emoji = emojiMap[parsed.emoji];
    parsed.generado_en = new Date().toISOString();
    return parsed;
  } catch (e) {
    throw new Error(`No se pudo parsear respuesta de Gemini (${clean.length} chars): ${clean.slice(0, 500)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Iniciando analisis de actividad ${STRAVA_ACTIVITY_ID}...`);

  if (!GEM_API_KEY)          throw new Error('Falta GEM_API_KEY en secrets');
  if (!STRAVA_ACCESS_TOKEN)  throw new Error('Falta STRAVA_ACCESS_TOKEN');
  if (!STRAVA_ACTIVITY_ID)   throw new Error('Falta STRAVA_ACTIVITY_ID');

  console.log('Fetching Strava...');
  const [activityRaw, recentRaw] = await Promise.all([
    fetchActivity(STRAVA_ACTIVITY_ID),
    fetchRecentActivities(),
  ]);

  const session = parseActivity(activityRaw);
  const recentHistory = summarizeRecent(recentRaw, STRAVA_ACTIVITY_ID);

  console.log(`Actividad: "${session.name}" - ${session.distance_km}km a ${session.avg_pace}/km`);

  console.log('Llamando a Gemini 2.5 Flash...');
  const prompt = buildPrompt(session, recentHistory, PLAN_CONTEXT);
  const analysis = await callGemini(prompt);

  const result = {
    activity: session,
    analysis,
    recent_history: recentHistory,
    plan_context: PLAN_CONTEXT,
    fetched_at: new Date().toISOString(),
  };

  const outPath = path.join(process.cwd(), 'data', 'coach-latest.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`Analisis guardado en data/coach-latest.json`);
  console.log(`Cumplimiento: ${analysis.emoji} ${analysis.cumplimiento}`);
  console.log(`Titulo: ${analysis.titulo}`);
}

main().catch(err => {
  console.error('Error en analisis:', err.message);
  process.exit(1);
});
