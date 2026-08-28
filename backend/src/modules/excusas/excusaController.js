const { Excusa, Inscripcion, Estudiante } = require('../../models');
const excusaService = require('./excusaService');
const ai = require('../../ai');

const excusaController = {
  // POST /api/excusas  (estudiante) — multipart: documento + campos
  radicar: async (req, res) => {
    try {
      const { inscripcion_id, fecha_inicio, fecha_fin } = req.body;
      if (!inscripcion_id || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'inscripcion_id, fecha_inicio y fecha_fin son requeridos.' });
      }

      // Verificar que la inscripción sea del estudiante autenticado.
      const insc = await Inscripcion.findByPk(inscripcion_id, {
        include: [{ model: Estudiante, as: 'estudiante', attributes: ['usuario_id'] }],
      });
      if (!insc) return res.status(404).json({ error: 'Inscripción no encontrada.' });
      if (req.user.rol === 'estudiante' && insc.estudiante?.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'No puedes radicar excusas de otra inscripción.' });
      }

      const excusa = await excusaService.radicarExcusa({
        inscripcionId: inscripcion_id,
        fechaInicio: fecha_inicio,
        fechaFin: fecha_fin,
        documento: req.file, // multer memoryStorage
      });

      res.status(201).json({
        message: 'Excusa radicada.',
        ia_analizada: !!excusa.analisis_ia && !excusa.analisis_ia.error,
        excusa,
      });
    } catch (err) {
      console.error('radicar excusa:', err);
      res.status(500).json({ error: 'Error al radicar la excusa.' });
    }
  },

  // GET /api/excusas/mias  (estudiante)
  misExcusas: async (req, res) => {
    try {
      const excusas = await Excusa.findAll({
        include: [{
          model: Inscripcion, as: 'inscripcion', required: true,
          include: [{ model: Estudiante, as: 'estudiante', where: { usuario_id: req.user.id }, attributes: [] }],
        }],
        order: [['fecha_radicacion', 'DESC']],
      });
      res.json(excusas);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener tus excusas.' });
    }
  },

  // GET /api/excusas/pendientes  (director de programa)
  pendientes: async (req, res) => {
    try {
      const excusas = await excusaService.listarPendientesPorDirector(req.user.id);
      res.json(excusas);
    } catch (err) {
      console.error('pendientes:', err);
      res.status(500).json({ error: 'Error al obtener excusas pendientes.' });
    }
  },

  // POST /api/excusas/:id/decision  (director) — { decision: 'avalar'|'rechazar', motivo? }
  decidir: async (req, res) => {
    try {
      const { decision, motivo } = req.body;
      if (!['avalar', 'rechazar'].includes(decision)) {
        return res.status(400).json({ error: "decision debe ser 'avalar' o 'rechazar'." });
      }
      const resultado = await excusaService.decidir({
        excusaId: req.params.id,
        decision,
        motivo,
        directorUsuarioId: req.user.id,
      });
      res.json({
        message: decision === 'avalar' ? 'Excusa avalada.' : 'Excusa rechazada.',
        ...resultado,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // GET /api/excusas/estado-ia  — diagnóstico de disponibilidad de la IA
  estadoIA: (_req, res) => {
    res.json({ ia_disponible: ai.isAvailable(), proveedor: ai.config.provider });
  },
};

module.exports = excusaController;
