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

// Radica una excusa con el documento (PDF o imagen). multipart/form-data.
// La excusa cubre al estudiante en el rango de fechas (todas sus materias);
// no se elige asignatura.
export const radicarExcusa = async ({ fechaInicio, fechaFin, file, explicacion }) => {
  const form = new FormData();
  form.append('fecha_inicio', fechaInicio);
  form.append('fecha_fin', fechaFin);
  if (file) form.append('documento', file);
  if (explicacion) form.append('explicacion', explicacion);

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
