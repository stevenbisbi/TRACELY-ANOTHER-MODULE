// ─────────────────────────────────────────────────────────────────────────────
// Interpretación de una nueva versión del reglamento.
//   interpretar()  -> la IA propone cambios de parámetros + análisis de impacto
//   aplicar()      -> un humano aprueba: se crea una nueva POLITICA_ACADEMICA
//
// La IA propone; el humano aprueba; el motor determinístico ejecuta con la nueva
// política. Los cálculos de notas/asistencia nunca dependen del PDF interpretado.
// ─────────────────────────────────────────────────────────────────────────────

const { Op } = require('sequelize');
const {
  PoliticaAcademica, Inscripcion, Asignatura, Asistencia,
} = require('../../models');
const ai = require('../../ai');
const reglamentoService = require('./reglamentoService');
const { reglamentoInterpretSchema, buildInterpretInstruction } = require('../../ai/prompts/reglamentoPrompts');
const { calcularInasistencia } = require('../../utils/asistenciaMath');

/**
 * La IA lee el reglamento nuevo y propone cambios contra la política vigente.
 * NO persiste nada: devuelve la propuesta + el impacto estimado para revisión.
 * @param {{ buffer: Buffer, mimeType: string }} documentoNuevo
 */
async function interpretar(documentoNuevo) {
  if (!ai.isAvailable()) throw new Error('La IA no está disponible.');

  const politicaVigente = await reglamentoService.getPoliticaVigente();
  const parametrosVigentes = politicaVigente?.parametros ?? {};

  // La IA extrae los cambios de forma estructurada (comparando contra lo vigente).
  const propuesta = await ai.provider().extractFromDocument({
    document: documentoNuevo,
    schema: reglamentoInterpretSchema,
    instruction: buildInterpretInstruction(parametrosVigentes),
  });

  // Construir los parámetros propuestos aplicando solo los cambios paramétricos
  // con confianza alta/media (los estructurales NO se auto-aplican).
  const parametrosPropuestos = { ...parametrosVigentes };
  for (const c of propuesta.cambios) {
    if (c.tipo_cambio === 'parametrico' && c.valor_nuevo != null && c.confianza !== 'baja') {
      // La IA suele devolver "0.15 (15%)" o "5 días hábiles"; se extrae el número
      // inicial. Solo se aplica si el parámetro vigente también era numérico.
      const num = parseFloat(String(c.valor_nuevo));
      const vigenteEsNumero = typeof parametrosVigentes[c.parametro] === 'number';
      parametrosPropuestos[c.parametro] =
        Number.isFinite(num) && vigenteEsNumero ? num : c.valor_nuevo;
    }
  }

  // Impacto: cuántos estudiantes cambiarían de estado con los nuevos parámetros.
  const impacto = await estimarImpacto(parametrosVigentes, parametrosPropuestos);

  return { propuesta, parametrosVigentes, parametrosPropuestos, impacto };
}

/**
 * Compara el estado de inasistencia de cada inscripción bajo los parámetros
 * vigentes vs los propuestos, y cuenta cuántos pasan a perder o a riesgo.
 */
async function estimarImpacto(paramVigentes, paramPropuestos) {
  const inscripciones = await Inscripcion.findAll({
    include: [
      { model: Asignatura, as: 'asignatura', attributes: ['nombre', 'horas_programadas'] },
      { model: Asistencia, as: 'asistencias', attributes: ['horas', 'presente', 'justificada'] },
    ],
  });

  let nuevosPerdidos = 0;
  let nuevosEnRiesgo = 0;
  const detalle = [];

  for (const insc of inscripciones) {
    const asistencias = insc.asistencias ?? [];
    if (asistencias.length === 0) continue;
    const horas = insc.asignatura?.horas_programadas ?? null;

    const antes = calcularInasistencia({ asistencias, horasProgramadas: horas, politica: paramVigentes });
    const despues = calcularInasistencia({ asistencias, horasProgramadas: horas, politica: paramPropuestos });

    if (!antes.perdida && despues.perdida) {
      nuevosPerdidos++;
      detalle.push({ asignatura: insc.asignatura?.nombre, cambio: 'pasa a PERDER', pct: despues.pctInjustificado });
    } else if (antes.nivel !== 'perdida' && despues.nivel === 'riesgo' && antes.nivel !== 'riesgo') {
      nuevosEnRiesgo++;
    }
  }

  return {
    inscripciones_evaluadas: inscripciones.length,
    nuevos_perdidos: nuevosPerdidos,
    nuevos_en_riesgo: nuevosEnRiesgo,
    detalle,
  };
}

/**
 * Aplica una política nueva aprobada por un humano: crea una versión nueva de
 * POLITICA_ACADEMICA, la activa y desactiva las anteriores.
 * @param {Object} p
 * @param {Object} p.parametros    parámetros aprobados (ya revisados por el humano)
 * @param {string} p.aprobadaPor   id_institucional de quien aprueba
 * @param {string} [p.reglamentoVersion]
 * @param {string} [p.vigenteDesde] YYYY-MM-DD (default: hoy)
 */
async function aplicar({ parametros, aprobadaPor, reglamentoVersion, vigenteDesde }) {
  const ultima = await PoliticaAcademica.findOne({ order: [['version', 'DESC']] });
  const nuevaVersion = (ultima?.version ?? 0) + 1;

  await PoliticaAcademica.update({ activa: false }, { where: { activa: true } });

  const politica = await PoliticaAcademica.create({
    version: nuevaVersion,
    parametros,
    activa: true,
    vigente_desde: vigenteDesde ?? new Date().toISOString().slice(0, 10),
    aprobada_por: aprobadaPor,
    reglamento_version: reglamentoVersion ?? null,
  });

  return politica;
}

module.exports = { interpretar, estimarImpacto, aplicar };
