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
const socketService = require('../../services/socketService');
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

// Qué se manda a la IA para analizar: el certificado (binario) si lo hay; si no,
// la explicación escrita del estudiante (texto), para casos de fuerza mayor.
function buildAiInput(documento, explicacion) {
  if (documento?.buffer) return { buffer: documento.buffer, mimeType: documento.mimetype };
  if (explicacion) return { text: explicacion };
  return null;
}

/**
 * Radica una excusa: guarda el documento, lo analiza con IA y la deja lista para
 * la decisión de la Dirección. La excusa cubre al estudiante en el rango de
 * fechas (todas sus materias), no una asignatura puntual.
 * @param {Object} p
 * @param {string} p.estudianteId  UUID del perfil estudiante
 * @param {string} p.fechaInicio   YYYY-MM-DD
 * @param {string} p.fechaFin      YYYY-MM-DD
 * @param {{ buffer: Buffer, mimetype: string, originalname: string }} [p.documento]
 * @param {string} [p.explicacion] explicación escrita (fuerza mayor sin certificado)
 */
// Normaliza texto para comparar (minúsculas, sin tildes ni signos).
function normalizar(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Verificaciones DETERMINÍSTICAS (no dependen del modelo): que el certificado
// sea del estudiante y que las fechas coincidan con las de la excusa.
function verificar(extraccion, { estudianteNombre, fechaInicio, fechaFin }) {
  const alertas = [];

  // Nombre del paciente vs estudiante.
  if (extraccion?.nombre_paciente && estudianteNombre) {
    const p = normalizar(extraccion.nombre_paciente);
    const e = normalizar(estudianteNombre);
    const pTokens = new Set(p.split(' ').filter(Boolean));
    const eTokens = e.split(' ').filter(Boolean);
    const comunes = eTokens.filter((t) => pTokens.has(t)).length;
    const coincide = comunes >= 2 || (p && (p.includes(e) || e.includes(p)));
    if (!coincide) {
      alertas.push(`El certificado está a nombre de "${extraccion.nombre_paciente}", que no coincide con el estudiante (${estudianteNombre}).`);
    }
  }

  // Fechas del certificado vs fechas declaradas en la excusa (deben solaparse).
  if (extraccion?.fecha_inicio && extraccion?.fecha_fin) {
    const solapan = extraccion.fecha_inicio <= fechaFin && extraccion.fecha_fin >= fechaInicio;
    if (!solapan) {
      alertas.push(`Las fechas del certificado (${extraccion.fecha_inicio} a ${extraccion.fecha_fin}) no coinciden con las de la excusa (${fechaInicio} a ${fechaFin}).`);
    }
  }
  return alertas;
}

/**
 * Compuertas del AVAL AUTOMÁTICO. No es "la IA decide": es el sistema aplicando
 * criterios determinísticos sobre lo que la IA extrajo. Si CUALQUIERA falla, la
 * excusa va a revisión de la Dirección.
 * @returns {{ procede: boolean, motivo: string }}
 */
function evaluarAutoAval({ extraccion, dentroDePlazo, tieneDocumento, verificaciones }) {
  const falla = (m) => ({ procede: false, motivo: m });

  if (!tieneDocumento) return falla('No hay certificado de un tercero (solo explicación escrita).');
  if (!extraccion) return falla('No hay análisis del documento.');
  if (verificaciones?.length) return falla(verificaciones[0]);
  if (extraccion.legible === false) return falla('El documento no es legible.');
  if (!extraccion.tipo || extraccion.tipo === 'no_clasificado') {
    return falla('La causal no encuadra en las del reglamento.');
  }
  if (!extraccion.entidad_emisora) return falla('El documento no identifica a la entidad que lo expide.');
  if (dentroDePlazo === false) return falla('Se radicó fuera del plazo establecido.');
  if (extraccion.anomalias?.length) return falla(`Anomalía detectada: ${extraccion.anomalias[0]}`);

  const entidad = extraccion.entidad_emisora;
  const periodo = extraccion.fecha_inicio === extraccion.fecha_fin
    ? extraccion.fecha_inicio
    : `${extraccion.fecha_inicio} a ${extraccion.fecha_fin}`;
  return {
    procede: true,
    motivo:
      `Avalada automáticamente: certificado de ${entidad} a nombre del estudiante, ` +
      `causal válida (${extraccion.tipo.replace(/_/g, ' ')}), período ${periodo}, ` +
      `radicada dentro del plazo. Verificaciones de identidad y fechas correctas.`,
  };
}

/** Notifica al estudiante el resultado de su excusa (tiempo real + correo). */
async function notificarEstudiante(excusa, resultado, cobertura) {
  try {
    const estudiante = await Estudiante.findByPk(excusa.estudiante_id, {
      include: [{ model: Usuario, as: 'usuario', attributes: ['id_institucional', 'nombre', 'correo'] }],
    });
    const usuarioId = estudiante?.usuario?.id_institucional;
    if (!usuarioId) return;

    socketService.emitToStudent(usuarioId, 'excusa:resuelta', {
      excusaId: excusa.id,
      estado: resultado,                       // 'avalada' | 'rechazada'
      automatica: excusa.decidido_por === 'ia',
      motivo: excusa.motivo_decision,
      cobertura: cobertura ?? excusa.cobertura ?? null,
      fecha_inicio: excusa.fecha_inicio,
      fecha_fin: excusa.fecha_fin,
    });
  } catch (e) {
    // La notificación nunca debe tumbar el trámite.
    console.error('notificarEstudiante:', e.message);
  }
}

async function radicarExcusa({ estudianteId, estudianteNombre, estudianteIdInst, fechaInicio, fechaFin, documento, explicacion }) {
  // 1. Crear el registro base (estado inicial).
  const excusa = await Excusa.create({
    estudiante_id: estudianteId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    estado: 'radicada',
    documento_nombre: documento?.originalname ?? null,
    documento_mime: documento?.mimetype ?? null,
    explicacion: explicacion || null,
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
  // Se analiza el certificado si lo hay; si no, la explicación escrita.
  const aiInput = buildAiInput(documento, explicacion);
  let analisis = null;
  if (ai.isAvailable() && aiInput) {
    try {
      // 4a. Extracción de datos (estructurada, sin citas). Se le pasa el
      // contexto del estudiante para que la IA también note incoherencias.
      const extraccion = await ai.provider().extractFromDocument({
        document: aiInput,
        schema: prompts.excusaExtractionSchema,
        instruction: prompts.buildExtractionInstruction({
          estudianteNombre, estudianteId: estudianteIdInst, fechaInicio, fechaFin,
        }),
      });

      // Verificaciones determinísticas (no dependen del modelo). Se anteponen a
      // las anomalías para que el director siempre las vea, sea Haiku u Opus.
      const verificaciones = verificar(extraccion, { estudianteNombre, fechaInicio, fechaFin });
      if (verificaciones.length) {
        extraccion.anomalias = [...verificaciones, ...(extraccion.anomalias || [])];
      }

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

      // 4c. ¿Procede el aval automático? Solo si la política lo habilita y TODAS
      // las compuertas determinísticas pasan. Si no, queda para la Dirección.
      const autoHabilitado = politica?.parametros?.auto_aval_ia_habilitado === true;
      const auto = evaluarAutoAval({
        extraccion,
        dentroDePlazo: dentro,
        tieneDocumento: !!documento?.buffer,
        verificaciones,
      });
      analisis.auto_aval = { habilitado: autoHabilitado, ...auto };

      const updates = {
        analisis_ia: analisis,
        estado: 'pendiente_direccion',
        reglamento_version: analisis.reglamento_version,
      };
      if (extraccion?.tipo) updates.tipo = extraccion.tipo;
      await excusa.update(updates);

      if (autoHabilitado && auto.procede) {
        const r = await aplicarAval(excusa, { decididoPor: 'ia', avaladaPor: null, motivo: auto.motivo });
        await excusa.reload();
        await notificarEstudiante(excusa, 'avalada', r.cobertura);
      }
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

/**
 * Excusas del programa que dirige un director.
 * @param {string} directorUsuarioId
 * @param {Object} [filtro] por defecto las pendientes; { estado } para otras
 *   (p. ej. las avaladas automáticamente, para auditoría).
 */
async function listarPendientesPorDirector(directorUsuarioId, filtro = {}) {
  return Excusa.findAll({
    where: { estado: 'pendiente_direccion', ...filtro },
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
 * Aplica el aval: marca justificadas las inasistencias del rango en TODAS las
 * materias del estudiante y guarda la cobertura. Reutilizado por la decisión
 * del director y por el aval automático.
 */
async function aplicarAval(excusa, { decididoPor, avaladaPor, motivo }) {
  const inscripciones = await Inscripcion.findAll({
    where: { estudiante_id: excusa.estudiante_id },
    attributes: ['id'],
  });
  const inscIds = inscripciones.map((i) => i.id);

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
    decidido_por: decididoPor,
    avalada_por: avaladaPor ?? null,
    decidida_en: new Date(),
    motivo_decision: motivo ?? null,
    cobertura,
  });
  return { inasistenciasJustificadas: n, cobertura };
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
    const r = await aplicarAval(excusa, {
      decididoPor: 'director', avaladaPor: directorUsuarioId, motivo,
    });
    await notificarEstudiante(excusa, 'avalada', r.cobertura);
    return { excusa: await excusa.reload(), ...r };
  }

  if (decision === 'rechazar') {
    await excusa.update({
      estado: 'rechazada',
      decidido_por: 'director',
      avalada_por: directorUsuarioId,
      decidida_en: new Date(),
      motivo_decision: motivo ?? null,
    });
    await notificarEstudiante(excusa, 'rechazada');
    return { excusa: await excusa.reload(), inasistenciasJustificadas: 0 };
  }

  throw new Error("Decisión inválida (usa 'avalar' o 'rechazar').");
}

module.exports = { radicarExcusa, listarPendientesPorDirector, decidir, evaluarAutoAval };
