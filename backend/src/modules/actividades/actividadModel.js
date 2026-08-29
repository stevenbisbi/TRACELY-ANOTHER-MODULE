const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

const Actividad = sequelize.define('actividad', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  corte_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'corte', key: 'id' },
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,  // ej: "Parcial C1", "Taller ER"
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,  // parcial | quiz | taller | proyecto | examen | laboratorio
    defaultValue: 'taller',
  },
  porcentaje_en_corte: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100,
    validate: { min: 0, max: 100 },
  },
}, {
  tableName: 'actividad',
});

module.exports = Actividad;
