const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Usuario = sequelize.define('usuario', {
  id_institucional: {
    type: DataTypes.STRING,
    primaryKey: true,  // ej: "2021-0342" o "DOC-0112"
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  correo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  contrasena_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM('estudiante', 'docente', 'admin'),
    allowNull: false,
    defaultValue: 'estudiante',
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_token_expira: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'usuario',
  defaultScope: {
    attributes: { exclude: ['contrasena_hash', 'reset_token', 'reset_token_expira'] },
  },
  scopes: {
    withPassword: { attributes: {} },
  },
});

module.exports = Usuario;
