// ============================================
// PACES.JS — Gestión de ritmos personalizados
// ============================================

const DEFAULT_PACES = {
  easy:     '6:35',
  mod:      '6:00',
  tempo:    '5:15',
  interval: '4:50',
  race:     '5:40',
};

let PACES = loadPaces();

function loadPaces() {
  try {
    const saved = localStorage.getItem('training_paces');
    return saved ? { ...DEFAULT_PACES, ...JSON.parse(saved) } : { ...DEFAULT_PACES };
  } catch { return { ...DEFAULT_PACES }; }
}

function savePaces() {
  localStorage.setItem('training_paces', JSON.stringify(PACES));
}

function resetPaces() {
  PACES = { ...DEFAULT_PACES };
  savePaces();
  syncInputsToPaces();
  showToast('Ritmos restablecidos', 'success');
}

function applyPaces() {
  PACES.easy     = document.getElementById('paceEasy').value || DEFAULT_PACES.easy;
  PACES.mod      = document.getElementById('paceMod').value  || DEFAULT_PACES.mod;
  PACES.tempo    = document.getElementById('paceTempo').value || DEFAULT_PACES.tempo;
  PACES.interval = document.getElementById('paceInterval').value || DEFAULT_PACES.interval;
  PACES.race     = document.getElementById('paceRace').value || DEFAULT_PACES.race;
  savePaces();
  toggleSettings();
  renderPlanApp(); // re-render plan with new paces
  showToast('✓ Ritmos actualizados', 'success');
}

function syncInputsToPaces() {
  document.getElementById('paceEasy').value     = PACES.easy;
  document.getElementById('paceMod').value      = PACES.mod;
  document.getElementById('paceTempo').value    = PACES.tempo;
  document.getElementById('paceInterval').value = PACES.interval;
  document.getElementById('paceRace').value     = PACES.race;
}

// Recalc from VDOT (approximate Jack Daniels tables)
function recalcPaces() {
  const vdot = parseInt(document.getElementById('vdot').value) || 42;
  // Simple linear interpolation from known VDOT values
  // E, M, T, I paces in seconds/km
  const table = {
    35: { e: 500, m: 450, t: 410, i: 375 },
    38: { e: 475, m: 425, t: 385, i: 350 },
    40: { e: 458, m: 408, t: 368, i: 333 },
    42: { e: 440, m: 392, t: 353, i: 318 },
    43: { e: 432, m: 384, t: 346, i: 312 },
    45: { e: 418, m: 370, t: 331, i: 298 },
    48: { e: 398, m: 350, t: 312, i: 280 },
    50: { e: 385, m: 337, t: 299, i: 268 },
    55: { e: 358, m: 310, t: 273, i: 244 },
    60: { e: 335, m: 287, t: 251, i: 223 },
    65: { e: 315, m: 268, t: 232, i: 205 },
  };

  const keys = Object.keys(table).map(Number).sort((a,b) => a-b);
  let lo = keys[0], hi = keys[keys.length-1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (vdot >= keys[i] && vdot <= keys[i+1]) { lo = keys[i]; hi = keys[i+1]; break; }
  }

  const t = lo === hi ? 0 : (vdot - lo) / (hi - lo);
  const interp = (a, b) => Math.round(a + (b - a) * t);

  const e = interp(table[lo].e, table[hi].e);
  const m = interp(table[lo].m, table[hi].m);
  const tm = interp(table[lo].t, table[hi].t);
  const iv = interp(table[lo].i, table[hi].i);
  // Race pace ~5% slower than T
  const rc = Math.round(tm * 1.05);

  document.getElementById('paceEasy').value     = secsToMmss(e);
  document.getElementById('paceMod').value      = secsToMmss(m);
  document.getElementById('paceTempo').value    = secsToMmss(tm);
  document.getElementById('paceInterval').value = secsToMmss(iv);
  document.getElementById('paceRace').value     = secsToMmss(rc);
}

function secsToMmss(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Replace pace tokens in session descriptions
// E.g. "[E]" → current easy pace, "[T]" → tempo pace, etc.
function applyPacesToText(text) {
  if (!text) return text;
  return text
    .replace(/\[E\]/g, `<span class="pace-tag easy">${PACES.easy}</span>`)
    .replace(/\[M\]/g, `<span class="pace-tag mod">${PACES.mod}</span>`)
    .replace(/\[T\]/g, `<span class="pace-tag tempo">${PACES.tempo}</span>`)
    .replace(/\[I\]/g, `<span class="pace-tag interval">${PACES.interval}</span>`)
    .replace(/\[R\]/g, `<span class="pace-tag race">${PACES.race}</span>`);
}
