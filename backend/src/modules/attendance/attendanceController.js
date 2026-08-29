const { Asistencia, Inscripcion, Asignatura, Estudiante, Usuario, Pensum, Docente, Alerta } = require('../../models');
const { sendAttendanceAlert } = require('../../services/emailService');
const socketService = require('../../services/socketService');

const attendanceController = {

  getByEstudiante: async (req, res) => {
    try {
      const { estudianteId } = req.params;
      const { semestre }     = req.query;

      if (req.user.rol === 'estudiante' && req.user.id !== estudianteId)
        return res.status(403).json({ error: 'No autorizado' });

      const estudiante = await Estudiante.findOne({ where: { usuario_id: estudianteId } });
      if (!estudiante) return res.json({ courses: [] });

      const whereAsig = semestre ? { semestre_academico: semestre } : {};

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: estudiante.id },
        include: [
          {
            model: Asignatura, as: 'asignatura', where: whereAsig, required: true,
            include: [
              { model: Pensum, as: 'pensum', attributes: ['nombre_asignatura', 'creditos'] },
              { model: Docente, as: 'docente', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }] },
            ],
          },
          { model: Asistencia, as: 'asistencias' },
        ],
      });

      const result = inscripciones.map((insc) => {
        const total     = insc.asistencias.length;
        const presentes = insc.asistencias.filter((a) => a.presente).length;
        const pct       = total > 0 ? Math.round((presentes / total) * 100) : 100;
        // Últimas 5 sesiones registradas (más reciente primero) — para el
        // indicador visual de asistencia reciente en el detalle de la materia.
        const ultimasSesiones = [...insc.asistencias]
          .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
          .slice(0, 5)
          .reverse()
          .map((a) => ({ fecha: a.fecha, presente: a.presente }));
        return {
          id:            insc.asignatura.id,
          name:          insc.asignatura.nombre,
          code:          insc.asignatura.NRC,
          teacher:       insc.asignatura.docente?.usuario?.nombre ?? '',
          credits:       insc.asignatura.pensum?.creditos ?? 0,
          color:         '#4F46E5',
          attendance:    pct,
          status:        pct >= 80 ? 'active' : 'alert',
          total,
          presentes,
          ultimasSesiones,
          inscripcionId: insc.id,
        };
      });

      // Historial mensual real: agrupa TODOS los registros de asistencia del
      // estudiante (todas las materias) por mes calendario (a partir de
      // Asistencia.fecha), no una simulación aleatoria.
      const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const porMes = {};
      inscripciones.forEach((insc) => {
        insc.asistencias.forEach((a) => {
          const key = a.fecha.slice(0, 7); // 'YYYY-MM'
          if (!porMes[key]) porMes[key] = { total: 0, presentes: 0 };
          porMes[key].total++;
          if (a.presente) porMes[key].presentes++;
        });
      });
      const attendanceHistory = Object.keys(porMes).sort().map((key) => ({
        month: MESES[Number(key.slice(5, 7)) - 1] ?? key,
        rate: Math.round((porMes[key].presentes / porMes[key].total) * 100),
      }));

      res.json({ courses: result, attendanceHistory });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener asistencia' });
    }
  },

  getByAsignatura: async (req, res) => {
    try {
      const { asignaturaId } = req.params;
      const { fecha }        = req.query;

      const inscripciones = await Inscripcion.findAll({
        where: { asignatura_id: asignaturaId },
        include: [
          {
            model: Estudiante, as: 'estudiante',
            include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'id_institucional'] }],
          },
          { model: Asistencia, as: 'asistencias', where: fecha ? { fecha } : {}, required: false },
        ],
      });

      res.json(inscripciones);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener asistencia del grupo' });
    }
  },

  saveDayAttendance: async (req, res) => {
    try {
      const { asignatura_id, fecha, records } = req.body;

      if (!Array.isArray(records) || !asignatura_id || !fecha)
        return res.status(400).json({ error: 'Datos incompletos' });

      // Guardar asistencia
      const results = await Promise.all(
        records.map(async ({ inscripcion_id, presente }) => {
          const [record, created] = await Asistencia.findOrCreate({
            where: { inscripcion_id, fecha },
            defaults: { presente, registrado_por: req.user.id },
          });
          if (!created) await record.update({ presente });
          return record;
        })
      );

      // Verificar alertas y enviar emails en background (no bloquea la respuesta)
      setImmediate(async () => {
        for (const { inscripcion_id } of records) {
          try {
            const insc = await Inscripcion.findByPk(inscripcion_id, {
              include: [
                {
                  model: Estudiante, as: 'estudiante',
                  include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo'] }],
                },
                { model: Asistencia, as: 'asistencias' },
                { model: Asignatura, as: 'asignatura', attributes: ['nombre'] },
              ],
            });
            if (!insc) continue;

            const total     = insc.asistencias.length;
            const presentes = insc.asistencias.filter((a) => a.presente).length;
            const pct       = total > 0 ? Math.round((presentes / total) * 100) : 100;

            // Estado antes de este guardado (excluyendo el registro de hoy)
            // vs. después — el mismo patrón que usa evaluarAlertaPorNota,
            // para no depender de si la fila Alerta se creó o no (esa fila
            // puede no crearse si ya existe una alerta activa por otro
            // motivo, ej. de nota, dejando al estudiante sin notificación
            // en tiempo real aunque su asistencia sí haya cruzado el umbral).
            const asistenciasSinHoy = insc.asistencias.filter((a) => a.fecha !== fecha);
            const totalAntes    = asistenciasSinHoy.length;
            const presentesAntes = asistenciasSinHoy.filter((a) => a.presente).length;
            const pctAntes      = totalAntes > 0 ? Math.round((presentesAntes / totalAntes) * 100) : 100;
            const tipoAntes     = pctAntes < 70 ? 'critica' : pctAntes < 80 ? 'advertencia' : null;
            const tipoDespues   = pct < 70 ? 'critica' : pct < 80 ? 'advertencia' : null;

            if (tipoDespues) {
              // Crear o actualizar alerta
              await Alerta.findOrCreate({
                where: { inscripcion_id, estado: 'activa' },
                defaults: { tipo: tipoDespues, es_recuperable: true },
              });

              // Enviar email
              await sendAttendanceAlert({
                studentName:       insc.estudiante?.usuario?.nombre ?? '',
                studentEmail:      insc.estudiante?.usuario?.correo ?? '',
                subjectName:       insc.asignatura?.nombre ?? '',
                attendancePercent: pct,
                isRecuperable:     pct >= 70,
              });

              // Notificar en tiempo real solo si recién cruzó el umbral o
              // empeoró de severidad — no en cada guardado mientras sigue
              // igual de baja.
              if (tipoDespues !== tipoAntes) {
                socketService.emitToStudent(insc.estudiante?.usuario_id, 'alerta:nueva', {
                  asignaturaId: insc.asignatura_id,
                  asignaturaNombre: insc.asignatura?.nombre ?? '',
                  tipo: tipoDespues,
                  categoria: 'asistencia',
                  attendance: pct,
                });
              }
            }
          } catch (e) {
            console.error('Error en notificación:', e.message);
          }
        }
      });

      res.json({ message: `Asistencia guardada para ${results.length} estudiantes`, fecha });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar asistencia' });
    }
  },
};

module.exports = attendanceController;
