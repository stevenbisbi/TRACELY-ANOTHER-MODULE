// Tipos compartidos del API (esquema UUID). Sequelize serializa los DECIMAL
// como string, por eso los campos numéricos aceptan ambos: usar toNum().

export function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export interface ApiActividad {
  id: string;
  corte_id: string;
  nombre: string;
  tipo: string;
  porcentaje_en_corte: number | string | null;
}

export interface ApiCorte {
  id: string;
  numero_corte: number;
  peso_porcentual: number | string | null;
  actividades?: ApiActividad[];
  // Calculados por el backend (gradeMath.js) cuando el corte viene de
  // /calificaciones/estudiante — no siempre presentes (ej. en /teachers/dashboard).
  nota_corte?: number | string | null;
  corte_completo?: boolean;
}

export interface ApiAsignatura {
  id: string;
  nombre: string;
  NRC: string;
  semestre_academico: string;
  pensum?: { nombre_asignatura: string; creditos: number } | null;
  docente?: { id: string; usuario?: { nombre: string } | null } | null;
  cortes?: ApiCorte[];
}

export interface ApiCalificacion {
  id: string;
  actividad_id: string;
  nota: number | string | null;
  actividad?: (ApiActividad & { corte?: ApiCorte | null }) | null;
}

export interface ApiAsistencia {
  id: string;
  fecha: string;
  presente: boolean;
}
