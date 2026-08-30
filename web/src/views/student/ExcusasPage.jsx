import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, FileText, Upload, CheckCircle2, XCircle, Clock, Sparkles,
  AlertTriangle, Quote, CalendarDays,
} from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import { radicarExcusa, getMisExcusas } from '../../services/excusasService';

// ── Estado de la excusa: etiqueta, color y clase de badge ─────────────────────
const ESTADO = {
  radicada:            { label: 'Radicada', badge: 'badge', icon: Clock },
  analizada_ia:        { label: 'Analizada por IA', badge: 'badge', icon: Sparkles },
  pendiente_direccion: { label: 'En revisión de Dirección', badge: 'badge badge-warning', icon: Clock },
  avalada:             { label: 'Avalada', badge: 'badge badge-active', icon: CheckCircle2 },
  rechazada:           { label: 'Rechazada', badge: 'badge badge-critical', icon: XCircle },
  vencida:             { label: 'Vencida', badge: 'badge', icon: XCircle },
};

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

// Etiqueta de campo visible sobre fondo claro (login-label es blanca).
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 };

// ── Tarjeta con el análisis de la IA de una excusa ────────────────────────────
function AnalisisIA({ analisis }) {
  if (!analisis) return null;
  if (analisis.error) {
    return <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 8 }}>El análisis automático no está disponible; queda para revisión manual.</div>;
  }
  const ext = analisis.extraccion;
  const ev = analisis.evaluacion;
  return (
    <div style={{ marginTop: 12, background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        <Sparkles size={13} /> Análisis del asistente
      </div>
      {ext && (
        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8, lineHeight: 1.5 }}>{ext.resumen}</div>
      )}
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
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
            Ver evaluación contra el reglamento{ev.citations?.length ? ` (${ev.citations.length} citas)` : ''}
          </summary>
          <div style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ev.text}</div>
          {ev.citations?.slice(0, 3).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--text3)', marginTop: 6, fontStyle: 'italic' }}>
              <Quote size={12} style={{ flexShrink: 0, marginTop: 2 }} />
              «{(c.cited_text || '').trim().slice(0, 120)}»{c.start_page_number ? ` (pág. ${c.start_page_number})` : ''}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

export default function ExcusasPage({ estudianteId }) {
  const [excusas, setExcusas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulario
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [file, setFile] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExcusas(await getMisExcusas());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (estudianteId) cargar(); }, [estudianteId, cargar]);

  const enviar = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    if (!fechaInicio || !fechaFin) return setFormError('Indica el rango de fechas que cubre el certificado.');
    if (fechaFin < fechaInicio) return setFormError('La fecha de fin no puede ser anterior a la de inicio.');
    if (!file) return setFormError('Adjunta el certificado (PDF o imagen).');

    setEnviando(true);
    try {
      const r = await radicarExcusa({ fechaInicio, fechaFin, file });
      setSuccess(r.ia_analizada
        ? 'Excusa radicada y analizada por el asistente. Queda en revisión de la Dirección.'
        : 'Excusa radicada. Queda en revisión de la Dirección.');
      setFile(null);
      setFechaInicio('');
      setFechaFin('');
      await cargar();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando excusas...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Formulario para radicar ── */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={17} /> Radicar excusa de inasistencia
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4, marginBottom: 16 }}>
          Sube tu certificado (incapacidad, calamidad, etc.). Cubre todas tus materias en esas fechas. El asistente lo analizará y la Dirección del programa decidirá.
        </div>

        {formError && <div className="login-error" style={{ marginBottom: 12 }}>{formError}</div>}
        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle2 size={15} /> {success}
          </div>
        )}

        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div>
              <label style={lbl}>Desde</label>
              <input type="date" className="input-field" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lbl}>Hasta</label>
              <input type="date" className="input-field" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={lbl}>Certificado (PDF o imagen)</label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13, color: 'var(--text2)' }}
            />
            {file && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}><FileText size={13} /> {file.name}</div>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={enviando} style={{ alignSelf: 'flex-start' }}>
            {enviando ? <><Loader2 size={15} className="spin" /> Enviando...</> : <><Upload size={15} /> Radicar excusa</>}
          </button>
        </form>
      </div>

      {/* ── Lista de mis excusas ── */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title">Mis excusas</div>
        {excusas.length === 0 ? (
          <div className="empty"><div className="empty-icon"><FileText /></div>Aún no has radicado ninguna excusa.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {excusas.map((ex) => {
              const est = ESTADO[ex.estado] ?? ESTADO.radicada;
              const Icon = est.icon;
              return (
                <div key={ex.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 11, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CalendarDays size={15} style={{ color: 'var(--text3)' }} />
                        {fmt(ex.fecha_inicio)}{ex.fecha_fin !== ex.fecha_inicio ? ` — ${fmt(ex.fecha_fin)}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                        {TIPO_LABEL[ex.tipo] ?? ex.tipo}
                        {ex.dentro_de_plazo === false && <span style={{ color: 'var(--orange)', marginLeft: 8 }}>· fuera de plazo</span>}
                      </div>
                    </div>
                    <span className={est.badge} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={12} /> {est.label}
                    </span>
                  </div>

                  {ex.cobertura?.inasistencias > 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--green)', marginTop: 8, fontWeight: 600 }}>
                      Justificó {ex.cobertura.inasistencias} inasistencia{ex.cobertura.inasistencias === 1 ? '' : 's'}
                      {ex.cobertura.materias?.length ? ` en ${ex.cobertura.materias.length} materia${ex.cobertura.materias.length === 1 ? '' : 's'}: ${ex.cobertura.materias.join(', ')}` : ''}
                    </div>
                  )}

                  {ex.motivo_decision && (
                    <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 8, fontStyle: 'italic' }}>
                      Dirección: “{ex.motivo_decision}”
                    </div>
                  )}

                  <AnalisisIA analisis={ex.analisis_ia} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
