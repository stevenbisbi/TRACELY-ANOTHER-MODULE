import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, GraduationCap, Presentation, BookOpen, BarChart3, CheckCircle2, Lock, NotebookPen, User, Settings, Check, Plus, Inbox } from 'lucide-react';
import { attColor, gradeColor } from '../../utils/helpers';
import PeopleView from './PeopleView';
import ProgramDetailView from './ProgramDetailView';
import CreateCareerModal from './CreateCareerModal';
import { fadeInUp } from '../../utils/motionVariants';
import { getStudents, getOverview, getRecentActivity, getProgramStats } from '../../services/adminAcademicService';

// ── Tab Programas (lista clicable → detalle con materias/estudiantes) ──
function ProgramsTab({ onToast }) {
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const colors = ['#1C3992', '#059669', '#D97706', '#DB2777', '#4861B6'];

  const load = () => {
    setLoading(true);
    getProgramStats().then(setStats).catch(() => setStats([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (selected) {
    return <ProgramDetailView program={selected} onBack={() => { setSelected(null); load(); }} onToast={onToast} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showCreate && (
        <CreateCareerModal onClose={() => setShowCreate(false)} onSuccess={(msg) => { onToast?.(msg); load(); }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Nueva carrera
        </button>
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando...</div>
      ) : stats.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Inbox /></div>Sin programas registrados</div>
      ) : (
        <div className="grid grid-2" style={{ gap: 14 }}>
          {stats.map((p, i) => (
            <div key={p.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => setSelected(p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length] }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
              </div>
              <div className="grid grid-3" style={{ gap: 10 }}>
                <div><div className="stat-label">Estudiantes</div><div style={{ fontSize: 22, fontWeight: 700 }}>{p.students.toLocaleString()}</div></div>
                <div><div className="stat-label">GPA</div><div style={{ fontSize: 22, fontWeight: 700, color: gradeColor(p.avgGpa) }}>{p.avgGpa.toFixed(1)}</div></div>
                <div><div className="stat-label">Retención</div><div style={{ fontSize: 22, fontWeight: 700, color: attColor(p.retention) }}>{p.retention}%</div></div>
              </div>
              <div className="progress-bar" style={{ marginTop: 12 }}>
                <div className="progress-fill" style={{ width: `${p.retention}%`, background: colors[i % colors.length] }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Resumen (overview) ───────────────────────────────────
function OverviewTab() {
  const [stats, setStats]     = useState(null);
  const [activity, setActivity] = useState([]);
  const [atRisk, setAtRisk]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getOverview(), getRecentActivity(), getStudents()])
      .then(([ov, act, students]) => {
        setStats(ov);
        setActivity(act);
        setAtRisk(students.filter((s) => s.risk !== 'low').sort((a, b) => (a.attendance ?? 100) - (b.attendance ?? 100)).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const severityColor = { critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--gold)', info: 'var(--accent)', success: 'var(--green)' };
  const activityIcon  = { alert: <AlertTriangle size={16} />, grade: <NotebookPen size={16} />, user: <User size={16} />, system: <Settings size={16} /> };

  if (loading || !stats) return <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando resumen...</div>;

  return (
    <motion.div key="overview" variants={fadeInUp} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid grid-4" style={{ gap: 14 }}>
        <div className="stat-card"><div className="stat-icon"><GraduationCap /></div><div className="stat-label">Estudiantes</div><div className="stat-val">{stats.totalStudents.toLocaleString()}</div><div className="stat-sub">Matriculados</div></div>
        <div className="stat-card"><div className="stat-icon"><Presentation /></div><div className="stat-label">Docentes</div><div className="stat-val">{stats.totalTeachers}</div><div className="stat-sub">Vinculados</div></div>
        <div className="stat-card"><div className="stat-icon"><BookOpen /></div><div className="stat-label">Cursos</div><div className="stat-val">{stats.totalCourses}</div><div className="stat-sub">Semestre {stats.activeSemester}</div></div>
        <div className="stat-card"><div className="stat-icon" style={{ color: 'var(--orange)' }}><AlertTriangle /></div><div className="stat-label">En Riesgo</div><div className="stat-val" style={{ color: 'var(--orange)' }}>{stats.atRiskCount}</div><div className="stat-sub">Atención</div></div>
      </div>
      <div className="grid grid-3" style={{ gap: 14 }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}><div style={{ color: 'var(--accent)' }}><BarChart3 size={32} /></div><div><div className="stat-label">GPA Promedio</div><div style={{ fontSize: 28, fontWeight: 700, color: gradeColor(stats.avgGpa) }}>{stats.avgGpa.toFixed(1)}</div><div className="stat-sub">Institución</div></div></div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}><div style={{ color: 'var(--green)' }}><CheckCircle2 size={32} /></div><div><div className="stat-label">Asistencia Global</div><div style={{ fontSize: 28, fontWeight: 700, color: attColor(stats.attendanceGlobal) }}>{stats.attendanceGlobal}%</div><div className="stat-sub">Promedio</div></div></div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}><div style={{ color: 'var(--green)' }}><Lock size={32} /></div><div><div className="stat-label">Retención</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{stats.retentionRate}%</div><div className="stat-sub">Semestre actual</div></div></div>
      </div>
      <div className="grid grid-2-1" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Actividad Reciente</div>
          {activity.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>Sin actividad reciente</div>
          ) : activity.map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <div style={{ marginTop: 1, color: 'var(--text2)' }}>{activityIcon[a.type]}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{a.message}</div><div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.time}</div></div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: severityColor[a.severity] }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>En Riesgo</div>
          {atRisk.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>Sin estudiantes en riesgo</div>
          ) : atRisk.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.program} · Sem {s.semester ?? '—'}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 700, color: attColor(s.attendance ?? 100) }}>{s.attendance != null ? `${s.attendance}%` : '—'}</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>asist.</div></div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────
export default function AdminDashboard() {
  const [tab,   setTab]   = useState('overview');
  const [toast, setToast] = useState(null);

  const handleCreated = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  return (
    <div>
      {toast && <div className="toast success"><Check size={14} /> {toast}</div>}

      <div className="tabs" style={{ margin: '0 0 16px' }}>
        {[
          { id: 'overview', label: 'Resumen' },
          { id: 'people',   label: 'Personas' },
          { id: 'programs', label: 'Programas' },
        ].map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'people'   && <motion.div key="people" variants={fadeInUp} initial="hidden" animate="show"><PeopleView onToast={handleCreated} /></motion.div>}
      {tab === 'programs' && <motion.div key="programs" variants={fadeInUp} initial="hidden" animate="show"><ProgramsTab onToast={handleCreated} /></motion.div>}
    </div>
  );
}
