// src/modules/inscripciones/inscripcionController.js
const { Inscripcion, Estudiante, Asignatura, Alerta, Calificacion, Actividad, Corte, Usuario } = require('../../models');
const { Op } = require('sequelize');

const inscripcionController = {

  // GET /api/inscripciones/estudiante/:estudianteId
  getByEstudiante: async (req, res) => {
    try {
      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: req.params.estudianteId },
        include: [
          {
            model: Asignatura, as: 'asignatura',
            include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
          },
          { model: Calificacion, as: 'calificaciones' },
          { model: Alerta, as: 'alertas', where: { estado: 'activa' }, required: false },
        ],
      });
      res.json(inscripciones);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener inscripciones' });
    }
  },

  // GET /api/inscripciones/asignatura/:asignaturaId — lista de estudiantes inscritos (docente)
  getByAsignatura: async (req, res) => {
    try {
      const inscripciones = await Inscripcion.findAll({
        where: { asignatura_id: req.params.asignaturaId },
        include: [
          {
            model: Estudiante, as: 'estudiante',
            include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo', 'id_institucional'] }],
          },
          { model: Alerta, as: 'alertas', required: false },
        ],
      });
      res.json(inscripciones);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener inscripciones' });
    }
  },

  // POST /api/inscripciones — inscribir estudiante a asignatura
  create: async (req, res) => {
    try {
      const { estudiante_id, asignatura_id } = req.body;
      const [inscripcion, created] = await Inscripcion.findOrCreate({
        where: { estudiante_id, asignatura_id },
        defaults: { estado: 'activa' },
      });

      if (!created)
        return res.status(400).json({ error: 'El estudiante ya está inscrito en esta asignatura' });

      res.status(201).json({ message: 'Inscripción creada', inscripcion });
    } catch (err) {
      res.status(500).json({ error: 'Error al crear inscripción' });
    }
  },

  // PUT /api/inscripciones/:id/finalizar — finalizar inscripción con nota definitiva
  finalizar: async (req, res) => {
    try {
      const inscripcion = await Inscripcion.findByPk(req.params.id);
      if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada' });

      const { nota_definitiva } = req.body;
      await inscripcion.update({
        nota_definitiva,
        estado: 'finalizada',
        aprobada: nota_definitiva >= 3.0,
      });

      res.json({ message: 'Inscripción finalizada', inscripcion });
    } catch (err) {
      res.status(500).json({ error: 'Error al finalizar inscripción' });
    }
  },

  // DELETE /api/inscripciones/:id — des-inscribir. Calificacion/Asistencia/
  // Alerta referencian inscripcion_id con ON DELETE CASCADE (migration.sql),
  // así que el borrado es seguro a nivel de integridad referencial.
  remove: async (req, res) => {
    try {
      const inscripcion = await Inscripcion.findByPk(req.params.id);
      if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada' });
      await inscripcion.destroy();
      res.json({ message: 'Estudiante des-inscrito' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al des-inscribir' });
    }
  },
};

module.exports = inscripcionController;
