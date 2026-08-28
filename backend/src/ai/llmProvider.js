// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO del proveedor de LLM (la "interfaz").
//
// Cualquier proveedor —Anthropic hoy, otro mañana— debe extender esta clase e
// implementar sus métodos. El código de negocio (excusas, reglamento) programa
// CONTRA esta interfaz, nunca contra un SDK concreto. Así, cambiar de proveedor
// es cambiar una sola línea de configuración (AI_PROVIDER).
// ─────────────────────────────────────────────────────────────────────────────

/** Error propio de la capa de IA, para distinguirlo de errores de negocio. */
class AIError extends Error {
  constructor(message, { cause, retryable = false } = {}) {
    super(message);
    this.name = 'AIError';
    this.cause = cause;
    this.retryable = retryable; // true = tiene sentido reintentar (429, 5xx, red)
  }
}

/**
 * @typedef {Object} DocumentInput
 * @property {Buffer} buffer   - contenido binario del documento (PDF o imagen)
 * @property {string} mimeType - 'application/pdf' | 'image/png' | 'image/jpeg' ...
 */

class LLMProvider {
  /**
   * Extrae datos estructurados de un documento (p. ej. una incapacidad), validados
   * contra un esquema Zod. NO usa citas: es extracción pura de datos.
   * @param {Object} p
   * @param {DocumentInput} p.document - el documento a leer
   * @param {import('zod').ZodType} p.schema - esquema Zod del resultado esperado
   * @param {string} p.instruction - qué extraer, en lenguaje natural
   * @returns {Promise<Object>} objeto validado contra el esquema
   */
  async extractFromDocument() {
    throw new AIError('extractFromDocument no implementado por el proveedor');
  }

  /**
   * Analiza texto/datos apoyándose en un documento de referencia (el reglamento),
   * devolviendo la respuesta CON citas del artículo correspondiente.
   * @param {Object} p
   * @param {string} p.referenceDocId - file_id del documento de referencia ya subido
   * @param {string} p.system - rol e instrucciones estables (se cachean)
   * @param {string} p.question - la consulta concreta (parte variable)
   * @returns {Promise<{ text: string, citations: Array }>}
   */
  async analyzeWithReference() {
    throw new AIError('analyzeWithReference no implementado por el proveedor');
  }

  /**
   * Sube un documento de referencia una sola vez y devuelve su identificador,
   * para reutilizarlo (cacheado) en llamadas posteriores sin reenviarlo.
   * @param {DocumentInput} document
   * @returns {Promise<string>} identificador del documento (file_id)
   */
  async uploadReferenceDocument() {
    throw new AIError('uploadReferenceDocument no implementado por el proveedor');
  }

  /** Indica si el proveedor está configurado y listo para operar. */
  isReady() {
    return false;
  }
}

module.exports = { LLMProvider, AIError };
