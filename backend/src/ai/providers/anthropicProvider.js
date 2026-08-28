// ─────────────────────────────────────────────────────────────────────────────
// Implementación del contrato LLMProvider usando el SDK de Anthropic.
//
// ⚠️ Este es el ÚNICO archivo del proyecto que importa '@anthropic-ai/sdk'.
// Si algún día se cambia de proveedor, solo se toca este archivo. El resto del
// backend depende de la interfaz (llmProvider.js), no del SDK.
// ─────────────────────────────────────────────────────────────────────────────

const Anthropic = require('@anthropic-ai/sdk');
const { toFile } = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { LLMProvider, AIError } = require('../llmProvider');
const config = require('../config');

class AnthropicProvider extends LLMProvider {
  constructor() {
    super();
    this.cfg = config.anthropic;
    // El cliente se crea de forma perezosa: sin API key no se instancia,
    // así el backend arranca igual aunque la IA no esté configurada.
    // Si la key es identity-linked, la API exige el workspace id en cada petición.
    this.client = this.cfg.apiKey
      ? new Anthropic({
          apiKey: this.cfg.apiKey,
          ...(this.cfg.workspaceId
            ? { defaultHeaders: { 'anthropic-workspace-id': this.cfg.workspaceId } }
            : {}),
        })
      : null;
  }

  isReady() {
    return this.client !== null;
  }

  _requireClient() {
    if (!this.client) {
      throw new AIError(
        'La IA no está configurada: falta ANTHROPIC_API_KEY en el entorno.',
        { retryable: false }
      );
    }
  }

  // Traduce errores del SDK a nuestro AIError, marcando cuáles vale la pena reintentar.
  _wrap(err) {
    const status = err?.status;
    const retryable = status === 429 || (status >= 500 && status < 600) ||
      err instanceof Anthropic.APIConnectionError;
    return new AIError(
      `Error del proveedor de IA${status ? ` (HTTP ${status})` : ''}: ${err?.message ?? err}`,
      { cause: err, retryable }
    );
  }

  async uploadReferenceDocument({ buffer, mimeType }) {
    this._requireClient();
    try {
      const uploaded = await this.client.beta.files.upload({
        file: await toFile(buffer, undefined, { type: mimeType }),
        betas: [this.cfg.filesBeta],
      });
      return uploaded.id;
    } catch (err) {
      throw this._wrap(err);
    }
  }

  async extractFromDocument({ document, schema, instruction }) {
    this._requireClient();
    try {
      const isPdf = document.mimeType === 'application/pdf';
      const docBlock = isPdf
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: document.buffer.toString('base64'),
            },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: document.mimeType,
              data: document.buffer.toString('base64'),
            },
          };

      // messages.parse valida la respuesta contra el esquema Zod automáticamente.
      // (No se usan citas aquí: extracción de datos, no interpretación normativa.)
      const response = await this.client.messages.parse({
        model: this.cfg.model,
        max_tokens: this.cfg.maxTokens,
        messages: [
          { role: 'user', content: [docBlock, { type: 'text', text: instruction }] },
        ],
        output_config: { format: zodOutputFormat(schema) },
      });

      if (!response.parsed_output) {
        throw new AIError('El documento no pudo interpretarse en el formato esperado.');
      }
      return response.parsed_output;
    } catch (err) {
      if (err instanceof AIError) throw err;
      throw this._wrap(err);
    }
  }

  async analyzeWithReference({ referenceDocId, system, question }) {
    this._requireClient();
    try {
      const response = await this.client.beta.messages.create({
        model: this.cfg.model,
        max_tokens: this.cfg.maxTokens,
        // El system es estable y se cachea; el reglamento va como primer bloque
        // del mensaje (también estable) para aprovechar el prompt caching.
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'file', file_id: referenceDocId },
                title: 'Reglamento Estudiantil',
                citations: { enabled: true },
                cache_control: { type: 'ephemeral' }, // corte de caché tras el reglamento
              },
              { type: 'text', text: question },
            ],
          },
        ],
        betas: [this.cfg.filesBeta],
      });

      // La respuesta se parte en bloques; los citados traen su array de citas.
      let text = '';
      const citations = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          text += block.text;
          if (Array.isArray(block.citations)) citations.push(...block.citations);
        }
      }
      return { text, citations };
    } catch (err) {
      throw this._wrap(err);
    }
  }
}

module.exports = AnthropicProvider;
