const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Calificacion = sequelize.define('calificacion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  inscripcion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'inscripcion', key: 'id' },
  },
  actividad_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'actividad', key: 'id' },
  },
  nota: {
    type: DataTypes.FLOAT,
    allowNull: true,  // null = pendiente
    validate: { min: 0, max: 5 },
  },
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'calificacion',
  indexes: [
    { unique: true, fields: ['inscripcion_id', 'actividad_id'] },
  ],
});

module.exports = Calificacion;
