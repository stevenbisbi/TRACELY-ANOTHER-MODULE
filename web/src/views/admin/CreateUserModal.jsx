import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createUser, getCareers } from '../../services/adminAcademicService';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };
const ROLE_LABEL = { estudiante: 'estudiante', docente: 'docente', admin: 'administrador' };

// Modal de creación de usuario, con el rol ya fijado por la pestaña desde
// donde se abre (Estudiantes/Docentes/Administradores) — ya no hay selector
// de rol libre, para que no se pueda crear, por ejemplo, un docente desde
// la pestaña de estudiantes.
export default function CreateUserModal({ role, onClose, onSuccess }) {
  const [form, setForm]     = useState({ id_institucional: '', nombre: '', correo: '', password: '', carrera_id: '', semestre_actual: 1 });
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (role !== 'estudiante') return;
    getCareers().then((cs) => {
      setCareers(cs);
      if (cs[0]) setForm((p) => ({ ...p, carrera_id: cs[0].id }));
    }).catch(() => {});
  }, [role]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.id_institucional || !form.nombre || !form.correo || !form.password)
      return setError('Todos los campos son obligatorios');
    if (role === 'estudiante' && !form.carrera_id)
      return setError('Selecciona una carrera para el estudiante');
    setLoading(true); setError(null);
    try {
      await createUser({ ...form, rol: role });
      onSuccess(`${role === 'estudiante' ? 'Estudiante' : role === 'docente' ? 'Docente' : 'Administrador'} ${form.nombre} creado`);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Crear nuevo {ROLE_LABEL[role] ?? 'usuario'}</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}
          {[
            { label: 'ID Institucional',     key: 'id_institucional', ph: 'ej: 2025-0001 o DOC-0200' },
            { label: 'Nombre completo',      key: 'nombre',           ph: 'ej: Juan Pérez' },
            { label: 'Correo institucional', key: 'correo',           ph: 'ej: j.perez@unicatolica.edu.co' },
            { label: 'Contraseña temporal',  key: 'password',         ph: 'Mínimo 6 caracteres', type: 'password' },
          ].map((f) => (
            <div key={f.key}>
              <div style={labelStyle}>{f.label}</div>
              <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
                type={f.type ?? 'text'} placeholder={f.ph}
                value={form[f.key]} onChange={set(f.key)} />
            </div>
          ))}
          {role === 'estudiante' && (
            <>
              <div>
                <div style={labelStyle}>Carrera</div>
                <select className="settings-select" style={{ width: '100%' }} value={form.carrera_id} onChange={set('carrera_id')}>
                  <option value="">Selecciona una carrera</option>
                  {careers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Semestre actual</div>
                <input type="number" min="1" max="12" className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
                  value={form.semestre_actual} onChange={set('semestre_actual')} />
              </div>
            </>
          )}
        </div>
        <div className="settings-modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="settings-save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : `Crear ${ROLE_LABEL[role] ?? 'usuario'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
