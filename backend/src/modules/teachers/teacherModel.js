const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Docente = sequelize.define('docente', {
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
}, {
  tableName: 'docente',
});

module.exports = Docente;
