// ─────────────────────────────────────────────────────────────────────────────
// Prueba de humo de la capa de IA. No forma parte del servidor.
// Verifica de punta a punta que:
//   1. el proveedor se instancia y está listo,
//   2. el reglamento se sube correctamente (Files API),
//   3. una consulta normativa devuelve respuesta CON citas del artículo.
//
// Uso:  node src/ai/smokeTest.js
// Requiere ANTHROPIC_API_KEY en el .env.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ai = require('./index');

const REGLAMENTO = path.join(__dirname, '..', '..', 'data', 'reglamento',
  'reglamento-estudiantil-20260717-c418c04f.pdf');

async function main() {
  console.log('1) ¿Proveedor listo? ->', ai.isAvailable() ? '✅ sí' : '❌ no');
  if (!ai.isAvailable()) {
    console.log('   Configura ANTHROPIC_API_KEY en backend/.env y reintenta.');
    process.exit(1);
  }

  const provider = ai.provider();

  console.log('2) Subiendo el reglamento (Files API)...');
  const buffer = fs.readFileSync(REGLAMENTO);
  const fileId = await provider.uploadReferenceDocument({
    buffer,
    mimeType: 'application/pdf',
  });
  console.log('   file_id ->', fileId);

  console.log('3) Consulta normativa con citas...');
  const { text, citations } = await provider.analyzeWithReference({
    referenceDocId: fileId,
    system:
      'Eres un asistente que responde consultas sobre el Reglamento Estudiantil ' +
      'de UNICATÓLICA citando el artículo exacto. Responde en español, breve y preciso.',
    question:
      '¿Cuál es el porcentaje máximo de inasistencia con justificación médica, ' +
      'y en cuántos días hábiles debe presentarse la justificación?',
  });

  console.log('\n── Respuesta ──────────────────────────────');
  console.log(text.trim());
  console.log('\n── Citas (' + citations.length + ') ──────────────────');
  for (const c of citations) {
    const loc = c.start_page_number ? `pág. ${c.start_page_number}` : '';
    console.log(`   • "${(c.cited_text || '').trim().slice(0, 90)}..." ${loc}`);
  }
  console.log('\n✅ Plomería de IA verificada de punta a punta.');
}

main().catch((e) => {
  console.error('\n❌ Falló la prueba de humo:', e.message);
  if (e.retryable) console.error('   (era un error reintentable: red / límite de tasa)');
  process.exit(1);
});
