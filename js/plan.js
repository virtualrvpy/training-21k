// ============================================
// PLAN.JS — Plan de entrenamiento 22 semanas
// ============================================

// Semana 1: martes 31 marzo 2026 · Carrera: domingo 30 agosto 2026
const PLAN_START = new Date(2026, 2, 31);
const DAY_OFFSET = { 'Mar': 0, 'Mié': 1, 'Vie': 3, 'Dom': 5 };

function getSessionDate(weekIndex, dayKey) {
  const d = new Date(PLAN_START);
  d.setDate(d.getDate() + weekIndex * 7 + (DAY_OFFSET[dayKey] || 0));
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}

function getWeekRange(weekIndex) {
  const start = new Date(PLAN_START);
  start.setDate(start.getDate() + weekIndex * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  const fmt = d => d.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Pace tokens: [E]=fácil [M]=moderado [T]=tempo [I]=intervalo [R]=race 21K
// Rangos: ±5–7s del pace central
const PLAN = [
  // ---- FASE BASE S1–8 ----
  { w: 1, phase: 'base', km: 28, note: 'Construcción aeróbica', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '8km fácil [E]', detail: '10min plío: skipping A/B, saltos cajón · trote suave' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Sesión completa (35 min)', detail: 'Búlgara 3×10, RDL 3×10, hip thrust 3×12, core 3×30s' },
    { day: 'Vie', type: 'easy',     label: 'Aeróbico + Fuerza B',  desc: '8km moderado [M] + Fuerza B', detail: 'Estocada, step-up, excéntrico talón, core — 25 min' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '12km largo [E]', detail: 'Ritmo conversacional · hidratación c/4km' },
  ]},
  { w: 2, phase: 'base', km: 30, note: 'Construcción aeróbica', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '8km fácil [E] + 10min plío', detail: 'Skipping A/B, saltos cajón 3×8' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 5km fácil opcional', detail: 'Prioridad fuerza si hay fatiga' },
    { day: 'Vie', type: 'easy',     label: 'Aeróbico + Fuerza B',  desc: '8km [M] + Fuerza B', detail: 'Excéntrico de talón clave en esta etapa' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '14km largo [E]', detail: 'Últimos 2km a [M] si te sentís bien' },
  ]},
  { w: 3, phase: 'base', km: 32, note: 'Construcción aeróbica', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '9km fácil [E] + 10min plío', detail: 'Bounding 3×20m' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil', detail: 'Aumentar carga en búlgara y RDL' },
    { day: 'Vie', type: 'tempo',    label: 'Progresivo suave',     desc: '9km: 4 fácil + 3 progresivo ([M]→[T]) + 2 fácil', detail: 'Primera introducción de ritmo sostenido' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '14km largo [E]', detail: 'Ritmo conversacional constante' },
  ]},
  { w: 4, phase: 'base', km: 28, note: '⬇ Semana de descarga', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Plío ligera',  desc: '7km fácil [E] + 8min plío suave', detail: 'Reducir volumen, mantener activación' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A (reducida)',  desc: 'Fuerza A al 70% — 2 series c/ejercicio', detail: 'Descarga muscular activa' },
    { day: 'Vie', type: 'easy',     label: 'Aeróbico suave',       desc: '7km fácil [E]', detail: 'Sin fuerza posterior' },
    { day: 'Dom', type: 'long',     label: 'Largo corto',          desc: '10km largo [E]', detail: 'Ritmo muy cómodo — recuperación' },
  ]},
  { w: 5, phase: 'base', km: 33, note: 'Inicio tempo continuo', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '9km fácil [E] + 10min plío', detail: 'Saltos alternos 4×6 c/lado' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil', detail: 'Progressión de carga normal' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo continuo',       desc: '10km: 2cal + 5km tempo [T] + 3vuelta', detail: 'Primer tempo sostenido — mantener pace estable' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '16km largo [E]', detail: 'Nutrición: gel o dátiles a los 10km' },
  ]},
  { w: 6, phase: 'base', km: 35, note: 'Tempo + volumen', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '9km fácil [E] + 10min plío', detail: 'Hops unilaterales 3×8 c/lado' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km moderado', detail: 'Progressión de carga' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo + strides',      desc: '10km: 2cal + 6km tempo [T] + 2vuelta + 4×100m strides', detail: 'Strides: aceleración suave al 85%, no sprint' },
    { day: 'Dom', type: 'long',     label: 'Largo con ritmo',      desc: '17km: 6 fácil [E] + 8 moderado [M] + 3 fácil', detail: 'Primer largo con segmento de ritmo' },
  ]},
  { w: 7, phase: 'base', km: 36, note: 'Construcción máxima base', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Pliometría',   desc: '10km fácil [E] + 10min plío', detail: 'Bounding progresivo 4×30m' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 7km fácil', detail: 'Volumen de fuerza al máximo de esta fase' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo 2×20min',        desc: '12km: 2cal + 20min [T] + 3min trote + 20min [T] + 2vuelta', detail: 'Pace estable en ambos bloques — descanso activo' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '18km largo [E]', detail: 'Ritmo aeróbico cómodo constante' },
  ]},
  { w: 8, phase: 'base', km: 28, note: '⬇ Descarga + test 5K', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil activación',     desc: '6km fácil [E] + 4×100m strides', detail: 'Preparación semana test' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A ligera',      desc: 'Fuerza A al 60% — activación', detail: 'Sin fatiga muscular' },
    { day: 'Vie', type: 'interval', label: 'Test 5K (time trial)', desc: '2km cal + 5K máximo esfuerzo + 2km vuelta', detail: 'Recalibrar VDOT y zonas. Objetivo: sub 24:00' },
    { day: 'Dom', type: 'long',     label: 'Largo suave',          desc: '12km largo [E]', detail: 'Recuperación post-test' },
  ]},

  // ---- FASE DESARROLLO S9–14 ----
  { w: 9, phase: 'build', km: 37, note: 'Inicio intervalos VO2', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '12km: 2cal + 5×1000m [I] rec 400m + 2vuelta', detail: '10min plío antes · Rec: 2:30–3min entre repeticiones' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil [E]', detail: 'Prioridad tren inferior' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo + Fuerza B',     desc: '10km: 2cal + 6km tempo [T] + 2vuelta + Fuerza B', detail: 'Controlado — no forzar tras intervalos del martes' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '18km largo [E]', detail: 'Gel a los 12km' },
  ]},
  { w: 10, phase: 'build', km: 38, note: 'Carga alta', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '12km: 2cal + 6×800m [I] rec 400m + 2vuelta', detail: '10min plío (drop jumps 3×6) · Pace constante en todas las series' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil [E]', detail: 'Fuerza de mantenimiento' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo progresivo + Fuerza B', desc: '11km: 2cal + 7km progresivo ([M]→[T]) + 2vuelta + Fuerza B', detail: 'Últimos 2km al límite del umbral' },
    { day: 'Dom', type: 'long',     label: 'Largo',                desc: '19km: 15 suave [E] + 4 a pace objetivo [R]', detail: 'Primer contacto sostenido con pace de carrera' },
  ]},
  { w: 11, phase: 'build', km: 40, note: 'Semana de carga pico build', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '13km: 2cal + 4×1200m [I] rec 600m + 2vuelta', detail: '10min plío · Series largas — control fino de pace' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 7km fácil [E]', detail: 'Carga máxima fase build' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo 3×10min + Fuerza B', desc: '11km: 2cal + 3×10min [T] rec 2min + 2vuelta + Fuerza B', detail: 'Pace igual en los 3 bloques' },
    { day: 'Dom', type: 'long',     label: '⚡ Largo 20km',         desc: '20km: 17 suave [E] + 3 a pace objetivo [R]', detail: 'Primer 20K — nutrición cada 5km' },
  ]},
  { w: 12, phase: 'build', km: 30, note: '⬇ Descarga', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + Plío suave',   desc: '8km fácil [E] + 8min plío suave', detail: 'Recuperación activa' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A reducida',    desc: 'Fuerza A 70% + 5km fácil [E]', detail: 'Descarga estratégica' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo corto + Fuerza B', desc: '8km: 2cal + 3km tempo [T] + 3vuelta + Fuerza B ligera', detail: 'Mantener estímulo sin acumular fatiga' },
    { day: 'Dom', type: 'long',     label: 'Largo suave',          desc: '14km cómodo [E]', detail: 'Recuperación total' },
  ]},
  { w: 13, phase: 'build', km: 40, note: 'Pre-carrera 10K', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Plío',    desc: '10km: 2cal + 4×800m [I] rec 400m + 2vuelta', detail: '10min plío · Velocidad pre-10K' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A moderada',    desc: 'Fuerza A + 6km fácil [E]', detail: 'Normal — aún lejos del 10K' },
    { day: 'Vie', type: 'easy',     label: 'Fácil + strides + Fuerza B', desc: '8km fácil [E] + 6×100m strides + Fuerza B activación', detail: 'Strides a ritmo de carrera 10K' },
    { day: 'Dom', type: 'long',     label: 'Largo con ritmo',      desc: '18km: 12 suave [E] + 6 a pace [R]', detail: 'Confianza pre-10K' },
  ]},
  { w: 14, phase: 'build', km: 28, note: '🏃 Semana carrera 10K', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + strides',      desc: '7km fácil [E] + 4×100m strides', detail: 'Último trabajo de calidad. Sin pliometría' },
    { day: 'Mié', type: 'easy',     label: 'Trote suave',          desc: '5km muy suave [E]', detail: 'Sin fuerza. Descanso activo' },
    { day: 'Vie', type: 'easy',     label: 'Activación pre-10K',   desc: '3km suave + 4×100m strides', detail: 'Piernas livianas para mañana' },
    { day: 'Dom', type: 'race',     label: '🏁 CARRERA 10K — 5 Jul', desc: 'Objetivo: 49:30–51:00 · Pace: ~4:57–5:06/km', detail: 'Resultado recalibra zonas para las últimas 8 semanas' },
  ]},

  // ---- FASE PEAK S15–19 ----
  { w: 15, phase: 'peak', km: 38, note: 'Recuperación 10K + inicio peak', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Recuperación + Plío ligera', desc: '9km fácil [E] + 8min plío suave', detail: 'Post-carrera 10K — no forzar' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil [E]', detail: 'Retomar fuerza con normalidad' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo pace 21K + Fuerza B', desc: '10km: 2cal + 5km a pace [R] + 3vuelta + Fuerza B', detail: 'Sentir el pace de competencia — debe sentirse moderado' },
    { day: 'Dom', type: 'long',     label: 'Largo 18km',           desc: '18km: 13 suave [E] + 5 a pace [R]', detail: 'Segmento de carrera al final con algo de fatiga' },
  ]},
  { w: 16, phase: 'peak', km: 42, note: 'Peak máximo volumen', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '13km: 2cal + 3×1600m [I] rec 800m + 2vuelta', detail: '10min plío avanzada · Controlar los primeros 400m de cada serie' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 7km moderado [M]', detail: 'Sesión completa' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo 2×15min + Fuerza B', desc: '12km: 2cal + 2×15min [R] rec 3min + 2vuelta + Fuerza B', detail: 'Simular esfuerzo de carrera' },
    { day: 'Dom', type: 'long',     label: '🎯 Largo 21km',         desc: '21km largo [E]', detail: 'Distancia completa — ritmo muy cómodo. Nutrición completa' },
  ]},
  { w: 17, phase: 'peak', km: 42, note: 'Peak — especificidad', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '12km: 2cal + 5×1000m [I] rec 400m + 2vuelta', detail: '10min plío · Calidad máxima del ciclo' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 7km fácil [E]', detail: 'Últimas semanas de carga real de fuerza' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo 8km + Fuerza B', desc: '12km: 2cal + 8km tempo [T] + 2vuelta + Fuerza B', detail: 'Tempo más largo del plan — confirmar resistencia al umbral' },
    { day: 'Dom', type: 'long',     label: 'Largo 20km con 6 a pace', desc: '20km: 14 suave [E] + 6 a pace objetivo [R]', detail: 'Simulacro parcial de carrera al final del largo' },
  ]},
  { w: 18, phase: 'peak', km: 42, note: 'Peak — volumen alto', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Pliometría', desc: '13km: 2cal + 4×1200m + 2×400m [I] + 2vuelta', detail: '10min plío · Series cortas rápidas al final' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A',             desc: 'Fuerza A + 6km fácil [E]', detail: 'Reducir a 2 series si hay fatiga acumulada' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo progresivo + Fuerza B', desc: '12km: 2cal + 8km progresivo ([M]→[T]) + 2vuelta + Fuerza B', detail: 'Negativos: empezar conservador, terminar fuerte' },
    { day: 'Dom', type: 'long',     label: '🎯 Largo 21km',         desc: '21km: último largo serio [E]', detail: 'Nutrición completa simulando día de carrera' },
  ]},
  { w: 19, phase: 'peak', km: 34, note: '⬇ Inicio taper suave', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos cortos + Plío', desc: '10km: 2cal + 4×800m [I] rec 400m + 2vuelta', detail: '8min plío suave · Último trabajo de calidad alto' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A (reducción)',  desc: 'Fuerza A al 80% + 5km fácil [E]', detail: 'Empezar a reducir volumen de fuerza' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo corto + Fuerza B reducida', desc: '9km: 2cal + 4km tempo [T] + 3vuelta + Fuerza B 60%', detail: 'Reducir carga manteniendo estímulo running' },
    { day: 'Dom', type: 'long',     label: 'Largo reducido',        desc: '16km largo [E]', detail: 'Reducción de volumen activa' },
  ]},

  // ---- TAPER S20–22 ----
  { w: 20, phase: 'taper', km: 26, note: 'Taper — reducción', sessions: [
    { day: 'Mar', type: 'interval', label: 'Intervalos + Plío mínima', desc: '9km: 2cal + 3×1000m [I] rec 400m + 2vuelta', detail: '6min plío activación · Mantener ritmo, reducir volumen' },
    { day: 'Mié', type: 'strength', label: 'Fuerza A mantenimiento', desc: 'Fuerza A al 60% + 4km suave [E]', detail: 'Solo mantenimiento — no acumular fatiga' },
    { day: 'Vie', type: 'tempo',    label: 'Tempo corto + Fuerza B mínima', desc: '7km: 2cal + 3km tempo [T] + 2vuelta + Fuerza B 50%', detail: '2 series de cada ejercicio — solo activación' },
    { day: 'Dom', type: 'long',     label: 'Largo medio',           desc: '14km: 10 suave [E] + 4 a pace objetivo [R]', detail: 'Recordar cómo se siente el pace de carrera' },
  ]},
  { w: 21, phase: 'taper', km: 20, note: 'Taper — piernas frescas', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Fácil + strides',       desc: '7km fácil [E] + 6×100m strides', detail: 'Strides a ritmo 10K · Sin pliometría pesada' },
    { day: 'Mié', type: 'strength', label: 'Movilidad + Fuerza mínima', desc: '20min movilidad / yoga + 3km fácil [E]', detail: 'Fuerza solo 1 serie por ejercicio si te sentís bien' },
    { day: 'Vie', type: 'easy',     label: 'Activación + strides',  desc: '5km suave [E] + 4×100m strides + 2min a pace [R]', detail: 'Última sesión de calidad real. Sin fuerza' },
    { day: 'Dom', type: 'long',     label: 'Largo muy corto',       desc: '8km cómodo [E]', detail: 'Última carrera larga — disfrutar' },
  ]},
  { w: 22, phase: 'taper', km: 10, note: '🏁 Semana de carrera — 30 Agosto', sessions: [
    { day: 'Mar', type: 'easy',     label: 'Trote suave',           desc: '4km muy suave [E] + 4×80m strides', detail: 'Mantenerse activo sin fatiga' },
    { day: 'Mié', type: 'rest',     label: 'Descanso activo',       desc: 'Caminata 20–30min, movilidad, estiramiento', detail: 'Sin running — piernas frescas' },
    { day: 'Vie', type: 'easy',     label: 'Activación pre-carrera', desc: '3km suave [E] + 4×100m strides + 2min a pace [R]', detail: 'Cargar carbohidratos desde hoy' },
    { day: 'Dom', type: 'race',     label: '🏁 CARRERA 21K — 30 Ago', desc: 'Objetivo A: Sub 1:57 · Objetivo B: Sub 2:00 · Pace: [R]', detail: 'Primeros 5km conservador. Mitad negativa. Vaporfly 3 🚀' },
  ]},
];

