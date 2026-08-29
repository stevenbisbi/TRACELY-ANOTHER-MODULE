import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, UserPlus, Pencil, Trash2, Loader2, AlertTriangle, Inbox, Users } from 'lucide-react';
import { attColor, gradeColor } from '../../utils/helpers';
import { fadeInUp } from '../../utils/motionVariants';
import { getSubjects, getStudents, deleteSubject, updateStudent, deleteCareer, getCareers } from '../../services/adminAcademicService';
import CreateSubjectModal from './CreateSubjectModal';
import EditSubjectModal from './EditSubjectModal';
import EditCareerModal from './EditCareerModal';
import EnrollStudentModal from './EnrollStudentModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import SearchSelect from '../../components/common/SearchSelect';

const riskLabel = { low: 'Normal', medium: 'Aviso', high: 'Riesgo' };
const riskClass = { low: 'badge-active', medium: 'badge-warning', high: 'badge-risk' };

// Vista de detalle de un programa (carrera): sus materias y sus
// estudiantes, con las mismas acciones que antes vivían sueltas en la
// pestaña "Materias" (ahora eliminada) y en "Estudiantes".
export default function ProgramDetailView({ program, onBack, onToast }) {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [editingSubject, setEditingSubject]         = useState(null);
  const [deletingSubject, setDeletingSubject]       = useState(null);
  const [enrollFor, setEnrollFor]                   = useState(null);
  const [showAddStudent, setShowAddStudent]         = useState(false);
  const [addingStudent, setAddingStudent]           = useState(null);
  const [editingCareer, setEditingCareer]           = useState(false);
  const [deletingCareer, setDeletingCareer]         = useState(false);
  const [careerError, setCareerError]               = useState(null);
  const [careerDetail, setCareerDetail]             = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getSubjects({ carrera_id: program.id }), getStudents({ carrera_id: program.id }), getCareers()])
      .then(([subs, studs, careers]) => {
        setSubjects(subs);
        setStudents(studs);
        setCareerDetail(careers.find((c) => c.id === program.id) ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [program.id]);

  const handleToast = (msg) => { onToast?.(msg); load(); };

  const handleDeleteSubject = async () => {
    const target = deletingSubject;
    setDeletingSubject(null);
    try {
      await deleteSubject(target.id);
      handleToast(`"${target.nombre}" eliminada`);
    } catch (e) { onToast?.(e.message); }
  };

  const handleAddStudentToProgram = async (student) => {
    setAddingStudent(student.id);
    try {
      await updateStudent(student.id, { carrera_id: program.id });
      setShowAddStudent(false);
      handleToast(`${student.name} agregado al programa`);
    } catch (e) { onToast?.(e.message); }
    finally { setAddingStudent(null); }
  };

  // La restricción real la aplica el backend (bloquea si hay estudiantes o
  // materias de pensum asociadas) — aquí solo se refleja el mensaje que
  // devuelva, en vez de asumir de antemano cuáles son todas las razones.
  const handleDeleteCareer = async () => {
    setDeletingCareer(false);
    try {
      await deleteCareer(program.id);
      onToast?.(`"${program.name}" eliminado`);
      onBack();
    } catch (e) { setCareerError(e.message); }
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {showCreateSubject && (
        <CreateSubjectModal fixedCarreraId={program.id} onClose={() => setShowCreateSubject(false)} onSuccess={handleToast} />
      )}
      {editingSubject && (
        <EditSubjectModal subject={editingSubject} onClose={() => setEditingSubject(null)} onSuccess={handleToast} />
      )}
      {deletingSubject && (
        <ConfirmModal
          title={`¿Eliminar "${deletingSubject.nombre}"?`}
          message="Esta acción no se puede deshacer."
          danger confirmLabel="Eliminar"
          onConfirm={handleDeleteSubject}
          onCancel={() => setDeletingSubject(null)}
        />
      )}
      {enrollFor && (
        <EnrollStudentModal
          fixedAsignaturaId={enrollFor.id}
          fixedAsignaturaLabel={`${enrollFor.nombre} — ${enrollFor.NRC}`}
          onClose={() => setEnrollFor(null)}
          onSuccess={handleToast}
        />
      )}
      {editingCareer && careerDetail && (
        <EditCareerModal
          career={careerDetail}
          onClose={() => setEditingCareer(false)}
          onSuccess={(msg) => { onToast?.(msg); load(); }}
        />
      )}
      {deletingCareer && (
        <ConfirmModal
          title={`¿Eliminar "${program.name}"?`}
          message="Solo se puede eliminar si no tiene estudiantes ni materias de pensum asociadas. Esta acción no se puede deshacer."
          danger confirmLabel="Eliminar"
          onConfirm={handleDeleteCareer}
          onCancel={() => setDeletingCareer(false)}
        />
      )}

      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={13} /> Volver a Programas
      </button>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{program.name}</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingCareer(true)} title="Editar carrera"><Pencil size={12} /></button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => program.students === 0 && setDeletingCareer(true)}
              disabled={program.students > 0}
              title={program.students > 0 ? `No se puede eliminar: tiene ${program.students} estudiante(s) asociado(s)` : 'Eliminar carrera'}
              style={{ color: program.students > 0 ? 'var(--text3)' : 'var(--red)', cursor: program.students > 0 ? 'not-allowed' : 'pointer' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {careerError && (
          <div style={{ color: 'var(--red)', fontSize: 12, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> {careerError}
          </div>
        )}
        <div className="grid grid-3" style={{ gap: 10, marginTop: 14 }}>
          <div><div className="stat-label">Estudiantes</div><div style={{ fontSize: 22, fontWeight: 700 }}>{program.students.toLocaleString()}</div></div>
          <div><div className="stat-label">GPA</div><div style={{ fontSize: 22, fontWeight: 700, color: gradeColor(program.avgGpa) }}>{program.avgGpa.toFixed(1)}</div></div>
          <div><div className="stat-label">Retención</div><div style={{ fontSize: 22, fontWeight: 700, color: attColor(program.retention) }}>{program.retention}%</div></div>
        </div>
      </div>

      {error && <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>}

      {/* ── Materias ────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-title">Materias</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateSubject(true)}><BookOpen size={13} /> Agregar materia</button>
        </div>
        {loading ? (
          <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando...</div>
        ) : subjects.length === 0 ? (
          <div className="empty"><div className="empty-icon"><BookOpen /></div>Este programa aún no tiene materias</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th style={{ padding: '14px 16px 10px' }}>Materia</th><th>NRC</th><th>Docente</th><th>Semestre</th><th>Inscritos</th><th></th></tr></thead>
              <tbody>
                {subjects.map((a) => (
                  <tr key={a.id}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{a.nombre}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.NRC}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.docente?.usuario?.nombre ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.semestre_academico}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{a.inscritos}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEnrollFor(a)} title="Inscribir estudiante"><UserPlus size={12} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingSubject(a)} title="Editar"><Pencil size={12} /></button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => a.inscritos === 0 && setDeletingSubject(a)}
                          disabled={a.inscritos > 0}
                          title={a.inscritos > 0 ? `No se puede eliminar: tiene ${a.inscritos} estudiante(s) inscrito(s)` : 'Eliminar'}
                          style={{ color: a.inscritos > 0 ? 'var(--text3)' : 'var(--red)', cursor: a.inscritos > 0 ? 'not-allowed' : 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Estudiantes ─────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-title">Estudiantes</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddStudent(true)}><UserPlus size={13} /> Agregar estudiante al programa</button>
        </div>
        {showAddStudent && (
          <div className="card" style={{ padding: 16, marginBottom: 10, overflow: 'visible' }}>
            <SearchSelect
              value={null}
              onSelect={handleAddStudentToProgram}
              fetchResults={(q) => getStudents(q)}
              getLabel={(s) => `${s.name} (${s.usuarioId})`}
              isItemDisabled={(s) => s.carreraId === program.id}
              renderItem={(s) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.carreraId === program.id && <span className="badge badge-active" style={{ flexShrink: 0 }}>Ya en el programa</span>}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.usuarioId} · {s.correo}</div>
                  </div>
                </div>
              )}
              placeholder="Busca un estudiante existente por nombre, ID o correo..."
            />
            {addingStudent && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Agregando...</div>}
          </div>
        )}
        {loading ? (
          <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando...</div>
        ) : students.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Users /></div>Este programa aún no tiene estudiantes</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th style={{ padding: '14px 16px 10px' }}>Estudiante</th><th>Semestre</th><th>GPA</th><th>Asistencia</th><th>Riesgo</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.usuarioId}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.semester ?? '—'}</td>
                    <td style={{ fontSize: 12, fontWeight: 700, color: gradeColor(s.gpa ?? 0) }}>{s.gpa != null ? s.gpa.toFixed(1) : '—'}</td>
                    <td style={{ fontSize: 12, fontWeight: 700, color: attColor(s.attendance ?? 100) }}>{s.attendance != null ? `${s.attendance}%` : '—'}</td>
                    <td><span className={`badge ${riskClass[s.risk]}`}>{riskLabel[s.risk]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
