// ─────────────────────────────────────────────────────────────────────────────
// Configuración central de la capa de IA.
// Todo lo que dependa del proveedor o del modelo se concentra aquí, para que el
// resto del código de negocio no conozca estos detalles.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Proveedor de LLM activo. El factory (ai/index.js) lo usa para elegir la
  // implementación. Hoy solo 'anthropic'; mañana podría ser 'openai', 'local', etc.
  provider: process.env.AI_PROVIDER || 'anthropic',

  // Si es false, la capa de IA queda desactivada y los servicios que la usan
  // deben degradar con elegancia (el prototipo sigue funcionando sin IA).
  enabled: process.env.AI_ENABLED !== 'false',

  anthropic: {
    // La API key vive SOLO aquí (vía entorno). Ningún otro archivo la lee.
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    // Requerido solo si la key está vinculada a identidad (identity-linked):
    // en ese caso la API exige el id del workspace en cada petición.
    // Se encuentra en console.anthropic.com -> Settings -> Workspaces (wrkspc_...).
    workspaceId: process.env.ANTHROPIC_WORKSPACE_ID || '',
    // Modelo por defecto para tareas de análisis. Configurable por si se quiere
    // bajar a uno más económico en pruebas.
    model: process.env.AI_MODEL || 'claude-opus-5',
    // Betas necesarias para la Files API (subir el reglamento una sola vez).
    filesBeta: 'files-api-2025-04-14',
    maxTokens: 8000,
  },
};
