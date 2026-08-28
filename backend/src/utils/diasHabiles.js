// src/utils/diasHabiles.js
// Cálculo de días hábiles con festivos de Colombia (Ley 51 de 1983 / Emiliani).
// Puro y determinístico. Se usa para el plazo de 3 días hábiles del Art. 29.

// ── Festivos ──────────────────────────────────────────────────────────────────

/** Domingo de Pascua por el algoritmo de Gauss/Butcher (para los festivos móviles). */
function domingoPascua(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, mes - 1, dia));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Traslada un festivo al lunes siguiente (Ley Emiliani). */
function siguienteLunes(date) {
  const dow = date.getUTCDay(); // 0=dom .. 1=lun
  if (dow === 1) return date;
  const delta = (8 - dow) % 7 || 7; // días hasta el próximo lunes
  return addDays(date, delta);
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

/** Conjunto (Set) de festivos colombianos de un año, en formato 'YYYY-MM-DD'. */
function festivosColombia(year) {
  const set = new Set();
  const fijo = (m, d) => set.add(iso(new Date(Date.UTC(year, m - 1, d))));
  const emiliani = (m, d) => set.add(iso(siguienteLunes(new Date(Date.UTC(year, m - 1, d)))));

  // Fijos
  fijo(1, 1);   // Año Nuevo
  fijo(5, 1);   // Día del Trabajo
  fijo(7, 20);  // Independencia
  fijo(8, 7);   // Batalla de Boyacá
  fijo(12, 8);  // Inmaculada Concepción
  fijo(12, 25); // Navidad

  // Trasladables (Emiliani → lunes)
  emiliani(1, 6);   // Reyes Magos
  emiliani(3, 19);  // San José
  emiliani(6, 29);  // San Pedro y San Pablo
  emiliani(8, 15);  // Asunción
  emiliani(10, 12); // Día de la Raza
  emiliani(11, 1);  // Todos los Santos
  emiliani(11, 11); // Independencia de Cartagena

  // Móviles (basados en Pascua)
  const pascua = domingoPascua(year);
  set.add(iso(addDays(pascua, -3)));  // Jueves Santo
  set.add(iso(addDays(pascua, -2)));  // Viernes Santo
  set.add(iso(siguienteLunes(addDays(pascua, 39)))); // Ascensión (+lunes)
  set.add(iso(siguienteLunes(addDays(pascua, 60)))); // Corpus Christi
  set.add(iso(siguienteLunes(addDays(pascua, 68)))); // Sagrado Corazón

  return set;
}

// ── Días hábiles ──────────────────────────────────────────────────────────────

function esFinDeSemana(date) {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

/** ¿La fecha es día hábil? (ni fin de semana ni festivo) */
function esDiaHabil(date) {
  if (esFinDeSemana(date)) return false;
  return !festivosColombia(date.getUTCFullYear()).has(iso(date));
}

/**
 * Suma N días hábiles a una fecha (sin contar el día de partida).
 * @param {string|Date} desde  fecha base (ISO 'YYYY-MM-DD' o Date)
 * @param {number} n            número de días hábiles a sumar
 * @returns {string} fecha resultante en 'YYYY-MM-DD'
 */
function sumarDiasHabiles(desde, n) {
  let d = typeof desde === 'string' ? new Date(desde + 'T00:00:00Z') : new Date(desde);
  let restantes = n;
  while (restantes > 0) {
    d = addDays(d, 1);
    if (esDiaHabil(d)) restantes--;
  }
  return iso(d);
}

/**
 * ¿La radicación se hizo dentro del plazo de N días hábiles desde la inasistencia?
 * @returns {{ dentro: boolean, fechaLimite: string }}
 */
function dentroDePlazo(fechaInasistencia, fechaRadicacion, nDiasHabiles) {
  const fechaLimite = sumarDiasHabiles(fechaInasistencia, nDiasHabiles);
  const radicacion = iso(new Date(fechaRadicacion));
  return { dentro: radicacion <= fechaLimite, fechaLimite };
}

module.exports = {
  festivosColombia, esDiaHabil, sumarDiasHabiles, dentroDePlazo,
};
