const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Alerta = sequelize.define('alerta', {
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
  tipo: {
    type: DataTypes.ENUM('advertencia', 'critica'),
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('activa', 'resuelta'),
    allowNull: false,
    defaultValue: 'activa',
  },
  nota_minima_requerida: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  es_recuperable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'alerta',
});

module.exports = Alerta;
