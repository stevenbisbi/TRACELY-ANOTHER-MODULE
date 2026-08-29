import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import { useData } from '../../context/DataContext';
import { toNum } from '../../services/apiTypes';
import * as calificacionesService from '../../services/calificacionesService';

interface ActivityGroup {
  actividadId: string;
  nombre: string;
  tipo: string;
  porcentaje: number | null;
  grades: { key: string; estudiante: string; nota: number | null }[];
}

export default function GradesEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teacherSemData, refresh } = useData();

  const course = useMemo(
    () => teacherSemData?.courses.find((c) => c.id === id) ?? null,
    [teacherSemData, id]
  );

  const [corteNum, setCorteNum] = useState<number | null>(null);
  const [actividad, setActividad] = useState('');
  const [tipo, setTipo] = useState('taller');
  const [peso, setPeso] = useState('');
  const [values, setValues] = useState<Record<string, string>>({}); // por inscripcion_id
  const [groups, setGroups] = useState<ActivityGroup[]>([]);

  const [loadingNotas, setLoadingNotas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingPesoId, setEditingPesoId] = useState<string | null>(null);
  const [pesoEditValue, setPesoEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<calificacionesService.ImportResult | null>(null);

  const cortes = course?.cortes ?? [];
  const activeCorte = cortes.find((c) => c.numero_corte === corteNum) ?? cortes[0] ?? null;

  useEffect(() => {
    if (corteNum == null && cortes.length) setCorteNum(cortes[0].numero_corte);
  }, [cortes, corteNum]);

  const loadExisting = useCallback(async () => {
    if (!course || !activeCorte) return;
    setLoadingNotas(true);
    try {
      const inscripciones = await calificacionesService.getByAsignatura(course.id, activeCorte.numero_corte);
      const byActividad = new Map<string, ActivityGroup>();
      for (const insc of inscripciones) {
        const nombre = insc.estudiante?.usuario?.nombre ?? '—';
        for (const cal of insc.calificaciones ?? []) {
          if (!cal.actividad) continue; // calificación de otro corte
          if (!byActividad.has(cal.actividad_id)) {
            byActividad.set(cal.actividad_id, {
              actividadId: cal.actividad_id,
              nombre: cal.actividad.nombre,
              tipo: cal.actividad.tipo,
              porcentaje: toNum(cal.actividad.porcentaje_en_corte),
              grades: [],
            });
          }
          byActividad.get(cal.actividad_id)!.grades.push({ key: cal.id, estudiante: nombre, nota: toNum(cal.nota) });
        }
      }
      const list = [...byActividad.values()];
      list.forEach((g) => g.grades.sort((a, b) => a.estudiante.localeCompare(b.estudiante)));
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setGroups(list);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las notas');
    } finally {
      setLoadingNotas(false);
    }
  }, [course, activeCorte]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  if (!course) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Curso no encontrado. Vuelve al dashboard e inténtalo de nuevo.</Text>
      </View>
    );
  }

  const students = course.students;

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!activeCorte) {
      setError('Esta asignatura no tiene cortes configurados.');
      return;
    }
    if (!actividad.trim()) {
      setError('Ponle un nombre a la actividad.');
      return;
    }
    const pesoNum = parseFloat(peso);
    if (!pesoNum || pesoNum <= 0 || pesoNum > 100) {
      setError('El peso en el corte debe estar entre 1 y 100.');
      return;
    }

    const notas = students
      .map((s) => {
        const raw = values[s.inscripcionId];
        if (raw == null || raw.trim() === '') return null;
        const nota = parseFloat(raw);
        if (Number.isNaN(nota) || nota < 0 || nota > 5) return null;
        return { inscripcion_id: s.inscripcionId, nota };
      })
      .filter((g): g is NonNullable<typeof g> => g != null);

    if (notas.length === 0) {
      setError('Ingresa al menos una nota válida (0.0 – 5.0).');
      return;
    }

    setSaving(true);
    try {
      const nueva = await calificacionesService.createActividad({
        corte_id: activeCorte.id,
        nombre: actividad.trim(),
        tipo: tipo.trim().toLowerCase() || 'taller',
        porcentaje_en_corte: pesoNum,
      });
      await calificacionesService.bulkUpsert(
        notas.map((n) => ({ ...n, actividad_id: nueva.id }))
      );
      setSuccess(`${notas.length} nota(s) guardadas en "${nueva.nombre}"`);
      setValues({});
      setActividad('');
      setPeso('');
      await loadExisting();
      refresh(); // actualiza cortes/actividades del contexto en segundo plano
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron guardar las notas');
    } finally {
      setSaving(false);
    }
  };

  const startEditPeso = (g: ActivityGroup) => {
    setEditingPesoId(g.actividadId);
    setPesoEditValue(String(g.porcentaje ?? ''));
  };

  const savePeso = async (actividadId: string) => {
    const n = Number(pesoEditValue);
    if (Number.isNaN(n) || n <= 0 || n > 100) {
      setError('El peso debe ser un número entre 1 y 100.');
      return;
    }
    try {
      await calificacionesService.updateActividad(actividadId, n);
      setEditingPesoId(null);
      await loadExisting();
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo actualizar el peso');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await calificacionesService.deleteActividad(deletingId);
      setDeletingId(null);
      await loadExisting();
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo eliminar la actividad');
      setDeletingId(null);
    }
  };

  const handleImport = async () => {
    setError('');
    setImportResult(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const file = result.assets[0];
    setImporting(true);
    try {
      const res = await calificacionesService.importExcel(course.id, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
      setImportResult(res);
      await loadExisting();
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.courseTitle}>{course.name} · {course.code}</Text>

      <View style={styles.corteRow}>
        {cortes.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.cortePill, activeCorte?.id === c.id && styles.cortePillActive]}
            onPress={() => setCorteNum(c.numero_corte)}
          >
            <Text style={[styles.cortePillText, activeCorte?.id === c.id && styles.cortePillTextActive]}>
              Corte {c.numero_corte}
            </Text>
            <Text style={styles.cortePillWeight}>{toNum(c.peso_porcentual) ?? 0}%</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Importar desde Excel</Text>
          <TouchableOpacity style={styles.importBtn} onPress={handleImport} disabled={importing}>
            {importing ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color={Colors.accent} />
                <Text style={styles.importBtnText}>Elegir archivo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Columnas esperadas: ID, Actividad, Nota</Text>
        {importResult && (
          <View style={styles.importSummary}>
            <Text style={styles.importSummaryText}>
              {importResult.procesadas} nota(s) importadas, {importResult.errores.length} fila(s) con error
            </Text>
            {importResult.errores.slice(0, 5).map((e, i) => (
              <Text key={i} style={styles.importErrorText}>Fila {e.fila}: {e.motivo}</Text>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Nueva actividad</Text>

        {error !== '' && <Text style={styles.errorText}>{error}</Text>}
        {success !== '' && <Text style={styles.successText}>{success}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>Nombre de la actividad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Taller ER, Quiz 1, Parcial C1..."
            placeholderTextColor={Colors.text3}
            value={actividad}
            onChangeText={setActividad}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Tipo</Text>
            <TextInput
              style={styles.input}
              placeholder="taller, quiz, parcial, proyecto..."
              placeholderTextColor={Colors.text3}
              value={tipo}
              onChangeText={setTipo}
            />
          </View>
          <View style={[styles.field, { width: 110 }]}>
            <Text style={styles.label}>% en corte</Text>
            <TextInput
              style={styles.input}
              placeholder="20"
              placeholderTextColor={Colors.text3}
              keyboardType="numeric"
              value={peso}
              onChangeText={setPeso}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: Space.sm }]}>Notas por estudiante</Text>
        {students.length === 0 ? (
          <Text style={styles.emptyText}>Sin estudiantes inscritos</Text>
        ) : (
          students.map((s) => (
            <View key={s.inscripcionId} style={styles.studentRow}>
              <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
              <TextInput
                style={styles.gradeInput}
                placeholder="—"
                placeholderTextColor={Colors.text3}
                keyboardType="decimal-pad"
                value={values[s.inscripcionId] ?? ''}
                onChangeText={(t) => setValues((v) => ({ ...v, [s.inscripcionId]: t }))}
              />
            </View>
          ))
        )}

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Guardar notas</Text>}
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Notas registradas — Corte {activeCorte?.numero_corte ?? '—'}</Text>
        {loadingNotas ? (
          <ActivityIndicator color={Colors.accent} style={{ paddingVertical: Space.md }} />
        ) : groups.length === 0 ? (
          <Text style={styles.emptyText}>Sin notas registradas en este corte</Text>
        ) : (
          groups.map((g) => (
            <View key={g.actividadId} style={styles.activityGroup}>
              <View style={styles.activityHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityName}>{g.nombre}</Text>
                  <Text style={styles.activitySub}>{g.tipo}</Text>
                </View>
                {editingPesoId === g.actividadId ? (
                  <View style={styles.pesoEditRow}>
                    <TextInput
                      style={styles.pesoEditInput}
                      value={pesoEditValue}
                      onChangeText={setPesoEditValue}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => savePeso(g.actividadId)} hitSlop={6}>
                      <Ionicons name="checkmark" size={18} color={Colors.green} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingPesoId(null)} hitSlop={6}>
                      <Ionicons name="close" size={18} color={Colors.text3} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pesoTag} onPress={() => startEditPeso(g)}>
                    <Text style={styles.pesoTagText}>{g.porcentaje != null ? `${g.porcentaje}%` : '—'}</Text>
                    <Ionicons name="pencil" size={12} color={Colors.accent} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDeletingId(g.actividadId)} hitSlop={6} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.red} />
                </TouchableOpacity>
              </View>
              {g.grades.map((row) => (
                <View key={row.key} style={styles.existingRow}>
                  <Text style={styles.existingStudent}>{row.estudiante}</Text>
                  <Text style={styles.existingValor}>{row.nota != null ? row.nota.toFixed(1) : '—'}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </Card>

      <ConfirmDialog
        visible={deletingId != null}
        title="Eliminar actividad"
        message="Se eliminará la actividad y todas las notas registradas en ella. Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />

      <View style={{ height: Space.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: Colors.bg },
  emptyText: { fontSize: Font.sm, color: Colors.text3, paddingVertical: Space.sm, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  courseTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text },

  corteRow: { flexDirection: 'row', gap: Space.sm },
  cortePill: {
    flex: 1, alignItems: 'center', paddingVertical: Space.sm,
    backgroundColor: Colors.bg3, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'transparent',
  },
  cortePillActive: { backgroundColor: 'rgba(28,57,146,0.08)', borderColor: Colors.accent },
  cortePillText: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  cortePillTextActive: { color: Colors.accent },
  cortePillWeight: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.md },
  errorText: { color: Colors.red, fontSize: Font.sm, marginBottom: Space.sm },
  successText: { color: Colors.green, fontSize: Font.sm, marginBottom: Space.sm },

  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bg3, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  importBtnText: { fontSize: Font.sm, fontWeight: '600', color: Colors.accent },
  hint: { fontSize: Font.xs, color: Colors.text3, marginTop: -Space.sm },
  importSummary: { marginTop: Space.sm, padding: Space.sm, backgroundColor: Colors.bg3, borderRadius: Radius.sm, gap: 2 },
  importSummaryText: { fontSize: Font.sm, fontWeight: '600', color: Colors.text },
  importErrorText: { fontSize: Font.xs, color: Colors.red },

  field: { gap: Space.xs, marginBottom: Space.sm },
  fieldRow: { flexDirection: 'row', gap: Space.sm },
  label: { fontSize: Font.xs, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bg3, borderRadius: Radius.sm, paddingHorizontal: Space.md,
    paddingVertical: Space.sm, fontSize: Font.base, color: Colors.text,
  },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  studentName: { flex: 1, fontSize: Font.sm, color: Colors.text },
  gradeInput: {
    width: 60, textAlign: 'center', backgroundColor: Colors.bg3, borderRadius: Radius.sm,
    paddingVertical: Space.xs, fontSize: Font.base, fontWeight: '700', color: Colors.text,
  },

  saveBtn: {
    marginTop: Space.md, backgroundColor: Colors.accent, borderRadius: Radius.md,
    padding: Space.md, alignItems: 'center',
  },
  saveBtnText: { fontSize: Font.base, fontWeight: '700', color: Colors.white },

  activityGroup: { marginBottom: Space.md, paddingBottom: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginBottom: Space.xs },
  activityName: { fontSize: Font.sm, fontWeight: '700', color: Colors.text },
  activitySub: { fontSize: Font.xs, color: Colors.text3, marginTop: 1 },
  pesoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg3, borderRadius: Radius.full, paddingHorizontal: Space.sm, paddingVertical: 4 },
  pesoTagText: { fontSize: Font.xs, fontWeight: '700', color: Colors.text },
  pesoEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pesoEditInput: { width: 44, textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: Colors.accent, fontSize: Font.sm, color: Colors.text, paddingVertical: 2 },
  deleteBtn: { padding: 4 },

  existingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6,
  },
  existingStudent: { fontSize: Font.sm, color: Colors.text2 },
  existingValor: { fontSize: Font.base, fontWeight: '700', color: Colors.text },
});
