const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Corte = sequelize.define('corte', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  asignatura_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'asignatura', key: 'id' },
  },
  numero_corte: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 3 },  // 1, 2 o 3
  },
  peso_porcentual: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 33.33,  // 30, 30, 40 típicamente
    validate: { min: 0, max: 100 },
  },
}, {
  tableName: 'corte',
  indexes: [
    { unique: true, fields: ['asignatura_id', 'numero_corte'] },
  ],
});

module.exports = Corte;
