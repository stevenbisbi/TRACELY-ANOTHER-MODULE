import { useState, useEffect, useMemo, useRef } from 'react';
import { X, NotebookPen, Users, Save, Loader2, AlertTriangle, Upload, CheckCircle2, Check, Pencil } from 'lucide-react';
import { gradeColor } from '../../utils/helpers';
import { getCourseGrades, createActividad, updateActividad, deleteActividad, saveCalificaciones, importGradesExcel } from '../../services/teacherGradesService';
import ConfirmModal from '../common/ConfirmModal';

const TIPOS = ['Taller', 'Quiz', 'Parcial', 'Proyecto', 'Examen', 'Oral', 'Laboratorio'];

export default function GradePanel({ course, onClose, onSaved }) {
  // Cortes reales del curso (con sus actividades), tal como vienen del
  // dashboard del docente. Se copian a estado local para poder agregar/
  // quitar actividades sin depender de que el padre vuelva a pedir datos.
  const [cortes, setCortes] = useState(() =>
    (course.cortes ?? [])
      .map((ct) => ({
        id: ct.id,
        numero_corte: ct.numero_corte,
        label: ct.label ?? `Corte ${ct.numero_corte}`,
        weight: ct.weight ?? ct.peso_porcentual ?? 33,
        actividades: (ct.actividades ?? []).map((a) => ({ id: a.id, label: a.nombre, tipo: a.tipo, peso: a.porcentaje_en_corte ?? 0 })),
      }))
      .sort((a, b) => a.numero_corte - b.numero_corte)
  );

  const students = course.students ?? [];

  const [activeCorteId, setActiveCorteId] = useState(cortes[0]?.id ?? null);
  // notas: { [inscripcion_id]: { [actividad_id]: number|null } }
  const [notas, setNotas] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newTipo, setNewTipo] = useState('Taller');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pesoDrafts, setPesoDrafts] = useState({}); // { [actId]: '20' } — edición en curso de %
  const [savingPeso, setSavingPeso] = useState(null); // actId en guardado
  const [confirmClose, setConfirmClose] = useState(false);
  const fileInputRef = useRef(null);
  const notasIniciales = useRef({});

  const cargarNotas = () =>
    getCourseGrades(course.id).then((inscripciones) => {
      const mapa = {};
      (inscripciones ?? []).forEach((insc) => {
        mapa[insc.id] = {};
        (insc.calificaciones ?? []).forEach((cal) => {
          mapa[insc.id][cal.actividad_id] = cal.nota;
        });
      });
      setNotas(mapa);
      notasIniciales.current = mapa;
    });

  // Cargar las notas ya registradas para este curso
  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setLoadError(null);
    cargarNotas()
      .catch((e) => !cancelado && setLoadError(e.message))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [course.id]);

  // Hay cambios sin guardar si las notas en pantalla difieren de las que
  // se cargaron del backend (agregar/editar/eliminar actividades ya se
  // guarda al instante, así que no cuenta como "sin guardar" aquí).
  const isDirty = useMemo(
    () => JSON.stringify(notas) !== JSON.stringify(notasIniciales.current),
    [notas]
  );

  // Advertir si intentan cerrar/recargar la pestaña con notas sin guardar
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const requestClose = () => {
    if (isDirty) setConfirmClose(true);
    else onClose();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setSaveError(null);
    try {
      const result = await importGradesExcel(course.id, file);
      setImportResult(result);
      await cargarNotas();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const activeCorte = useMemo(() => cortes.find((c) => c.id === activeCorteId), [cortes, activeCorteId]);
  const activities = activeCorte?.actividades ?? [];
  const pesoUsado = activities.reduce((s, a) => s + (a.peso ?? 0), 0);
  const pesoDisponible = Math.max(0, 100 - pesoUsado);

  const addActivity = async () => {
    if (!newLabel.trim() || !activeCorteId || pesoDisponible <= 0) return;
    try {
      const creada = await createActividad({
        corte_id: activeCorteId,
        nombre: newLabel.trim(),
        tipo: newTipo,
        porcentaje_en_corte: pesoDisponible,
      });
      setCortes((prev) =>
        prev.map((ct) =>
          ct.id !== activeCorteId
            ? ct
            : { ...ct, actividades: [...ct.actividades, { id: creada.id, label: creada.nombre, tipo: creada.tipo, peso: creada.porcentaje_en_corte }] }
        )
      );
      setNewLabel('');
    } catch (e) {
      setSaveError(e.message);
    }
  };

  const removeActivity = async (actId) => {
    try {
      await deleteActividad(actId);
      setCortes((prev) =>
        prev.map((ct) =>
          ct.id !== activeCorteId ? ct : { ...ct, actividades: ct.actividades.filter((a) => a.id !== actId) }
        )
      );
      setNotas((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((inscId) => {
          if (next[inscId]?.[actId] !== undefined) {
            const { [actId]: _omit, ...resto } = next[inscId];
            next[inscId] = resto;
          }
        });
        return next;
      });
    } catch (e) {
      setSaveError(e.message);
    }
  };

  // Redistribuir el % de una actividad ya creada (ej: bajarla de 30% a 20%
  // para hacerle espacio a una nueva). El backend valida que la suma del
  // corte no pase de 100%.
  const savePeso = async (actId) => {
    const draft = pesoDrafts[actId];
    const nuevoValor = parseFloat(draft);
    if (draft === undefined || isNaN(nuevoValor) || nuevoValor < 0 || nuevoValor > 100) return;

    setSavingPeso(actId);
    setSaveError(null);
    try {
      await updateActividad(actId, { porcentaje_en_corte: nuevoValor });
      setCortes((prev) =>
        prev.map((ct) =>
          ct.id !== activeCorteId
            ? ct
            : { ...ct, actividades: ct.actividades.map((a) => a.id === actId ? { ...a, peso: nuevoValor } : a) }
        )
      );
      setPesoDrafts((prev) => { const { [actId]: _omit, ...rest } = prev; return rest; });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSavingPeso(null);
    }
  };

  const updateGrade = (inscripcionId, actId, val) => {
    const num = val === '' ? null : parseFloat(val);
    const clamped = num != null ? Math.min(5, Math.max(0, num)) : null;
    setNotas((prev) => ({
      ...prev,
      [inscripcionId]: { ...prev[inscripcionId], [actId]: isNaN(clamped) ? null : clamped },
    }));
  };

  const studentAvg = (inscripcionId) => {
    const notasCorte = activities
      .map((act) => notas[inscripcionId]?.[act.id])
      .filter((v) => v != null);
    return notasCorte.length ? notasCorte.reduce((s, v) => s + v, 0) / notasCorte.length : null;
  };

  const handleGuardar = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = [];
      students.forEach((s) => {
        activities.forEach((act) => {
          const nota = notas[s.inscripcionId]?.[act.id] ?? null;
          const notaInicial = notasIniciales.current[s.inscripcionId]?.[act.id] ?? null;
          // Enviar si hay una nota, o si se borró una que existía antes
          // (nota null pero notaInicial no) — si no, "borrar" nunca llegaba
          // al backend y la nota vieja quedaba intacta.
          if (nota != null || notaInicial != null) {
            payload.push({ inscripcion_id: s.inscripcionId, actividad_id: act.id, nota });
          }
        });
      });
      if (payload.length > 0) await saveCalificaciones(payload);
      notasIniciales.current = notas;
      onSaved?.(`Notas de ${course.name} guardadas`);
      onClose();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cortes.length) return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ maxWidth: 1020, maxHeight: '92vh' }}>
        <div className="panel-header">
          <div style={{ fontSize: 17, fontWeight: 700 }}>Gestión de Notas</div>
          <button className="close-btn" onClick={onClose}><X size={14} strokeWidth={2.5} /></button>
        </div>
        <div className="empty"><div className="empty-icon"><NotebookPen /></div>No hay cortes configurados para este curso</div>
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && requestClose()}>
      {confirmClose && (
        <ConfirmModal
          title="¿Salir sin guardar?"
          message="Tienes notas modificadas que no se han guardado. Si sales ahora, se perderán."
          confirmLabel="Salir sin guardar"
          danger
          onConfirm={() => { setConfirmClose(false); onClose(); }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
      <div className="panel" style={{ maxWidth: 1020, maxHeight: '92vh' }}>
        <div className="panel-header">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Gestión de Notas</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: course.color, marginRight: 6 }} />
              {course.name} · Grupo {course.group ?? ''}
            </div>
          </div>
          <button className="close-btn" onClick={requestClose}><X size={14} strokeWidth={2.5} /></button>
        </div>

        {/* Tabs de cortes */}
        <div className="corte-tabs">
          {cortes.map((ct) => (
            <button
              key={ct.id}
              className={`corte-tab ${activeCorteId === ct.id ? 'active' : ''}`}
              onClick={() => setActiveCorteId(ct.id)}
            >
              {ct.label}
              <span className="corte-weight">{ct.weight}%</span>
            </button>
          ))}
        </div>

        {/* Nueva actividad */}
        <div style={{ background: 'var(--bg3)', borderRadius: 11, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>+ Nueva Actividad</span>
            <span style={{ color: pesoDisponible > 0 ? 'var(--text3)' : 'var(--red)' }}>
              {pesoDisponible > 0 ? `${pesoDisponible}% disponible en este corte` : 'Este corte ya suma 100%'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="input-field" style={{ flex: 2, minWidth: 150 }}
              placeholder="Nombre..." value={newLabel} disabled={pesoDisponible <= 0}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addActivity()} />
            <select className="input-field" value={newTipo} disabled={pesoDisponible <= 0} onChange={(e) => setNewTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={addActivity} disabled={pesoDisponible <= 0}>Agregar</button>
          </div>
          {activities.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
              ¿Necesitas espacio para esta actividad? Baja el % de una actividad existente con el lápiz de abajo antes de agregar.
            </div>
          )}
        </div>

        {/* Importar notas desde Excel */}
        <div style={{ background: 'var(--bg3)', borderRadius: 11, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Importar notas desde Excel
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <><Loader2 size={14} className="spin" /> Importando...</> : <><Upload size={14} /> Elegir archivo .xlsx</>}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>
          {importResult && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <CheckCircle2 size={14} color="var(--green, #22c55e)" /> {importResult.message}
              </div>
              {importResult.errores?.length > 0 && (
                <ul style={{ marginTop: 6, paddingLeft: 18, color: 'var(--red)' }}>
                  {importResult.errores.map((e, i) => (
                    <li key={i}>Fila {e.fila}: {e.motivo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {saveError && (
          <div style={{ color: 'var(--red)', fontSize: 12, background: 'var(--bg3)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {saveError}
          </div>
        )}

        {loading ? (
          <div className="empty"><div className="empty-icon"><Loader2 className="spin" /></div>Cargando notas...</div>
        ) : loadError ? (
          <div className="empty"><div className="empty-icon"><AlertTriangle /></div>{loadError}</div>
        ) : students.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Users /></div>Sin estudiantes en este grupo</div>
        ) : activities.length === 0 ? (
          <div className="empty"><div className="empty-icon"><NotebookPen /></div>Agrega una actividad para ingresar notas</div>
        ) : (
          <>
            {/* Encabezado tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${activities.length}, 1fr) 70px`, gap: 6, padding: '6px 0', borderBottom: '1.5px solid var(--border)', marginBottom: 6, alignItems: 'end' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Estudiante</div>
              {activities.map((act) => {
                const draft = pesoDrafts[act.id];
                const editando = draft !== undefined;
                return (
                  <div key={act.id} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{act.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                      <span className={`tipo-chip tipo-${act.tipo}`}>{act.tipo}</span>
                      <button onClick={() => removeActivity(act.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      {editando ? (
                        <>
                          <input
                            type="number" min="0" max="100" className="grade-input" style={{ width: 44, padding: '2px 4px', fontSize: 11 }}
                            value={draft}
                            autoFocus
                            onChange={(e) => setPesoDrafts((prev) => ({ ...prev, [act.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && savePeso(act.id)}
                          />
                          <button
                            onClick={() => savePeso(act.id)}
                            disabled={savingPeso === act.id}
                            style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', display: 'flex' }}
                            title="Guardar porcentaje"
                          >
                            {savingPeso === act.id ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setPesoDrafts((prev) => ({ ...prev, [act.id]: String(act.peso) }))}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}
                          title="Editar porcentaje"
                        >
                          {act.peso}% <Pencil size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' }}>Prom.</div>
            </div>

            {/* Filas de estudiantes */}
            {students.map((s) => {
              const avg = studentAvg(s.inscripcionId);
              return (
                <div key={s.inscripcionId} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${activities.length}, 1fr) 70px`, gap: 6, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg3)', border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                      {(s.name ?? '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{(s.name ?? '').split(' ').slice(0, 2).join(' ')}</div>
                      <span className={`badge badge-${s.status ?? 'active'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                        {s.status === 'active' ? 'OK' : s.status === 'warning' ? 'Aviso' : 'Riesgo'}
                      </span>
                    </div>
                  </div>

                  {activities.map((act) => (
                    <div key={act.id} style={{ textAlign: 'center' }}>
                      <input className="grade-input" type="number" min="0" max="5" step="0.1"
                        value={notas[s.inscripcionId]?.[act.id] ?? ''} placeholder="—"
                        onChange={(e) => updateGrade(s.inscripcionId, act.id, e.target.value)} />
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: gradeColor(avg) }}>
                    {avg != null ? avg.toFixed(1) : '—'}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              {isDirty && (
                <span style={{ fontSize: 11, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} /> Cambios sin guardar
                </span>
              )}
              <button className="btn btn-ghost" onClick={requestClose} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? <><Loader2 size={14} className="spin" /> Guardando...</> : <><Save size={14} /> Guardar Notas</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
