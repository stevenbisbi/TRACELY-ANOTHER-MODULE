import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CalendarX, BookOpen, Users, NotebookPen } from 'lucide-react';
import { getTeacherDashboard } from '../../services/teacherService';
import { fadeInUp } from '../../utils/motionVariants';

// ── Dashboard Docente ─────────────────────────────────────────
export default function TeacherDashboard({ docenteId, semestre, semData, onNavigate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!docenteId || !semestre) {
      if (semData) setData(semData);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTeacherDashboard(docenteId, semestre)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [docenteId, semestre, semData]);

  if (loading) return <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando dashboard...</div>;
  if (error)   return <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>;
  if (!data || !data.courses?.length) return (
    <div className="empty"><div className="empty-icon"><CalendarX /></div>No hay cursos para este semestre</div>
  );

  const { courses, schedule } = data;

  // Estudiantes en riesgo crítico (no advertencias) across todos los cursos
  // del docente — un estudiante en varios cursos críticos aparece una vez
  // por curso, para que quede claro en cuál materia necesita atención.
  const criticalStudents = courses.flatMap((c) =>
    (c.students ?? [])
      .filter((s) => s.status === 'critical')
      .map((s) => ({ ...s, courseName: c.name, courseId: c.id }))
  );

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      {/* Stats */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon"><BookOpen /></div>
          <div className="stat-label">Cursos</div>
          <div className="stat-val">{courses.length}</div>
          <div className="stat-sub">Este semestre</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users /></div>
          <div className="stat-label">Estudiantes</div>
          <div className="stat-val">{courses.reduce((a, c) => a + c.enrolled, 0)}</div>
          <div className="stat-sub">Total inscritos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--red)' }}><AlertTriangle /></div>
          <div className="stat-label">En Riesgo</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{criticalStudents.length}</div>
          <div className="stat-sub">Riesgo crítico</div>
        </div>
      </div>

      {/* Fila: Mis cursos / Horario / Estudiantes en riesgo */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Mis Cursos</div>
          {courses.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.code} · {c.enrolled} est.</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate?.('courses', c.id)}>
                <NotebookPen size={13} /> Notas
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Horario</div>
          {schedule.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', width: 36, textTransform: 'uppercase' }}>{s.day.slice(0, 3)}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', width: 88 }}>{s.time}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.course}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.room}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Estudiantes en Riesgo</div>
          {criticalStudents.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>Sin estudiantes en riesgo crítico</div>
          ) : (
            criticalStudents.map((s) => (
              <div key={`${s.courseId}-${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                  {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.courseName}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
                  {s.notaDefinitiva != null ? s.notaDefinitiva.toFixed(1) : '—'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
