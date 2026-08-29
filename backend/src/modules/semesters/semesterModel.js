const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Semestre = sequelize.define('semestre', {
  id:           { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
  codigo:       { type: DataTypes.STRING(10), allowNull: false, unique: true },
  nombre:       { type: DataTypes.STRING, allowNull: false },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin:    { type: DataTypes.DATEONLY, allowNull: false },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'semestre' });

module.exports = Semestre;
