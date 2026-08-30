// ─────────────────────────────────────────────────────────────────────────────
// Servicio de excusas: orquesta el flujo completo.
//   radicar → IA extrae del certificado → calcula plazo → IA evalúa vs reglamento
//           → queda pendiente de la Dirección → decisión humana → aplica efectos
//
// La IA interpreta y prepara; NUNCA decide ni modifica asistencia. El aval es
// humano (Dirección de programa) y solo entonces se marcan las inasistencias.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Excusa, Asistencia, Inscripcion, Estudiante, Asignatura, Carrera, Usuario,
} = require('../../models');
const ai = require('../../ai');
const reglamentoService = require('../politica/reglamentoService');
const { dentroDePlazo } = require('../../utils/diasHabiles');
const prompts = require('../../ai/prompts/excusaPrompts');

const DIR_EXCUSAS = path.join(__dirname, '..', '..', '..', 'data', 'excusas');

function extDeMime(mime) {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return 'bin';
}

/**
 * Radica una excusa: guarda el documento, lo analiza con IA y la deja lista para
 * la decisión de la Dirección. La excusa cubre al estudiante en el rango de
 * fechas (todas sus materias), no una asignatura puntual.
 * @param {Object} p
 * @param {string} p.estudianteId  UUID del perfil estudiante
 * @param {string} p.fechaInicio   YYYY-MM-DD
 * @param {string} p.fechaFin      YYYY-MM-DD
 * @param {{ buffer: Buffer, mimetype: string, originalname: string }} p.documento
 */
async function radicarExcusa({ estudianteId, fechaInicio, fechaFin, documento }) {
  // 1. Crear el registro base (estado inicial).
  const excusa = await Excusa.create({
    estudiante_id: estudianteId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    estado: 'radicada',
    documento_nombre: documento?.originalname ?? null,
    documento_mime: documento?.mimetype ?? null,
  });

  // 2. Guardar el documento en disco (si vino).
  if (documento?.buffer) {
    if (!fs.existsSync(DIR_EXCUSAS)) fs.mkdirSync(DIR_EXCUSAS, { recursive: true });
    const nombre = `${excusa.id}.${extDeMime(documento.mimetype)}`;
    fs.writeFileSync(path.join(DIR_EXCUSAS, nombre), documento.buffer);
    await excusa.update({ documento_ruta: path.join('data', 'excusas', nombre) });
  }

  // 3. Plazo (determinístico, sin IA): política vigente + días hábiles.
  const politica = await reglamentoService.getPoliticaVigente();
  const plazoDias = politica?.parametros?.plazo_radicacion_dias_habiles ?? 3;
  const { dentro, fechaLimite } = dentroDePlazo(fechaInicio, excusa.fecha_radicacion, plazoDias);
  await excusa.update({ dentro_de_plazo: dentro, fecha_limite: fechaLimite });

  // 4. Análisis de IA (si está disponible). Si no, queda para revisión manual.
  let analisis = null;
  if (ai.isAvailable() && documento?.buffer) {
    try {
      // 4a. Extracción de datos del certificado (estructurada, sin citas).
      const extraccion = await ai.provider().extractFromDocument({
        document: { buffer: documento.buffer, mimeType: documento.mimetype },
        schema: prompts.excusaExtractionSchema,
        instruction: prompts.EXTRACTION_INSTRUCTION,
      });

      // 4b. Evaluación normativa contra el reglamento (con citas del artículo).
      let evaluacion = null;
      try {
        const fileId = await reglamentoService.getFileIdVigente();
        const contexto = {
          periodo_certificado: `${fechaInicio} a ${fechaFin}`,
          radicada_dentro_del_plazo: dentro,
          plazo_dias_habiles: plazoDias,
        };
        evaluacion = await ai.provider().analyzeWithReference({
          referenceDocId: fileId,
          system: prompts.EVALUATION_SYSTEM,
          question: prompts.buildEvaluationQuestion(extraccion, contexto),
        });
      } catch (e) {
        evaluacion = { error: e.message };
      }

      analisis = {
        extraccion,
        evaluacion,
        reglamento_version: (await reglamentoService.getVigente())?.version ?? null,
        analizado_en: new Date().toISOString(),
      };

      // La IA sugiere el tipo; se guarda como propuesta (la decisión sigue siendo humana).
      const updates = {
        analisis_ia: analisis,
        estado: 'pendiente_direccion',
        reglamento_version: analisis.reglamento_version,
      };
      if (extraccion?.tipo) updates.tipo = extraccion.tipo;
      await excusa.update(updates);
    } catch (e) {
      // Falla de IA: no bloquea el trámite, queda para revisión manual.
      await excusa.update({
        analisis_ia: { error: e.message, analizado_en: new Date().toISOString() },
        estado: 'pendiente_direccion',
      });
    }
  } else {
    // Sin IA: pasa directo a revisión de la Dirección.
    await excusa.update({ estado: 'pendiente_direccion' });
  }

  return excusa.reload();
}

