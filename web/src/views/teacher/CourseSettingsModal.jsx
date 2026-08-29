import { useState } from 'react';
import { X, AlertTriangle, Loader2, Save, RotateCcw, Gauge, PieChart } from 'lucide-react';
import { updateCortes, updateUmbral } from '../../services/teacherGradesService';

const DEFAULT_PESOS = [30, 30, 40];

// Configuración del curso: pesos de los 3 cortes (por defecto 30/30/40,
// deben sumar 100%) y umbral de advertencia (por defecto 3.0). Antes esto
// solo se podía ajustar directo en la base de datos o, para el umbral, con
// un input suelto metido en el encabezado del dashboard.
export default function CourseSettingsModal({ course, onClose, onSaved }) {
  const [cortes, setCortes] = useState(() =>
    [...(course.cortes ?? [])]
      .sort((a, b) => a.numero_corte - b.numero_corte)
      .map((c) => ({ id: c.id, numero_corte: c.numero_corte, peso: String(c.weight ?? c.peso_porcentual ?? '') }))
  );
  const [umbral, setUmbral] = useState(String(course.umbralAdvertencia ?? 3.0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const suma = cortes.reduce((s, c) => s + (parseFloat(c.peso) || 0), 0);
  const sumaValida = Math.round(suma * 100) / 100 === 100;
  const umbralNum = parseFloat(umbral);
  const umbralValido = !isNaN(umbralNum) && umbralNum >= 0 && umbralNum <= 5;

  const setPeso = (id, val) => setCortes((prev) => prev.map((c) => c.id === id ? { ...c, peso: val } : c));
  const restaurarDefault = () => setCortes((prev) => prev.map((c, i) => ({ ...c, peso: String(DEFAULT_PESOS[i] ?? c.peso) })));

  const handleSubmit = async () => {
    if (!sumaValida) return setError(`Los pesos de los cortes deben sumar 100% (suman ${suma}%)`);
    if (!umbralValido) return setError('El umbral debe estar entre 0 y 5');
    setSaving(true); setError(null);
    try {
      await updateCortes(course.id, cortes.map((c) => ({ id: c.id, peso_porcentual: Number(c.peso) })));
      await updateUmbral(course.id, umbralNum);
      onSaved?.('Configuración del curso actualizada');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ maxWidth: 460 }}>
        <div className="panel-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Configuración del curso</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{course.name}</div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <PieChart size={13} /> Peso de los cortes
            </div>
            <button className="btn btn-ghost btn-sm" onClick={restaurarDefault} type="button">
              <RotateCcw size={11} /> 30 / 30 / 40
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {cortes.map((c) => (
              <div key={c.id} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>Corte {c.numero_corte}</div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="0" max="100" step="1"
                    className="grade-input" style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
                    value={c.peso} onChange={(e) => setPeso(c.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, textAlign: 'right', color: sumaValida ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            Suma: {suma}% {sumaValida ? '✓' : '(debe ser 100%)'}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Gauge size={13} /> Umbral de advertencia
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min="0" max="5" step="0.1"
              className="grade-input" style={{ width: 80 }}
              value={umbral} onChange={(e) => setUmbral(e.target.value)}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Se genera una alerta cuando la nota proyectada cae por debajo de este valor (por defecto 3.0).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !sumaValida || !umbralValido}>
            {saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : <><Save size={14} /> Guardar configuración</>}
          </button>
        </div>
      </div>
    </div>
  );
}
