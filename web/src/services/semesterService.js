// services/semesterService.js
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// GET /api/semesters — público, no requiere token
export const getSemesters = async () => {
  const res = await fetch(`${API}/semesters`);
  if (!res.ok) throw new Error('Error al cargar semestres');
  return res.json();
};

// GET /api/semesters/active — público, no requiere token
export const getActiveSemester = async () => {
  const res = await fetch(`${API}/semesters/active`);
  if (!res.ok) return null;
  return res.json();
};
