const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Inscripcion = sequelize.define('inscripcion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  estudiante_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'estudiante', key: 'id' },
  },
  asignatura_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'asignatura', key: 'id' },
  },
  estado: {
    type: DataTypes.ENUM('activa', 'finalizada'),
    allowNull: false,
    defaultValue: 'activa',
  },
  nota_definitiva: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 5 },
  },
  aprobada: {
    type: DataTypes.BOOLEAN,
    allowNull: true,  // null = en curso, true/false = finalizada
  },
}, {
  tableName: 'inscripcion',
  indexes: [
    { unique: true, fields: ['estudiante_id', 'asignatura_id'] },
  ],
});

module.exports = Inscripcion;
