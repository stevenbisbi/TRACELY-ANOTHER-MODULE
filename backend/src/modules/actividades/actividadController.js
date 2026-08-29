const { Actividad, Corte } = require('../../models');

const actividadController = {

  // GET /api/actividades/corte/:corteId
  getByCorte: async (req, res) => {
    try {
      const actividades = await Actividad.findAll({
        where: { corte_id: req.params.corteId },
        order: [['createdAt', 'ASC']],
      });
      res.json(actividades);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener actividades' });
    }
  },

  // POST /api/actividades — valida que las actividades de un corte no sumen más de 100%
  create: async (req, res) => {
    try {
      const { corte_id, porcentaje_en_corte } = req.body;

      if (corte_id && porcentaje_en_corte != null) {
        const existentes = await Actividad.findAll({ where: { corte_id } });
        const sumaActual = existentes.reduce((s, a) => s + (a.porcentaje_en_corte ?? 0), 0);
        if (sumaActual + Number(porcentaje_en_corte) > 100) {
          return res.status(400).json({
            error: `Las actividades de este corte ya suman ${sumaActual}%; no se puede agregar ${porcentaje_en_corte}% más (máximo 100%).`,
          });
        }
      }

      const actividad = await Actividad.create(req.body);
      res.status(201).json(actividad);
    } catch (err) {
      res.status(500).json({ error: 'Error al crear actividad' });
    }
  },

  // PUT /api/actividades/:id — permite redistribuir el porcentaje de una
  // actividad ya creada (ej: bajar un taller de 30% a 20% para hacerle
  // espacio a un quiz nuevo). Valida que la suma del corte, sin contar esta
  // actividad, más el nuevo valor, no supere 100% — mismo criterio que create.
  update: async (req, res) => {
    try {
      const actividad = await Actividad.findByPk(req.params.id);
      if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });

      const { porcentaje_en_corte } = req.body;
      if (porcentaje_en_corte != null) {
        const hermanas = await Actividad.findAll({ where: { corte_id: actividad.corte_id } });
        const sumaOtras = hermanas
          .filter((a) => a.id !== actividad.id)
          .reduce((s, a) => s + (a.porcentaje_en_corte ?? 0), 0);
        if (sumaOtras + Number(porcentaje_en_corte) > 100) {
          return res.status(400).json({
            error: `Las demás actividades de este corte ya suman ${sumaOtras}%; no se puede dejar esta en ${porcentaje_en_corte}% (máximo 100% en total).`,
          });
        }
      }

      await actividad.update(req.body);
      res.json(actividad);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al actualizar actividad' });
    }
  },

  // DELETE /api/actividades/:id
  delete: async (req, res) => {
    try {
      const deleted = await Actividad.destroy({ where: { id: req.params.id } });
      if (!deleted) return res.status(404).json({ error: 'No encontrada' });
      res.json({ message: 'Actividad eliminada' });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar actividad' });
    }
  },
};

module.exports = actividadController;
