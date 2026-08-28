// ─────────────────────────────────────────────────────────────────────────────
// Servicio del reglamento: entrega el file_id de la versión vigente, subiéndolo
// a la Files API la primera vez y cacheándolo en la tabla reglamento_version
// para no re-subirlo en cada consulta.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { ReglamentoVersion, PoliticaAcademica } = require('../../models');
const ai = require('../../ai');

/** Devuelve el registro de la versión de reglamento activa (o null). */
async function getVigente() {
  return ReglamentoVersion.findOne({ where: { activo: true } });
}

/**
 * Devuelve el file_id de la versión vigente, subiéndola si aún no se ha subido.
 * Requiere que la IA esté disponible.
 */
async function getFileIdVigente() {
  const reglamento = await getVigente();
  if (!reglamento) throw new Error('No hay una versión de reglamento activa.');

  if (reglamento.file_id) return reglamento.file_id;

  // Primera vez: subir el PDF y guardar el file_id.
  const rutaAbs = path.join(__dirname, '..', '..', '..', reglamento.ruta_archivo);
  const buffer = fs.readFileSync(rutaAbs);
  const fileId = await ai.provider().uploadReferenceDocument({
    buffer,
    mimeType: 'application/pdf',
  });
  await reglamento.update({ file_id: fileId });
  return fileId;
}

/** Devuelve los parámetros de la política académica vigente (o null). */
async function getPoliticaVigente() {
  return PoliticaAcademica.findOne({ where: { activa: true }, order: [['version', 'DESC']] });
}

module.exports = { getVigente, getFileIdVigente, getPoliticaVigente };
