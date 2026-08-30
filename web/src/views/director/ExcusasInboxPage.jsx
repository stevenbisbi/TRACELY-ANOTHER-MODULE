import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Inbox, CheckCircle2, XCircle, Sparkles, AlertTriangle, Quote,
  CalendarDays, User, Clock,
} from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import { getPendientes, decidirExcusa } from '../../services/excusasService';

const TIPO_LABEL = {
  enfermedad_incapacitante: 'Enfermedad incapacitante',
  calamidad_domestica: 'Calamidad doméstica',
  motivos_laborales: 'Motivos laborales',
  emergencia_desastre: 'Emergencia o desastre',
  no_clasificado: 'Sin clasificar',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Bloque con el análisis del asistente para apoyar la decisión.
function AnalisisIA({ analisis }) {
  if (!analisis) return <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 8 }}>Sin análisis automático — revisar el documento manualmente.</div>;
  if (analisis.error) return <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 8 }}>El análisis automático falló; revisar manualmente.</div>;
  const ext = analisis.extraccion;
  const ev = analisis.evaluacion;
  return (
    <div style={{ marginTop: 12, background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        <Sparkles size={13} /> Análisis del asistente
      </div>
      {ext && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5 }}>
          <span><b>Entidad:</b> {ext.entidad_emisora ?? '—'}</span>
          <span><b>Radicado:</b> {ext.numero_documento ?? '—'}</span>
          <span><b>Legible:</b> {ext.legible ? 'sí' : 'no'}</span>
        </div>
      )}
      {ext?.resumen && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8, lineHeight: 1.5 }}>{ext.resumen}</div>}
      {ext?.anomalias?.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ext.anomalias.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--orange)' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {a}
            </div>
          ))}
        </div>
      )}
      {ev?.text && (
        <details style={{ marginTop: 10 }} open>
          <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
            Evaluación contra el reglamento{ev.citations?.length ? ` (${ev.citations.length} citas)` : ''}
          </summary>
          <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ev.text}</div>
          {ev.citations?.slice(0, 3).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--text3)', marginTop: 6, fontStyle: 'italic' }}>
              <Quote size={12} style={{ flexShrink: 0, marginTop: 2 }} />
              «{(c.cited_text || '').trim().slice(0, 130)}»{c.start_page_number ? ` (pág. ${c.start_page_number})` : ''}
            </div>
          ))}
        </details>
      )}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, fontStyle: 'italic' }}>
        El asistente prepara la información; la decisión es suya.
      </div>
    </div>
  );
}

export default function ExcusasInboxPage() {
  const [excusas, setExcusas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [motivos, setMotivos] = useState({});   // por excusa id
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExcusas(await getPendientes());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const decidir = async (ex, decision) => {
    setProcesando(ex.id);
    try {
      await decidirExcusa(ex.id, decision, motivos[ex.id] || '');
      setExcusas((prev) => prev.filter((e) => e.id !== ex.id)); // sale de pendientes
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(null);
    }
  };

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando excusas...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Inbox size={18} /> Excusas por revisar
          {excusas.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{excusas.length}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4, marginBottom: 16 }}>
          Excusas de inasistencia de tu programa pendientes de aval. Avala o rechaza según el reglamento.
        </div>

        {excusas.length === 0 ? (
          <div className="empty"><div className="empty-icon"><CheckCircle2 /></div>No hay excusas pendientes. Todo al día.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {excusas.map((ex) => {
              const est = ex.estudiante;
              const nombre = est?.usuario?.nombre ?? '—';
              const programa = est?.carrera?.nombre;
              const busy = procesando === ex.id;
              return (
                <div key={ex.id} style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <User size={15} style={{ color: 'var(--text3)' }} /> {nombre}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 3 }}>
                        {est?.usuario?.id_institucional}{programa ? ` · ${programa}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <CalendarDays size={14} style={{ color: 'var(--text3)' }} />
                        {fmt(ex.fecha_inicio)}{ex.fecha_fin !== ex.fecha_inicio ? ` — ${fmt(ex.fecha_fin)}` : ''}
                      </div>
                      <div style={{ fontSize: 11.5, marginTop: 4, display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span className="badge">{TIPO_LABEL[ex.tipo] ?? ex.tipo}</span>
                        {ex.dentro_de_plazo === false
                          ? <span className="badge badge-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Fuera de plazo</span>
                          : <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> En plazo</span>}
                      </div>
                    </div>
                  </div>

                  <AnalisisIA analisis={ex.analisis_ia} />

                  {/* Decisión */}
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input-field"
                      placeholder="Motivo (opcional)"
                      value={motivos[ex.id] || ''}
                      onChange={(e) => setMotivos((m) => ({ ...m, [ex.id]: e.target.value }))}
                      style={{ flex: 1, minWidth: 200 }}
                    />
                    <button className="btn btn-primary" disabled={busy} onClick={() => decidir(ex, 'avalar')}
                      style={{ background: 'var(--green)', borderColor: 'var(--green)' }}>
                      {busy ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} Avalar
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => decidir(ex, 'rechazar')}
                      style={{ color: 'var(--red)' }}>
                      <XCircle size={15} /> Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
