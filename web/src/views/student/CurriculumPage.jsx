import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Inbox, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import { getPensum } from '../../services/gradesService';
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/motionVariants';

const ESTADO_META = {
  aprobada: { label: 'Aprobada', badge: 'badge-active', icon: CheckCircle2, color: 'var(--green)' },
  en_curso: { label: 'En curso', badge: 'badge-warning', icon: BookOpen, color: 'var(--accent)' },
  pendiente: { label: 'Pendiente', badge: 'badge-risk', icon: Clock, color: 'var(--text3)' },
};

export default function CurriculumPage({ estudianteId }) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!estudianteId) return;
    setLoading(true);
    getPensum(estudianteId)
      .then(setMaterias)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudianteId]);

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando progreso curricular...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );
  if (materias.length === 0) return (
    <div className="empty"><div className="empty-icon"><Inbox /></div>No hay pensum configurado para tu carrera</div>
  );

  const aprobadas   = materias.filter((m) => m.estado === 'aprobada');
  const enCurso     = materias.filter((m) => m.estado === 'en_curso');
  const pendientes  = materias.filter((m) => m.estado === 'pendiente');
  const creditosAprobados = aprobadas.reduce((s, m) => s + (m.creditos ?? 0), 0);
  const creditosTotal     = materias.reduce((s, m) => s + (m.creditos ?? 0), 0);
  const pctAvance = creditosTotal > 0 ? Math.round((creditosAprobados / creditosTotal) * 100) : 0;

  const porSemestre = materias.reduce((acc, m) => {
    (acc[m.semestre] ??= []).push(m);
    return acc;
  }, {});

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}><CheckCircle2 /></div>
          <div className="stat-label">Aprobadas</div>
          <div className="stat-val">{aprobadas.length}</div>
          <div className="stat-sub">{creditosAprobados} créditos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><BookOpen /></div>
          <div className="stat-label">En curso</div>
          <div className="stat-val">{enCurso.length}</div>
          <div className="stat-sub">Este semestre</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--text3)' }}><Clock /></div>
          <div className="stat-label">Pendientes</div>
          <div className="stat-val">{pendientes.length}</div>
          <div className="stat-sub">Por cursar</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avance de carrera</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{pctAvance}%</div>
          <div className="progress-bar" style={{ marginTop: 6 }}>
            <div className="progress-fill" style={{ width: `${pctAvance}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.keys(porSemestre).sort((a, b) => a - b).map((sem) => (
          <motion.div key={sem} variants={staggerItem} className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Semestre {sem}</div>
            {porSemestre[sem].map((m) => {
              const meta = ESTADO_META[m.estado] ?? ESTADO_META.pendiente;
              const Icon = meta.icon;
              return (
                <div key={m.pensum_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ color: meta.color, display: 'flex' }}><Icon size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.nombre_asignatura}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.creditos} créditos</div>
                  </div>
                  {m.nota_definitiva != null && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{m.nota_definitiva.toFixed(1)}</div>
                  )}
                  <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </div>
              );
            })}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
