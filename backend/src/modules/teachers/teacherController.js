const { Op } = require('sequelize');
const models = require('../../models');
const { Docente, Usuario, Asignatura, Inscripcion, Estudiante, Corte, Actividad, Asistencia, Pensum, Alerta, Calificacion } = models;
const { calcularResumenCurso } = require('../../utils/gradeMath');
const { resumenInscripcion, streamGroupReportPdf, buildGroupReportExcel } = require('../../services/reportService');
const { resolverAlertaSiYaNoAplica } = require('../../services/alertService');

const teacherController = {

  // GET /api/teachers/me — perfil del docente autenticado
  getMe: async (req, res) => {
    try {
      const docente = await Docente.findOne({
        where: { usuario_id: req.user.id },
        include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo', 'id_institucional'] }],
      });
      if (!docente) return res.status(404).json({ error: 'Perfil de docente no encontrado' });
      res.json(docente);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  },

  // GET /api/teachers/:id/dashboard?semestre=2025-1
  // Dashboard del docente: cursos, estudiantes inscritos, asistencia hoy
  getDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const { semestre } = req.query;

      const whereAsignatura = semestre
        ? { docente_id: id, semestre_academico: semestre }
        : { docente_id: id };

      const hoy = new Date().toISOString().split('T')[0];

      const asignaturas = await Asignatura.findAll({
        where: whereAsignatura,
        include: [
          { model: Pensum, as: 'pensum', attributes: ['nombre_asignatura', 'creditos'] },
          { model: Corte,  as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] },
          {
            model: Inscripcion, as: 'inscripciones',
            include: [
              { model: Estudiante, as: 'estudiante',
                include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'id_institucional'] }] },
              { model: Asistencia, as: 'asistencias' }, // historial completo, no solo hoy
              { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
              { model: Calificacion, as: 'calificaciones' },
            ],
          },
        ],
      });

      // Calcular asistencia de hoy (derivada del historial completo, sin query aparte)
      let presentesHoy = 0, totalHoy = 0;
      asignaturas.forEach(asig => {
        asig.inscripciones.forEach(insc => {
          totalHoy++;
          if (insc.asistencias?.some(a => a.fecha === hoy && a.presente)) presentesHoy++;
        });
      });

      // Alertas activas cuya nota actual ya no amerita riesgo — se
      // resuelven en segundo plano al final (no bloquea la respuesta, no
      // crea alertas nuevas ni envía correos).
      const inscripcionesAResolver = [];

      const courses = asignaturas.map(asig => {
        // El orden de los cortes no está garantizado por la consulta — se
        // ordena aquí para que siempre se muestren 1, 2, 3 (GradePanel).
        asig.cortes = (asig.cortes ?? []).slice().sort((a, b) => a.numero_corte - b.numero_corte);
        const cortesParaCalculoBase = (asig.cortes ?? []).map((c) => ({
          peso_porcentual: c.peso_porcentual,
          actividades: (c.actividades ?? []).map((a) => ({ id: a.id, porcentaje_en_corte: a.porcentaje_en_corte })),
        }));

        return {
          id:       asig.id,
          name:     asig.nombre,
          code:     asig.NRC,
          enrolled: asig.inscripciones.length,
          cortes:   asig.cortes,
          umbral_advertencia: asig.umbral_advertencia,
          students: asig.inscripciones.map(insc => {
            const total     = insc.asistencias?.length ?? 0;
            const presentes = insc.asistencias?.filter(a => a.presente).length ?? 0;
            const attendance = total > 0 ? Math.round((presentes / total) * 100) : 100;

            const tieneCritica     = insc.alertas?.some(a => a.tipo === 'critica');
            const tieneAdvertencia = insc.alertas?.some(a => a.tipo === 'advertencia');

            const calPorActividad = Object.fromEntries((insc.calificaciones ?? []).map((c) => [c.actividad_id, c.nota]));
            const cortesParaCalculo = cortesParaCalculoBase.map((c) => ({
              peso_porcentual: c.peso_porcentual,
              actividades: c.actividades.map((a) => ({ porcentaje_en_corte: a.porcentaje_en_corte, nota: calPorActividad[a.id] ?? null })),
            }));
            const resumen = calcularResumenCurso(cortesParaCalculo);

            // Reconciliación al leer: si hay una alerta activa pero la nota
            // actual ya no amerita riesgo, no se refleja como crítica/aviso
            // aquí — y se resuelve en segundo plano para dejar la BD al día.
            const umbral = asig.umbral_advertencia ?? 3.5;
            const alertaObsoleta = (tieneCritica || tieneAdvertencia)
              && resumen.nota_definitiva != null && resumen.nota_definitiva >= umbral;
            if (alertaObsoleta) {
              inscripcionesAResolver.push({ inscripcionId: insc.id, notaDefinitiva: resumen.nota_definitiva, umbral });
            }
            const status = alertaObsoleta ? 'active' : tieneCritica ? 'critical' : tieneAdvertencia ? 'warning' : 'active';

            return {
              id:             insc.estudiante.id,
              name:           insc.estudiante.usuario.nombre,
              id_inst:        insc.estudiante.usuario.id_institucional,
              inscripcion_id: insc.id,
              presenteHoy:    insc.asistencias?.some(a => a.fecha === hoy && a.presente) ?? null,
              attendance,
              absences: total - presentes,
              status,
              notaDefinitiva: resumen.nota_definitiva,
              recuperable: resumen.recuperable,
            };
          }),
        };
      });

      if (inscripcionesAResolver.length > 0) {
        setImmediate(() => {
          inscripcionesAResolver.forEach((r) => {
            resolverAlertaSiYaNoAplica({ ...r, models }).catch((e) => console.error('Error resolviendo alerta obsoleta:', e.message));
          });
        });
      }

      res.json({
        courses,
        asistenciaHoy: { presentes: presentesHoy, total: totalHoy },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener dashboard del docente' });
    }
  },

  // GET /api/teachers/:id/report/:asignaturaId?format=pdf|xlsx — reporte grupal (RF-31)
  // :id es el UUID del docente (mismo que /dashboard). Solo el docente dueño
  // de la asignatura, o un admin, puede generarlo.
  getGroupReport: async (req, res) => {
    try {
      const { id, asignaturaId } = req.params;
      const format = (req.query.format ?? 'pdf').toLowerCase();

      if (req.user.rol === 'docente') {
        const propio = await Docente.findOne({ where: { usuario_id: req.user.id } });
        if (!propio || propio.id !== id) return res.status(403).json({ error: 'No autorizado' });
      }

      const asignatura = await Asignatura.findOne({
        where: { id: asignaturaId, docente_id: id },
        include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
      });
      if (!asignatura) return res.status(404).json({ error: 'Asignatura no encontrada' });

      const inscripciones = await Inscripcion.findAll({
        where: { asignatura_id: asignaturaId },
        include: [
          { model: Estudiante, as: 'estudiante', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'id_institucional'] }] },
          { model: Asistencia, as: 'asistencias' },
          { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
          { model: Calificacion, as: 'calificaciones' },
        ],
      });

      const filas = inscripciones.map((insc) => {
        const inscConAsignatura = { ...insc.toJSON(), asignatura: asignatura.toJSON() };
        const { resumen, asistencia, alertasActivas } = resumenInscripcion(inscConAsignatura);
        return {
          name: insc.estudiante.usuario.nombre,
          id_inst: insc.estudiante.usuario.id_institucional,
          notaDefinitiva: resumen.nota_definitiva,
          notaMinimaRequerida: resumen.nota_minima_requerida,
          recuperable: resumen.recuperable,
          asistencia,
          alertasActivas,
        };
      });

      if (format === 'xlsx') {
        const buffer = buildGroupReportExcel({ asignatura, filas });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_grupo_${asignatura.NRC ?? asignatura.id}.xlsx"`);
        return res.send(buffer);
      }

      streamGroupReportPdf(res, { asignatura, filas });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al generar el reporte' });
    }
  },

  // GET /api/teachers?search=... — solo admin. Mantiene `id`/`usuario_id`/
  // `usuario` (consumidos por el selector de docente en CreateSubjectModal)
  // y agrega `courses`/`students` reales (antes hardcodeados a 0 en el
  // frontend).
  getAll: async (req, res) => {
    try {
      const { search } = req.query;
      const whereUsuario = search ? {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } },
          { id_institucional: { [Op.iLike]: `%${search}%` } },
        ],
      } : {};

      const docentes = await Docente.findAll({
        include: [
          { model: Usuario, as: 'usuario', where: whereUsuario, attributes: ['nombre', 'correo', 'id_institucional'], required: true },
          { model: Asignatura, as: 'asignaturas', attributes: ['id'], include: [{ model: Inscripcion, as: 'inscripciones', attributes: ['estudiante_id'] }] },
        ],
      });

      const result = docentes.map((d) => {
        const plain = d.toJSON();
        const asignaturas = plain.asignaturas ?? [];
        const studentIds = new Set();
        asignaturas.forEach((a) => (a.inscripciones ?? []).forEach((i) => studentIds.add(i.estudiante_id)));
        delete plain.asignaturas;
        return { ...plain, courses: asignaturas.length, students: studentIds.size };
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener docentes' });
    }
  },
};

module.exports = teacherController;
