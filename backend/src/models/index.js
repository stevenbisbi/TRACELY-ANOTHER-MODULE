const sequelize    = require('../config/database');
const Usuario      = require('../modules/users/userModel');
const Carrera      = require('../modules/careers/careerModel');
const Semestre     = require('../modules/semesters/semesterModel');
const Estudiante   = require('../modules/students/studentModel');
const Docente      = require('../modules/teachers/teacherModel');
const Pensum       = require('../modules/pensum/pensumModel');
const Asignatura   = require('../modules/subjects/subjectModel');
const Corte        = require('../modules/cortes/corteModel');
const Actividad    = require('../modules/actividades/actividadModel');
const Inscripcion  = require('../modules/inscripciones/inscripcionModel');
const Calificacion = require('../modules/calificaciones/calificacionModel');
const Asistencia   = require('../modules/attendance/attendanceModel');
const Alerta       = require('../modules/alertas/alertaModel');

// Usuario <-> Estudiante / Docente
Usuario.hasOne(Estudiante,  { foreignKey: 'usuario_id', as: 'perfil_estudiante' });
Estudiante.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasOne(Docente,     { foreignKey: 'usuario_id', as: 'perfil_docente' });
Docente.belongsTo(Usuario,  { foreignKey: 'usuario_id', as: 'usuario' });

// Carrera <-> Estudiante
Carrera.hasMany(Estudiante,   { foreignKey: 'carrera_id', as: 'estudiantes' });
Estudiante.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

// Carrera <-> Pensum
Carrera.hasMany(Pensum,   { foreignKey: 'carrera_id', as: 'pensum' });
Pensum.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

// Pensum <-> Asignatura
Pensum.hasMany(Asignatura,    { foreignKey: 'pensum_id', as: 'asignaturas' });
Asignatura.belongsTo(Pensum,  { foreignKey: 'pensum_id', as: 'pensum' });

// Docente <-> Asignatura
Docente.hasMany(Asignatura,   { foreignKey: 'docente_id', as: 'asignaturas' });
Asignatura.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docente' });

// Asignatura <-> Corte
Asignatura.hasMany(Corte,   { foreignKey: 'asignatura_id', as: 'cortes' });
Corte.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Corte <-> Actividad
Corte.hasMany(Actividad,    { foreignKey: 'corte_id', as: 'actividades' });
Actividad.belongsTo(Corte,  { foreignKey: 'corte_id', as: 'corte' });

// Estudiante <-> Asignatura via Inscripcion
Estudiante.hasMany(Inscripcion,  { foreignKey: 'estudiante_id', as: 'inscripciones' });
Inscripcion.belongsTo(Estudiante,{ foreignKey: 'estudiante_id', as: 'estudiante' });
Asignatura.hasMany(Inscripcion,  { foreignKey: 'asignatura_id', as: 'inscripciones' });
Inscripcion.belongsTo(Asignatura,{ foreignKey: 'asignatura_id', as: 'asignatura' });

// Inscripcion <-> Calificacion
Inscripcion.hasMany(Calificacion,  { foreignKey: 'inscripcion_id', as: 'calificaciones' });
Calificacion.belongsTo(Inscripcion,{ foreignKey: 'inscripcion_id', as: 'inscripcion' });
Actividad.hasMany(Calificacion,    { foreignKey: 'actividad_id',   as: 'calificaciones' });
Calificacion.belongsTo(Actividad,  { foreignKey: 'actividad_id',   as: 'actividad' });

// Inscripcion <-> Asistencia
Inscripcion.hasMany(Asistencia,  { foreignKey: 'inscripcion_id', as: 'asistencias' });
Asistencia.belongsTo(Inscripcion,{ foreignKey: 'inscripcion_id', as: 'inscripcion' });

// Inscripcion <-> Alerta
Inscripcion.hasMany(Alerta,  { foreignKey: 'inscripcion_id', as: 'alertas' });
Alerta.belongsTo(Inscripcion,{ foreignKey: 'inscripcion_id', as: 'inscripcion' });

module.exports = {
  sequelize,
  Usuario, Carrera, Semestre,
  Estudiante, Docente,
  Pensum, Asignatura, Corte, Actividad,
  Inscripcion, Calificacion, Asistencia, Alerta,
};
