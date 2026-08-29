import { apiFetch, setToken, clearToken, getToken } from './client';

export type Role = 'student' | 'teacher';

export interface AuthUser {
  id_institucional: string;
  nombre: string;
  correo: string;
  rol: 'admin' | 'docente' | 'estudiante';
  role: Role | 'admin';
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(id: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ id, password }),
  });
  await setToken(data.token);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/users/me');
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function hasSession(): Promise<boolean> {
  return (await getToken()) != null;
}

export async function requestPasswordReset(correo: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
