// services/excusasService.js — flujo de excusas de inasistencia (asistente IA)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const token = () => localStorage.getItem('tracely_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

async function jsonOrThrow(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ── Estudiante ────────────────────────────────────────────────

// Asignaturas del estudiante (para elegir en qué materia va la excusa).
// Reusa el endpoint de calificaciones, que trae la inscripción + asignatura.
export const getMisAsignaturas = async (estudianteId) => {
  const res = await fetch(`${API}/calificaciones/estudiante/${estudianteId}`, { headers: authHeaders() });
  const inscripciones = await jsonOrThrow(res);
  return inscripciones
    .filter((i) => i.asignatura)
    .map((i) => ({ inscripcionId: i.id, nombre: i.asignatura.nombre, nrc: i.asignatura.NRC }));
};

// Radica una excusa con el documento (PDF o imagen). multipart/form-data.
export const radicarExcusa = async ({ inscripcionId, fechaInicio, fechaFin, file }) => {
  const form = new FormData();
  form.append('inscripcion_id', inscripcionId);
  form.append('fecha_inicio', fechaInicio);
  form.append('fecha_fin', fechaFin);
  if (file) form.append('documento', file);

  // No se fija Content-Type: fetch pone el boundary del multipart solo.
  const res = await fetch(`${API}/excusas`, { method: 'POST', headers: authHeaders(), body: form });
  return jsonOrThrow(res);
};

export const getMisExcusas = async () => {
  const res = await fetch(`${API}/excusas/mias`, { headers: authHeaders() });
  return jsonOrThrow(res);
};

// ── Dirección de programa ─────────────────────────────────────

export const getPendientes = async () => {
  const res = await fetch(`${API}/excusas/pendientes`, { headers: authHeaders() });
  return jsonOrThrow(res);
};

export const decidirExcusa = async (excusaId, decision, motivo) => {
  const res = await fetch(`${API}/excusas/${excusaId}/decision`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, motivo }),
  });
  return jsonOrThrow(res);
};

// ── Diagnóstico ───────────────────────────────────────────────
export const getEstadoIA = async () => {
  const res = await fetch(`${API}/excusas/estado-ia`, { headers: authHeaders() });
  return jsonOrThrow(res);
};
