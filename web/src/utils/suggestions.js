// utils/suggestions.js
// Sugerencias accionables para la vista de Notas (GradesPages.jsx),
// calculadas 100% en el frontend a partir de lo que ya trae getGrades — sin
// endpoints nuevos. Cada función devuelve `null` cuando no hay una señal
// real que comunicar (evita ruido visual).

const UMBRAL_APROBACION = 3.0;
const NOTA_MAXIMA = 5.0;

// Para el corte activo: entre las actividades sin calificar, toma la de
// mayor peso y calcula el mínimo que necesita ahí, asumiendo 5.0 en el
// resto de pendientes del mismo corte — un límite inferior autocontenido
// (no depende de otros cortes) para que el corte llegue a 3.0.
export function sugerenciaActividadClave(corte) {
  const actividades = corte?.actividades ?? [];
  const pendientes = actividades.filter((a) => a.value == null);
  if (pendientes.length === 0) return null;

  const graded = actividades.filter((a) => a.value != null);
  const sumaCalificada = graded.reduce((s, a) => s + a.value * (a.peso ?? 0), 0);

  const target = [...pendientes].sort((a, b) => (b.peso ?? 0) - (a.peso ?? 0))[0];
  if (!target.peso) return null;

  const pesoOtrasPendientes = pendientes
    .filter((a) => a.id !== target.id)
    .reduce((s, a) => s + (a.peso ?? 0), 0);

  const necesario = (UMBRAL_APROBACION * 100 - sumaCalificada - NOTA_MAXIMA * pesoOtrasPendientes) / target.peso;

  if (necesario <= 0) return null; // ya asegurado con lo que falta
  const imposible = necesario > NOTA_MAXIMA;
  return {
    type: 'actividad-clave',
    actividad: target.label,
    peso: target.peso,
    imposible,
    necesario: imposible ? null : necesario,
  };
}

// Última nota (por fecha_registro real) vs. el promedio de las anteriores
// en el curso completo — solo si la diferencia es lo bastante grande como
// para ser una señal, no una fluctuación normal.
export function sugerenciaTendencia(course) {
  const todas = (course?.cortes ?? [])
    .flatMap((c) => c.actividades ?? [])
    .filter((a) => a.value != null && a.fechaRegistro)
    .sort((a, b) => new Date(a.fechaRegistro) - new Date(b.fechaRegistro));

  if (todas.length < 2) return null;

  const ultima = todas[todas.length - 1];
  const anteriores = todas.slice(0, -1);
  const promedioAnterior = anteriores.reduce((s, a) => s + a.value, 0) / anteriores.length;
  const diferencia = ultima.value - promedioAnterior;

  if (Math.abs(diferencia) < 0.3) return null;
  return {
    type: 'tendencia',
    subiendo: diferencia > 0,
    ultima: ultima.value,
    promedioAnterior,
  };
}

// Aviso temprano de asistencia (80-90%) — antes de que se convierta en una
// alerta real (que ya se ve en Mis Alertas/Dashboard bajo 80%). No proyecta
// clases futuras (no existe ese dato), solo describe la cercanía actual.
export function sugerenciaAsistencia(course) {
  const att = course?.attendance;
  if (att == null || att < 80 || att >= 90) return null;
  return {
    type: 'asistencia',
    attendance: att,
    faltante: att - 80, // colchon real por encima del minimo de 80%, no distancia a 90
  };
}

export function getSugerencias(course, corteActivo) {
  return [
    sugerenciaActividadClave(corteActivo),
    sugerenciaTendencia(course),
    sugerenciaAsistencia(course),
  ].filter(Boolean);
}