const PHASE_COLORS = {
  base:   { cls: 'ph-base',   label: 'Base aeróbica' },
  build:  { cls: 'ph-build',  label: 'Desarrollo' },
  peak:   { cls: 'ph-peak',   label: 'Peak' },
  taper:  { cls: 'ph-taper',  label: 'Taper' },
};

const TYPE_LABELS = {
  easy: 'Fácil', tempo: 'Tempo', interval: 'Intervalos',
  long: 'Largo', strength: 'Fuerza', rest: 'Descanso', race: 'Carrera',
};

let activePhaseFilter = 'all';
let openWeeks = new Set();

function renderPlanApp() {
  const app = document.getElementById('planApp');
  if (!app) return;
  app.innerHTML = `
    <div class="plan-page">
      ${renderNextSessionInPlan()}
      ${renderPlanHeader()}
      ${renderZones()}
      ${renderPhaseNav()}
      ${renderWeekList()}
    </div>
  `;
  // Re-attach open state
  openWeeks.forEach(w => {
    const el = document.querySelector(`[data-week="${w}"]`);
    if (el) el.classList.add('open');
  });
}

function renderNextSessionInPlan() {
  if (typeof getNextPlannedSession !== 'function') return '';
  const next = getNextPlannedSession();
  if (!next) return '';
  return `
    <div class="plan-section coach-next-session">
      <div class="section-label">Próximo entrenamiento</div>
      <div class="next-session-card">
        <div class="next-sess-header">
          <span class="next-sess-when">${next.isToday ? '🟢 Hoy' : next.isTomorrow ? '🟡 Mañana' : next.dateStr}</span>
          <span class="next-sess-type t-${next.type}">${next.label}</span>
        </div>
        <div class="next-sess-desc">${applyPacesToText(next.desc)}</div>
        <div class="next-sess-detail">${next.detail}</div>
        <div class="next-sess-meta">Semana ${next.weekNum} · ${next.phase}</div>
      </div>
    </div>
  `;
}

