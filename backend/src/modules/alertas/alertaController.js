// src/modules/alertas/alertaController.js
const models = require('../../models');
const { Alerta, Inscripcion, Estudiante, Asignatura, Usuario, Corte, Actividad, Calificacion } = models;
const { calcularResumenCurso } = require('../../utils/gradeMath');
const { resolverAlertaSiYaNoAplica } = require('../../services/alertService');

const alertaController = {

  // GET /api/alertas/estudiante/:estudianteId — alertas activas del estudiante
  getByEstudiante: async (req, res) => {
    try {
      const { estudianteId } = req.params;

      // estudianteId es el UUID del perfil estudiante, no el id_institucional del JWT.
      if (req.user.rol === 'estudiante') {
        const propio = await Estudiante.findByPk(estudianteId);
        if (!propio || propio.usuario_id !== req.user.id)
          return res.status(403).json({ error: 'No autorizado' });
      }

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: estudianteId },
        attributes: ['id'],
      });

      const ids = inscripciones.map(i => i.id);
      const alertas = await Alerta.findAll({
        where: { inscripcion_id: ids },
        include: [{
          model: Inscripcion, as: 'inscripcion',
          include: [
            {
              model: Asignatura, as: 'asignatura', attributes: ['nombre', 'NRC', 'umbral_advertencia'],
              include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
            },
            { model: Calificacion, as: 'calificaciones' },
          ],
        }],
        order: [['createdAt', 'DESC']],
      });

      // Reconciliación al leer: si la nota actual ya no amerita la alerta
      // (mejoró por una vía que no disparó evaluarAlertaPorNota, o fue
      // sembrada directamente), se resuelve aquí antes de responder — así
      // el estudiante y el contador del sidebar nunca ven una alerta
      // obsoleta junto a una nota proyectada que ya está bien.
      const resultado = await Promise.all(alertas.map(async (alerta) => {
        const plain = alerta.toJSON();
        if (plain.estado === 'activa' && plain.inscripcion?.asignatura) {
          const calPorActividad = Object.fromEntries(
            (plain.inscripcion.calificaciones ?? []).map((c) => [c.actividad_id, c.nota])
          );
          const cortesParaCalculo = (plain.inscripcion.asignatura.cortes ?? []).map((c) => ({
            peso_porcentual: c.peso_porcentual,
            actividades: (c.actividades ?? []).map((a) => ({
              porcentaje_en_corte: a.porcentaje_en_corte,
              nota: calPorActividad[a.id] ?? null,
            })),
          }));
          const resumen = calcularResumenCurso(cortesParaCalculo);
          const umbral = plain.inscripcion.asignatura.umbral_advertencia ?? 3.5;
          const resuelta = await resolverAlertaSiYaNoAplica({
            inscripcionId: plain.inscripcion_id,
            notaDefinitiva: resumen.nota_definitiva,
            umbral,
            models,
          });
          if (resuelta) plain.estado = 'resuelta';
        }
        delete plain.inscripcion?.calificaciones;
        delete plain.inscripcion?.asignatura?.cortes;
        return plain;
      }));

      res.json(resultado);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener alertas' });
    }
  },

  // POST /api/alertas — crear alerta (sistema automático o admin)
  create: async (req, res) => {
    try {
      const alerta = await Alerta.create(req.body);
      res.status(201).json(alerta);
    } catch (err) {
      res.status(500).json({ error: 'Error al crear alerta' });
    }
  },

  // PUT /api/alertas/:id/resolver
  resolver: async (req, res) => {
    try {
      const alerta = await Alerta.findByPk(req.params.id);
      if (!alerta) return res.status(404).json({ error: 'Alerta no encontrada' });
      await alerta.update({ estado: 'resuelta' });
      res.json({ message: 'Alerta resuelta', alerta });
    } catch (err) {
      res.status(500).json({ error: 'Error al resolver alerta' });
    }
  },
};

module.exports = alertaController;
