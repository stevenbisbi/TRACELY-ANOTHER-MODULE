const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// POLITICA_ACADEMICA — los parámetros del reglamento, versionados.
//
// El motor de cálculo (determinístico) lee SIEMPRE de aquí, nunca del PDF ni de
// constantes en el código. Cuando cambia el reglamento, la IA propone una nueva
// versión de estos parámetros; un humano la aprueba; el motor pasa a usarla.
//
// Así el cálculo es determinístico y a la vez adaptable sin tocar código.
// ─────────────────────────────────────────────────────────────────────────────

const PoliticaAcademica = sequelize.define('politica_academica', {
  id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },

  version: { type: DataTypes.INTEGER, allowNull: false, unique: true },

  // Parámetros del Art. 29 y afines. Cada valor guarda su artículo de origen
  // para poder citar la norma en cualquier decisión que dependa de él.
  //   {
  //     inasistencia_max_sin_justificar: 0.20,
  //     inasistencia_max_con_justificar: 0.30,
  //     plazo_radicacion_dias_habiles: 3,
  //     tipos_justificacion: [...],
  //     nota_perdida_por_inasistencia: 0.0,
  //     nota_aprobacion: 3.0,
  //     fuentes: { inasistencia_max_sin_justificar: "Art. 29", ... }
  //   }
  parametros: { type: DataTypes.JSONB, allowNull: false },

  vigente_desde: { type: DataTypes.DATEONLY, allowNull: false },
  activa:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  // Quién la aprobó (admin o dirección) y de qué versión del reglamento salió.
  aprobada_por:       { type: DataTypes.STRING, allowNull: true },
  reglamento_version: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'politica_academica',
});

module.exports = PoliticaAcademica;
