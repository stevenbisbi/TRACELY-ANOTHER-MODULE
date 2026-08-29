const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const rolMap = { estudiante: 'student', docente: 'teacher', admin: 'admin', director_programa: 'director' };

export const login = async (id, password) => {
  const res = await fetch(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ID o contraseña incorrectos.');
  }

  const data = await res.json();
  return {
    id:     data.user.id_institucional,
    role:   rolMap[data.user.rol] ?? data.user.rol,
    nombre: data.user.nombre,
    correo: data.user.correo,   // ← incluir correo
    token:  data.token,
  };
};

export const logout = async () => true;

export const requestPasswordReset = async (correo) => {
  const res = await fetch(`${API}/users/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al solicitar el restablecimiento');
  return data;
};

export const resetPassword = async (token, password) => {
  const res = await fetch(`${API}/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña');
  return data;
};
