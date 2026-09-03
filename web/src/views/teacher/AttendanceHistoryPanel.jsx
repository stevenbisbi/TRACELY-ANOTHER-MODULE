import { useState, useEffect, useMemo } from 'react';
import { X, History, Loader2, AlertTriangle, Users, Check } from 'lucide-react';
import { getAttendanceHistory } from '../../services/attendanceService';

function fmtShort(fecha) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
function fmtLong(fecha) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Historial completo de asistencia del curso: una columna por cada fecha en
// que se tomó asistencia, una fila por estudiante, desde el primer registro
// hasta hoy. Distingue ausente justificada (por excusa avalada) de la simple.
export default function AttendanceHistoryPanel({ course, onClose }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    getAttendanceHistory(course.id)
      .then((data) => !cancelado && setInscripciones(data ?? []))
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [course.id]);

  const fechas = useMemo(() => {
    const set = new Set();
    inscripciones.forEach((insc) => (insc.asistencias ?? []).forEach((a) => set.add(a.fecha)));
    return [...set].sort();
  }, [inscripciones]);

  const filas = useMemo(() => inscripciones.map((insc) => {
    const porFecha = {};
    (insc.asistencias ?? []).forEach((a) => { porFecha[a.fecha] = a; });
    return {
      inscripcionId: insc.id,
      nombre: insc.estudiante?.usuario?.nombre ?? '—',
      idInst: insc.estudiante?.usuario?.id_institucional ?? '',
      porFecha,
    };
  }), [inscripciones]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ maxWidth: 1100, maxHeight: '92vh' }}>
        <div className="panel-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={17} /> Historial de Asistencia
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: course.color, marginRight: 6 }} />
              {course.name} · Grupo {course.group ?? ''}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>

        {loading ? (
          <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando historial...</div>
        ) : error ? (
          <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
        ) : filas.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Users /></div>Sin estudiantes en este grupo</div>
        ) : fechas.length === 0 ? (
          <div className="empty"><div className="empty-icon"><History /></div>Todavía no se ha registrado asistencia en este curso</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: 'var(--text2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span className="att-chip present" style={{ width: 18, height: 18 }}><Check size={11} /></span> Presente
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span className="att-chip absent" style={{ width: 18, height: 18 }}><X size={11} /></span> Ausente
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span className="att-chip absent" style={{ width: 18, height: 18, opacity: 0.5, boxShadow: '0 0 0 2px var(--accent) inset' }}><X size={11} /></span> Ausente, justificada por excusa
              </span>
              <span style={{ marginLeft: 'auto' }}>{fechas.length} fecha{fechas.length === 1 ? '' : 's'} registrada{fechas.length === 1 ? '' : 's'}</span>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              <table className="table" style={{ minWidth: 180 + fechas.length * 56 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 1, minWidth: 180 }}>Estudiante</th>
                    {fechas.map((f) => (
                      <th key={f} style={{ textAlign: 'center', minWidth: 56, whiteSpace: 'nowrap' }} title={fmtLong(f)}>
                        {fmtShort(f)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.inscripcionId}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{fila.nombre}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{fila.idInst}</div>
                      </td>
                      {fechas.map((f) => {
                        const a = fila.porFecha[f];
                        if (!a) return <td key={f} style={{ textAlign: 'center', color: 'var(--text3)' }}>—</td>;
                        return (
                          <td key={f} style={{ textAlign: 'center' }} title={a.justificada ? 'Ausente — justificada por excusa' : a.presente ? 'Presente' : 'Ausente'}>
                            <span
                              className={`att-chip ${a.presente ? 'present' : 'absent'}`}
                              style={{ margin: '0 auto', cursor: 'default', ...(a.justificada ? { boxShadow: '0 0 0 2px var(--accent) inset' } : {}) }}
                            >
                              {a.presente ? <Check size={13} /> : <X size={13} />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
