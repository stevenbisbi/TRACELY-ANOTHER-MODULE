const { Excusa, Estudiante } = require('../../models');
const excusaService = require('./excusaService');
const ai = require('../../ai');

const excusaController = {
  // POST /api/excusas  (estudiante) — multipart: documento + fechas.
  // La excusa cubre al estudiante; no se elige materia.
  radicar: async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin } = req.body;
      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridos.' });
      }

      // Resolver el perfil de estudiante del usuario autenticado.
      const estudiante = await Estudiante.findOne({ where: { usuario_id: req.user.id }, attributes: ['id'] });
      if (!estudiante) return res.status(403).json({ error: 'Solo los estudiantes pueden radicar excusas.' });

      const excusa = await excusaService.radicarExcusa({
        estudianteId: estudiante.id,
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
      const estudiante = await Estudiante.findOne({ where: { usuario_id: req.user.id }, attributes: ['id'] });
      if (!estudiante) return res.json([]);
      const excusas = await Excusa.findAll({
        where: { estudiante_id: estudiante.id },
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
