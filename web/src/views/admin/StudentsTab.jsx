import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Inbox, Pencil, Trash2, X, AlertTriangle, UserPlus } from 'lucide-react';
import { attColor, gradeColor } from '../../utils/helpers';
import { fadeInUp } from '../../utils/motionVariants';
import { getStudents, updateStudent, updateUser, deleteUser, getCareers } from '../../services/adminAcademicService';
import ConfirmModal from '../../components/common/ConfirmModal';
import CreateUserModal from './CreateUserModal';

const riskLabel = { low: 'Normal', medium: 'Aviso', high: 'Riesgo' };
const riskClass = { low: 'badge-active', medium: 'badge-warning', high: 'badge-risk' };
const FILTERS   = ['all', 'low', 'medium', 'high'];
const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

// ── Modal editar estudiante (info personal + contraseña + carrera/semestre) ──
function EditStudentModal({ student, onClose, onSuccess }) {
  const [nombre,    setNombre]    = useState(student.name);
  const [correo,    setCorreo]    = useState(student.correo ?? '');
  const [password,  setPassword]  = useState('');
  const [careers,   setCareers]   = useState([]);
  const [carreraId, setCarreraId] = useState(student.carreraId ?? '');
  const [semester,  setSemester]  = useState(student.semester ?? 1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => { getCareers().then(setCareers).catch(() => {}); }, []);

  const handleSubmit = async () => {
    if (password && password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setLoading(true); setError(null);
    try {
      const userPayload = { nombre, correo };
      if (password) userPayload.password = password;
      await Promise.all([
        updateUser(student.usuarioId, userPayload),
        updateStudent(student.id, { carrera_id: carreraId, semestre_actual: Number(semester) }),
      ]);
      onSuccess('Estudiante actualizado');
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Editar {student.name}</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}
          <div>
            <div style={labelStyle}>Nombre completo</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>Correo institucional</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>Nueva contraseña</div>
            <input type="password" className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Dejar en blanco para no cambiarla" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>Carrera</div>
            <select className="settings-select" style={{ width: '100%' }} value={carreraId} onChange={(e) => setCarreraId(e.target.value)}>
              {careers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Semestre actual</div>
            <input type="number" min="1" max="12" className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
              value={semester} onChange={(e) => setSemester(e.target.value)} />
          </div>
        </div>
        <div className="settings-modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="settings-save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsTab({ onToast }) {
  const [students, setStudents] = useState([]);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = (q) => {
    setLoading(true);
    getStudents(q).then(setStudents).catch(() => setStudents([])).finally(() => setLoading(false));
  };

  // Búsqueda contra el backend (debounced) — no se trae la lista completa
  // de estudiantes al navegador para filtrarla en el cliente.
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = students.filter((s) => filter === 'all' || s.risk === filter);

  const handleDeleteConfirm = async () => {
    const target = deleting;
    setDeleting(null);
    try {
      await deleteUser(target.usuarioId);
      onToast?.(`${target.name} eliminado`);
      load(search);
    } catch (e) {
      onToast?.(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showCreate && (
        <CreateUserModal role="estudiante" onClose={() => setShowCreate(false)} onSuccess={(msg) => { onToast?.(msg); load(search); }} />
      )}
      {editing && (
        <EditStudentModal
          student={editing}
          onClose={() => setEditing(null)}
          onSuccess={(msg) => { onToast?.(msg); load(search); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title={`¿Eliminar a ${deleting.name}?`}
          message="Esta acción borrará también sus inscripciones, notas y asistencia. No se puede deshacer."
          danger
          confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
        />
      )}

      {/* Barra de búsqueda y filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="input-field" style={{ width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
              placeholder="Buscar por nombre, ID o correo..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            {FILTERS.map((f) => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'Todos' : riskLabel[f]}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <UserPlus size={13} /> Crear estudiante
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando estudiantes...</div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Inbox /></div>Sin resultados</div>
      ) : (
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ padding: '14px 16px 10px' }}>Estudiante</th>
                <th>Programa</th>
                <th>Semestre</th>
                <th>Promedio</th>
                <th>Asistencia</th>
                <th>Riesgo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--bg3)',
                        border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text2)', flexShrink: 0,
                      }}>
                        {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.usuarioId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.program}</td>
                  <td style={{ fontSize: 13 }}>{s.semester ? `${s.semester}°` : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                  <td style={{ fontWeight: 700, color: s.gpa ? gradeColor(s.gpa) : 'var(--text3)' }}>
                    {s.gpa != null ? s.gpa.toFixed(1) : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: s.attendance ? attColor(s.attendance) : 'var(--text3)' }}>
                    {s.attendance != null ? `${s.attendance}%` : '—'}
                  </td>
                  <td><span className={`badge ${riskClass[s.risk]}`}>{riskLabel[s.risk]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(s)} title="Editar"><Pencil size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(s)} title="Eliminar" style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>
        {filtered.length} estudiante(s) {search && 'encontrados'}
      </div>
    </div>
  );
}
