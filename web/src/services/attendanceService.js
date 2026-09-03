// services/attendanceService.js
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Obtiene la asistencia del estudiante.
 * Retorna array de cursos con % de asistencia.
 */
export const getAttendance = async (estudianteId, semestre) => {
  const token = getToken();

  const res = await fetch(
    `${API}/attendance/estudiante/${estudianteId}?semestre=${semestre}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error('Error al obtener asistencia');

  const data = await res.json();
  // data.courses ya viene formateado desde el backend con { name, code, attendance, status, ... }
  return data.courses ?? [];
};

/**
 * Guarda la asistencia del día para un grupo (docente).
 * records = [{ inscripcion_id, presente: bool }]
 */
export const saveDayAttendance = async ({ asignatura_id, fecha, records }) => {
  const token = getToken();

  const res = await fetch(`${API}/attendance/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ asignatura_id, fecha, records }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar asistencia');
  }

  return res.json();
};

// Historial completo de asistencia de un curso (docente): todas las fechas
// registradas, de todos los estudiantes inscritos, desde el primer día hasta hoy.
export const getAttendanceHistory = async (asignaturaId) => {
  const token = getToken();

  const res = await fetch(`${API}/attendance/asignatura/${asignaturaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Error al obtener el historial de asistencia');
  return res.json();
};
