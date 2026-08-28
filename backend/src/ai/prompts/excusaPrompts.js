// ─────────────────────────────────────────────────────────────────────────────
// Prompts y esquema para el análisis de excusas de inasistencia.
// Se mantienen separados del código de negocio para poder versionarlos y ajustar
// el texto sin tocar la lógica del servicio.
// ─────────────────────────────────────────────────────────────────────────────

const { z } = require('zod');

// Esquema de lo que la IA debe EXTRAER del certificado (datos, no decisión).
const excusaExtractionSchema = z.object({
  tipo: z
    .enum([
      'enfermedad_incapacitante',
      'calamidad_domestica',
      'motivos_laborales',
      'emergencia_desastre',
      'no_clasificado',
    ])
    .describe('Causal del Art. 29 que mejor encuadra el documento; no_clasificado si ninguna aplica'),
  fecha_inicio: z
    .string()
    .nullable()
    .describe('Fecha de inicio del período que cubre el certificado, formato YYYY-MM-DD; null si no se indica'),
  fecha_fin: z
    .string()
    .nullable()
    .describe('Fecha de fin del período cubierto, YYYY-MM-DD; igual a inicio si es un solo día; null si no se indica'),
  entidad_emisora: z
    .string()
    .nullable()
    .describe('Entidad o persona que emite el certificado (EPS, IPS, empresa, autoridad); null si no aparece'),
  numero_documento: z
    .string()
    .nullable()
    .describe('Número de radicado, folio o identificación del documento; null si no tiene'),
  dias_cubiertos: z
    .number()
    .int()
    .nullable()
    .describe('Cantidad de días que cubre el certificado si se declara explícitamente; null si no'),
  legible: z
    .boolean()
    .describe('true si el documento se pudo leer con claridad; false si está ilegible, incompleto o no es un certificado'),
  resumen: z
    .string()
    .describe('Resumen de una frase, en español, de qué es el documento y qué certifica'),
  anomalias: z
    .array(z.string())
    .describe('Señales de alerta para revisión humana: fechas inconsistentes, entidad dudosa, posible edición, etc. Vacío si no hay'),
});

const EXTRACTION_INSTRUCTION =
  'Este documento es un certificado que un estudiante presenta para justificar una ' +
  'inasistencia (una incapacidad médica, constancia de calamidad, certificación laboral ' +
  'o de emergencia). Extrae los datos solicitados con precisión. No inventes datos: si ' +
  'algo no aparece en el documento, usa null. No decidas si la excusa es válida — solo ' +
  'extrae la información. Señala en "anomalias" cualquier cosa que un humano debería revisar.';

// System para la evaluación normativa (usa el reglamento con citas).
const EVALUATION_SYSTEM =
  'Eres un asistente que apoya a la Dirección de programa de UNICATÓLICA a evaluar ' +
  'excusas de inasistencia según el Reglamento Estudiantil. Respondes en español, breve ' +
  'y preciso, citando SIEMPRE el artículo aplicable. Tu papel es informar la decisión, ' +
  'NO tomarla: no apruebas ni rechazas, solo expones qué dice la norma y si los datos de ' +
  'la excusa cumplen los requisitos formales (causal válida, plazo, soporte).';

/** Arma la pregunta de evaluación normativa a partir de los datos extraídos. */
function buildEvaluationQuestion(datosExtraidos, contexto) {
  return (
    'Evalúa esta excusa contra el Reglamento Estudiantil y responde citando el artículo:\n\n' +
    `Datos extraídos del certificado:\n${JSON.stringify(datosExtraidos, null, 2)}\n\n` +
    `Contexto de la inasistencia:\n${JSON.stringify(contexto, null, 2)}\n\n` +
    'Indica: (1) si la causal corresponde a una de las justificaciones válidas del ' +
    'reglamento, (2) si se presentó dentro del plazo permitido, (3) qué requisitos de ' +
    'soporte exige la norma, y (4) cualquier observación relevante para quien decide. ' +
    'No concluyas aprobando o rechazando; esa decisión es de la Dirección.'
  );
}

module.exports = {
  excusaExtractionSchema,
  EXTRACTION_INSTRUCTION,
  EVALUATION_SYSTEM,
  buildEvaluationQuestion,
};
