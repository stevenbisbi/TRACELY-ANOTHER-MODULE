import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { updateSubject, getTeachers } from '../../services/adminAcademicService';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

export default function EditSubjectModal({ subject, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: subject.nombre,
    NRC: subject.NRC,
    docente_id: subject.docente_id,
    semestre_academico: subject.semestre_academico,
    umbral_advertencia: subject.umbral_advertencia,
  });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => { getTeachers().then(setTeachers).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nombre || !form.NRC || !form.docente_id || !form.semestre_academico)
      return setError('Todos los campos son obligatorios');
    setLoading(true); setError(null);
    try {
      await updateSubject(subject.id, { ...form, umbral_advertencia: Number(form.umbral_advertencia) });
      onSuccess('Asignatura actualizada');
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Editar asignatura</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}
          <div>
            <div style={labelStyle}>Nombre de la materia</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.nombre} onChange={set('nombre')} />
          </div>
          <div>
            <div style={labelStyle}>NRC</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.NRC} onChange={set('NRC')} />
          </div>
          <div>
            <div style={labelStyle}>Docente</div>
            <select className="settings-select" style={{ width: '100%' }} value={form.docente_id} onChange={set('docente_id')}>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.usuario?.nombre} ({t.usuario_id}) — {t.usuario?.correo}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Semestre académico</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.semestre_academico} onChange={set('semestre_academico')} />
          </div>
          <div>
            <div style={labelStyle}>Umbral de advertencia</div>
            <input type="number" step="0.1" min="0" max="5" className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={form.umbral_advertencia} onChange={set('umbral_advertencia')} />
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
