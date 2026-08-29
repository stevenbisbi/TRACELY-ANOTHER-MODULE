// src/utils/gradeMath.js
// Motor de cálculo académico — fuente única de verdad para notas por corte,
// nota definitiva, nota mínima requerida e indicador de recuperabilidad.
// Puro (sin acceso a BD) para poder probarlo/reutilizarlo fácilmente.

const UMBRAL_APROBACION = 3.0;
const NOTA_MAXIMA = 5.0;

/**
 * Nota de un corte: suma ponderada de (nota × porcentaje_actividad) / 100.
 * Si el corte está completo (todas sus actividades calificadas), aplica la
 * fórmula literal sobre 100. Si está parcialmente calificado, renormaliza
 * sobre el peso de lo ya calificado (sirve como "nota parcial" del corte en
 * curso). Devuelve null si ninguna actividad tiene nota todavía.
 *
 * @param {{ porcentaje_en_corte: number, nota: number|null }[]} actividades
 */
function notaPorCorte(actividades) {
  const calificadas = actividades.filter((a) => a.nota != null);
  if (calificadas.length === 0) return null;

  const pesoCalificado = calificadas.reduce((s, a) => s + (a.porcentaje_en_corte ?? 0), 0);
  const sumaPonderada = calificadas.reduce((s, a) => s + a.nota * (a.porcentaje_en_corte ?? 0), 0);

  if (calificadas.length === actividades.length) {
    return sumaPonderada / 100;
  }
  return pesoCalificado > 0 ? sumaPonderada / pesoCalificado : null;
}

/** Un corte se considera completo cuando todas sus actividades tienen nota. */
function corteEstaCompleto(actividades) {
  return actividades.length > 0 && actividades.every((a) => a.nota != null);
}

/**
 * Nota definitiva/actual del curso: promedio ponderado de los cortes que ya
 * tienen al menos una nota, usando su peso_porcentual. Es la nota "hasta
 * ahora", no una proyección optimista de lo pendiente.
 *
 * @param {{ peso_porcentual: number, actividades: {porcentaje_en_corte:number, nota:number|null}[] }[]} cortes
 */
function notaDefinitiva(cortes) {
  let sumaPct = 0;
  let pesoUsadoPct = 0;
  cortes.forEach((c) => {
    const nota = notaPorCorte(c.actividades);
    if (nota != null) {
      sumaPct += nota * (c.peso_porcentual ?? 0);
      pesoUsadoPct += c.peso_porcentual ?? 0;
    }
  });
  return pesoUsadoPct > 0 ? sumaPct / pesoUsadoPct : null;
}

/**
 * Nota mínima requerida: cuánto necesita sacar en promedio en los cortes
 * PENDIENTES (los que aún no están completos) para que la nota definitiva
 * final llegue a 3.0. Si no hay cortes pendientes, devuelve null (ya no
 * aplica — la nota definitiva ya es la que es). El valor puede salir <=0
 * (ya está asegurado el pase) o >5.0 (matemáticamente imposible).
 *
 * @param {{ peso_porcentual: number, actividades: {porcentaje_en_corte:number, nota:number|null}[] }[]} cortes
 */
function notaMinimaRequerida(cortes) {
  let sumaPct = 0;      // aporte ya ganado de los cortes completos, en puntos de 0-100
  let pesoCompletoPct = 0;
  let pesoPendientePct = 0;

  cortes.forEach((c) => {
    const peso = c.peso_porcentual ?? 0;
    if (corteEstaCompleto(c.actividades)) {
      const nota = notaPorCorte(c.actividades);
      sumaPct += (nota ?? 0) * peso;
      pesoCompletoPct += peso;
    } else {
      pesoPendientePct += peso;
    }
  });

  if (pesoPendientePct <= 0) return null; // no queda nada pendiente

  const necesario = (UMBRAL_APROBACION * 100 - sumaPct) / pesoPendientePct;
  return Math.round(necesario * 100) / 100;
}

/** No es matemáticamente recuperable si se necesita más de la nota máxima posible. */
function esRecuperable(notaMinReq) {
  if (notaMinReq == null) return true; // no hay cortes pendientes, no aplica el concepto
  return notaMinReq <= NOTA_MAXIMA;
}

/**
 * Calcula todo el bloque de una vez para una materia (lista de cortes con
 * sus actividades ya cruzadas con las notas del estudiante).
 */
function calcularResumenCurso(cortes) {
  const cortesConNota = cortes.map((c) => ({
    ...c,
    nota_corte: notaPorCorte(c.actividades),
    completo: corteEstaCompleto(c.actividades),
  }));

  const definitiva = notaDefinitiva(cortes);
  const minimaRequerida = notaMinimaRequerida(cortes);

  return {
    cortes: cortesConNota,
    nota_definitiva: definitiva,
    nota_minima_requerida: minimaRequerida,
    recuperable: esRecuperable(minimaRequerida),
  };
}

module.exports = {
  UMBRAL_APROBACION,
  NOTA_MAXIMA,
  notaPorCorte,
  corteEstaCompleto,
  notaDefinitiva,
  notaMinimaRequerida,
  esRecuperable,
  calcularResumenCurso,
};
