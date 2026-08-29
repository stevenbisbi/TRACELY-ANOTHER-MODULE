// services/teacherService.js
import { getToken } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getTeacherDashboard = async (docenteUserId, semestre) => {
  const token   = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Perfil del docente (busca por usuario_id = id_institucional del JWT)
  const meRes = await fetch(`${API}/teachers/me`, { headers });
  if (!meRes.ok) throw new Error('Error al cargar perfil del docente');
  const docente = await meRes.json();

  // 2. Dashboard usando el UUID interno del docente
  const dashRes = await fetch(
    `${API}/teachers/${docente.id}/dashboard?semestre=${semestre}`,
    { headers }
  );
  if (!dashRes.ok) throw new Error('Error al cargar dashboard');
  const { courses, asistenciaHoy } = await dashRes.json();

  const colors = ['#1C3992', '#059669', '#D97706', '#DC2626', '#4861B6'];

  const coursesFormateados = (courses ?? []).map((c, idx) => ({
    id:       c.id,
    name:     c.name,
    code:     c.code?.split('-').slice(0, 2).join('-') ?? c.code,
    group:    c.code?.split('-')[2] ?? 'G1',
    enrolled: c.enrolled,
    color:    colors[idx % colors.length],
    cortes:   c.cortes ?? [],
    umbralAdvertencia: c.umbral_advertencia ?? 3.5,
    students: (c.students ?? []).map((s) => ({
      id:            s.id,
      name:          s.name,
      id_inst:       s.id_inst,
      inscripcionId: s.inscripcion_id,
      attendance:    s.attendance ?? 100,
      absences:      s.absences ?? 0,
      status:        s.status ?? 'active',
      notaDefinitiva: s.notaDefinitiva ?? null,
      recuperable:    s.recuperable ?? true,
    })),
    todayAttendance: (c.students ?? []).map((s) => ({
      studentId:     s.id,
      present:       s.presenteHoy ?? false,
      inscripcionId: s.inscripcion_id,
    })),
  }));

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const schedule = coursesFormateados.slice(0, 4).map((c, i) => ({
    day:    days[i % 5],
    time:   i % 2 === 0 ? '08:00-10:00' : '10:00-12:00',
    course: c.code,
    room:   `Aula ${300 + i}`,
  }));

  return { docente, courses: coursesFormateados, schedule, asistenciaHoy, semestre };
};

export const saveAttendance = async ({ asignatura_id, fecha, records }) => {
  const res = await fetch(`${API}/attendance/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ asignatura_id, fecha, records }),
  });
  if (!res.ok) throw new Error('Error al guardar asistencia');
  return res.json();
};
