const Semestre = require('./semesterModel');

const semesterController = {

  // GET /api/semesters — lista todos los semestres (para el selector del front)
  getAll: async (req, res) => {
    try {
      const semestres = await Semestre.findAll({ order: [['fecha_inicio', 'DESC']] });
      res.json(semestres);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener semestres' });
    }
  },

  // GET /api/semesters/active — semestre activo actual
  getActive: async (req, res) => {
    try {
      const semestre = await Semestre.findOne({ where: { activo: true } });
      if (!semestre) return res.status(404).json({ error: 'No hay semestre activo' });
      res.json(semestre);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener semestre activo' });
    }
  },

  // POST /api/semesters — crear semestre (admin)
  create: async (req, res) => {
    try {
      const semestre = await Semestre.create(req.body);
      res.status(201).json(semestre);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El código de semestre ya existe' });
      res.status(500).json({ error: 'Error al crear semestre' });
    }
  },

  // PUT /api/semesters/:id/activate — activar un semestre (desactiva los demás)
  activate: async (req, res) => {
    try {
      await Semestre.update({ activo: false }, { where: {} });
      const semestre = await Semestre.findByPk(req.params.id);
      if (!semestre) return res.status(404).json({ error: 'Semestre no encontrado' });
      await semestre.update({ activo: true });
      res.json({ message: 'Semestre activado', semestre });
    } catch (err) {
      res.status(500).json({ error: 'Error al activar semestre' });
    }
  },
};

module.exports = semesterController;
