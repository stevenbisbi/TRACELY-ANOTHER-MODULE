// services/adminAcademicService.js
// Gestión académica desde el panel de administración: crear asignaturas
// e inscribir estudiantes (RF-12 / RF-13). Antes solo se podía hacer
// directamente contra la base de datos.
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function handle(res, fallbackError) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || fallbackError);
  }
  return res.json();
}

// GET /api/subjects?semestre=&carrera_id= — incluye `inscritos` por materia
export const getSubjects = async (opts = {}) => {
  const { semestre, carrera_id } = typeof opts === 'string' ? { semestre: opts } : opts;
  const params = new URLSearchParams();
  if (semestre) params.set('semestre', semestre);
  if (carrera_id) params.set('carrera_id', carrera_id);
  const suffix = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API}/subjects${suffix}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar asignaturas');
};

// POST /api/subjects — crea la asignatura con sus 3 cortes 30/30/40 automáticamente
export const createSubject = async (payload) => {
  const res = await fetch(`${API}/subjects`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al crear la asignatura');
};

// PUT /api/subjects/:id
export const updateSubject = async (id, payload) => {
  const res = await fetch(`${API}/subjects/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al actualizar la asignatura');
};

// DELETE /api/subjects/:id — rechazado por el backend si tiene inscritos
export const deleteSubject = async (id) => {
  const res = await fetch(`${API}/subjects/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handle(res, 'Error al eliminar la asignatura');
};

// GET /api/teachers?search= (admin)
export const getTeachers = async (search) => {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API}/teachers${suffix}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar docentes');
};

// GET /api/students?search=&carrera_id=&asignatura_id= (admin) — incluye
// GPA/asistencia/riesgo reales; asignatura_id agrega `yaInscrito` por estudiante
export const getStudents = async (opts = {}) => {
  const { search, carrera_id, asignatura_id } = typeof opts === 'string' ? { search: opts } : opts;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (carrera_id) params.set('carrera_id', carrera_id);
  if (asignatura_id) params.set('asignatura_id', asignatura_id);
  const suffix = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API}/students${suffix}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar estudiantes');
};

// PUT /api/students/:id — editar carrera/semestre de un estudiante
export const updateStudent = async (estudianteId, payload) => {
  const res = await fetch(`${API}/students/${estudianteId}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al actualizar el estudiante');
};

// GET /api/users?rol=&search= (admin)
export const getUsers = async ({ rol, search } = {}) => {
  const params = new URLSearchParams();
  if (rol) params.set('rol', rol);
  if (search) params.set('search', search);
  const suffix = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API}/users${suffix}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar usuarios');
};

// POST /api/users/register — crea Usuario + perfil Estudiante/Docente enlazado
export const createUser = async (payload) => {
  const res = await fetch(`${API}/users/register`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al crear el usuario');
};

// PUT /api/users/:id — editar nombre/correo
export const updateUser = async (id, payload) => {
  const res = await fetch(`${API}/users/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al actualizar el usuario');
};

// DELETE /api/users/:id
export const deleteUser = async (id) => {
  const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handle(res, 'Error al eliminar el usuario');
};

// GET /api/admin/overview
export const getOverview = async () => {
  const res = await fetch(`${API}/admin/overview`, { headers: authHeaders() });
  return handle(res, 'Error al cargar el resumen institucional');
};

// GET /api/admin/recent-activity
export const getRecentActivity = async () => {
  const res = await fetch(`${API}/admin/recent-activity`, { headers: authHeaders() });
  return handle(res, 'Error al cargar la actividad reciente');
};

// GET /api/admin/program-stats
export const getProgramStats = async () => {
  const res = await fetch(`${API}/admin/program-stats`, { headers: authHeaders() });
  return handle(res, 'Error al cargar estadísticas por programa');
};

// GET /api/pensum/carrera/:carreraId
export const getPensumByCarrera = async (carreraId) => {
  const res = await fetch(`${API}/pensum/carrera/${carreraId}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar el pensum');
};

// GET /api/careers
export const getCareers = async () => {
  const res = await fetch(`${API}/careers`, { headers: authHeaders() });
  return handle(res, 'Error al cargar carreras');
};

// POST /api/careers
export const createCareer = async (payload) => {
  const res = await fetch(`${API}/careers`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al crear la carrera');
};

// PUT /api/careers/:id
export const updateCareer = async (id, payload) => {
  const res = await fetch(`${API}/careers/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
  return handle(res, 'Error al actualizar la carrera');
};

// DELETE /api/careers/:id — rechazado por el backend si tiene estudiantes o pensum asociado
export const deleteCareer = async (id) => {
  const res = await fetch(`${API}/careers/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handle(res, 'Error al eliminar la carrera');
};

// POST /api/inscripciones — vincula un estudiante existente a una asignatura por ID
export const enrollStudent = async (estudiante_id, asignatura_id) => {
  const res = await fetch(`${API}/inscripciones`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ estudiante_id, asignatura_id }),
  });
  return handle(res, 'Error al inscribir al estudiante');
};

// GET /api/inscripciones/asignatura/:asignaturaId — roster real (para poder des-inscribir)
export const getInscripcionesByAsignatura = async (asignaturaId) => {
  const res = await fetch(`${API}/inscripciones/asignatura/${asignaturaId}`, { headers: authHeaders() });
  return handle(res, 'Error al cargar los inscritos');
};

// DELETE /api/inscripciones/:id — des-inscribir
export const unenrollStudent = async (inscripcionId) => {
  const res = await fetch(`${API}/inscripciones/${inscripcionId}`, { method: 'DELETE', headers: authHeaders() });
  return handle(res, 'Error al des-inscribir al estudiante');
};