function renderPlanHeader() {
  return `
    <div class="plan-header">
      <div class="plan-hero">
        <h1>PLAN<br>21K</h1>
        <div class="plan-hero-sub">
          <div class="stat-chip">5K <strong>24:59</strong></div>
          <div class="stat-chip">10K <strong>53:30</strong></div>
          <div class="stat-chip">VDOT <strong>42–43</strong></div>
          <div class="stat-chip target">Objetivo <strong>Sub 2:00</strong></div>
          <div class="stat-chip">Pace <strong>${PACES.race}/km</strong></div>
          <div class="stat-chip">10K test <strong>5 Jul 2026</strong></div>
          <div class="stat-chip accent">Carrera <strong>30 Ago 2026</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderZones() {
  return `
    <div class="plan-section">
      <div class="section-label">Zonas de ritmo — VDOT 42–43 · Jack Daniels <button class="edit-zones-btn" onclick="toggleSettings()">✎ Editar</button></div>
      <div class="zones-grid">
        <div class="zone-card"><div class="zn easy">Fácil (E)</div><div class="zv easy">${PACES.easy}/km</div><div class="zd">FC 65–72% · conversación fluida</div></div>
        <div class="zone-card"><div class="zn mod">Moderado (M)</div><div class="zv mod">${PACES.mod}/km</div><div class="zd">FC 72–78% · esfuerzo cómodo</div></div>
        <div class="zone-card"><div class="zn tempo">Tempo (T)</div><div class="zv tempo">${PACES.tempo}/km</div><div class="zd">FC 82–88% · comfortably hard</div></div>
        <div class="zone-card"><div class="zn interval">Intervalos (I)</div><div class="zv interval">${PACES.interval}/km</div><div class="zd">FC 90–95% · difícil</div></div>
        <div class="zone-card"><div class="zn race">Pace 21K (R)</div><div class="zv race">${PACES.race}/km</div><div class="zd">Entre M y T · pace de carrera</div></div>
      </div>
    </div>
  `;
}

function renderPhaseNav() {
  const phases = [
    { key: 'all', label: 'Todo el plan' },
    { key: 'base', label: 'Base (S1–8)' },
    { key: 'build', label: 'Desarrollo (S9–14)' },
    { key: 'peak', label: 'Peak (S15–19)' },
    { key: 'taper', label: 'Taper (S20–22)' },
  ];
  return `
    <div class="plan-section phase-nav-wrap">
      ${phases.map(p => `
        <button class="phase-btn ${activePhaseFilter === p.key ? 'active' : ''}"
          onclick="setPhaseFilter('${p.key}')">${p.label}</button>
      `).join('')}
    </div>
  `;
}

function setPhaseFilter(key) {
  activePhaseFilter = key;
  renderPlanApp();
}

function renderWeekList() {
  const weeks = activePhaseFilter === 'all' ? PLAN : PLAN.filter(w => w.phase === activePhaseFilter);
  return `
    <div class="plan-section week-list">
      ${weeks.map(w => renderWeek(w)).join('')}
    </div>
  `;
}

function renderWeek(w) {
  const wi = w.w - 1;
  const ph = PHASE_COLORS[w.phase] || { cls: '', label: w.phase };
  return `
    <div class="week-block" data-week="${w.w}" onclick="toggleWeek(${w.w})">
      <div class="week-hd">
        <div class="wk-num"><span>SEM</span>${w.w}</div>
        <div class="wk-meta">
          <span class="wk-phase ${ph.cls}">${ph.label}</span>
          <span class="wk-range">${getWeekRange(wi)}</span>
          <span class="wk-km">${w.km} km</span>
          <span class="wk-note">${w.note}</span>
        </div>
        <div class="wk-toggle">+</div>
      </div>
      <div class="week-sessions">
        ${w.sessions.map(s => renderSession(s, wi)).join('')}
      </div>
    </div>
  `;
}

function renderSession(s, wi) {
  const fecha = getSessionDate(wi, s.day);
  const desc = applyPacesToText(s.desc);
  const detail = applyPacesToText(s.detail);
  return `
    <div class="session-row t-${s.type}">
      <div class="sess-day">
        <span>${s.day}</span>
        <small>${fecha}</small>
      </div>
      <div class="sess-body">
        <div class="sess-label t-${s.type}">${s.label}</div>
        <div class="sess-desc">${desc}</div>
        <div class="sess-detail">${detail}</div>
      </div>
    </div>
  `;
}

function toggleWeek(wNum) {
  const el = document.querySelector(`[data-week="${wNum}"]`);
  if (!el) return;
  el.classList.toggle('open');
  if (el.classList.contains('open')) openWeeks.add(wNum);
  else openWeeks.delete(wNum);
}
