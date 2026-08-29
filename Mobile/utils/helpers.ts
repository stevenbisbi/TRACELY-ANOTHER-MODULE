import { Colors } from '../constants/theme';

export function gradeColor(val: number | null | undefined): string {
  if (val == null) return Colors.text3;
  if (val >= 4.0) return Colors.green;
  if (val >= 3.0) return Colors.orange;
  return Colors.red;
}

export function attColor(val: number | null | undefined): string {
  if (val == null) return Colors.text3;
  if (val >= 80) return Colors.green;
  if (val >= 70) return Colors.orange;
  return Colors.red;
}

export interface Actividad {
  id: string;
  label: string;
  tipo: string;
  value: number | null;
  weight: number | null; // porcentaje_en_corte
}

export interface Corte {
  id: number; // numero_corte (1, 2, 3…)
  uuid: string;
  label: string;
  weight: number; // peso_porcentual del corte
  actividades: Actividad[];
  notaCorte?: number | null;  // calculado por el backend (gradeMath.js)
  completo?: boolean;
}

// Promedio del corte ponderado por porcentaje_en_corte; si las actividades
// calificadas no tienen peso, promedio simple.
export function corteAvg(actividades: Actividad[]): number | null {
  const graded = actividades.filter((a) => a.value != null);
  if (!graded.length) return null;
  const totalWeight = graded.reduce((s, a) => s + (a.weight ?? 0), 0);
  if (totalWeight > 0) {
    return graded.reduce((s, a) => s + (a.value ?? 0) * (a.weight ?? 0), 0) / totalWeight;
  }
  return graded.reduce((s, a) => s + (a.value ?? 0), 0) / graded.length;
}

export function courseOverall(cortes: Corte[]): number | null {
  let total = 0, totalWeight = 0;
  for (const ct of cortes) {
    const avg = corteAvg(ct.actividades);
    if (avg != null) { total += avg * ct.weight; totalWeight += ct.weight; }
  }
  return totalWeight === 0 ? null : total / totalWeight;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export function riskLevel(gpa: number | null, attendanceRate: number | null): RiskLevel {
  if (gpa != null && gpa < 3.0) return 'high';
  if (attendanceRate != null && attendanceRate < 70) return 'high';
  if (gpa != null && gpa < 3.5) return 'medium';
  if (attendanceRate != null && attendanceRate < 80) return 'medium';
  return 'low';
}

export type StudentStatus = 'active' | 'warning' | 'risk' | 'critical';

export function attendanceStatus(pct: number): StudentStatus {
  if (pct >= 85) return 'active';
  if (pct >= 70) return 'warning';
  if (pct >= 50) return 'risk';
  return 'critical';
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function monthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return MONTHS_ES[d.getMonth()];
}

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Fecha local (no UTC): con toISOString() en Colombia (UTC-5) después de las
// 7pm la asistencia quedaba registrada con la fecha del día siguiente.
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
