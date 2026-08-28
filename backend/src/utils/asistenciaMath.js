// src/utils/asistenciaMath.js
// Motor de inasistencia — fuente única de verdad para el cálculo por porcentaje
// de horas del Art. 29 del Reglamento Estudiantil.
//
// Puro (sin acceso a BD ni a IA): recibe los datos ya cargados y los parámetros
// de la política vigente, y devuelve el veredicto. Determinístico: los mismos
// datos siempre dan el mismo resultado. La IA NUNCA participa en este cálculo.

/**
 * Parámetros por defecto (Art. 29). En operación se pasan los de la política
 * vigente (tabla politica_academica); estos son solo el respaldo.
 */
const DEFAULTS = {
  inasistencia_max_sin_justificar: 0.20,
  inasistencia_max_con_justificar: 0.30,
};

/**
 * Calcula el estado de inasistencia de un estudiante en una asignatura.
 *
 * @param {Object} p
 * @param {{ horas: number, presente: boolean, justificada: boolean }[]} p.asistencias
 *        registros de asistencia de la inscripción
 * @param {number|null} p.horasProgramadas
 *        total de horas del semestre (asignatura.horas_programadas)
 * @param {Object} [p.politica] parámetros de la política vigente
 * @returns {Object} veredicto de inasistencia
 */
function calcularInasistencia({ asistencias, horasProgramadas, politica = DEFAULTS }) {
  const maxSin = politica.inasistencia_max_sin_justificar ?? DEFAULTS.inasistencia_max_sin_justificar;
  const maxCon = politica.inasistencia_max_con_justificar ?? DEFAULTS.inasistencia_max_con_justificar;

  // Horas de inasistencia (ausencias), separando justificadas de injustificadas.
  const ausencias = asistencias.filter((a) => !a.presente);
  const horasInasistidas = ausencias.reduce((s, a) => s + (a.horas ?? 0), 0);
  const horasJustificadas = ausencias
    .filter((a) => a.justificada)
    .reduce((s, a) => s + (a.horas ?? 0), 0);
  const horasInjustificadas = horasInasistidas - horasJustificadas;

  // Base del cálculo: horas programadas del semestre. Si no está configurada,
  // se cae a la suma de horas registradas (mejor que dividir por cero).
  const horasSumadas = asistencias.reduce((s, a) => s + (a.horas ?? 0), 0);
  const base = horasProgramadas && horasProgramadas > 0 ? horasProgramadas : horasSumadas;
  const baseValida = base > 0;

  const pctTotal = baseValida ? horasInasistidas / base : 0;
  const pctInjustificado = baseValida ? horasInjustificadas / base : 0;

  // Reglas del Art. 29:
  //  - pierde si el total (aun justificado) supera el máximo con justificación
  //  - o si lo injustificado supera el máximo sin justificación
  const perdidaPorTotal = pctTotal > maxCon;
  const perdidaPorInjustificado = pctInjustificado > maxSin;
  const perdida = perdidaPorTotal || perdidaPorInjustificado;

  let motivo = null;
  if (perdidaPorInjustificado) {
    motivo = `Inasistencia injustificada del ${pct(pctInjustificado)} supera el máximo del ${pct(maxSin)}.`;
  } else if (perdidaPorTotal) {
    motivo = `Inasistencia total del ${pct(pctTotal)} supera el máximo del ${pct(maxCon)}, aun con justificación.`;
  }

  // Horas que aún puede faltar (injustificado) antes de perder por el 20%.
  const horasLimiteInjustificado = maxSin * base;
  const horasRestantes = baseValida
    ? Math.max(0, Math.floor(horasLimiteInjustificado - horasInjustificadas))
    : null;

  return {
    horasProgramadas: base,
    horasInasistidas,
    horasJustificadas,
    horasInjustificadas,
    pctTotal: round(pctTotal),
    pctInjustificado: round(pctInjustificado),
    perdida,
    motivo,
    horasRestantesAntesDePerder: horasRestantes,
    nivel: nivelAlerta(pctInjustificado, maxSin, perdida),
    baseValida,
  };
}

/**
 * Nivel de alerta escalonado según cuánto se acerca al límite injustificado.
 * Devuelve: 'ok' | 'aviso' | 'riesgo' | 'critico' | 'perdida'.
 */
function nivelAlerta(pctInjustificado, maxSin, perdida) {
  if (perdida) return 'perdida';
  const ratio = maxSin > 0 ? pctInjustificado / maxSin : 0; // 1.0 = justo en el límite
  if (ratio >= 0.9) return 'critico';   // ≥ 18% si el máximo es 20%
  if (ratio >= 0.75) return 'riesgo';   // ≥ 15%
  if (ratio >= 0.5) return 'aviso';     // ≥ 10%
  return 'ok';
}

function pct(x) {
  return `${Math.round(x * 100)}%`;
}
function round(x) {
  return Math.round(x * 1000) / 1000; // 3 decimales
}

module.exports = { calcularInasistencia, nivelAlerta, DEFAULTS };
