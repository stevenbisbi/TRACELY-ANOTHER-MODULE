// ─────────────────────────────────────────────────────────────────────────────
// Prompts y esquema para la INTERPRETACIÓN de una nueva versión del reglamento.
//
// La IA compara el reglamento nuevo contra los parámetros vigentes y PROPONE
// cambios. No los aplica: clasifica cada uno (paramétrico vs estructural), cita
// el artículo y estima su confianza. Un humano decide si se adoptan.
// ─────────────────────────────────────────────────────────────────────────────

const { z } = require('zod');

const cambioSchema = z.object({
  parametro: z.string().describe('Nombre del parámetro de política, ej: inasistencia_max_sin_justificar'),
  valor_actual: z.string().describe('Valor vigente que se le entregó en el contexto'),
  valor_nuevo: z.string().nullable().describe('Valor que establece el reglamento nuevo; null si no lo trata'),
  tipo_cambio: z
    .enum(['sin_cambio', 'parametrico', 'estructural'])
    .describe('sin_cambio: igual. parametrico: solo cambia un valor (aplicable automático). estructural: exige nueva lógica/desarrollo'),
  articulo: z.string().nullable().describe('Artículo del reglamento nuevo que lo sustenta, ej: "Art. 29"'),
  descripcion: z.string().describe('Explicación breve en español del cambio'),
  confianza: z.enum(['alta', 'media', 'baja']).describe('Qué tan seguro está de esta lectura'),
});

const reglamentoInterpretSchema = z.object({
  cambios: z.array(cambioSchema).describe('Un item por cada parámetro vigente evaluado'),
  cambios_estructurales_detectados: z
    .array(z.string())
    .describe('Cambios del reglamento que NO son simples valores y requieren desarrollo (nuevas reglas, instancias, etc.). Vacío si no hay'),
  resumen: z.string().describe('Resumen ejecutivo de 1-2 frases de lo que cambia'),
});

/** Instrucción para interpretar el reglamento nuevo contra los parámetros vigentes. */
function buildInterpretInstruction(parametrosVigentes) {
  return (
    'Este documento es una NUEVA versión del Reglamento Estudiantil. Compáralo contra ' +
    'los parámetros de política actualmente vigentes en el sistema y determina, para cada ' +
    'uno, qué establece el reglamento nuevo.\n\n' +
    `Parámetros vigentes en el sistema:\n${JSON.stringify(parametrosVigentes, null, 2)}\n\n` +
    'Para cada parámetro indica: el valor que trae el reglamento nuevo (o null si no lo ' +
    'trata), si es sin_cambio / paramétrico / estructural, el artículo que lo sustenta y tu ' +
    'confianza. Marca como "estructural" cualquier disposición nueva que no se reduzca a ' +
    'cambiar un número (por ejemplo, contar la asistencia virtual distinto, crear una ' +
    'segunda instancia de apelación, etc.) y descríbela en cambios_estructurales_detectados. ' +
    'No inventes: si el reglamento no menciona un parámetro, deja valor_nuevo en null y ' +
    'tipo_cambio en sin_cambio. Solo interpretas y propones; no apliques nada.'
  );
}

module.exports = { reglamentoInterpretSchema, buildInterpretInstruction };
