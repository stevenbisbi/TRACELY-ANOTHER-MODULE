// src/modules/subjects/subjectController.js
const { sequelize, Asignatura, Docente, Pensum, Corte, Actividad, Inscripcion, Usuario } = require('../../models');

const subjectController = {

  // GET /api/subjects?semestre=2025-1&carrera_id=... — carrera_id filtra por
  // las materias cuyo pensum pertenece a esa carrera (para la vista de
  // detalle de un programa). Incluye `inscritos` (conteo de estudiantes)
  // para poder decidir en el frontend si se puede borrar una materia.
  getAll: async (req, res) => {
    try {
      const { semestre, carrera_id } = req.query;
      const where = semestre ? { semestre_academico: semestre } : {};
      const asignaturas = await Asignatura.findAll({
        where,
        include: [
          { model: Docente, as: 'docente', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo'] }] },
          {
            model: Pensum, as: 'pensum', attributes: ['nombre_asignatura', 'semestre', 'creditos', 'carrera_id'],
            where: carrera_id ? { carrera_id } : undefined,
            required: !!carrera_id,
          },
          { model: Inscripcion, as: 'inscripciones', attributes: ['id'] },
        ],
      });
      const result = asignaturas.map((a) => {
        const plain = a.toJSON();
        plain.inscritos = plain.inscripciones?.length ?? 0;
        delete plain.inscripciones;
        return plain;
      });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener asignaturas' });
    }
  },

  // GET /api/subjects/:id — detalle completo con cortes y actividades
  getOne: async (req, res) => {
    try {
      const asignatura = await Asignatura.findByPk(req.params.id, {
        include: [
          { model: Docente, as: 'docente', include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }] },
          { model: Pensum,  as: 'pensum' },
          {
            model: Corte, as: 'cortes',
            include: [{ model: Actividad, as: 'actividades' }],
          },
        ],
      });
      if (!asignatura) return res.status(404).json({ error: 'Asignatura no encontrada' });
      res.json(asignatura);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener asignatura' });
    }
  },

  // GET /api/subjects/teacher/:docenteId — asignaturas de un docente
  getByTeacher: async (req, res) => {
    try {
      const { semestre } = req.query;
      const where = { docente_id: req.params.docenteId };
      if (semestre) where.semestre_academico = semestre;

      const asignaturas = await Asignatura.findAll({
        where,
        include: [
          { model: Pensum, as: 'pensum', attributes: ['nombre_asignatura', 'creditos'] },
          { model: Corte,  as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] },
        ],
      });
      res.json(asignaturas);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener asignaturas del docente' });
    }
  },

  // POST /api/subjects — crear asignatura (admin). Crea automáticamente sus
  // 3 cortes con la estructura 30/30/40 (RF-12).
  create: async (req, res) => {
    try {
      const asignatura = await sequelize.transaction(async (t) => {
        const nueva = await Asignatura.create(req.body, { transaction: t });
        await Corte.bulkCreate(
          [30, 30, 40].map((peso, i) => ({
            asignatura_id: nueva.id,
            numero_corte: i + 1,
            peso_porcentual: peso,
          })),
          { transaction: t }
        );
        return nueva;
      });
      res.status(201).json(asignatura);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ error: 'El NRC ya existe' });
      console.error(err);
      res.status(500).json({ error: 'Error al crear asignatura' });
    }
  },

  // PUT /api/subjects/:id
  update: async (req, res) => {
    try {
      const asignatura = await Asignatura.findByPk(req.params.id);
      if (!asignatura) return res.status(404).json({ error: 'No encontrada' });
      await asignatura.update(req.body);
      res.json(asignatura);
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar' });
    }
  },

  // DELETE /api/subjects/:id — solo si no tiene estudiantes inscritos. El
  // cascade de BD (corte→actividad, inscripcion→calificacion/asistencia)
  // ya está limpio, pero borrar una materia CON gente inscrita se bloquea
  // como regla de negocio, no de integridad referencial.
  remove: async (req, res) => {
    try {
      const asignatura = await Asignatura.findByPk(req.params.id);
      if (!asignatura) return res.status(404).json({ error: 'No encontrada' });

      const inscritos = await Inscripcion.count({ where: { asignatura_id: req.params.id } });
      if (inscritos > 0)
        return res.status(400).json({ error: `No se puede eliminar: tiene ${inscritos} estudiante(s) inscrito(s)` });

      await asignatura.destroy();
      res.json({ message: 'Asignatura eliminada' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar la asignatura' });
    }
  },

  // PUT /api/subjects/:id/umbral — el docente configura su propio umbral de advertencia
  updateUmbral: async (req, res) => {
    try {
      const { umbral_advertencia } = req.body;
      if (typeof umbral_advertencia !== 'number' || umbral_advertencia < 0 || umbral_advertencia > 5)
        return res.status(400).json({ error: 'umbral_advertencia debe ser un número entre 0 y 5' });

      const asignatura = await Asignatura.findByPk(req.params.id, {
        include: [{ model: Docente, as: 'docente' }],
      });
      if (!asignatura) return res.status(404).json({ error: 'No encontrada' });

      if (req.user.rol === 'docente' && asignatura.docente?.usuario_id !== req.user.id)
        return res.status(403).json({ error: 'No autorizado' });

      await asignatura.update({ umbral_advertencia });
      res.json({ message: 'Umbral actualizado', umbral_advertencia: asignatura.umbral_advertencia });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar el umbral' });
    }
  },

  // PUT /api/subjects/:id/cortes — configura de una sola vez el peso de los
  // 3 cortes de una asignatura (por defecto 30/30/40). Body: { cortes:
  // [{ id, peso_porcentual }, ...] }. Se actualizan los 3 juntos en una
  // transacción para que nunca quede un estado intermedio que no sume 100%.
  updateCortes: async (req, res) => {
    try {
      const { cortes } = req.body;
      if (!Array.isArray(cortes) || cortes.length === 0)
        return res.status(400).json({ error: 'Debes enviar la lista de cortes' });

      const suma = cortes.reduce((s, c) => s + Number(c.peso_porcentual ?? 0), 0);
      if (Math.round(suma * 100) / 100 !== 100)
        return res.status(400).json({ error: `Los pesos de los cortes deben sumar exactamente 100% (suman ${suma}%)` });

      const asignatura = await Asignatura.findByPk(req.params.id, {
        include: [{ model: Docente, as: 'docente' }, { model: Corte, as: 'cortes' }],
      });
      if (!asignatura) return res.status(404).json({ error: 'No encontrada' });

      if (req.user.rol === 'docente' && asignatura.docente?.usuario_id !== req.user.id)
        return res.status(403).json({ error: 'No autorizado' });

      const idsPropios = new Set(asignatura.cortes.map((c) => c.id));
      if (cortes.some((c) => !idsPropios.has(c.id)) || cortes.length !== asignatura.cortes.length)
        return res.status(400).json({ error: 'La lista de cortes no coincide con los de esta asignatura' });

      await sequelize.transaction(async (t) => {
        await Promise.all(
          cortes.map((c) => Corte.update({ peso_porcentual: c.peso_porcentual }, { where: { id: c.id }, transaction: t }))
        );
      });

      const actualizados = await Corte.findAll({ where: { asignatura_id: asignatura.id }, order: [['numero_corte', 'ASC']] });
      res.json({ message: 'Cortes actualizados', cortes: actualizados });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar los cortes' });
    }
  },
};

module.exports = subjectController;
