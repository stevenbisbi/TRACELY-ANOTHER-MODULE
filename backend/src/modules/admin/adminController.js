// src/modules/admin/adminController.js
// Agregados institucionales para el dashboard de administrador. Todo se
// calcula a partir de datos reales (nada hardcodeado) reutilizando el mismo
// motor de cálculo académico que usan estudiantes/docentes (gradeMath.js),
// para que el GPA que ve un admin coincida con el que ve el estudiante.
const {
  Estudiante, Docente, Asignatura, Inscripcion, Corte, Actividad,
  Calificacion, Asistencia, Alerta, Carrera, Semestre, Usuario,
} = require('../../models');
const { calcularResumenCurso } = require('../../utils/gradeMath');

// Resume una lista de inscripciones (con asignatura/cortes/actividades y
// calificaciones ya incluidas) en: promedio de notas definitivas, tasa de
// asistencia y tasa de retención. Reutilizado por overview y program-stats.
function resumirInscripciones(inscripciones) {
  let sumaGpa = 0, contGpa = 0, totalAsist = 0, presentesAsist = 0, finalizadasNoAprobadas = 0;

  inscripciones.forEach((insc) => {
    const calPorActividad = Object.fromEntries((insc.calificaciones ?? []).map((c) => [c.actividad_id, c.nota]));
    const cortesParaCalculo = (insc.asignatura?.cortes ?? []).map((c) => ({
      peso_porcentual: c.peso_porcentual,
      actividades: (c.actividades ?? []).map((a) => ({ porcentaje_en_corte: a.porcentaje_en_corte, nota: calPorActividad[a.id] ?? null })),
    }));
    const resumen = calcularResumenCurso(cortesParaCalculo);
    if (resumen.nota_definitiva != null) { sumaGpa += resumen.nota_definitiva; contGpa++; }

    totalAsist += insc.asistencias?.length ?? 0;
    presentesAsist += insc.asistencias?.filter((a) => a.presente).length ?? 0;

    if (insc.estado === 'finalizada' && insc.aprobada === false) finalizadasNoAprobadas++;
  });

  return {
    avgGpa: contGpa > 0 ? Math.round((sumaGpa / contGpa) * 10) / 10 : 0,
    attendanceRate: totalAsist > 0 ? Math.round((presentesAsist / totalAsist) * 100) : 0,
    // Retención = % de inscripciones que no terminaron en reprobación. Es la
    // mejor aproximación posible con el esquema actual (no existe un estado
    // explícito de "retiro").
    retentionRate: inscripciones.length > 0
      ? Math.round(((inscripciones.length - finalizadasNoAprobadas) / inscripciones.length) * 100)
      : 100,
  };
}

const RELATIVE_UNITS = [
  { limit: 60, div: 1, label: 'seg' },
  { limit: 3600, div: 60, label: 'min' },
  { limit: 86400, div: 3600, label: 'h' },
  { limit: 2592000, div: 86400, label: 'd' },
];
function tiempoRelativo(fecha) {
  const diffSeg = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 1000));
  if (diffSeg < 60) return 'Hace un momento';
  for (const u of RELATIVE_UNITS) {
    if (diffSeg < u.limit) return `Hace ${Math.floor(diffSeg / u.div)} ${u.label}`;
  }
  return new Date(fecha).toLocaleDateString('es-CO');
}

