import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, Inbox, NotebookPen, Check, Ban, Target, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { gradeColor, corteAvg, courseOverall } from '../../utils/helpers';
import { getGrades } from '../../services/gradesService';
import { getSugerencias } from '../../utils/suggestions';
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/motionVariants';

export default function GradesView({ estudianteId, semestre, semData, initialCourseId }) {
  const [courses, setCourses] = useState(semData?.courses ?? []);
  const [loading, setLoading] = useState(!semData && !!estudianteId);
  const [error, setError]     = useState(null);

  const [selectedId,  setSelectedId]  = useState(initialCourseId || courses[0]?.id || null);
  const [activeCorte, setActiveCorte] = useState(() => courses[0]?.cortes?.[0]?.id ?? null);

  // Cargar desde API si hay estudianteId
  useEffect(() => {
    if (!estudianteId || !semestre) return;
    setLoading(true);
    getGrades(estudianteId, semestre)
      .then((data) => {
        setCourses(data);
        setSelectedId(initialCourseId ?? data[0]?.id ?? null);
        setActiveCorte(data[0]?.cortes?.[0]?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudianteId, semestre]);

  if (loading) return (
    <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando calificaciones...</div>
  );
  if (error) return (
    <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{error}</div>
  );
  if (courses.length === 0) return (
    <div className="empty"><div className="empty-icon"><Inbox /></div>No hay materias para este semestre</div>
  );

  const course  = courses.find((c) => c.id === selectedId) ?? courses[0];
  const corte   = course.cortes?.find((c) => c.id === activeCorte) ?? course.cortes?.[0];
  const cvg     = corte ? (corte.notaCorte ?? corteAvg(corte.actividades)) : null;
  const overall = course.notaDefinitivaCalculada ?? courseOverall(course.cortes ?? []);
  const sugerencias = getSugerencias(course, corte);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <div className="grid grid-2-1" style={{ gap: 18 }}>
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lista de cursos */}
          <div className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Materias del semestre</div>
            {courses.map((c) => {
              const ov = c.notaDefinitivaCalculada ?? courseOverall(c.cortes ?? []);
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setActiveCorte(c.cortes?.[0]?.id ?? null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                    background: selectedId === c.id ? 'var(--bg3)' : 'transparent',
                    border: `1.5px solid ${selectedId === c.id ? 'var(--border2)' : 'var(--border)'}`,
                    borderLeft: selectedId === c.id ? '3px solid var(--secondary)' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.color ?? '#1C3992', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {c.name}
                      {c.recuperable === false && (
                        <span title="Ya no es matemáticamente recuperable" style={{ display: 'inline-flex', color: 'var(--red)' }}>
                          <Ban size={12} />
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{c.code} · {c.teacher}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: gradeColor(ov) }}>
                      {ov != null ? ov.toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.attendance}% asist.</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen por corte */}
          <div className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Resumen por Corte</div>
            <AnimatePresence mode="wait">
              <motion.div key={course.id} variants={staggerContainer} initial="hidden" animate="show">
                {(course.cortes ?? []).map((ct) => {
                  const avg = ct.notaCorte ?? corteAvg(ct.actividades ?? []);
                  return (
                    <motion.div key={ct.id} variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div
                        style={{
                          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                          background: activeCorte === ct.id ? 'rgba(254,147,0,0.12)' : 'var(--bg3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          color: activeCorte === ct.id ? 'var(--accent)' : 'var(--text2)',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        onClick={() => setActiveCorte(ct.id)}
                      >
                        {ct.label?.replace('Corte ', '') ?? '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {ct.label} <span style={{ fontSize: 10, color: 'var(--text3)' }}>({ct.weight}%)</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {(ct.actividades ?? []).filter((a) => a.value != null).length}/{(ct.actividades ?? []).length} evaluaciones
                        </div>
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 700, color: gradeColor(avg) }}>
                        {avg != null ? avg.toFixed(1) : '—'}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '2px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Nota acumulada</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${course.id}-overall`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: gradeColor(overall) }}
                >
                  {overall != null ? overall.toFixed(2) : '—'}
                </motion.div>
              </AnimatePresence>
            </div>

            {course.notaMinimaRequerida != null && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: course.recuperable ? 'rgba(254,147,0,0.08)' : 'rgba(220,38,38,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>
                    Nota mínima requerida en lo pendiente
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: course.recuperable ? 'var(--accent)' : 'var(--red)' }}>
                    {Math.max(0, course.notaMinimaRequerida).toFixed(2)}
                  </div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                  color: course.recuperable ? 'var(--green)' : 'var(--red)',
                }}>
                  {course.recuperable ? <><Check size={13} /> Recuperable</> : <><Ban size={13} /> No recuperable</>}
                </span>
              </div>
            )}

            {sugerencias.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sugerencias.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 9 }}>
                    <div style={{ color: 'var(--text3)', display: 'flex', marginTop: 1, flexShrink: 0 }}>
                      {s.type === 'actividad-clave' && <Target size={14} />}
                      {s.type === 'tendencia' && (s.subiendo ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}
                      {s.type === 'asistencia' && <Clock size={14} />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
                      {s.type === 'actividad-clave' && (
                        s.imposible
                          ? <>Ya no puedes llegar a 3.0 en este corte aunque saques 5.0 en el resto — habla con tu docente.</>
                          : <>En <strong style={{ color: 'var(--text)' }}>{s.actividad}</strong> ({s.peso}% del corte) necesitas al menos <strong style={{ color: 'var(--text)' }}>{s.necesario.toFixed(1)}</strong> para no cerrar la puerta a este corte.</>
                      )}
                      {s.type === 'tendencia' && (
                        <>Tu última nota (<strong style={{ color: 'var(--text)' }}>{s.ultima.toFixed(1)}</strong>) está {s.subiendo ? 'por encima' : 'por debajo'} de tu promedio anterior ({s.promedioAnterior.toFixed(1)}).</>
                      )}
                      {s.type === 'asistencia' && (
                        <>Tu asistencia está en {s.attendance}%, a {s.faltante} {s.faltante === 1 ? 'punto' : 'puntos'} del mínimo del 80% — vale la pena cuidarla.</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: actividades del corte */}
        <div className="card" style={{ padding: 22 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: course.color ?? '#1C3992' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{course.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{course.teacher}</div>
                </div>
              </div>

              <div className="corte-tabs">
                {(course.cortes ?? []).map((ct) => (
                  <button
                    key={ct.id}
                    className={`corte-tab ${activeCorte === ct.id ? 'active' : ''}`}
                    onClick={() => setActiveCorte(ct.id)}
                  >
                    {ct.label}
                    <span className="corte-weight">{ct.weight}% de la nota</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${course.id}-${activeCorte}`}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {!corte || (corte.actividades ?? []).length === 0 ? (
                <div className="empty"><div className="empty-icon"><NotebookPen /></div>Sin actividades en este corte</div>
              ) : (
                corte.actividades.map((act) => (
                  <motion.div key={act.id} variants={staggerItem} className="actividad-row">
                    <span className={`tipo-chip tipo-${act.tipo}`}>{act.tipo}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{act.label}</div>
                    </div>
                    {act.value != null ? (
                      <div style={{ fontSize: 21, fontWeight: 700, color: gradeColor(act.value), letterSpacing: '-0.5px' }}>
                        {act.value.toFixed(1)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Pendiente</div>
                    )}
                  </motion.div>
                ))
              )}

              {corte && (corte.actividades ?? []).length > 0 && (
                <motion.div variants={staggerItem} style={{ background: 'var(--bg3)', borderRadius: 11, padding: '12px 16px', marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>
                      Promedio {corte.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', color: gradeColor(cvg) }}>
                      {cvg != null ? cvg.toFixed(2) : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}>
                      Peso final
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.8px' }}>
                      {corte.weight}%
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
