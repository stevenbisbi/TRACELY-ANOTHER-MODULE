import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Loader2, UserPlus, Pencil, Trash2, Search, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StudentsTab from './StudentsTab';
import CreateUserModal from './CreateUserModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { fadeInUp } from '../../utils/motionVariants';
import { getTeachers, getUsers, updateUser, deleteUser } from '../../services/adminAcademicService';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

// ── Modal editar usuario (nombre/correo/contraseña) — Docentes y Administradores ──
function EditUserModal({ user, onClose, onSuccess }) {
  const [nombre, setNombre]     = useState(user.name);
  const [correo, setCorreo]     = useState(user.correo ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async () => {
    if (password && password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setLoading(true); setError(null);
    try {
      const payload = { nombre, correo };
      if (password) payload.password = password;
      await updateUser(user.id, payload);
      onSuccess('Usuario actualizado');
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Editar usuario</h2>
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

// ── Tab genérica de personas (Docentes / Administradores) ───────
function PeopleTab({ rol, extraColumns, onToast }) {
  const { user: currentUser } = useAuth();
  const [people, setPeople]     = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = (q) => {
    setLoading(true);
    const fetcher = rol === 'docente' ? getTeachers(q) : getUsers({ rol, search: q });
    fetcher
      .then((data) => {
        const mapped = rol === 'docente'
          ? data.map((t) => ({ id: t.usuario_id, name: t.usuario?.nombre, correo: t.usuario?.correo, courses: t.courses, students: t.students }))
          : data.map((u) => ({ id: u.id_institucional, name: u.nombre, correo: u.correo }));
        setPeople(mapped);
      })
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDeleteConfirm = async () => {
    const target = deleting;
    setDeleting(null);
    try {
      await deleteUser(target.id);
      onToast?.(`${target.name} eliminado`);
      load(search);
    } catch (e) { onToast?.(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showCreate && (
        <CreateUserModal role={rol} onClose={() => setShowCreate(false)} onSuccess={(msg) => { onToast?.(msg); load(search); }} />
      )}
      {editing && (
        <EditUserModal user={editing} onClose={() => setEditing(null)} onSuccess={(msg) => { onToast?.(msg); load(search); }} />
      )}
      {deleting && (
        <ConfirmModal
          title={`¿Eliminar a ${deleting.name}?`}
          message={rol === 'docente' ? 'Esto también borrará las materias que dicta y toda su información académica asociada.' : 'Esta acción no se puede deshacer.'}
          danger confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input className="input-field" style={{ width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
            placeholder="Buscar por nombre, ID o correo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <UserPlus size={13} /> Crear {rol === 'docente' ? 'docente' : 'administrador'}
        </button>
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando...</div>
      ) : people.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Inbox /></div>Sin resultados</div>
      ) : (
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ padding: '14px 16px 10px' }}>{rol === 'docente' ? 'Docente' : 'Administrador'}</th>
                <th>Correo</th>
                {extraColumns?.map((c) => <th key={c.key}>{c.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--sidebar),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {(p.name ?? '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.id}</div></div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{p.correo}</td>
                  {extraColumns?.map((c) => <td key={c.key} style={{ fontSize: 13 }}>{p[c.key]}</td>)}
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)} title="Editar"><Pencil size={12} /></button>
                      {p.id === currentUser?.id ? (
                        <button className="btn btn-ghost btn-sm" disabled title="No puedes eliminar tu propia cuenta" style={{ color: 'var(--text3)', cursor: 'not-allowed' }}><Trash2 size={12} /></button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(p)} title="Eliminar" style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}

// ── Vista "Personas" — sub-navegación Estudiantes/Docentes/Administradores,
// mismo patrón (segmented sub-tabs) que la pantalla equivalente en móvil ──
export default function PeopleView({ onToast }) {
  const [subTab, setSubTab] = useState('estudiantes');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="tabs" style={{ margin: 0 }}>
        {[
          { id: 'estudiantes', label: 'Estudiantes' },
          { id: 'docentes', label: 'Docentes' },
          { id: 'administradores', label: 'Administradores' },
        ].map((t) => (
          <button key={t.id} className={`tab ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {subTab === 'estudiantes' && (
        <motion.div key="estudiantes" variants={fadeInUp} initial="hidden" animate="show">
          <StudentsTab onToast={onToast} />
        </motion.div>
      )}
      {subTab === 'docentes' && (
        <motion.div key="docentes" variants={fadeInUp} initial="hidden" animate="show">
          <PeopleTab rol="docente" extraColumns={[{ key: 'courses', label: 'Cursos' }, { key: 'students', label: 'Estudiantes' }]} onToast={onToast} />
        </motion.div>
      )}
      {subTab === 'administradores' && (
        <motion.div key="administradores" variants={fadeInUp} initial="hidden" animate="show">
          <PeopleTab rol="admin" onToast={onToast} />
        </motion.div>
      )}
    </div>
  );
}
