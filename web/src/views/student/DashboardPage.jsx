import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, CalendarX, BarChart3, CheckCircle2, BookOpen, Bell, Check, Ban, Inbox, ArrowRight, X } from 'lucide-react';
import RingChart    from '../../components/charts/RingChart';
import MiniBarChart from '../../components/charts/MiniBarChart';
import { gradeColor, attColor, courseOverall } from '../../utils/helpers';
import { getStudentDashboard } from '../../services/studentService';
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/motionVariants';

export default function StudentDashboard({ estudianteId, semestre, semData, onNavigate, onNotifClick }) {
  // Sin estudianteId/semestre (modo mock standalone) los datos vienen directo
  // del prop — no hace falta un efecto para copiar algo que ya está disponible
  // en el primer render.
  const [data,    setData]    = useState(() => (!estudianteId || !semestre ? semData ?? null : null));
  const [loading, setLoading] = useState(!!estudianteId && !!semestre);
  const [error,   setError]   = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Cargar desde backend si hay estudianteId
  useEffect(() => {
    if (!estudianteId || !semestre) return;
    setLoading(true);
    setError(null);
    getStudentDashboard(estudianteId, semestre)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudianteId, semestre]);

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando dashboard...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );
  if (!data) return (
    <div className="empty"><div className="empty-icon"><CalendarX /></div>No hay datos para este semestre</div>
  );

  const { gpa, attendanceRate, riskLevel, courses, notifications, attendanceHistory, semester } = data;
  const unread       = notifications.filter((n) => !n.read).length;
  const alertCourses = courses.filter((c) => c.status === 'alert');

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <AnimatePresence>
        {alertCourses.length > 0 && !bannerDismissed && (
          <motion.div
            className="alert-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 18 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="alert-banner-icon">
              <AlertTriangle size={16} />
            </div>
            <div className="alert-banner-text">
              {alertCourses.length} materia(s) requieren atención:{' '}
              {alertCourses.map((c) => c.name).join(', ')}
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              aria-label="Cerrar aviso"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7, display: 'flex', padding: 4, marginLeft: 'auto', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 /></div>
          <div className="stat-label">Promedio General</div>
          <div className="stat-val" style={{ color: gradeColor(gpa) }}>
            {gpa != null ? gpa.toFixed(1) : '—'}
          </div>
          <div className="stat-sub">Escala 0.0 – 5.0</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CheckCircle2 /></div>
          <div className="stat-label">Asistencia Global</div>
          <div className="stat-val" style={{ color: attendanceRate != null ? attColor(attendanceRate) : 'var(--text3)' }}>
            {attendanceRate != null ? `${attendanceRate}%` : '—'}
          </div>
          <div className="stat-sub">Mínimo requerido 80%</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><BookOpen /></div>
          <div className="stat-label">Materias</div>
          <div className="stat-val">{courses.length}</div>
          <div className="stat-sub">{courses.reduce((a, c) => a + (c.credits ?? 0), 0)} créditos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Bell /></div>
          <div className="stat-label">Alertas</div>
          <div className="stat-val" style={{ color: unread ? 'var(--red)' : 'var(--text)' }}>{unread}</div>
          <div className="stat-sub">Sin leer</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Asistencia Mensual</div>
          <MiniBarChart data={attendanceHistory} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {attendanceHistory.map((d) => (
              <div key={d.month} style={{ fontSize: 9, color: 'var(--text3)', flex: 1, textAlign: 'center' }}>
                {d.rate}%
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexDirection: 'column' }}>
          <RingChart value={gpa ?? 0} max={5} size={88} color={gradeColor(gpa)} label={gpa != null ? gpa.toFixed(1) : '—'} sublabel="Promedio" />
          <div style={{ textAlign: 'center' }}>
            <div className="card-label">Nivel de Riesgo</div>
            <span className={`badge badge-${riskLevel === 'low' ? 'active' : riskLevel === 'medium' ? 'warning' : 'critical'}`} style={{ fontSize: 12, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {riskLevel === 'low' ? <><Check size={13} /> Bajo</> : riskLevel === 'medium' ? <><AlertTriangle size={13} /> Medio</> : <><Ban size={13} /> Alto</>}
            </span>
          </div>
        </div>

        <div className="card notif-card" style={{ padding: 20 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <div className="section-title">Notificaciones</div>
            {unread > 0 && <span className="badge badge-alert">{unread} nuevas</span>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
              Sin notificaciones
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show">
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  variants={staggerItem}
                  className={`notif-item ${n.read ? 'read' : 'unread'} ${n.courseId ? 'clickable' : ''}`}
                  onClick={() => n.courseId && onNotifClick && onNotifClick(n.courseId, n.categoria)}
                >
                  <div className="notif-dot-icon" style={{
                    background: n.type === 'alert' ? 'var(--red)' : n.type === 'warning' ? 'var(--orange)' : n.type === 'success' ? 'var(--green)' : 'var(--accent)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                  {n.courseId && <div style={{ display: 'flex', color: 'var(--accent)' }}><ArrowRight size={14} /></div>}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mis materias */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-header">
          <div className="section-title">Mis Materias — {semester}</div>
          <button className="section-link" onClick={() => onNavigate && onNavigate('grades')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Ver notas detalladas <ArrowRight size={14} />
          </button>
        </div>
        {courses.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Inbox /></div>No hay materias para este semestre</div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {courses.map((c) => {
              const ov = courseOverall(c.cortes ?? []);
              return (
                <motion.div
                  key={c.id}
                  variants={staggerItem}
                  className="course-card"
                  onClick={() => onNavigate && onNavigate('grades', c.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>
                        {c.code}
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>{c.teacher}</div>
                    </div>
                    <span className={`badge badge-${c.status === 'active' ? 'active' : 'alert'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {c.status === 'active' ? 'Al día' : <><AlertTriangle size={12} /> Alerta</>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: gradeColor(ov) }}>{ov != null ? ov.toFixed(1) : '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Nota</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: attColor(c.attendance) }}>{c.attendance}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>Asistencia</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
