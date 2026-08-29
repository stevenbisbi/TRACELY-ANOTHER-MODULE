import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { updateCareer } from '../../services/adminAcademicService';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

export default function EditCareerModal({ career, onClose, onSuccess }) {
  const [nombre, setNombre]     = useState(career.name ?? career.nombre ?? '');
  const [codigo, setCodigo]     = useState(career.codigo ?? '');
  const [creditos, setCreditos] = useState(career.total_creditos ?? '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async () => {
    if (!nombre.trim() || !codigo.trim()) return setError('Nombre y código son obligatorios');
    setLoading(true); setError(null);
    try {
      await updateCareer(career.id, { nombre: nombre.trim(), codigo: codigo.trim(), total_creditos: Number(creditos) || 0 });
      onSuccess('Carrera actualizada');
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Editar carrera</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}
          <div>
            <div style={labelStyle}>Nombre</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>Código</div>
            <input className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
          </div>
          <div>
            <div style={labelStyle}>Créditos totales</div>
            <input type="number" min="0" className="settings-input" style={{ width: '100%', boxSizing: 'border-box' }} value={creditos} onChange={(e) => setCreditos(e.target.value)} />
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
