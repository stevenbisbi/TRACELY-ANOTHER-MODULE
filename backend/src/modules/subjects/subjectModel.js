const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// Asignatura = instancia real de una materia en un semestre académico
// dictada por un docente específico (ej: "BD II G1 - 2025-1")
const Asignatura = sequelize.define('asignatura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  docente_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'docente', key: 'id' },
  },
  pensum_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'pensum', key: 'id' },
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  NRC: {
    type: DataTypes.STRING,  // código único de grupo, ej: "IS401-G1"
    allowNull: false,
    unique: true,
  },
  semestre_academico: {
    type: DataTypes.STRING,  // ej: "2025-1"
    allowNull: false,
  },
  umbral_advertencia: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 3.0,
  },
  // Total de horas programadas de la asignatura en el semestre. Base para el
  // cálculo de inasistencia por porcentaje (Art. 29). Nullable: si no está
  // definido, el motor cae a conteo de sesiones en vez de porcentaje de horas.
  horas_programadas: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'asignatura',
});

module.exports = Asignatura;