const adminController = {

  // GET /api/admin/overview
  getOverview: async (req, res) => {
    try {
      const semestreActivo = await Semestre.findOne({ where: { activo: true } });
      const semestreCode = semestreActivo?.codigo ?? null;
      const whereAsig = semestreCode ? { semestre_academico: semestreCode } : {};

      const [totalStudents, totalTeachers, totalCourses, inscripciones, alertasActivas] = await Promise.all([
        Estudiante.count(),
        Docente.count(),
        Asignatura.count({ where: whereAsig }),
        Inscripcion.findAll({
          include: [
            {
              model: Asignatura, as: 'asignatura', where: whereAsig, required: true,
              include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
            },
            { model: Calificacion, as: 'calificaciones' },
            { model: Asistencia, as: 'asistencias' },
          ],
        }),
        Alerta.findAll({
          where: { estado: 'activa' },
          include: [{ model: Inscripcion, as: 'inscripcion', attributes: ['estudiante_id'] }],
        }),
      ]);

      const { avgGpa, attendanceRate, retentionRate } = resumirInscripciones(inscripciones);
      const atRiskCount = new Set(alertasActivas.map((a) => a.inscripcion?.estudiante_id).filter(Boolean)).size;

      res.json({
        totalStudents, totalTeachers, totalCourses,
        activeSemester: semestreCode ?? '—',
        atRiskCount,
        avgGpa,
        attendanceGlobal: attendanceRate,
        retentionRate,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al calcular el resumen institucional' });
    }
  },

  // GET /api/admin/recent-activity — últimas alertas académicas e
  // inscripciones registradas, como aproximación de "actividad reciente"
  // (no existe una tabla de auditoría dedicada en el esquema actual).
  getRecentActivity: async (req, res) => {
    try {
      const [alertas, inscripciones] = await Promise.all([
        Alerta.findAll({
          order: [['createdAt', 'DESC']], limit: 8,
          include: [{
            model: Inscripcion, as: 'inscripcion',
            include: [
              { model: Estudiante, as: 'estudiante', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }] },
              { model: Asignatura, as: 'asignatura', attributes: ['nombre'] },
            ],
          }],
        }),
        Inscripcion.findAll({
          order: [['createdAt', 'DESC']], limit: 8,
          include: [
            { model: Estudiante, as: 'estudiante', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }] },
            { model: Asignatura, as: 'asignatura', attributes: ['nombre'] },
          ],
        }),
      ]);

      const alertEvents = alertas.map((a) => ({
        id: `alerta-${a.id}`,
        type: 'alert',
        severity: a.tipo === 'critica' ? 'critical' : 'high',
        message: `${a.inscripcion?.estudiante?.usuario?.nombre ?? 'Un estudiante'} generó una alerta de ${a.tipo === 'critica' ? 'riesgo crítico' : 'advertencia'} en ${a.inscripcion?.asignatura?.nombre ?? 'una materia'}`,
        rawTime: a.createdAt,
      }));
      const enrollEvents = inscripciones.map((i) => ({
        id: `insc-${i.id}`,
        type: 'user',
        severity: 'info',
        message: `${i.estudiante?.usuario?.nombre ?? 'Un estudiante'} fue inscrito en ${i.asignatura?.nombre ?? 'una materia'}`,
        rawTime: i.createdAt,
      }));

      const merged = [...alertEvents, ...enrollEvents]
        .sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime))
        .slice(0, 10)
        .map(({ rawTime, ...e }) => ({ ...e, time: tiempoRelativo(rawTime) }));

      res.json(merged);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener actividad reciente' });
    }
  },

  // GET /api/admin/program-stats — estudiantes, GPA y retención por carrera
  getProgramStats: async (req, res) => {
    try {
      const [carreras, estudiantes] = await Promise.all([
        Carrera.findAll(),
        Estudiante.findAll({
          include: [{
            model: Inscripcion, as: 'inscripciones',
            include: [
              { model: Asignatura, as: 'asignatura', include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }] },
              { model: Calificacion, as: 'calificaciones' },
              { model: Asistencia, as: 'asistencias' },
            ],
          }],
        }),
      ]);

      const porCarrera = new Map(carreras.map((c) => [c.id, { id: c.id, name: c.nombre, students: 0, inscripciones: [] }]));

      estudiantes.forEach((est) => {
        const bucket = porCarrera.get(est.carrera_id);
        if (!bucket) return;
        bucket.students++;
        bucket.inscripciones.push(...(est.inscripciones ?? []));
      });

      const result = [...porCarrera.values()].map((b) => ({
        id: b.id,
        name: b.name,
        students: b.students,
        ...resumirInscripciones(b.inscripciones),
      })).map((b) => ({ id: b.id, name: b.name, students: b.students, avgGpa: b.avgGpa, retention: b.retentionRate }));

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener estadísticas por programa' });
    }
  },
};

module.exports = adminController;
