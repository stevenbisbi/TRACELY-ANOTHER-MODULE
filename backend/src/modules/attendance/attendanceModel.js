const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// Asistencia ligada a la inscripcion del estudiante en la asignatura
const Asistencia = sequelize.define('asistencia', {
  id:             { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
  inscripcion_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'inscripcion', key: 'id' } },
  fecha:          { type: DataTypes.DATEONLY, allowNull: false },
  presente:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  registrado_por: { type: DataTypes.STRING, allowNull: true },  // id_institucional del docente
  observacion:    { type: DataTypes.STRING, allowNull: true },
  // Cuántas horas vale esta sesión (para el cálculo por % de horas del Art. 29).
  horas:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  // Una inasistencia justificada NO cuenta como injustificada. Se marca true
  // solo cuando la Dirección avala la excusa que la cubre.
  justificada:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  excusa_id:      { type: DataTypes.UUID, allowNull: true, references: { model: 'excusa', key: 'id' } },
}, {
  tableName: 'asistencia',
  indexes: [{ unique: true, fields: ['inscripcion_id', 'fecha'] }],
});

module.exports = Asistencia;
