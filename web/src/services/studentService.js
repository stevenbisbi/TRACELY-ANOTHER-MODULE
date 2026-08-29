// services/studentService.js
import { getToken } from '../context/AuthContext';
import { getStudentAlerts } from './alertService';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Carga todos los datos del dashboard del estudiante desde el backend.
 * Combina calificaciones + asistencia + alertas en la estructura
 * que espera StudentDashboard.jsx
 */
export const getStudentDashboard = async (estudianteId, semestre) => {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Llamadas en paralelo
  const [inscRes, attRes] = await Promise.all([
    fetch(`${API}/calificaciones/estudiante/${estudianteId}?semestre=${semestre}`, { headers }),
    fetch(`${API}/attendance/estudiante/${estudianteId}?semestre=${semestre}`, { headers }),
  ]);

  if (!inscRes.ok) throw new Error('Error al cargar datos del semestre');

  const inscripciones = await inscRes.json();
  const attData       = attRes.ok ? await attRes.json() : { courses: [], attendanceHistory: [] };
  const attMap        = Object.fromEntries((attData.courses ?? []).map((c) => [c.id, c]));

  const colors = ['#1C3992', '#059669', '#D97706', '#DC2626', '#4861B6'];

  // Construir courses con estructura completa
  const courses = inscripciones.map((insc, idx) => {
    const asig     = insc.asignatura;
    const attInfo  = attMap[asig?.id] ?? {};
    const att      = attInfo.attendance ?? 100;

    const cortesFormateados = (asig?.cortes ?? []).map((corte) => ({
      id:     corte.id,
      label:  `Corte ${corte.numero_corte}`,
      weight: corte.peso_porcentual,
      actividades: (corte.actividades ?? []).map((act) => {
        const cal = insc.calificaciones?.find((c) => c.actividad_id === act.id);
        return {
          id:    act.id,
          label: act.nombre,
          tipo:  act.tipo,
          value: cal?.nota ?? null,
          peso:  act.porcentaje_en_corte,
        };
      }),
    }));

    // Promedio general del curso: viene ya calculado del backend (gradeMath.js),
    // única fuente de verdad — evita recalcular con una fórmula distinta aquí.
    const gpaCorso = insc.nota_definitiva_calculada ?? null;

    return {
      id:         asig?.id,
      name:       asig?.nombre ?? '',
      code:       asig?.NRC ?? '',
      teacher:    asig?.docente?.usuario?.nombre ?? '',
      credits:    asig?.pensum?.creditos ?? 0,
      color:      colors[idx % colors.length],
      attendance: att,
      status:     att >= 80 ? 'active' : 'alert',
      cortes:     cortesFormateados,
      gpa:        gpaCorso,
      inscripcionId: insc.id,
      notaMinimaRequerida: insc.nota_minima_requerida ?? null,
      recuperable:         insc.recuperable ?? true,
    };
  });

  // Stats globales
  const gpas        = courses.filter((c) => c.gpa != null).map((c) => c.gpa);
  const gpa         = gpas.length > 0 ? Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 10) / 10 : null;
  const attendanceRate = courses.length > 0
    ? Math.round(courses.reduce((a, c) => a + c.attendance, 0) / courses.length)
    : null;
  // Notificaciones y nivel de riesgo: se derivan de la misma lista unificada
  // de alertas (nota + asistencia) que usa "Mis Alertas", para que ambas
  // vistas siempre coincidan y el riesgo refleje alertas reales, no un
  // conteo de asistencia inventado aparte.
  const alertas = await getStudentAlerts(estudianteId, semestre).catch(() => []);
  const alertasActivas = alertas.filter((a) => a.estado === 'activa');

  const riskLevel = alertasActivas.some((a) => a.tipo === 'critica')
    ? 'high'
    : alertasActivas.length > 0 ? 'medium' : 'low';

  const notifications = [...alertasActivas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 8)
    .map((a) => ({
      id:       a.id,
      type:     a.tipo === 'critica' ? 'alert' : 'warning',
      categoria: a.categoria,
      courseId: a.asignaturaId,
      message:  a.categoria === 'asistencia'
        ? `Asistencia ${a.attendance < 70 ? 'crítica' : 'baja'} en ${a.asignaturaNombre} (${a.attendance}%)`
        : `Tu proyección en ${a.asignaturaNombre} está en riesgo`,
      time:     a.categoria === 'asistencia' ? 'Hoy' : new Date(a.fecha).toLocaleDateString('es-CO'),
      read:     false,
    }));

  // Historial de asistencia mensual real, calculado por el backend a partir
  // de los registros de Asistencia (no una simulación).
  const attendanceHistory = attData.attendanceHistory ?? [];

  return {
    gpa,
    attendanceRate,
    riskLevel,
    courses,
    notifications,
    attendanceHistory,
    semester: semestre,
  };
};
