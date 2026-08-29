// services/politicaService.js — interpretación de reglamento y política académica
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const token = () => localStorage.getItem('tracely_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

async function jsonOrThrow(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const getPoliticaVigente = async () => {
  const res = await fetch(`${API}/politica/vigente`, { headers: authHeaders() });
  return jsonOrThrow(res);
};

// Sube el reglamento nuevo (PDF); la IA propone cambios + impacto. No aplica nada.
export const interpretarReglamento = async (file) => {
  const form = new FormData();
  form.append('reglamento', file);
  const res = await fetch(`${API}/politica/interpretar`, { method: 'POST', headers: authHeaders(), body: form });
  return jsonOrThrow(res);
};

// Aplica la política aprobada (crea y activa una nueva versión).
export const aplicarPolitica = async (parametros, reglamentoVersion) => {
  const res = await fetch(`${API}/politica/aplicar`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ parametros, reglamento_version: reglamentoVersion }),
  });
  return jsonOrThrow(res);
};
