import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { attColor } from '../../utils/helpers';
import { getAttendance } from '../../services/attendanceService';
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/motionVariants';

export default function AttendanceView({ estudianteId, semestre, semData, initialCourseId }) {
  const [courses, setCourses]   = useState(semData?.courses ?? []);
  const [loading, setLoading]   = useState(!semData);
  const [error, setError]       = useState(null);

  // Si viene estudianteId (modo backend real), carga desde API
  useEffect(() => {
    if (!estudianteId || !semestre) return;
    setLoading(true);
    getAttendance(estudianteId, semestre)
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudianteId, semestre]);

  // Si cambia semData (modo mock), actualiza
  useEffect(() => {
    if (semData?.courses) setCourses(semData.courses);
  }, [semData]);

  if (loading) return (
    <div className="empty">
      <div className="empty-icon"><Loader2 className="spin" /></div>
      Cargando asistencia...
    </div>
  );

  if (error) return (
    <div className="empty">
      <div className="empty-icon"><AlertTriangle /></div>
      {error}
    </div>
  );

  if (courses.length === 0) return (
    <div className="empty">
      <div className="empty-icon"><Inbox /></div>
      No hay materias para este semestre
    </div>
  );

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      {/* Cards grid */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-4" style={{ marginBottom: 18 }}>
        {courses.map((c) => (
          <motion.div
            key={c.id}
            variants={staggerItem}
            className="card"
            style={{ padding: 18, ...(String(c.id) === String(initialCourseId) ? { border: '2px solid var(--accent)' } : {}) }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color ?? '#1C3992', marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', color: attColor(c.attendance) }}>
              {c.attendance}%
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${c.attendance}%`, background: attColor(c.attendance) }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>
              Mín. 80% {c.attendance < 80 && <AlertTriangle size={11} style={{ color: 'var(--red)', verticalAlign: 'middle' }} />}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Summary table */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>Resumen de Asistencia</div>
        <table className="table">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Docente</th>
              <th>Créditos</th>
              <th>Asistencia</th>
              <th>Estado</th>
              <th>Indicador</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color ?? '#1C3992' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.code}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{c.teacher ?? '—'}</td>
                <td style={{ color: 'var(--text2)' }}>{c.credits ?? '—'}</td>
                <td style={{ fontWeight: 700, color: attColor(c.attendance) }}>{c.attendance}%</td>
                <td>
                  <span className={`badge badge-${c.status === 'active' ? 'active' : 'alert'}`}>
                    {c.status === 'active' ? 'Al día' : 'Alerta'}
                  </span>
                </td>
                <td style={{ width: 120 }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${c.attendance}%`, background: attColor(c.attendance) }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
