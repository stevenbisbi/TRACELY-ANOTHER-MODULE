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
  // Director del programa: usuario con rol 'director_programa' que avala las
  // excusas de los estudiantes de esta carrera (Art. 29). Nullable en prototipo.
  director_usuario_id: {
    type: DataTypes.STRING,
    allowNull: true,
    references: { model: 'usuario', key: 'id_institucional' },
  },
}, {
  tableName: 'carrera',
});

module.exports = Carrera;
