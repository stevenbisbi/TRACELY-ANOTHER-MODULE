const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// EXCUSA — justificación de inasistencia (Art. 29 del Reglamento Estudiantil).
//
// El estudiante sube un certificado que cubre un rango de fechas. La IA lo lee
// y lo evalúa contra el reglamento (extracción + análisis, nunca decisión). La
// Dirección del programa avala o rechaza. Si avala, las inasistencias del rango
// se marcan como justificadas y dejan de contar como injustificadas.
// ─────────────────────────────────────────────────────────────────────────────

const Excusa = sequelize.define('excusa', {
  id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },

  inscripcion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'inscripcion', key: 'id' },
  },

  // Una de las 4 causales del parágrafo del Art. 29 (o 'no_clasificado' si la IA
  // no logra encuadrarla en ninguna, para revisión humana).
  tipo: {
    type: DataTypes.ENUM(
      'enfermedad_incapacitante',
      'calamidad_domestica',
      'motivos_laborales',
      'emergencia_desastre',
      'no_clasificado'
    ),
    allowNull: false,
    defaultValue: 'no_clasificado',
  },

  // Rango de fechas que cubre el certificado.
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin:    { type: DataTypes.DATEONLY, allowNull: false },

  // Cuándo la radicó el estudiante y hasta cuándo tenía plazo (3 días hábiles).
  fecha_radicacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_limite:     { type: DataTypes.DATEONLY, allowNull: true },
  dentro_de_plazo:  { type: DataTypes.BOOLEAN, allowNull: true },

  // Máquina de estados del trámite.
  estado: {
    type: DataTypes.ENUM(
      'radicada',            // subida por el estudiante
      'analizada_ia',        // la IA ya la leyó y evaluó
      'pendiente_direccion', // esperando decisión de la Dirección
      'avalada',             // aprobada
      'rechazada',           // negada
      'vencida'              // fuera de plazo, sin decisión
    ),
    allowNull: false,
    defaultValue: 'radicada',
  },

  // Documento subido (se guarda en disco bajo data/excusas/, aquí solo la ref).
  documento_nombre: { type: DataTypes.STRING, allowNull: true },
  documento_ruta:   { type: DataTypes.STRING, allowNull: true },
  documento_mime:   { type: DataTypes.STRING, allowNull: true },

  // Resultado del análisis de la IA: datos extraídos, evaluación normativa y
  // citas del artículo. La IA propone; NO decide. JSON libre para el prototipo.
  analisis_ia: { type: DataTypes.JSONB, allowNull: true },

  // Decisión humana (Dirección del programa).
  avalada_por:     { type: DataTypes.STRING, allowNull: true, references: { model: 'usuario', key: 'id_institucional' } },
  decidida_en:     { type: DataTypes.DATE, allowNull: true },
  motivo_decision: { type: DataTypes.STRING, allowNull: true },

  // Trazabilidad: bajo qué versión del reglamento/política se resolvió.
  reglamento_version: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'excusa',
  indexes: [{ fields: ['inscripcion_id', 'estado'] }],
});

module.exports = Excusa;
