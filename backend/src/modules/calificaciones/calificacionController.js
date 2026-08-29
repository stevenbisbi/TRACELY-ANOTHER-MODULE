const XLSX = require('xlsx');
const models = require('../../models');
const { Calificacion, Inscripcion, Actividad, Corte, Asignatura, Estudiante, Usuario, Pensum, Docente } = models;
const { calcularResumenCurso } = require('../../utils/gradeMath');
const { evaluarAlertaPorNota } = require('../../services/alertService');
const { normalizeId } = require('../../utils/normalizeId');

const calificacionController = {

  // GET /api/calificaciones/estudiante/:estudianteId?semestre=2025-1
  // estudianteId = id_institucional del usuario (ej: "2021-0342")
  getByEstudiante: async (req, res) => {
    try {
      const { estudianteId } = req.params;
      const { semestre }     = req.query;

      // Verificar que el usuario autenticado solo vea sus propias notas
      if (req.user.rol === 'estudiante' && req.user.id !== estudianteId)
        return res.status(403).json({ error: 'No autorizado' });

      // Buscar el perfil estudiante por id_institucional
      const estudiante = await Estudiante.findOne({ where: { usuario_id: estudianteId } });
      if (!estudiante) return res.json([]);

      const whereAsignatura = semestre ? { semestre_academico: semestre } : {};

      const inscripciones = await Inscripcion.findAll({
        where: { estudiante_id: estudiante.id },
        include: [
          {
            model: Asignatura, as: 'asignatura',
            where: whereAsignatura,
            required: true,
            include: [
              { model: Pensum,  as: 'pensum',  attributes: ['nombre_asignatura', 'creditos'] },
              {
                model: Docente, as: 'docente',
                include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }],
              },
              {
                model: Corte, as: 'cortes',
                include: [{ model: Actividad, as: 'actividades' }],
              },
            ],
          },
          {
            model: Calificacion, as: 'calificaciones',
            include: [{ model: Actividad, as: 'actividad' }],
          },
        ],
      });

      const resultado = inscripciones.map((insc) => {
        const plain = insc.toJSON();
        // El orden de los cortes no está garantizado por la consulta — se
        // ordena aquí para que siempre se muestren 1, 2, 3.
        if (plain.asignatura?.cortes) {
          plain.asignatura.cortes.sort((a, b) => a.numero_corte - b.numero_corte);
        }
        const calPorActividad = Object.fromEntries(
          (plain.calificaciones ?? []).map((c) => [c.actividad_id, c.nota])
        );

        const cortesParaCalculo = (plain.asignatura?.cortes ?? []).map((c) => ({
          peso_porcentual: c.peso_porcentual,
          actividades: (c.actividades ?? []).map((a) => ({
            porcentaje_en_corte: a.porcentaje_en_corte,
            nota: calPorActividad[a.id] ?? null,
          })),
        }));

        const resumen = calcularResumenCurso(cortesParaCalculo);

        if (plain.asignatura) {
          plain.asignatura.cortes = (plain.asignatura.cortes ?? []).map((c, i) => ({
            ...c,
            nota_corte: resumen.cortes[i]?.nota_corte ?? null,
            corte_completo: resumen.cortes[i]?.completo ?? false,
          }));
        }

        plain.nota_definitiva_calculada = resumen.nota_definitiva;
        plain.nota_minima_requerida = resumen.nota_minima_requerida;
        plain.recuperable = resumen.recuperable;

        return plain;
      });

      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener calificaciones' });
    }
  },

  // POST /api/calificaciones — registrar o actualizar una nota
  upsert: async (req, res) => {
    try {
      const { inscripcion_id, actividad_id, nota } = req.body;

      const [cal, created] = await Calificacion.findOrCreate({
        where: { inscripcion_id, actividad_id },
        defaults: { nota, fecha_registro: new Date() },
      });
      if (!created) await cal.update({ nota });

      // Evaluar alerta automática por nota en segundo plano (no bloquea la respuesta)
      setImmediate(() => {
        evaluarAlertaPorNota(inscripcion_id, models).catch((e) => console.error('Error evaluando alerta:', e.message));
      });

      res.status(created ? 201 : 200).json({
        message: created ? 'Nota registrada' : 'Nota actualizada',
        calificacion: cal,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar nota' });
    }
  },

  // POST /api/calificaciones/bulk
  bulkUpsert: async (req, res) => {
    try {
      const { calificaciones } = req.body;
      if (!Array.isArray(calificaciones) || calificaciones.length === 0)
        return res.status(400).json({ error: 'Sin datos' });

      const results = await Promise.all(
        calificaciones.map(async ({ inscripcion_id, actividad_id, nota }) => {
          const [r, created] = await Calificacion.findOrCreate({
            where: { inscripcion_id, actividad_id },
            defaults: { nota },
          });
          if (!created) await r.update({ nota });
          return r;
        })
      );

      // Evaluar alerta automática por nota para cada inscripción afectada (una sola vez por inscripción)
      const inscripcionesAfectadas = [...new Set(calificaciones.map((c) => c.inscripcion_id))];
      setImmediate(() => {
        inscripcionesAfectadas.forEach((id) => {
          evaluarAlertaPorNota(id, models).catch((e) => console.error('Error evaluando alerta:', e.message));
        });
      });

      res.json({ message: `${results.length} notas procesadas`, count: results.length });
    } catch (err) {
      res.status(500).json({ error: 'Error al procesar notas' });
    }
  },

  // POST /api/calificaciones/import — carga masiva de notas desde un .xlsx
  // (RNF-09 / HU-04). Columnas esperadas (encabezado en la primera fila,
  // sin importar mayúsculas): ID | Actividad | Nota. El ID se normaliza
  // (con o sin ceros a la izquierda apunta al mismo estudiante) y el nombre
  // de la actividad debe coincidir (sin importar mayúsculas/espacios) con
  // una actividad ya creada en la asignatura indicada.
  importExcel: async (req, res) => {
    try {
      const { asignatura_id } = req.body;
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
      if (!asignatura_id) return res.status(400).json({ error: 'Falta asignatura_id' });

      const asignatura = await Asignatura.findByPk(asignatura_id, {
        include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
      });
      if (!asignatura) return res.status(404).json({ error: 'Asignatura no encontrada' });

      const actividadPorNombre = new Map();
      (asignatura.cortes ?? []).forEach((c) => {
        (c.actividades ?? []).forEach((a) => actividadPorNombre.set(a.nombre.trim().toLowerCase(), a.id));
      });

      const inscripciones = await Inscripcion.findAll({
        where: { asignatura_id },
        include: [{ model: Estudiante, as: 'estudiante' }],
      });
      const inscripcionPorId = new Map();
      inscripciones.forEach((i) => inscripcionPorId.set(normalizeId(i.estudiante.usuario_id), i.id));

      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } catch {
        return res.status(400).json({ error: 'El archivo no es un Excel válido' });
      }
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

      const getCol = (row, ...nombres) => {
        for (const n of nombres) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === n);
          if (key !== undefined) return row[key];
        }
        return undefined;
      };

      const validas = [];
      const errores = [];

      filas.forEach((row, i) => {
        const numFila = i + 2; // +1 por encabezado, +1 por índice base 1
        const idRaw = String(getCol(row, 'id', 'id institucional', 'estudiante') ?? '').trim();
        const actividadRaw = String(getCol(row, 'actividad', 'actividad_nombre') ?? '').trim();
        const notaRaw = getCol(row, 'nota');

        if (!idRaw || !actividadRaw || notaRaw === undefined || notaRaw === '') {
          errores.push({ fila: numFila, motivo: 'Faltan columnas (ID, Actividad o Nota)' });
          return;
        }

        const inscripcionId = inscripcionPorId.get(normalizeId(idRaw));
        if (!inscripcionId) {
          errores.push({ fila: numFila, motivo: `Estudiante "${idRaw}" no está inscrito en esta asignatura` });
          return;
        }

        const actividadId = actividadPorNombre.get(actividadRaw.toLowerCase());
        if (!actividadId) {
          errores.push({ fila: numFila, motivo: `Actividad "${actividadRaw}" no existe en esta asignatura` });
          return;
        }

        const nota = Number(notaRaw);
        if (Number.isNaN(nota) || nota < 0 || nota > 5) {
          errores.push({ fila: numFila, motivo: `Nota "${notaRaw}" inválida (debe ser entre 0 y 5)` });
          return;
        }

        validas.push({ inscripcion_id: inscripcionId, actividad_id: actividadId, nota });
      });

      await Promise.all(
        validas.map(({ inscripcion_id, actividad_id, nota }) =>
          Calificacion.findOrCreate({ where: { inscripcion_id, actividad_id }, defaults: { nota } })
            .then(([r, created]) => (created ? r : r.update({ nota })))
        )
      );

      const inscripcionesAfectadas = [...new Set(validas.map((v) => v.inscripcion_id))];
      setImmediate(() => {
        inscripcionesAfectadas.forEach((id) => {
          evaluarAlertaPorNota(id, models).catch((e) => console.error('Error evaluando alerta:', e.message));
        });
      });

      res.json({
        message: `${validas.length} notas importadas, ${errores.length} filas con error`,
        procesadas: validas.length,
        errores,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al importar el archivo' });
    }
  },

  // GET /api/calificaciones/asignatura/:asignaturaId?corte=1 (opcional)
  getByAsignatura: async (req, res) => {
    try {
      const { asignaturaId } = req.params;
      const { corte }        = req.query;

      const asignatura = await Asignatura.findByPk(asignaturaId, {
        include: [{ model: Corte, as: 'cortes', include: [{ model: Actividad, as: 'actividades' }] }],
      });

      const inscripciones = await Inscripcion.findAll({
        where: { asignatura_id: asignaturaId },
        include: [
          {
            model: Estudiante, as: 'estudiante',
            include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'correo'] }],
          },
          {
            model: Calificacion, as: 'calificaciones',
            include: [{ model: Actividad, as: 'actividad', include: [{ model: Corte, as: 'corte' }] }],
          },
        ],
      });

      // El orden de los cortes no está garantizado por la consulta — se
      // ordena aquí para que siempre se muestren 1, 2, 3.
      const cortesBase = (asignatura?.cortes ?? []).slice().sort((a, b) => a.numero_corte - b.numero_corte);

      const resultado = inscripciones.map((insc) => {
        const plain = insc.toJSON();
        // El resumen (nota definitiva, mínima requerida, recuperable) siempre
        // se calcula con TODAS las calificaciones, sin importar el filtro ?corte=
        const calPorActividad = Object.fromEntries(
          (plain.calificaciones ?? []).map((c) => [c.actividad_id, c.nota])
        );
        const cortesParaCalculo = cortesBase.map((c) => ({
          peso_porcentual: c.peso_porcentual,
          actividades: (c.actividades ?? []).map((a) => ({
            porcentaje_en_corte: a.porcentaje_en_corte,
            nota: calPorActividad[a.id] ?? null,
          })),
        }));
        const resumen = calcularResumenCurso(cortesParaCalculo);

        plain.nota_definitiva_calculada = resumen.nota_definitiva;
        plain.nota_minima_requerida = resumen.nota_minima_requerida;
        plain.recuperable = resumen.recuperable;

        // El filtro ?corte= solo recorta la lista de calificaciones devuelta
        if (corte) {
          plain.calificaciones = (plain.calificaciones ?? []).filter(
            (c) => c.actividad?.corte?.numero_corte === Number(corte)
          );
        }

        return plain;
      });

      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener notas' });
    }
  },
};

module.exports = calificacionController;
