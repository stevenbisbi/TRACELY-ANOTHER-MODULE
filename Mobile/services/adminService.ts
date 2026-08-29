import { apiFetch } from './client';

// ── Resumen institucional ───────────────────────────────────────
export interface AdminOverview {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeSemester: string;
  atRiskCount: number;
  avgGpa: number;
  attendanceGlobal: number;
  retentionRate: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'alert' | 'user';
  severity: 'critical' | 'high' | 'info';
  message: string;
  time: string;
}

export interface ProgramStat {
  id: string;
  name: string;
  students: number;
  avgGpa: number;
  retention: number;
}

export async function getOverview(): Promise<AdminOverview> {
  return apiFetch<AdminOverview>('/admin/overview');
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  return apiFetch<RecentActivityItem[]>('/admin/recent-activity');
}

export async function getProgramStats(): Promise<ProgramStat[]> {
  return apiFetch<ProgramStat[]>('/admin/program-stats');
}

// ── Carreras ─────────────────────────────────────────────────────
export interface Career {
  id: string;
  nombre: string;
  codigo: string;
  total_creditos: number;
}

export async function getCareers(): Promise<Career[]> {
  return apiFetch<Career[]>('/careers');
}

export async function createCareer(payload: { nombre: string; codigo: string; total_creditos?: number }): Promise<Career> {
  return apiFetch<Career>('/careers', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCareer(id: string, payload: { nombre?: string; codigo?: string; total_creditos?: number }): Promise<Career> {
  return apiFetch<Career>(`/careers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCareer(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/careers/${id}`, { method: 'DELETE' });
}

// ── Usuarios (estudiantes / docentes / administradores) ─────────
export interface AdminStudentRow {
  id: string; // Estudiante UUID
  usuarioId: string;
  name: string;
  correo: string;
  program: string;
  carreraId: string | null;
  semester: number;
  gpa: number | null;
  attendance: number | null;
  risk: 'low' | 'medium' | 'high';
  yaInscrito?: boolean;
}

export interface AdminTeacherRow {
  id: string; // Docente UUID
  usuario_id: string;
  usuario: { nombre: string; correo: string; id_institucional: string } | null;
  courses: number;
  students: number;
}

export interface AdminUserRow {
  id_institucional: string;
  nombre: string;
  correo: string;
  rol: 'admin' | 'docente' | 'estudiante';
}

export async function getStudents(params: { search?: string; carrera_id?: string; asignatura_id?: string } = {}): Promise<AdminStudentRow[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.carrera_id) qs.set('carrera_id', params.carrera_id);
  if (params.asignatura_id) qs.set('asignatura_id', params.asignatura_id);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AdminStudentRow[]>(`/students${suffix}`);
}

export async function getCareer(id: string): Promise<Career> {
  return apiFetch<Career>(`/careers/${id}`);
}

export async function updateStudentAcademics(id: string, payload: { carrera_id?: string; semestre_actual?: number }): Promise<{ message: string }> {
  return apiFetch(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function getTeachers(search?: string): Promise<AdminTeacherRow[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<AdminTeacherRow[]>(`/teachers${suffix}`);
}

export async function getUsers(params: { rol?: string; search?: string } = {}): Promise<AdminUserRow[]> {
  const qs = new URLSearchParams();
  if (params.rol) qs.set('rol', params.rol);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AdminUserRow[]>(`/users${suffix}`);
}

export async function createUser(payload: {
  id_institucional: string;
  nombre: string;
  correo: string;
  password: string;
  rol: 'estudiante' | 'docente' | 'admin';
  carrera_id?: string;
  semestre_actual?: number;
}): Promise<{ message: string }> {
  return apiFetch('/users/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateUser(id: string, payload: { nombre?: string; correo?: string; password?: string }): Promise<{ message: string }> {
  return apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

// ── Materias / pensum / inscripciones ────────────────────────────
export interface AdminSubject {
  id: string;
  nombre: string;
  NRC: string;
  semestre_academico: string;
  umbral_advertencia: number;
  pensum_id: string;
  docente_id: string;
  docente?: { usuario?: { nombre: string; correo: string } | null } | null;
  pensum?: { nombre_asignatura: string; semestre: number; creditos: number; carrera_id: string } | null;
  inscritos: number;
}

export async function getSubjects(params: { carrera_id?: string; semestre?: string } = {}): Promise<AdminSubject[]> {
  const qs = new URLSearchParams();
  if (params.carrera_id) qs.set('carrera_id', params.carrera_id);
  if (params.semestre) qs.set('semestre', params.semestre);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<AdminSubject[]>(`/subjects${suffix}`);
}

export async function createSubject(payload: {
  nombre: string; NRC: string; docente_id: string; pensum_id: string; semestre_academico: string;
}): Promise<AdminSubject> {
  return apiFetch<AdminSubject>('/subjects', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSubject(id: string, payload: {
  nombre?: string; NRC?: string; docente_id?: string; semestre_academico?: string; umbral_advertencia?: number;
}): Promise<AdminSubject> {
  return apiFetch<AdminSubject>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteSubject(id: string): Promise<{ message: string }> {
  return apiFetch(`/subjects/${id}`, { method: 'DELETE' });
}

export interface PensumItem {
  id: string;
  carrera_id: string;
  nombre_asignatura: string;
  semestre: number;
  creditos: number;
}

export async function getPensumByCareer(carreraId: string): Promise<PensumItem[]> {
  return apiFetch<PensumItem[]>(`/pensum/carrera/${carreraId}`);
}

export async function enrollStudent(estudiante_id: string, asignatura_id: string): Promise<{ message: string }> {
  return apiFetch('/inscripciones', { method: 'POST', body: JSON.stringify({ estudiante_id, asignatura_id }) });
}

export async function unenrollStudent(inscripcionId: string): Promise<{ message: string }> {
  return apiFetch(`/inscripciones/${inscripcionId}`, { method: 'DELETE' });
}

export async function getInscripcionesByAsignatura(asignaturaId: string): Promise<{ id: string; estudiante?: { id: string; usuario?: { nombre: string; id_institucional: string } | null } | null }[]> {
  return apiFetch(`/inscripciones/asignatura/${asignaturaId}`);
}
