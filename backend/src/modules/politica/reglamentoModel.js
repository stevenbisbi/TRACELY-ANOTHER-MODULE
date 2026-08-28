const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// REGLAMENTO_VERSION — cada versión del Reglamento Estudiantil (el PDF).
//
// Guarda el file_id que devuelve la Files API de Anthropic tras subirlo, para
// no re-subir el PDF en cada consulta (se reutiliza cacheado). Cuando entra una
// versión nueva, la IA la compara contra la vigente y propone cambios de política.
// ─────────────────────────────────────────────────────────────────────────────

const ReglamentoVersion = sequelize.define('reglamento_version', {
  id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },

  version:        { type: DataTypes.STRING, allowNull: false, unique: true },
  nombre_archivo: { type: DataTypes.STRING, allowNull: false },
  ruta_archivo:   { type: DataTypes.STRING, allowNull: true },   // ruta local del PDF

  // Identificador del documento en el proveedor de IA (Files API). Nullable
  // hasta que se suba; la capa de IA lo rellena la primera vez que se usa.
  file_id: { type: DataTypes.STRING, allowNull: true },

  fecha_publicacion: { type: DataTypes.DATEONLY, allowNull: true },
  vigente_desde:     { type: DataTypes.DATEONLY, allowNull: true },
  activo:            { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'reglamento_version',
});

module.exports = ReglamentoVersion;
