import { apiFetch, API_URL, getToken } from './client';
import type { ApiActividad, ApiCalificacion } from './apiTypes';

// Inscripción con estudiante y sus notas (vista del docente por asignatura)
export interface AsignaturaCalificaciones {
  id: string; // inscripcion UUID
  estudiante?: { id: string; usuario?: { nombre: string; correo: string } | null } | null;
  calificaciones?: ApiCalificacion[];
}

export async function getByAsignatura(asignaturaId: string, corte?: number): Promise<AsignaturaCalificaciones[]> {
  const suffix = corte ? `?corte=${corte}` : '';
  return apiFetch<AsignaturaCalificaciones[]>(`/calificaciones/asignatura/${asignaturaId}${suffix}`);
}

export async function bulkUpsert(
  calificaciones: { inscripcion_id: string; actividad_id: string; nota: number }[]
): Promise<{ message: string; count: number }> {
  return apiFetch('/calificaciones/bulk', {
    method: 'POST',
    body: JSON.stringify({ calificaciones }),
  });
}

export async function createActividad(payload: {
  corte_id: string;
  nombre: string;
  tipo: string;
  porcentaje_en_corte: number;
}): Promise<ApiActividad> {
  return apiFetch('/actividades', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateActividad(id: string, porcentaje_en_corte: number): Promise<ApiActividad> {
  return apiFetch(`/actividades/${id}`, { method: 'PUT', body: JSON.stringify({ porcentaje_en_corte }) });
}

export async function deleteActividad(id: string): Promise<void> {
  await apiFetch(`/actividades/${id}`, { method: 'DELETE' });
}

export interface ImportResult {
  message: string;
  procesadas: number;
  errores: { fila: number; motivo: string }[];
}

// Sube un .xlsx como multipart/form-data — igual que hace GradePanel.jsx en
// la web. No se usa apiFetch aquí porque siempre serializa el body a JSON;
// con FormData el boundary lo debe fijar `fetch` automáticamente, así que
// solo se manda el header de autorización.
export async function importExcel(
  asignaturaId: string,
  file: { uri: string; name: string; mimeType?: string }
): Promise<ImportResult> {
  const token = await getToken();
  const form = new FormData();
  form.append('asignatura_id', asignaturaId);
  form.append('archivo', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/calificaciones/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
  return data as ImportResult;
}
