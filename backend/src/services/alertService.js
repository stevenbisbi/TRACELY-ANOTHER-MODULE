// src/services/alertService.js
// Evalúa la proyección de nota de una inscripción y genera/actualiza la
// alerta correspondiente + notifica al docente. Se dispara después de
// guardar una calificación (calificacionController.upsert/bulkUpsert),
// igual que attendanceController.saveDayAttendance hace con la asistencia.
const { calcularResumenCurso } = require('../utils/gradeMath');
const { sendTeacherRiskAlert } = require('./emailService');
const socketService = require('./socketService');

// Resuelve la alerta activa de una inscripción si su nota_definitiva ya no
// amerita riesgo. Solo lectura de negocio: no crea alertas ni envía correos
// — esos efectos solo deben dispararse desde evaluarAlertaPorNota, como
// consecuencia directa de guardar una nota. Se usa además como reconciliación
// al leer (alertaController.getByEstudiante, teacherController.getDashboard)
// para el caso en que la nota mejoró por una vía que no pasó por
// evaluarAlertaPorNota (ej. una alerta sembrada directamente en seed.js).
async function resolverAlertaSiYaNoAplica({ inscripcionId, notaDefinitiva, umbral, models }) {
  if (notaDefinitiva == null || notaDefinitiva < (umbral ?? 3.5)) return false;
  const [count] = await models.Alerta.update(
    { estado: 'resuelta' },
    { where: { inscripcion_id: inscripcionId, estado: 'activa' } }
  );
  return count > 0;
}

// Compara dos números (posiblemente null) considerando "diferente" solo si
// la diferencia supera un margen — evita notificar en tiempo real por ruido
// de punto flotante entre recálculos casi idénticos.
function difiereSignificativamente(a, b, epsilon = 0.05) {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > epsilon;
}

async function evaluarAlertaPorNota(inscripcionId, models) {
  const { Inscripcion, Asignatura, Corte, Actividad, Calificacion, Estudiante, Docente, Usuario, Alerta } = models;

  const insc = await Inscripcion.findByPk(inscripcionId, {
    include: [
      { model: Estudiante, as: 'estudiante', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }] },
      {
        model: Asignatura, as: 'asignatura',
        include: [
          { model: Docente, as: 'docente', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo'] }] },
          { model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] },
        ],
      },
      { model: Calificacion, as: 'calificaciones' },
    ],
  });
  if (!insc || !insc.asignatura) return null;

  const calPorActividad = Object.fromEntries(insc.calificaciones.map((c) => [c.actividad_id, c.nota]));
  const cortesParaCalculo = insc.asignatura.cortes.map((c) => ({
    peso_porcentual: c.peso_porcentual,
    actividades: c.actividades.map((a) => ({
      porcentaje_en_corte: a.porcentaje_en_corte,
      nota: calPorActividad[a.id] ?? null,
    })),
  }));

  const resumen = calcularResumenCurso(cortesParaCalculo);
  const { nota_definitiva: notaDefinitiva, nota_minima_requerida: notaMinimaRequerida, recuperable } = resumen;

  if (notaDefinitiva == null) return null; // sin notas aún, nada que evaluar

  const umbral = insc.asignatura.umbral_advertencia ?? 3.5;
  const enRiesgo = notaDefinitiva < umbral;
  if (!enRiesgo) {
    // El riesgo ya pasó (ej: el estudiante corrigió la nota) — resolver
    // cualquier alerta activa en vez de dejarla huérfana para siempre.
    const resuelta = await resolverAlertaSiYaNoAplica({ inscripcionId, notaDefinitiva, umbral, models });
    if (resuelta) {
      socketService.emitToStudent(insc.estudiante?.usuario_id, 'alerta:resuelta', {
        asignaturaId: insc.asignatura.id,
        asignaturaNombre: insc.asignatura.nombre,
        categoria: 'nota',
        notaProyectada: notaDefinitiva,
      });
    }
    return null;
  }

  const critico  = notaDefinitiva < 3.0 && !recuperable;
  const nuevoTipo = critico ? 'critica' : 'advertencia';

  const [alerta, created] = await Alerta.findOrCreate({
    where: { inscripcion_id: inscripcionId, estado: 'activa' },
    defaults: {
      tipo: nuevoTipo,
      nota_minima_requerida: notaMinimaRequerida,
      es_recuperable: recuperable,
    },
  });
  // Capturar el estado previo ANTES de actualizar, para saber si vale la
  // pena notificar en tiempo real: cambió la severidad, o cambió la nota
  // mínima requerida aunque el tipo se mantenga (ej. se borró una nota y el
  // corte pasó de "contado" a "pendiente" — el número cambia sin cruzar de
  // advertencia a crítica).
  const tipoAnterior = created ? null : alerta.tipo;
  const notaMinimaAnterior = created ? null : alerta.nota_minima_requerida;
  if (!created) {
    await alerta.update({
      tipo: nuevoTipo,
      nota_minima_requerida: notaMinimaRequerida,
      es_recuperable: recuperable,
    });
  }

  const docenteCorreo = insc.asignatura.docente?.usuario?.correo;
  if (docenteCorreo) {
    await sendTeacherRiskAlert({
      teacherName:  insc.asignatura.docente?.usuario?.nombre ?? '',
      teacherEmail: docenteCorreo,
      studentName:  insc.estudiante?.usuario?.nombre ?? '',
      subjectName:  insc.asignatura.nombre,
      notaDefinitiva,
      notaMinimaRequerida,
      recuperable,
      tipo: nuevoTipo,
    });
  }

  // Notificar en tiempo real al estudiante si es una alerta nueva, si la
  // severidad cambió, o si la nota mínima requerida cambió de forma
  // significativa (la alerta sigue "activa" con el mismo tipo, pero el
  // número que el estudiante necesita sacar ya no es el mismo).
  if (created || tipoAnterior !== nuevoTipo || difiereSignificativamente(notaMinimaAnterior, notaMinimaRequerida)) {
    socketService.emitToStudent(insc.estudiante?.usuario_id, 'alerta:nueva', {
      asignaturaId: insc.asignatura.id,
      asignaturaNombre: insc.asignatura.nombre,
      tipo: nuevoTipo,
      categoria: 'nota',
      notaProyectada: notaDefinitiva,
      notaMinimaRequerida,
      recuperable,
    });
  }

  return alerta;
}

module.exports = { evaluarAlertaPorNota, resolverAlertaSiYaNoAplica };
