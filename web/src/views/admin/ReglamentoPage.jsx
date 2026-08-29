import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, ScrollText, Upload, Sparkles, ArrowRight, AlertTriangle,
  Wrench, CheckCircle2, Users, FileText,
} from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import {
  getPoliticaVigente, interpretarReglamento, aplicarPolitica,
} from '../../services/politicaService';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 };

const TIPO_CAMBIO = {
  parametrico: { label: 'Paramétrico', color: 'var(--accent)', icon: ArrowRight },
  estructural: { label: 'Estructural', color: 'var(--orange)', icon: Wrench },
  sin_cambio:  { label: 'Sin cambio', color: 'var(--text3)', icon: CheckCircle2 },
};

export default function ReglamentoPage() {
  const [vigente, setVigente] = useState(null);
  const [file, setFile] = useState(null);
  const [interpretando, setInterpretando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [aplicada, setAplicada] = useState(null);

  useEffect(() => {
    getPoliticaVigente().then(setVigente).catch(() => {});
  }, []);

  const interpretar = async () => {
    setError('');
    setResultado(null);
    setAplicada(null);
    if (!file) return setError('Adjunta el PDF del reglamento nuevo.');
    setInterpretando(true);
    try {
      setResultado(await interpretarReglamento(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setInterpretando(false);
    }
  };

  const aplicar = async () => {
    setError('');
    setAplicando(true);
    try {
      const r = await aplicarPolitica(resultado.parametrosPropuestos, 'reforma');
      setAplicada(r.politica);
      setVigente(r.politica);
      setResultado(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setAplicando(false);
    }
  };

  const cambiosRelevantes = resultado?.propuesta?.cambios?.filter((c) => c.tipo_cambio !== 'sin_cambio') ?? [];
  const estructurales = resultado?.propuesta?.cambios_estructurales_detectados ?? [];

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Política vigente */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScrollText size={18} /> Política académica vigente
        </div>
        {vigente ? (
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 12 }}>
            <Stat label="Versión" value={`v${vigente.version}`} />
            <Stat label="Máx. sin justificar" value={`${(vigente.parametros?.inasistencia_max_sin_justificar ?? 0) * 100}%`} />
            <Stat label="Máx. con justificar" value={`${(vigente.parametros?.inasistencia_max_con_justificar ?? 0) * 100}%`} />
            <Stat label="Plazo (días hábiles)" value={vigente.parametros?.plazo_radicacion_dias_habiles ?? '—'} />
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>Cargando…</div>
        )}
      </div>

      {/* Subir reglamento nuevo */}
      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={17} /> Interpretar un reglamento nuevo
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4, marginBottom: 16 }}>
          Sube el PDF del reglamento reformado. El asistente lo comparará con la política vigente y propondrá los cambios. Nada se aplica sin tu aprobación.
        </div>

        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        {aplicada && (
          <div style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle2 size={15} /> Política v{aplicada.version} activada. El motor ya la usa.
          </div>
        )}

        <label style={lbl}>Reglamento (PDF)</label>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, color: 'var(--text2)' }} />
        {file && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}><FileText size={13} /> {file.name}</div>}

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={interpretando} onClick={interpretar}>
            {interpretando ? <><Loader2 size={15} className="spin" /> Interpretando…</> : <><Sparkles size={15} /> Interpretar</>}
          </button>
        </div>
      </div>

      {/* Propuesta */}
      {resultado && (
        <div className="card" style={{ padding: 22 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={17} /> Propuesta del asistente
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 8, lineHeight: 1.5 }}>{resultado.propuesta?.resumen}</div>

          {/* Cambios */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cambiosRelevantes.map((c, i) => {
              const t = TIPO_CAMBIO[c.tipo_cambio] ?? TIPO_CAMBIO.sin_cambio;
              const Icon = t.icon;
              return (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.08)', borderLeft: `4px solid ${t.color}`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{c.parametro}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.color, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Icon size={12} /> {t.label}{c.articulo ? ` · ${c.articulo}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text3)' }}>{c.valor_actual}</span>
                    <ArrowRight size={14} style={{ color: t.color }} />
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.valor_nuevo ?? '—'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{c.descripcion}</div>
                </div>
              );
            })}
          </div>

          {/* Estructurales */}
          {estructurales.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={13} /> Requieren desarrollo (no se aplican solos)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {estructurales.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 3, color: 'var(--orange)' }} /> {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impacto */}
          {resultado.impacto && (
            <div style={{ marginTop: 16, background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} /> Impacto en el semestre actual
              </div>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 10 }}>
                <Stat label="Inscripciones evaluadas" value={resultado.impacto.inscripciones_evaluadas} />
                <Stat label="Pasarían a perder" value={resultado.impacto.nuevos_perdidos} color={resultado.impacto.nuevos_perdidos > 0 ? 'var(--red)' : undefined} />
                <Stat label="Pasarían a riesgo" value={resultado.impacto.nuevos_en_riesgo} color={resultado.impacto.nuevos_en_riesgo > 0 ? 'var(--orange)' : undefined} />
              </div>
            </div>
          )}

          {/* Aplicar */}
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={aplicando} onClick={aplicar} style={{ background: 'var(--green)', borderColor: 'var(--green)' }}>
              {aplicando ? <><Loader2 size={15} className="spin" /> Aplicando…</> : <><CheckCircle2 size={15} /> Aprobar y aplicar cambios paramétricos</>}
            </button>
            <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Solo se aplican los cambios paramétricos. Los estructurales quedan pendientes de desarrollo.</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 3, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  );
}
