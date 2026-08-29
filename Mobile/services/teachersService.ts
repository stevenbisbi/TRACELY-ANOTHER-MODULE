import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiFetch, API_URL, getToken } from './client';
import type { ApiAsignatura, ApiAsistencia, ApiCorte } from './apiTypes';

export interface TeacherProfile {
  id: string; // UUID del perfil docente (para /teachers/:id/dashboard)
  usuario_id: string;
  usuario?: { nombre: string; correo: string; id_institucional: string } | null;
}

export interface DashboardStudent {
  id: string; // estudiante UUID
  name: string;
  id_inst: string;
  inscripcion_id: string;
  presenteHoy: boolean | null;
}

export interface DashboardCourse {
  id: string; // asignatura UUID
  name: string;
  code: string;
  enrolled: number;
  cortes: ApiCorte[];
  students: DashboardStudent[];
  umbral_advertencia?: number | string | null;
}

export interface TeacherDashboard {
  courses: DashboardCourse[];
  asistenciaHoy: { presentes: number; total: number };
}

// Inscripción con historial de asistencia (para % y faltas por estudiante)
export interface AsignaturaInscripcion {
  id: string;
  estudiante?: { id: string; usuario?: { nombre: string; id_institucional: string } | null } | null;
  asistencias?: ApiAsistencia[];
}

export async function getMyProfile(): Promise<TeacherProfile> {
  return apiFetch<TeacherProfile>('/teachers/me');
}

export async function getDashboard(docenteId: string, semestre?: string): Promise<TeacherDashboard> {
  const suffix = semestre ? `?semestre=${encodeURIComponent(semestre)}` : '';
  return apiFetch<TeacherDashboard>(`/teachers/${docenteId}/dashboard${suffix}`);
}

export async function getMySubjects(docenteId: string): Promise<ApiAsignatura[]> {
  return apiFetch<ApiAsignatura[]>(`/subjects/teacher/${docenteId}`);
}

export async function getAsignaturaAttendance(asignaturaId: string): Promise<AsignaturaInscripcion[]> {
  return apiFetch<AsignaturaInscripcion[]>(`/attendance/asignatura/${asignaturaId}`);
}

// Configuración del curso (mismo par de llamadas que hace CourseSettingsModal
// en la web): pesos de los 3 cortes y umbral de advertencia.
export async function updateCortes(asignaturaId: string, cortes: { id: string; peso_porcentual: number }[]): Promise<{ message: string }> {
  return apiFetch(`/subjects/${asignaturaId}/cortes`, { method: 'PUT', body: JSON.stringify({ cortes }) });
}

export async function updateUmbral(asignaturaId: string, umbral_advertencia: number): Promise<{ message: string }> {
  return apiFetch(`/subjects/${asignaturaId}/umbral`, { method: 'PUT', body: JSON.stringify({ umbral_advertencia }) });
}

export async function saveDayAttendance(payload: {
  asignatura_id: string;
  fecha: string;
  records: { inscripcion_id: string; presente: boolean }[];
}): Promise<{ message: string }> {
  return apiFetch('/attendance/bulk', { method: 'POST', body: JSON.stringify(payload) });
}

// Descarga el reporte grupal (PDF o Excel) de una asignatura y abre el panel
// de compartir/guardar del sistema — no hay vista previa dentro de la app.
export async function downloadGroupReport(
  docenteId: string,
  asignaturaId: string,
  format: 'pdf' | 'xlsx',
  fileNameHint: string
): Promise<string> {
  const token = await getToken();
  const url = `${API_URL}/teachers/${docenteId}/report/${asignaturaId}?format=${format}`;
  const dest = `${FileSystem.cacheDirectory}${fileNameHint}.${format}`;

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error('No se pudo descargar el reporte');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
  return result.uri;
}

// Reporte PDF individual de un estudiante — mismo mecanismo de descarga,
// endpoint distinto (GET /students/:id/report.pdf, permitido para docente/admin).
export async function downloadStudentReport(estudianteId: string, fileNameHint: string): Promise<string> {
  const token = await getToken();
  const url = `${API_URL}/students/${estudianteId}/report.pdf`;
  const dest = `${FileSystem.cacheDirectory}${fileNameHint}.pdf`;

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error('No se pudo descargar el reporte');
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
  return result.uri;
}
