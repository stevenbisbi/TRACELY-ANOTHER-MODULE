const { PoliticaAcademica } = require('../../models');
const interpretService = require('./reglamentoInterpretService');
const reglamentoService = require('./reglamentoService');

const politicaController = {
  // GET /api/politica/vigente
  vigente: async (_req, res) => {
    try {
      const politica = await reglamentoService.getPoliticaVigente();
      res.json(politica);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener la política vigente.' });
    }
  },

  // GET /api/politica  — historial de versiones
  historial: async (_req, res) => {
    try {
      const versiones = await PoliticaAcademica.findAll({ order: [['version', 'DESC']] });
      res.json(versiones);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener el historial de políticas.' });
    }
  },

  // POST /api/politica/interpretar  (admin) — multipart: reglamento nuevo (PDF)
  // La IA propone cambios + impacto. NO aplica nada.
  interpretar: async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Adjunta el PDF del reglamento nuevo (campo "reglamento").' });
      const resultado = await interpretService.interpretar({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });
      res.json({
        message: 'Interpretación completada. Revisa la propuesta antes de aplicarla.',
        ...resultado,
      });
    } catch (err) {
      console.error('interpretar reglamento:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // POST /api/politica/aplicar  (admin) — { parametros, reglamento_version?, vigente_desde? }
  // Crea y activa una nueva versión de política con los parámetros aprobados.
  aplicar: async (req, res) => {
    try {
      const { parametros, reglamento_version, vigente_desde } = req.body;
      if (!parametros || typeof parametros !== 'object') {
        return res.status(400).json({ error: 'parametros (objeto) es requerido.' });
      }
      const politica = await interpretService.aplicar({
        parametros,
        aprobadaPor: req.user.id,
        reglamentoVersion: reglamento_version,
        vigenteDesde: vigente_desde,
      });
      res.status(201).json({ message: `Política v${politica.version} activada.`, politica });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = politicaController;
