import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import FormSheet from '../../components/ui/FormSheet';
import FormField from '../../components/ui/FormField';
import PickerField from '../../components/ui/PickerField';
import SearchInput from '../../components/ui/SearchInput';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import * as adminService from '../../services/adminService';
import type { Career, AdminSubject, AdminStudentRow, PensumItem, AdminTeacherRow } from '../../services/adminService';

interface SubjectForm {
  mode: 'create' | 'edit';
  id: string | null;
  nombre: string;
  NRC: string;
  docenteId: string | null;
  pensumId: string | null;
  semestre: string;
  umbral: string;
}

const EMPTY_SUBJECT_FORM: SubjectForm = { mode: 'create', id: null, nombre: '', NRC: '', docenteId: null, pensumId: null, semestre: '', umbral: '3.5' };

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [career, setCareer] = useState<Career | null>(null);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [pensum, setPensum] = useState<PensumItem[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [careerForm, setCareerForm] = useState<{ nombre: string; codigo: string; total_creditos: string } | null>(null);
  const [deletingCareer, setDeletingCareer] = useState(false);
  const [deletingCareerBusy, setDeletingCareerBusy] = useState(false);
  const [deletingCareerError, setDeletingCareerError] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectForm | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [deletingSubjectBusy, setDeletingSubjectBusy] = useState(false);
  const [deletingSubjectError, setDeletingSubjectError] = useState<string | null>(null);
  const [enrollFor, setEnrollFor] = useState<AdminSubject | null>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, subj, studs, pens, tchs] = await Promise.all([
        adminService.getCareer(id),
        adminService.getSubjects({ carrera_id: id }),
        adminService.getStudents({ carrera_id: id }),
        adminService.getPensumByCareer(id),
        adminService.getTeachers(),
      ]);
      setCareer(c);
      setSubjects(subj);
      setStudents(studs);
      setPensum(pens);
      setTeachers(tchs);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el programa');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !career) {
    return <EmptyState icon="⚠️" message={error ?? 'Programa no encontrado'} actionLabel="Reintentar" onAction={load} />;
  }

  const openEditCareer = () => {
    setCareerForm({ nombre: career.nombre, codigo: career.codigo, total_creditos: String(career.total_creditos) });
    setFormError(null);
  };

  const submitCareer = async () => {
    if (!careerForm) return;
    if (!careerForm.nombre.trim() || !careerForm.codigo.trim()) {
      setFormError('Nombre y código son obligatorios.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await adminService.updateCareer(career.id, {
        nombre: careerForm.nombre.trim(),
        codigo: careerForm.codigo.trim(),
        total_creditos: Number(careerForm.total_creditos) || 0,
      });
      setCareerForm(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? 'No se pudo actualizar la carrera');
    } finally {
      setSubmitting(false);
    }
  };

  // El backend rechaza el borrado si la carrera tiene estudiantes o materias
  // de pensum asociadas (misma regla que ya aplica a las materias). Acá
  // además se deshabilita el botón de forma proactiva cuando ya sabemos que
  // hay estudiantes (students.length), y de todas formas se muestra el
  // mensaje real del servidor si falla por otra razón (ej. pensum).
  const confirmDeleteCareer = async () => {
    setDeletingCareerBusy(true);
    setDeletingCareerError(null);
    try {
      await adminService.deleteCareer(career.id);
      setDeletingCareer(false);
      router.back();
    } catch (e: any) {
      setDeletingCareerError(e?.message ?? 'No se pudo eliminar la carrera');
    } finally {
      setDeletingCareerBusy(false);
    }
  };

  const openCreateSubject = () => {
    setSubjectForm({ ...EMPTY_SUBJECT_FORM, mode: 'create' });
    setFormError(null);
  };

  const openEditSubject = (s: AdminSubject) => {
    setSubjectForm({
      mode: 'edit', id: s.id, nombre: s.nombre, NRC: s.NRC, docenteId: s.docente_id,
      pensumId: s.pensum_id, semestre: s.semestre_academico, umbral: String(s.umbral_advertencia ?? 3.5),
    });
    setFormError(null);
  };

  const submitSubject = async () => {
    if (!subjectForm) return;
    if (!subjectForm.nombre.trim() || !subjectForm.NRC.trim() || !subjectForm.docenteId || !subjectForm.semestre.trim()) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    if (subjectForm.mode === 'create' && !subjectForm.pensumId) {
      setFormError('Selecciona la materia del pensum.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (subjectForm.mode === 'create') {
        await adminService.createSubject({
          nombre: subjectForm.nombre.trim(),
          NRC: subjectForm.NRC.trim(),
          docente_id: subjectForm.docenteId,
          pensum_id: subjectForm.pensumId!,
          semestre_academico: subjectForm.semestre.trim(),
        });
      } else {
        await adminService.updateSubject(subjectForm.id!, {
          nombre: subjectForm.nombre.trim(),
          NRC: subjectForm.NRC.trim(),
          docente_id: subjectForm.docenteId,
          semestre_academico: subjectForm.semestre.trim(),
          umbral_advertencia: Number(subjectForm.umbral) || 3.5,
        });
      }
      setSubjectForm(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? 'No se pudo guardar la materia');
    } finally {
      setSubmitting(false);
    }
  };

  // El backend rechaza el borrado si la materia tiene estudiantes inscritos.
  const confirmDeleteSubject = async () => {
    if (!deletingSubjectId) return;
    setDeletingSubjectBusy(true);
    setDeletingSubjectError(null);
    try {
      await adminService.deleteSubject(deletingSubjectId);
      setDeletingSubjectId(null);
      await load();
    } catch (e: any) {
      setDeletingSubjectError(e?.message ?? 'No se pudo eliminar la materia');
    } finally {
      setDeletingSubjectBusy(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.careerName}>{career.nombre}</Text>
          <Text style={styles.careerSub}>{career.codigo} · {career.total_creditos} créditos</Text>
        </View>
        <TouchableOpacity onPress={openEditCareer} hitSlop={6} style={styles.iconBtn}>
          <Ionicons name="pencil" size={18} color={Colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { if (students.length === 0) { setDeletingCareerError(null); setDeletingCareer(true); } }}
          disabled={students.length > 0}
          hitSlop={6}
          style={styles.iconBtn}
        >
          <Ionicons name="trash-outline" size={18} color={students.length > 0 ? Colors.text3 : Colors.red} />
        </TouchableOpacity>
      </View>
      {students.length > 0 && (
        <Text style={styles.careerDeleteHint}>No se puede eliminar: tiene {students.length} estudiante(s) asociado(s)</Text>
      )}

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Materias</Text>
          <TouchableOpacity style={styles.smallBtn} onPress={openCreateSubject}>
            <Ionicons name="add" size={14} color={Colors.white} />
            <Text style={styles.smallBtnText}>Nueva</Text>
          </TouchableOpacity>
        </View>
        {subjects.length === 0 ? (
          <Text style={styles.emptyText}>Sin materias registradas</Text>
        ) : (
          subjects.map((s) => (
            <View key={s.id} style={styles.subjectRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName}>{s.nombre}</Text>
                <Text style={styles.subjectSub}>
                  {s.NRC} · {s.docente?.usuario?.nombre ?? 'Sin docente'} · {s.inscritos} inscrito(s)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollFor(s)} hitSlop={6} style={styles.iconBtn}>
                <Ionicons name="person-add-outline" size={16} color={Colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEditSubject(s)} hitSlop={6} style={styles.iconBtn}>
                <Ionicons name="pencil" size={16} color={Colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (s.inscritos === 0) { setDeletingSubjectError(null); setDeletingSubjectId(s.id); } }}
                disabled={s.inscritos > 0}
                hitSlop={6}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={16} color={s.inscritos > 0 ? Colors.text3 : Colors.red} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Estudiantes del programa</Text>
          <TouchableOpacity style={styles.smallBtn} onPress={() => setAddStudentOpen(true)}>
            <Ionicons name="add" size={14} color={Colors.white} />
            <Text style={styles.smallBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>
        {students.length === 0 ? (
          <Text style={styles.emptyText}>Sin estudiantes en este programa</Text>
        ) : (
          students.map((s) => (
            <View key={s.id} style={styles.studentRow}>
              <Text style={styles.studentName}>{s.name}</Text>
              <Text style={styles.studentSub}>Sem. {s.semester} · GPA {s.gpa != null ? s.gpa.toFixed(1) : '—'}</Text>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 100 }} />

      {/* Editar carrera */}
      {careerForm && (
        <FormSheet visible title="Editar carrera" onClose={() => setCareerForm(null)} onSubmit={submitCareer} submitting={submitting} error={formError}>
          <FormField label="Nombre" value={careerForm.nombre} onChangeText={(t) => setCareerForm((f) => f && { ...f, nombre: t })} />
          <FormField label="Código" value={careerForm.codigo} onChangeText={(t) => setCareerForm((f) => f && { ...f, codigo: t })} autoCapitalize="characters" />
          <FormField label="Créditos totales" value={careerForm.total_creditos} onChangeText={(t) => setCareerForm((f) => f && { ...f, total_creditos: t.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
        </FormSheet>
      )}

      {/* Crear/editar materia */}
      {subjectForm && (
        <FormSheet
          visible
          title={subjectForm.mode === 'create' ? 'Nueva materia' : 'Editar materia'}
          onClose={() => setSubjectForm(null)}
          onSubmit={submitSubject}
          submitting={submitting}
          error={formError}
        >
          <FormField label="Nombre" value={subjectForm.nombre} onChangeText={(t) => setSubjectForm((f) => f && { ...f, nombre: t })} />
          <FormField label="NRC" value={subjectForm.NRC} onChangeText={(t) => setSubjectForm((f) => f && { ...f, NRC: t })} autoCapitalize="characters" />
          <PickerField
            label="Docente"
            value={subjectForm.docenteId}
            options={teachers.map((t) => ({ value: t.id, label: t.usuario?.nombre ?? t.usuario_id }))}
            onSelect={(v) => setSubjectForm((f) => f && { ...f, docenteId: v })}
          />
          {subjectForm.mode === 'create' && (
            <PickerField
              label="Materia del pensum"
              value={subjectForm.pensumId}
              options={pensum.map((p) => ({ value: p.id, label: p.nombre_asignatura, sublabel: `Semestre ${p.semestre} · ${p.creditos} créditos` }))}
              onSelect={(v) => setSubjectForm((f) => f && { ...f, pensumId: v })}
            />
          )}
          <FormField label="Semestre académico" value={subjectForm.semestre} onChangeText={(t) => setSubjectForm((f) => f && { ...f, semestre: t })} placeholder="2025-1" />
          {subjectForm.mode === 'edit' && (
            <FormField label="Umbral de advertencia" value={subjectForm.umbral} onChangeText={(t) => setSubjectForm((f) => f && { ...f, umbral: t })} keyboardType="decimal-pad" />
          )}
        </FormSheet>
      )}

      {enrollFor && (
        <EnrollSheet subject={enrollFor} onClose={() => setEnrollFor(null)} onChanged={load} />
      )}

      {addStudentOpen && (
        <AddStudentToProgramSheet careraId={career.id} onClose={() => setAddStudentOpen(false)} onChanged={load} />
      )}

      <ConfirmDialog
        visible={deletingCareer}
        title="Eliminar carrera"
        message="Solo se puede eliminar si no tiene estudiantes ni materias asociadas. Esta acción no se puede deshacer."
        loading={deletingCareerBusy}
        error={deletingCareerError}
        onConfirm={confirmDeleteCareer}
        onCancel={() => { setDeletingCareer(false); setDeletingCareerError(null); }}
      />
      <ConfirmDialog
        visible={deletingSubjectId != null}
        title="Eliminar materia"
        message="Solo se puede eliminar si no tiene estudiantes inscritos. Esta acción no se puede deshacer."
        loading={deletingSubjectBusy}
        error={deletingSubjectError}
        onConfirm={confirmDeleteSubject}
        onCancel={() => { setDeletingSubjectId(null); setDeletingSubjectError(null); }}
      />
    </ScrollView>
  );
}

// ── Inscribir / des-inscribir estudiantes de una materia puntual ──
function EnrollSheet({ subject, onClose, onChanged }: { subject: AdminSubject; onClose: () => void; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminStudentRow[]>([]);
  const [enrolled, setEnrolled] = useState<{ id: string; estudiante?: { id: string; usuario?: { nombre: string; id_institucional: string } | null } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studs, inscs] = await Promise.all([
        adminService.getStudents({ search: search || undefined, asignatura_id: subject.id }),
        adminService.getInscripcionesByAsignatura(subject.id),
      ]);
      setResults(studs.filter((s) => !s.yaInscrito));
      setEnrolled(inscs);
    } finally {
      setLoading(false);
    }
  }, [search, subject.id]);

  useEffect(() => { load(); }, [load]);

  const enroll = async (estudianteId: string) => {
    setBusyId(estudianteId);
    try {
      await adminService.enrollStudent(estudianteId, subject.id);
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const unenroll = async (inscripcionId: string) => {
    setBusyId(inscripcionId);
    try {
      await adminService.unenrollStudent(inscripcionId);
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormSheet visible title={`Inscritos — ${subject.nombre}`} onClose={onClose} onSubmit={onClose} submitLabel="Listo">
      <Text style={styles.sheetLabel}>Inscritos actualmente</Text>
      {enrolled.length === 0 ? (
        <Text style={styles.emptyText}>Nadie inscrito todavía</Text>
      ) : (
        enrolled.map((i) => (
          <View key={i.id} style={styles.enrollRow}>
            <Text style={styles.enrollName}>{i.estudiante?.usuario?.nombre ?? '—'}</Text>
            <TouchableOpacity onPress={() => unenroll(i.id)} disabled={busyId === i.id}>
              {busyId === i.id ? <ActivityIndicator size="small" color={Colors.red} /> : <Text style={styles.removeText}>Quitar</Text>}
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={[styles.sheetLabel, { marginTop: Space.md }]}>Agregar estudiante</Text>
      <SearchInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre o ID..." />
      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Space.md }} />
      ) : (
        results.slice(0, 20).map((s) => (
          <View key={s.id} style={styles.enrollRow}>
            <Text style={styles.enrollName}>{s.name}</Text>
            <TouchableOpacity onPress={() => enroll(s.id)} disabled={busyId === s.id}>
              {busyId === s.id ? <ActivityIndicator size="small" color={Colors.accent} /> : <Text style={styles.addText}>Inscribir</Text>}
            </TouchableOpacity>
          </View>
        ))
      )}
    </FormSheet>
  );
}

// ── Agregar un estudiante existente a este programa ──
function AddStudentToProgramSheet({ careraId, onClose, onChanged }: { careraId: string; onClose: () => void; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResults(await adminService.getStudents({ search: search || undefined }));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const add = async (studentId: string) => {
    setBusyId(studentId);
    try {
      await adminService.updateStudentAcademics(studentId, { carrera_id: careraId });
      onChanged();
      onClose();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormSheet visible title="Agregar estudiante al programa" onClose={onClose} onSubmit={onClose} submitLabel="Listo">
      <SearchInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre o ID..." />
      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Space.md }} />
      ) : (
        results.slice(0, 20).map((s) => (
          <View key={s.id} style={styles.enrollRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.enrollName}>{s.name}</Text>
              <Text style={styles.enrollSub}>{s.program}</Text>
            </View>
            <TouchableOpacity onPress={() => add(s.id)} disabled={busyId === s.id || s.carreraId === careraId}>
              {busyId === s.id ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={[styles.addText, s.carreraId === careraId && { color: Colors.text3 }]}>
                  {s.carreraId === careraId ? 'Ya está' : 'Agregar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  careerName: { fontSize: Font.lg, fontWeight: '700', color: Colors.text },
  careerSub: { fontSize: Font.sm, color: Colors.text2, marginTop: 2 },
  careerDeleteHint: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  iconBtn: { padding: 6 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.md },
  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: Radius.full, paddingHorizontal: Space.sm, paddingVertical: 5 },
  smallBtnText: { color: Colors.white, fontSize: Font.xs, fontWeight: '700' },
  emptyText: { fontSize: Font.sm, color: Colors.text3, textAlign: 'center', paddingVertical: Space.md },

  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  subjectName: { fontSize: Font.sm, fontWeight: '700', color: Colors.text },
  subjectSub: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },

  studentRow: { paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  studentName: { fontSize: Font.sm, fontWeight: '600', color: Colors.text },
  studentSub: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },

  sheetLabel: { fontSize: Font.xs, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  enrollRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  enrollName: { fontSize: Font.sm, color: Colors.text, fontWeight: '600' },
  enrollSub: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  addText: { fontSize: Font.sm, fontWeight: '700', color: Colors.accent },
  removeText: { fontSize: Font.sm, fontWeight: '700', color: Colors.red },
});
