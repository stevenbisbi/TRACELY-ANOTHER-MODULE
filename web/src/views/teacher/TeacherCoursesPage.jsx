import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CalendarX, Users, NotebookPen, Save, Check, X, Settings, FileText, FileSpreadsheet, Download } from 'lucide-react';
import GradePanel from '../../components/charts/GradePanel';
import CourseSettingsModal from './CourseSettingsModal';
import { attColor } from '../../utils/helpers';
import { getTeacherDashboard, saveAttendance } from '../../services/teacherService';
import { downloadStudentReport, downloadGroupReport } from '../../services/reportService';
import { fadeInUp } from '../../utils/motionVariants';

// ── Toast ────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? <Check size={14} /> : <X size={14} />} {message}
    </div>
  );
}

// ── Mis Cursos (docente): lista de cursos + notas/asistencia/config ────
export default function TeacherCoursesPage({ docenteId, semestre, initialCourseId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [activeCourse, setActiveCourse] = useState(null);
  const [attendance,   setAttendance]   = useState({});
  const [gradePanel,   setGradePanel]   = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [showCourseSettings, setShowCourseSettings] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(null);

  // Sincroniza activeCourse con la copia más reciente de `data.courses`
  // (usado tras editar la configuración del curso, para no perder la
  // selección actual del docente).
  const syncActiveCourse = (d, keepId) => {
    const found = keepId ? d.courses?.find((c) => c.id === keepId) : null;
    const next = found ?? d.courses?.[0];
    if (next) {
      setActiveCourse(next);
      setAttendance(Object.fromEntries(next.todayAttendance.map((a) => [a.studentId, a.present])));
    }
    return next;
  };

  const loadDashboard = (keepId, openGradesFor) => {
    if (!docenteId || !semestre) { setLoading(false); return; }

    setLoading(true);
    getTeacherDashboard(docenteId, semestre)
      .then((d) => {
        setData(d);
        const selected = d.courses?.length > 0 ? syncActiveCourse(d, keepId) : null;
        if (openGradesFor && selected) setGradePanel(selected);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Cargar desde backend. Si venimos de "Notas" en el Dashboard
  // (?course=<id>), seleccionamos ese curso y abrimos el modal directo.
  useEffect(() => {
    loadDashboard(initialCourseId, !!initialCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docenteId, semestre]);

  const toggleAtt = (id) => setAttendance((p) => ({ ...p, [id]: !p[id] }));

  const handleCourseChange = (c) => {
    setActiveCourse(c);
    setAttendance(Object.fromEntries(
      c.todayAttendance.map((a) => [a.studentId, a.present])
    ));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const fecha   = new Date().toISOString().split('T')[0];
      const records = activeCourse.todayAttendance.map((a) => ({
        inscripcion_id: a.inscripcionId,
        presente:       attendance[a.studentId] ?? false,
      }));
      await saveAttendance({ asignatura_id: activeCourse.id, fecha, records });
      setToast({ message: `Asistencia de ${activeCourse.name} guardada`, type: 'success' });
      // Refrescar `data` con lo realmente persistido — si no, al cambiar de
      // curso y volver, `todayAttendance` queda con los valores viejos y
      // pisa lo que se acaba de guardar (ver auditoría).
      loadDashboard(activeCourse.id);
    } catch (e) {
      setToast({ message: e.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadGroupReport = async (format) => {
    if (!activeCourse || !data?.docente?.id) return;
    const key = `group-${format}`;
    setDownloadingReport(key);
    try {
      await downloadGroupReport(data.docente.id, activeCourse.id, format, activeCourse.name);
    } catch (e) {
      setToast({ message: e.message || 'Error al generar el reporte', type: 'error' });
    } finally {
      setDownloadingReport(null);
    }
  };

  const handleDownloadStudentReport = async (studentId, studentName) => {
    setDownloadingReport(studentId);
    try {
      await downloadStudentReport(studentId, studentName);
    } catch (e) {
      setToast({ message: e.message || 'Error al generar el reporte', type: 'error' });
    } finally {
      setDownloadingReport(null);
    }
  };

  if (loading) return <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando cursos...</div>;
  if (error)   return <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>;
  if (!data || !data.courses?.length) return (
    <div className="empty"><div className="empty-icon"><CalendarX /></div>No hay cursos para este semestre</div>
  );

  const { courses } = data;
  const present = Object.values(attendance).filter(Boolean).length;
  const total   = activeCourse?.students?.length ?? 0;

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      {gradePanel && (
        <GradePanel
          course={gradePanel}
          onClose={() => setGradePanel(null)}
          onSaved={(message) => setToast({ message, type: 'success' })}
        />
      )}
      {showCourseSettings && activeCourse && (
        <CourseSettingsModal
          course={activeCourse}
          onClose={() => setShowCourseSettings(false)}
          onSaved={(message) => { setToast({ message, type: 'success' }); loadDashboard(activeCourse.id); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Lista de cursos */}
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div className="section-header">
          <div>
            <div className="section-title">Mis Cursos</div>
            {activeCourse && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: activeCourse.color, marginRight: 6 }} />
                {activeCourse.name} · Grupo {activeCourse.group ?? ''}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => activeCourse && setGradePanel(activeCourse)}>
              <NotebookPen size={13} /> Ver notas
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCourseSettings(true)}>
              <Settings size={13} /> Configurar curso
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadGroupReport('pdf')} disabled={downloadingReport === 'group-pdf'}>
              {downloadingReport === 'group-pdf' ? <Loader2 size={13} className="spin" /> : <FileText size={13} />} PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDownloadGroupReport('xlsx')} disabled={downloadingReport === 'group-xlsx'}>
              {downloadingReport === 'group-xlsx' ? <Loader2 size={13} className="spin" /> : <FileSpreadsheet size={13} />} Excel
            </button>
          </div>
        </div>

        <div className="tabs" style={{ marginTop: 14 }}>
          {courses.map((c) => (
            <button key={c.id} className={`tab ${activeCourse?.id === c.id ? 'active' : ''}`} onClick={() => handleCourseChange(c)}>
              {c.code} {c.group}
            </button>
          ))}
        </div>
      </div>

      {/* Control de Asistencia */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-header">
          <div>
            <div className="section-title">Control de Asistencia</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSaveAttendance} disabled={saving} style={{ minWidth: 150 }}>
            {saving ? (
              <><Loader2 size={13} className="spin" /> Guardando...</>
            ) : <><Save size={13} /> Guardar Asistencia</>}
          </button>
        </div>

        {!activeCourse || activeCourse.students.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Users /></div>Sin estudiantes en este grupo</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}><strong style={{ color: 'var(--green)' }}>{present}</strong> presentes</span>
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}><strong style={{ color: 'var(--red)' }}>{total - present}</strong> ausentes</span>
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}><strong>{total}</strong> total</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Toca <Check size={12} />/<X size={12} /> para cambiar asistencia
              </span>
            </div>

            <table className="table">
              <thead>
                <tr><th>Estudiante</th><th>Asistencia %</th><th>Estado</th><th>Hoy</th><th>Reporte</th></tr>
              </thead>
              <tbody>
                {activeCourse.students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                          {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.id_inst}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: attColor(s.attendance ?? 85) }}>{s.attendance ?? '—'}%</td>
                    <td><span className={`badge badge-${s.status ?? 'active'}`}>{s.status === 'active' ? 'OK' : s.status === 'critical' ? 'Crítico' : 'Aviso'}</span></td>
                    <td>
                      <div
                        className={`att-chip ${attendance[s.id] === undefined ? 'unset' : attendance[s.id] ? 'present' : 'absent'}`}
                        onClick={() => toggleAtt(s.id)}
                        title="Click para cambiar"
                      >
                        {attendance[s.id] === undefined ? '?' : attendance[s.id] ? <Check size={15} /> : <X size={15} />}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDownloadStudentReport(s.id, s.name)}
                        disabled={downloadingReport === s.id}
                        title="Descargar reporte individual"
                      >
                        {downloadingReport === s.id ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </motion.div>
  );
}
