const { Op } = require('sequelize');
const { Estudiante, Usuario, Carrera, Inscripcion, Asignatura, Asistencia, Calificacion, Alerta, Pensum, Corte, Actividad } = require('../../models');
const { streamStudentReportPdf } = require('../../services/reportService');
const { calcularResumenCurso } = require('../../utils/gradeMath');

const studentController = {

  // GET /api/students/me — perfil completo del estudiante autenticado
  getMe: async (req, res) => {
    try {
      const estudiante = await Estudiante.findOne({
        where: { usuario_id: req.user.id },
        include: [
          { model: Usuario, as: 'usuario', attributes: ['nombre', 'correo', 'id_institucional'] },
          { model: Carrera, as: 'carrera', attributes: ['nombre', 'codigo'] },
        ],
      });
      if (!estudiante) return res.status(404).json({ error: 'Perfil de estudiante no encontrado' });
      res.json(estudiante);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  },

  // GET /api/students/:id/dashboard?semestre=2025-1
  // Datos completos para el dashboard del estudiante (stats, materias, notificaciones)
  getDashboard: async (req, res) => {
    try {
      const { id } = req.params;
      const { semestre } = req.query;

      // :id es el UUID del perfil estudiante, no el id_institucional del JWT —
      // hay que resolverlo antes de poder comparar ownership.
      if (req.user.rol === 'estudiante') {
        const propio = await Estudiante.findByPk(id);
        if (!propio || propio.usuario_id !== req.user.id)
          return res.status(403).json({ error: 'No autorizado' });
      }

      const whereAsignatura = semestre ? { semestre_academico: semestre } : {};

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: id },
        include: [
          {
            model: Asignatura, as: 'asignatura',
            where: whereAsignatura,
            required: false,
          },
          { model: Calificacion, as: 'calificaciones' },
          { model: Asistencia,   as: 'asistencias' },
          { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
        ],
      });

      // Calcular stats generales
      let totalCreditos = 0;
      let sumaGpa = 0;
      let contGpa = 0;
      let sumaAtt = 0;
      let alertasCount = 0;

      const courses = inscripciones.map((insc) => {
        const total     = insc.asistencias.length;
        const presentes = insc.asistencias.filter(a => a.presente).length;
        const att       = total > 0 ? Math.round((presentes / total) * 100) : 100;
        const notas     = insc.calificaciones.filter(c => c.nota !== null).map(c => c.nota);
        const gpa       = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length) : null;

        if (gpa !== null) { sumaGpa += gpa; contGpa++; }
        sumaAtt += att;
        alertasCount += insc.alertas?.length ?? 0;

        return {
          id:         insc.asignatura?.id,
          name:       insc.asignatura?.nombre,
          code:       insc.asignatura?.NRC,
          attendance: att,
          gpa,
          status:     att >= 80 ? 'active' : 'alert',
        };
      });

      res.json({
        gpa:            contGpa > 0 ? Math.round((sumaGpa / contGpa) * 10) / 10 : null,
        attendanceRate: inscripciones.length > 0 ? Math.round(sumaAtt / inscripciones.length) : null,
        totalMaterias:  inscripciones.length,
        alertas:        alertasCount,
        courses,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener dashboard' });
    }
  },

  // GET /api/students/:estudianteId/pensum — progreso curricular completo (RF-16):
  // TODAS las materias del pensum de la carrera, clasificadas en
  // aprobada / en_curso / pendiente (no solo las del semestre actual).
  getPensum: async (req, res) => {
    try {
      const { estudianteId } = req.params;

      if (req.user.rol === 'estudiante' && req.user.id !== estudianteId)
        return res.status(403).json({ error: 'No autorizado' });

      const estudiante = await Estudiante.findOne({ where: { usuario_id: estudianteId } });
      if (!estudiante) return res.json([]);

      const pensum = await Pensum.findAll({
        where: { carrera_id: estudiante.carrera_id },
        order: [['semestre', 'ASC'], ['nombre_asignatura', 'ASC']],
      });

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: estudiante.id },
        include: [{ model: Asignatura, as: 'asignatura', attributes: ['id', 'pensum_id', 'nombre', 'semestre_academico'] }],
      });

      const inscripcionPorPensum = {};
      inscripciones.forEach((insc) => {
        const pensumId = insc.asignatura?.pensum_id;
        if (pensumId) inscripcionPorPensum[pensumId] = insc;
      });

      const resultado = pensum.map((p) => {
        const insc = inscripcionPorPensum[p.id];
        let estado = 'pendiente';
        if (insc?.estado === 'finalizada' && insc.aprobada) estado = 'aprobada';
        else if (insc?.estado === 'activa') estado = 'en_curso';

        return {
          pensum_id:         p.id,
          nombre_asignatura: p.nombre_asignatura,
          semestre:          p.semestre,
          creditos:          p.creditos,
          estado,
          nota_definitiva:   insc?.nota_definitiva ?? null,
          inscripcion_id:    insc?.id ?? null,
        };
      });

      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener el pensum' });
    }
  },

  // GET /api/students/:id/report.pdf — reporte académico individual (RF-21)
  // Exclusivo para docente/admin (restringido en el router).
  getReportPdf: async (req, res) => {
    try {
      const { id } = req.params;

      const estudiante = await Estudiante.findByPk(id, {
        include: [
          { model: Usuario, as: 'usuario', attributes: ['nombre', 'correo', 'id_institucional'] },
          { model: Carrera, as: 'carrera', attributes: ['nombre'] },
        ],
      });
      if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: id },
        include: [
          {
            model: Asignatura, as: 'asignatura',
            include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
          },
          { model: Calificacion, as: 'calificaciones' },
          { model: Asistencia, as: 'asistencias' },
          { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
        ],
      });

      streamStudentReportPdf(res, { estudiante, inscripciones });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al generar el reporte' });
    }
  },

  // GET /api/students?search=... — solo admin. Trae cada estudiante con su
  // GPA/asistencia/riesgo real calculados (mismo motor que el resto de la
  // app), no valores hardcodeados. `search` filtra por nombre, correo o ID
  // institucional (para no tener que listar miles de estudiantes en un
  // <select>).
  getAll: async (req, res) => {
    try {
      const { search, carrera_id, asignatura_id } = req.query;
      const whereUsuario = search ? {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } },
          { id_institucional: { [Op.iLike]: `%${search}%` } },
        ],
      } : {};
      const whereEstudiante = carrera_id ? { carrera_id } : {};

      const estudiantes = await Estudiante.findAll({
        where: whereEstudiante,
        include: [
          { model: Usuario, as: 'usuario', where: whereUsuario, attributes: ['nombre', 'correo', 'id_institucional'], required: true },
          { model: Carrera, as: 'carrera', attributes: ['nombre'] },
          {
            model: Inscripcion, as: 'inscripciones', required: false,
            include: [
              { model: Asignatura, as: 'asignatura', include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }] },
              { model: Calificacion, as: 'calificaciones' },
              { model: Asistencia, as: 'asistencias' },
              { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
            ],
          },
        ],
        limit: (search || carrera_id) ? undefined : 200,
      });

      const result = estudiantes.map((est) => {
        let sumaGpa = 0, contGpa = 0, totalAsist = 0, presentesAsist = 0, peorAlerta = null;

        (est.inscripciones ?? []).forEach((insc) => {
          const calPorActividad = Object.fromEntries((insc.calificaciones ?? []).map((c) => [c.actividad_id, c.nota]));
          const cortesParaCalculo = (insc.asignatura?.cortes ?? []).map((c) => ({
            peso_porcentual: c.peso_porcentual,
            actividades: (c.actividades ?? []).map((a) => ({ porcentaje_en_corte: a.porcentaje_en_corte, nota: calPorActividad[a.id] ?? null })),
          }));
          const resumen = calcularResumenCurso(cortesParaCalculo);
          if (resumen.nota_definitiva != null) { sumaGpa += resumen.nota_definitiva; contGpa++; }

          totalAsist += insc.asistencias?.length ?? 0;
          presentesAsist += insc.asistencias?.filter((a) => a.presente).length ?? 0;

          (insc.alertas ?? []).forEach((al) => {
            if (al.tipo === 'critica') peorAlerta = 'critica';
            else if (al.tipo === 'advertencia' && peorAlerta !== 'critica') peorAlerta = 'advertencia';
          });
        });

        return {
          id:         est.id,
          usuarioId:  est.usuario.id_institucional,
          name:       est.usuario.nombre,
          correo:     est.usuario.correo,
          program:    est.carrera?.nombre ?? '—',
          carreraId:  est.carrera_id,
          semester:   est.semestre_actual,
          gpa:        contGpa > 0 ? Math.round((sumaGpa / contGpa) * 10) / 10 : null,
          attendance: totalAsist > 0 ? Math.round((presentesAsist / totalAsist) * 100) : null,
          risk:       peorAlerta === 'critica' ? 'high' : peorAlerta === 'advertencia' ? 'medium' : 'low',
          yaInscrito: asignatura_id
            ? (est.inscripciones ?? []).some((i) => i.asignatura_id === asignatura_id)
            : undefined,
        };
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener estudiantes' });
    }
  },

  // PUT /api/students/:id — editar perfil académico (carrera/semestre). :id
  // es el UUID del Estudiante. Solo admin.
  update: async (req, res) => {
    try {
      const estudiante = await Estudiante.findByPk(req.params.id);
      if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

      const { carrera_id, semestre_actual } = req.body;
      const cambios = {};
      if (carrera_id !== undefined) cambios.carrera_id = carrera_id;
      if (semestre_actual !== undefined) cambios.semestre_actual = semestre_actual;

      await estudiante.update(cambios);
      res.json({ message: 'Estudiante actualizado', estudiante });
    } catch (err) {
      if (err.name === 'SequelizeForeignKeyConstraintError')
        return res.status(400).json({ error: 'La carrera indicada no existe' });
      if (err.name === 'SequelizeValidationError')
        return res.status(400).json({ error: err.errors?.[0]?.message ?? 'Datos inválidos' });
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar el estudiante' });
    }
  },
};

module.exports = studentController;