/** Excusas pendientes de decisión para los programas que dirige un director. */
async function listarPendientesPorDirector(directorUsuarioId) {
  return Excusa.findAll({
    where: { estado: 'pendiente_direccion' },
    include: [
      {
        model: Estudiante,
        as: 'estudiante',
        required: true,
        include: [
          { model: Usuario, as: 'usuario', attributes: ['nombre', 'id_institucional'] },
          {
            model: Carrera,
            as: 'carrera',
            required: true,
            where: { director_usuario_id: directorUsuarioId },
            attributes: ['nombre', 'codigo'],
          },
        ],
      },
    ],
    order: [['fecha_radicacion', 'ASC']],
  });
}

/**
 * Decisión de la Dirección sobre una excusa.
 * @param {Object} p
 * @param {string} p.excusaId
 * @param {'avalar'|'rechazar'} p.decision
 * @param {string} [p.motivo]
 * @param {string} p.directorUsuarioId  quién decide (queda en avalada_por)
 */
async function decidir({ excusaId, decision, motivo, directorUsuarioId }) {
  const excusa = await Excusa.findByPk(excusaId);
  if (!excusa) throw new Error('Excusa no encontrada');
  if (excusa.estado !== 'pendiente_direccion') {
    throw new Error(`La excusa no está pendiente (estado actual: ${excusa.estado}).`);
  }

  if (decision === 'avalar') {
    // Todas las inscripciones del estudiante (la excusa cubre a la persona).
    const inscripciones = await Inscripcion.findAll({
      where: { estudiante_id: excusa.estudiante_id },
      attributes: ['id'],
    });
    const inscIds = inscripciones.map((i) => i.id);

    // Marcar como justificadas las inasistencias del rango en TODAS sus materias.
    const [n] = await Asistencia.update(
      { justificada: true, excusa_id: excusa.id },
      {
        where: {
          inscripcion_id: { [Op.in]: inscIds },
          presente: false,
          fecha: { [Op.between]: [excusa.fecha_inicio, excusa.fecha_fin] },
        },
      }
    );

    // Resumen de cobertura: cuántas inasistencias y en qué materias.
    const cubiertas = await Asistencia.findAll({
      where: { excusa_id: excusa.id },
      include: [{
        model: Inscripcion, as: 'inscripcion', attributes: [],
        include: [{ model: Asignatura, as: 'asignatura', attributes: ['nombre'] }],
      }],
      attributes: ['id'],
      raw: true,
      nest: true,
    });
    const materias = [...new Set(cubiertas.map((a) => a.inscripcion?.asignatura?.nombre).filter(Boolean))];
    const cobertura = { inasistencias: n, materias };

    await excusa.update({
      estado: 'avalada',
      avalada_por: directorUsuarioId,
      decidida_en: new Date(),
      motivo_decision: motivo ?? null,
      cobertura,
    });
    return { excusa: await excusa.reload(), inasistenciasJustificadas: n, cobertura };
  }

  if (decision === 'rechazar') {
    await excusa.update({
      estado: 'rechazada',
      avalada_por: directorUsuarioId,
      decidida_en: new Date(),
      motivo_decision: motivo ?? null,
    });
    return { excusa: await excusa.reload(), inasistenciasJustificadas: 0 };
  }

  throw new Error("Decisión inválida (usa 'avalar' o 'rechazar').");
}

module.exports = { radicarExcusa, listarPendientesPorDirector, decidir };
