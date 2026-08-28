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
    // director_programa y decano se agregan para el flujo de excusas (Art. 29):
    // la Dirección del programa es quien avala las inasistencias justificadas.
    type: DataTypes.ENUM('estudiante', 'docente', 'admin', 'director_programa', 'decano'),
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
