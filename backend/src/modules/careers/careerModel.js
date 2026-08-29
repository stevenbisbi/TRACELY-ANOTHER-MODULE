const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Carrera = sequelize.define('carrera', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  total_creditos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'carrera',
});

module.exports = Carrera;
