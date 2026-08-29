import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Ban, Check, BellOff, ArrowRight } from 'lucide-react';
import { getStudentAlerts } from '../../services/alertService';
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/motionVariants';

const FILTERS = ['all', 'activa', 'resuelta'];
const FILTER_LABEL = { all: 'Todas', activa: 'Activas', resuelta: 'Resueltas' };
const TIPO_LABEL = { advertencia: 'Advertencia', critica: 'Crítica' };

// Qué tan urgente es una alerta, para ordenar por severidad en vez de por
// fecha: lo primero que debe ver el estudiante es lo que ya no tiene
// arreglo, no lo que se generó más recientemente.
function severityRank(a) {
  if (a.estado === 'resuelta') return 3;
  if (!a.recuperable) return 0;
  if (a.tipo === 'critica') return 1;
  return 2;
}

// Mensaje en lenguaje llano — reemplaza el número aislado ("nota mínima
// requerida: 4.9") por una frase que dice qué pasa y qué hacer.
function buildMessage(a) {
  if (a.categoria === 'asistencia') {
    return `Tu asistencia en esta materia es del ${a.attendance}%, por debajo del mínimo del 80% requerido.`;
  }
  if (!a.recuperable) {
    return 'Ya no es matemáticamente posible aprobar esta materia por notas. Habla con tu docente o con coordinación académica.';
  }
  if (a.cortesPendientes?.length > 0) {
    const nombres = a.cortesPendientes.map((c) => `Corte ${c.numero_corte}`).join(' y ');
    const plural = a.cortesPendientes.length > 1 ? 's' : '';
    const base = `${nombres} (${a.pesoPendienteTotal}% del curso) sigue${plural ? 'n' : ''} pendiente${plural}`;
    return a.notaMinimaRequerida != null
      ? `${base} — necesitas ${Math.max(0, a.notaMinimaRequerida).toFixed(1)} de promedio para aprobar.`
      : `${base}. Aún no hay suficientes notas para proyectar cuánto necesitas.`;
  }
  return 'Tu proyección está por debajo del umbral esperado. Revisa el detalle en Notas.';
}

export default function AlertsPage({ estudianteId, semestre, onNavigate }) {
  const [alerts, setAlerts]   = useState([]);
  const [filter, setFilter]   = useState('activa');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!estudianteId) return;
    setLoading(true);
    setError(null);
    getStudentAlerts(estudianteId, semestre)
      .then((data) => setAlerts(
        [...data].sort((a, b) => severityRank(a) - severityRank(b) || new Date(b.fecha) - new Date(a.fecha))
      ))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudianteId, semestre]);

  const filtered = alerts.filter((a) => filter === 'all' || a.estado === filter);
  const activeCount = alerts.filter((a) => a.estado === 'activa').length;

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando alertas...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <div className="card" style={{ padding: 22 }}>
        <div className="section-header">
          <div>
            <div className="section-title">Mis Alertas</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {activeCount > 0
                ? `${activeCount} alerta${activeCount === 1 ? '' : 's'} activa${activeCount === 1 ? '' : 's'}`
                : 'Sin alertas activas'}
            </div>
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            {FILTERS.map((f) => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><BellOff /></div>
            {filter === 'all' ? 'No tienes alertas registradas' : `No tienes alertas ${FILTER_LABEL[filter].toLowerCase()}`}
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {filtered.map((a) => {
              const critica = a.tipo === 'critica';
              const activa = a.estado === 'activa';
              const color = critica ? 'var(--red)' : 'var(--orange)';
              // Cuando está resuelta, el color deja de "gritar" — todo el
              // texto se apaga a gris, no solo el fondo, para que se lea
              // como desactivado de un vistazo.
              const accent   = activa ? color : 'var(--text3)';
              const heading  = activa ? 'var(--text)' : 'var(--text3)';
              const body     = activa ? 'var(--text)' : 'var(--text3)';
              return (
                <motion.div
                  key={a.id}
                  variants={staggerItem}
                  style={{
                    background: activa ? 'var(--card)' : 'var(--bg3)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderLeft: `4px solid ${accent}`,
                    borderRadius: 11, padding: '14px 18px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: accent, display: 'flex' }}><AlertTriangle size={18} /></div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: heading }}>
                          {a.asignaturaNombre} {a.asignaturaNRC && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)' }}>· {a.asignaturaNRC}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {new Date(a.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        className={activa ? `badge ${critica ? 'badge-critical' : 'badge-warning'}` : 'badge'}
                        style={activa ? undefined : { background: 'var(--border2)', color: 'var(--text3)' }}
                      >
                        {TIPO_LABEL[a.tipo] ?? a.tipo}
                      </span>
                      <span
                        className={activa ? 'badge badge-active' : 'badge'}
                        style={activa ? undefined : { background: 'var(--border2)', color: 'var(--text3)' }}
                      >
                        {activa ? 'Activa' : 'Resuelta'}
                      </span>
                    </div>
                  </div>

                  {/* Mensaje accionable — lo primero que se lee */}
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: body, marginTop: 10, lineHeight: 1.5 }}>
                    {buildMessage(a)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      {a.categoria === 'asistencia' ? (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Asistencia actual</div>
                          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: body }}>
                            {a.attendance}%
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nota proyectada</div>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: body }}>
                              {a.notaProyectada != null ? a.notaProyectada.toFixed(2) : '—'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nota mínima requerida</div>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: accent }}>
                              {a.notaMinimaRequerida != null ? Math.max(0, a.notaMinimaRequerida).toFixed(2) : '—'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Recuperabilidad</div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4, color: activa ? (a.recuperable ? 'var(--green)' : 'var(--red)') : 'var(--text3)' }}>
                              {a.recuperable ? <><Check size={13} /> Recuperable</> : <><Ban size={13} /> No recuperable</>}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {onNavigate && a.asignaturaId && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onNavigate(a.categoria === 'asistencia' ? 'attendance' : 'grades', a.asignaturaId)}
                        style={{ flexShrink: 0 }}
                      >
                        {a.categoria === 'asistencia' ? 'Ver asistencia' : 'Ver notas'} <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
