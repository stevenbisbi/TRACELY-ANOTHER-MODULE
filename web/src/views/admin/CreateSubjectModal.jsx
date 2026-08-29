import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createSubject, getTeachers, getPensumByCarrera, getCareers } from '../../services/adminAcademicService';
import { getActiveSemester } from '../../services/semesterService';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

// Modal crear asignatura (RF-12: crea automáticamente sus 3 cortes 30/30/40).
// Si se invoca con `fixedCarreraId` (desde el detalle de un programa), la
// carrera queda fija y no se muestra el selector.
export default function CreateSubjectModal({ fixedCarreraId, onClose, onSuccess }) {
  const [form, setForm]         = useState({ nombre: '', NRC: '', docente_id: '', pensum_id: '', semestre_academico: '' });
  const [carreraId, setCarreraId] = useState(fixedCarreraId ?? '');
  const [careers, setCareers]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [pensumOptions, setPensumOptions] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    Promise.all([getCareers(), getTeachers(), getActiveSemester()])
      .then(([cs, ts, activo]) => {
        setCareers(cs);
        setTeachers(ts);
        if (!fixedCarreraId && cs[0]) setCarreraId(cs[0].id);
        if (activo?.codigo) setForm((p) => ({ ...p, semestre_academico: activo.codigo }));
      })
      .catch((e) => setError(e.message));
  }, [fixedCarreraId]);

  useEffect(() => {
    if (!carreraId) return;
    getPensumByCarrera(carreraId).then(setPensumOptions).catch((e) => setError(e.message));
  }, [carreraId]);

  const carreraNombre = careers.find((c) => c.id === fixedCarreraId)?.nombre;
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nombre || !form.NRC || !form.docente_id || !form.pensum_id || !form.semestre_academico)
      return setError('Todos los campos son obligatorios');
    setLoading(true); setError(null);
    try {
      await createSubject(form);
      onSuccess(`Asignatura "${form.nombre}" creada con sus 3 cortes (30/30/40)`);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Crear nueva asignatura</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}
          <div>
            <div style={labelStyle}>Nombre de la materia</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="ej: Bases de Datos II" value={form.nombre} onChange={set('nombre')} />
          </div>
          <div>
            <div style={labelStyle}>NRC (código único de grupo)</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="ej: NRC0009" value={form.NRC} onChange={set('NRC')} />
          </div>
          <div>
            <div style={labelStyle}>Docente</div>
            <select className="settings-select" style={{ width: '100%' }} value={form.docente_id} onChange={set('docente_id')}>
              <option value="">Selecciona un docente</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.usuario?.nombre} ({t.usuario_id}) — {t.usuario?.correo}</option>)}
            </select>
          </div>
          {fixedCarreraId ? (
            <div>
              <div style={labelStyle}>Carrera</div>
              <div className="input-field" style={{ width: '100%', boxSizing: 'border-box', color: 'var(--text2)' }}>{carreraNombre ?? '—'}</div>
            </div>
          ) : (
            <div>
              <div style={labelStyle}>Carrera</div>
              <select className="settings-select" style={{ width: '100%' }}
                value={carreraId}
                onChange={(e) => { setCarreraId(e.target.value); setForm((p) => ({ ...p, pensum_id: '' })); }}>
                {careers.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <div style={labelStyle}>Materia del pensum</div>
            <select className="settings-select" style={{ width: '100%' }} value={form.pensum_id} onChange={set('pensum_id')}>
              <option value="">Selecciona</option>
              {pensumOptions.map((p) => <option key={p.id} value={p.id}>{p.nombre_asignatura} (semestre {p.semestre})</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Semestre académico</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="ej: 2026-2" value={form.semestre_academico} onChange={set('semestre_academico')} />
          </div>
        </div>
        <div className="settings-modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="settings-save-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'Crear asignatura'}
          </button>
        </div>
      </div>
    </div>
  );
}
