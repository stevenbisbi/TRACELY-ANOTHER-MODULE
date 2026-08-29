import { apiFetch } from './client';

// Autoservicio de perfil — el backend (PUT /api/users/:id) también acepta
// correo/password, pero la pantalla de Perfil solo expone nombre (misma
// decisión de alcance que toma hoy la web en su modal de "Configuración").
export async function updateName(id: string, nombre: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ nombre }),
  });
}
