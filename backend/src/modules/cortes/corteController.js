const { Corte, Actividad, Asignatura } = require('../../models');

const corteController = {

  // GET /api/cortes/asignatura/:asignaturaId — cortes con actividades de una asignatura
  getByAsignatura: async (req, res) => {
    try {
      const cortes = await Corte.findAll({
        where: { asignatura_id: req.params.asignaturaId },
        include: [{ model: Actividad, as: 'actividades' }],
        order: [['numero_corte', 'ASC']],
      });
      res.json(cortes);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener cortes' });
    }
  },

  // POST /api/cortes — crear corte (docente/admin)
  create: async (req, res) => {
    try {
      const corte = await Corte.create(req.body);
      res.status(201).json(corte);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El corte ya existe para esta asignatura' });
      res.status(500).json({ error: 'Error al crear corte' });
    }
  },

  // PUT /api/cortes/:id
  update: async (req, res) => {
    try {
      const corte = await Corte.findByPk(req.params.id);
      if (!corte) return res.status(404).json({ error: 'Corte no encontrado' });
      await corte.update(req.body);
      res.json(corte);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar corte' });
    }
  },
};

module.exports = corteController;
