const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// Pensum = plan de estudios de una carrera
// Lista qué asignaturas hay en cada semestre del plan
const Pensum = sequelize.define('pensum', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  carrera_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'carrera', key: 'id' },
  },
  nombre_asignatura: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  semestre: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 },
  },
  creditos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
}, {
  tableName: 'pensum',
});

module.exports = Pensum;
