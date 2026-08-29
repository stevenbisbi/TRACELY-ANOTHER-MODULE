const { Pensum, Carrera } = require('../../models');

const pensumController = {

  // GET /api/pensum/carrera/:carreraId
  getByCarrera: async (req, res) => {
    try {
      const pensum = await Pensum.findAll({
        where: { carrera_id: req.params.carreraId },
        order: [['semestre', 'ASC']],
      });
      res.json(pensum);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener pensum' });
    }
  },

  // POST /api/pensum
  create: async (req, res) => {
    try {
      const item = await Pensum.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: 'Error al crear entrada del pensum' });
    }
  },

  // PUT /api/pensum/:id
  update: async (req, res) => {
    try {
      const item = await Pensum.findByPk(req.params.id);
      if (!item) return res.status(404).json({ error: 'No encontrado' });
      await item.update(req.body);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar pensum' });
    }
  },
};

module.exports = pensumController;
