// services/alertService.js
// Alertas académicas del estudiante (RF-23/RF-25). No agrega endpoints
// nuevos: combina 3 endpoints que ya existen en el backend —
// GET /api/students/me (resuelve el UUID de Estudiante que espera
// alertaController, distinto del id_institucional del JWT),
// GET /api/alertas/estudiante/:estudianteUuid (historial completo,
// activas y resueltas, ya viene ordenado por fecha) y
// GET /api/calificaciones/estudiante/:id (para leer la nota proyectada
// actual de cada materia, que Alerta no guarda de forma persistente).
import { getToken } from '../context/AuthContext';
import { getAttendance } from './attendanceService';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// Alertas unificadas: notas (tabla Alerta, persistida) + asistencia baja
// (calculada en vivo, sin persistir — ver auditoría: el flujo de Alerta por
// asistencia es poco confiable porque se resuelve solo por nota). Ambas
// fuentes se combinan aquí para que el Dashboard y "Mis Alertas" siempre
// muestren exactamente lo mismo.
export const getStudentAlerts = async (estudianteId, semestre) => {
  const headers = authHeaders();

  const meRes = await fetch(`${API}/students/me`, { headers });
  if (!meRes.ok) throw new Error('Error al cargar el perfil del estudiante');
  const me = await meRes.json();

  const [alertasRes, califRes, attendanceCourses] = await Promise.all([
    fetch(`${API}/alertas/estudiante/${me.id}`, { headers }),
    fetch(`${API}/calificaciones/estudiante/${estudianteId}${semestre ? `?semestre=${semestre}` : ''}`, { headers }),
    getAttendance(estudianteId, semestre).catch(() => []),
  ]);
  if (!alertasRes.ok) throw new Error('Error al cargar las alertas');

  const alertas = await alertasRes.json();
  const calificaciones = califRes.ok ? await califRes.json() : [];
  const inscripcionPorId = Object.fromEntries(calificaciones.map((c) => [c.id, c]));

  const alertasNota = alertas.map((a) => {
    const insc = inscripcionPorId[a.inscripcion_id];
    const cortesPendientes = (insc?.asignatura?.cortes ?? [])
      .filter((c) => !c.corte_completo)
      .sort((x, y) => x.numero_corte - y.numero_corte);
    const pesoPendienteTotal = cortesPendientes.reduce((s, c) => s + (c.peso_porcentual ?? 0), 0);

    return {
      id: a.id,
      tipo: a.tipo,
      estado: a.estado,
      categoria: 'nota',
      notaMinimaRequerida: a.nota_minima_requerida,
      recuperable: a.es_recuperable,
      // updatedAt refleja la última reevaluación real (cada vez que se
      // guarda una nota); createdAt es de la primera vez que la materia
      // entró en riesgo, que puede ser muy vieja y engañosa.
      fecha: a.updatedAt,
      asignaturaId: a.inscripcion?.asignatura_id ?? null,
      asignaturaNombre: a.inscripcion?.asignatura?.nombre ?? 'Materia',
      asignaturaNRC: a.inscripcion?.asignatura?.NRC ?? '',
      notaProyectada: insc?.nota_definitiva_calculada ?? null,
      cortesPendientes,
      pesoPendienteTotal,
    };
  });

  // Alertas de asistencia: se calculan en vivo (no dependen de una fila
  // Alerta persistida) para que nunca queden obsoletas ni se pierdan por el
  // findOrCreate/reconciliación del sistema de alertas de nota.
  const alertasAsistencia = (attendanceCourses ?? [])
    .filter((c) => c.attendance < 80)
    .map((c) => ({
      id: `asistencia-${c.id}`,
      tipo: c.attendance < 70 ? 'critica' : 'advertencia',
      estado: 'activa',
      categoria: 'asistencia',
      notaMinimaRequerida: null,
      recuperable: true,
      fecha: new Date().toISOString(),
      asignaturaId: c.id,
      asignaturaNombre: c.name ?? 'Materia',
      asignaturaNRC: c.code ?? '',
      notaProyectada: null,
      cortesPendientes: [],
      pesoPendienteTotal: 0,
      attendance: c.attendance,
    }));

  return [...alertasNota, ...alertasAsistencia];
};
