// ─────────────────────────────────────────────────────────────────────────────
// Punto de entrada de la capa de IA.
//
// El resto del backend importa SOLO desde aquí:
//     const ai = require('../../ai');
//     const datos = await ai.provider().extractFromDocument({ ... });
//
// Nadie más conoce qué proveedor hay detrás. Cambiar de proveedor = cambiar la
// variable AI_PROVIDER y agregar un caso en el switch de abajo.
// ─────────────────────────────────────────────────────────────────────────────

const config = require('./config');
const { AIError } = require('./llmProvider');

let _instance = null;

function buildProvider() {
  if (!config.enabled) {
    return null; // IA desactivada por configuración
  }
  switch (config.provider) {
    case 'anthropic': {
      const AnthropicProvider = require('./providers/anthropicProvider');
      return new AnthropicProvider();
    }
    // case 'openai': return new OpenAIProvider();   ← futuro
    // case 'local':  return new LocalProvider();    ← futuro
    default:
      throw new AIError(`Proveedor de IA desconocido: '${config.provider}'`);
  }
}

/** Devuelve el proveedor activo (singleton). null si la IA está desactivada. */
function provider() {
  if (_instance === null) _instance = buildProvider();
  return _instance;
}

/** ¿Hay un proveedor configurado y listo para operar? */
function isAvailable() {
  const p = provider();
  return p !== null && p.isReady();
}

module.exports = { provider, isAvailable, config, AIError };
