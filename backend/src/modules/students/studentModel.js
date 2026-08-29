const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Estudiante = sequelize.define('estudiante', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  usuario_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    references: { model: 'usuario', key: 'id_institucional' },
  },
  carrera_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'carrera', key: 'id' },
  },
  semestre_actual: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1, max: 12 },
  },
}, {
  tableName: 'estudiante',
});

module.exports = Estudiante;
