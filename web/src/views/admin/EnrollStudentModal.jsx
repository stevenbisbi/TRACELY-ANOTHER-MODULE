import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { getSubjects, getStudents, enrollStudent, getInscripcionesByAsignatura, unenrollStudent } from '../../services/adminAcademicService';
import SearchSelect from '../../components/common/SearchSelect';

const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 5 };

// Modal inscribir estudiante (RF-13) — búsqueda en vez de <select>. Si se
// invoca con `fixedAsignaturaId` (ej. desde el detalle de una materia
// dentro de un programa), el selector de asignatura se oculta y queda fijo,
// y además se muestra el roster actual con opción de des-inscribir.
export default function EnrollStudentModal({ fixedAsignaturaId, fixedAsignaturaLabel, onClose, onSuccess }) {
  const [subjects, setSubjects]         = useState([]);
  const [student, setStudent]           = useState(null);
  const [asignaturaId, setAsignaturaId] = useState(fixedAsignaturaId ?? '');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const [roster, setRoster]           = useState([]);
  const [rosterLoading, setRosterLoading] = useState(!!fixedAsignaturaId);
  const [removingId, setRemovingId]   = useState(null);

  const loadRoster = useCallback(() => {
    if (!fixedAsignaturaId) return;
    setRosterLoading(true);
    getInscripcionesByAsignatura(fixedAsignaturaId)
      .then(setRoster)
      .catch(() => setRoster([]))
      .finally(() => setRosterLoading(false));
  }, [fixedAsignaturaId]);

  useEffect(() => {
    if (fixedAsignaturaId) { loadRoster(); return; }
    getSubjects().then(setSubjects).catch((e) => setError(e.message));
  }, [fixedAsignaturaId, loadRoster]);

  const handleSubmit = async () => {
    if (!student || !asignaturaId) return setError('Busca un estudiante y selecciona una asignatura');
    setLoading(true); setError(null);
    try {
      await enrollStudent(student.id, asignaturaId);
      if (fixedAsignaturaId) {
        setStudent(null);
        loadRoster();
        onSuccess?.('Estudiante inscrito correctamente');
      } else {
        onSuccess('Estudiante inscrito correctamente');
        onClose();
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleUnenroll = async (inscripcion) => {
    setRemovingId(inscripcion.id);
    try {
      await unenrollStudent(inscripcion.id);
      loadRoster();
      onSuccess?.(`${inscripcion.estudiante?.usuario?.nombre ?? 'Estudiante'} des-inscrito`);
    } catch (e) { setError(e.message); }
    finally { setRemovingId(null); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, overflow: 'visible' }}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">{fixedAsignaturaId ? `Inscritos — ${fixedAsignaturaLabel}` : 'Inscribir estudiante'}</h2>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'visible' }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

          {fixedAsignaturaId && (
            <div>
              <div style={labelStyle}>Inscritos actualmente</div>
              {rosterLoading ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="spin" /> Cargando...</div>
              ) : roster.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nadie inscrito todavía</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {roster.map((i) => (
                    <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{i.estudiante?.usuario?.nombre ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{i.estudiante?.usuario?.id_institucional}</div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleUnenroll(i)}
                        disabled={removingId === i.id}
                        style={{ color: 'var(--red)', fontSize: 12 }}
                      >
                        {removingId === i.id ? 'Quitando...' : 'Quitar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={labelStyle}>{fixedAsignaturaId ? 'Agregar estudiante' : 'Estudiante'}</div>
            <SearchSelect
              value={student}
              onSelect={setStudent}
              fetchResults={(q) => getStudents({ search: q, asignatura_id: fixedAsignaturaId })}
              getLabel={(s) => `${s.name} (${s.usuarioId})`}
              isItemDisabled={(s) => s.yaInscrito}
              renderItem={(s) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.yaInscrito && <span className="badge badge-active" style={{ flexShrink: 0 }}>Inscrito</span>}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.usuarioId} · {s.correo}</div>
                  </div>
                </div>
              )}
              placeholder="Busca por nombre, ID o correo..."
            />
          </div>
          {fixedAsignaturaId ? (
            <div>
              <div style={labelStyle}>Asignatura</div>
              <div className="input-field" style={{ width: '100%', boxSizing: 'border-box', color: 'var(--text2)' }}>{fixedAsignaturaLabel}</div>
            </div>
          ) : (
            <div>
              <div style={labelStyle}>Asignatura</div>
              <select className="settings-select" style={{ width: '100%' }} value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)}>
                <option value="">Selecciona una asignatura</option>
                {subjects.map((a) => <option key={a.id} value={a.id}>{a.nombre} — {a.NRC} ({a.semestre_academico})</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="settings-modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>{fixedAsignaturaId ? 'Cerrar' : 'Cancelar'}</button>
          <button className="settings-save-btn" onClick={handleSubmit} disabled={loading || !student}>
            {loading ? 'Inscribiendo...' : 'Inscribir'}
          </button>
        </div>
      </div>
    </div>
  );
}
