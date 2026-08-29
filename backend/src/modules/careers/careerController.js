// src/modules/careers/careerController.js
const { Carrera, Estudiante, Pensum } = require('../../models');

const careerController = {

  // GET /api/careers — listar todas las carreras (público)
  getAll: async (req, res) => {
    try {
      const carreras = await Carrera.findAll();
      res.json(carreras);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener carreras' });
    }
  },

  // GET /api/careers/:id (público)
  getOne: async (req, res) => {
    try {
      const carrera = await Carrera.findByPk(req.params.id);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });
      res.json(carrera);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener carrera' });
    }
  },

  // POST /api/careers — solo admin
  create: async (req, res) => {
    try {
      const carrera = await Carrera.create(req.body);
      res.status(201).json(carrera);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El código de carrera ya existe' });
      res.status(500).json({ error: 'Error al crear carrera' });
    }
  },

  // PUT /api/careers/:id — solo admin
  update: async (req, res) => {
    try {
      const carrera = await Carrera.findByPk(req.params.id);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });
      await carrera.update(req.body);
      res.json(carrera);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El código de carrera ya existe' });
      res.status(500).json({ error: 'Error al actualizar la carrera' });
    }
  },

  // DELETE /api/careers/:id — solo admin. Igual que con las asignaturas, se
  // bloquea si tiene dependientes en vez de dejar que el ON DELETE CASCADE
  // de la BD borre en cascada estudiantes/pensum/asignaturas sin avisar.
  remove: async (req, res) => {
    try {
      const carrera = await Carrera.findByPk(req.params.id);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });

      const estudiantes = await Estudiante.count({ where: { carrera_id: req.params.id } });
      if (estudiantes > 0)
        return res.status(400).json({ error: `No se puede eliminar: tiene ${estudiantes} estudiante(s) asociado(s)` });

      const pensum = await Pensum.count({ where: { carrera_id: req.params.id } });
      if (pensum > 0)
        return res.status(400).json({ error: `No se puede eliminar: tiene ${pensum} materia(s) en el pensum` });

      await carrera.destroy();
      res.json({ message: 'Carrera eliminada' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar la carrera' });
    }
  },
};

module.exports = careerController;
