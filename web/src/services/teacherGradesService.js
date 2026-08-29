// services/teacherGradesService.js
// Gestión de notas del lado del docente: leer/crear/eliminar actividades
// y guardar calificaciones. Usa los endpoints que ya expone el backend
// (calificacionController / actividadController) pero que la UI de
// GradePanel nunca llamaba.
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

// GET /api/calificaciones/asignatura/:asignaturaId
// Devuelve las inscripciones del curso con sus calificaciones ya registradas.
export const getCourseGrades = async (asignaturaId) => {
  const res = await fetch(`${API}/calificaciones/asignatura/${asignaturaId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar las notas del curso');
  return res.json();
};

// POST /api/actividades
export const createActividad = async ({ corte_id, nombre, tipo, porcentaje_en_corte = 100 }) => {
  const res = await fetch(`${API}/actividades`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ corte_id, nombre, tipo, porcentaje_en_corte }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al crear la actividad');
  return data;
};

// PUT /api/actividades/:id — redistribuir el porcentaje de una actividad ya creada
export const updateActividad = async (actividadId, payload) => {
  const res = await fetch(`${API}/actividades/${actividadId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al actualizar la actividad');
  return data;
};

// DELETE /api/actividades/:id
export const deleteActividad = async (actividadId) => {
  const res = await fetch(`${API}/actividades/${actividadId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar la actividad');
  return res.json();
};

// POST /api/calificaciones/bulk
export const saveCalificaciones = async (calificaciones) => {
  const res = await fetch(`${API}/calificaciones/bulk`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ calificaciones }),
  });
  if (!res.ok) throw new Error('Error al guardar las notas');
  return res.json();
};

// POST /api/calificaciones/import — carga masiva de notas desde un .xlsx
export const importGradesExcel = async (asignaturaId, file) => {
  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('asignatura_id', asignaturaId);
  const res = await fetch(`${API}/calificaciones/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al importar el archivo');
  return data;
};

// PUT /api/subjects/:id/umbral
export const updateUmbral = async (asignaturaId, umbral_advertencia) => {
  const res = await fetch(`${API}/subjects/${asignaturaId}/umbral`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ umbral_advertencia }),
  });
  if (!res.ok) throw new Error('Error al actualizar el umbral');
  return res.json();
};

// PUT /api/subjects/:id/cortes — actualiza los 3 pesos de corte a la vez
// (deben sumar 100%). cortes: [{ id, peso_porcentual }, ...]
export const updateCortes = async (asignaturaId, cortes) => {
  const res = await fetch(`${API}/subjects/${asignaturaId}/cortes`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ cortes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al actualizar los cortes');
  return data;
};
