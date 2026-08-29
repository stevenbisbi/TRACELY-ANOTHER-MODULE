import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import CourseTabs from '../../components/teacher/CourseTabs';
import StudentAttendanceRow from '../../components/teacher/StudentAttendanceRow';
import CourseSettingsSheet from '../../components/teacher/CourseSettingsSheet';
import { useData } from '../../context/DataContext';
import * as teachersService from '../../services/teachersService';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export default function CoursesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { teacherSemData: semData, loading, error, refresh, saveTodayAttendance } = useData();
  const courses = semData?.courses ?? [];

  const [activeCourseId, setActiveCourseId] = useState<string | null>(params.courseId ?? null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);

  useEffect(() => {
    if (courses.length && (activeCourseId == null || !courses.some((c) => c.id === activeCourseId))) {
      const initial = courses.find((c) => c.id === params.courseId) ?? courses[0];
      setActiveCourseId(initial.id);
      setAttendance(initial.todayAttendance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  if (loading && !semData) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return <EmptyState icon="⚠️" message={error} actionLabel="Reintentar" onAction={refresh} />;
  }

  if (!courses.length || activeCourseId == null) {
    return <EmptyState icon="📅" message="No hay cursos para este semestre" />;
  }

  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? courses[0];

  const toggleAtt = (id: string) => setAttendance((p) => ({ ...p, [id]: !p[id] }));

  const handleSelectCourse = (id: string) => {
    setActiveCourseId(id);
    const c = courses.find((x) => x.id === id);
    setAttendance(c?.todayAttendance ?? {});
  };

  const handleDownloadReport = async (format: 'pdf' | 'xlsx') => {
    setFormatMenuOpen(false);
    setDownloading(true);
    try {
      const perfil = await teachersService.getMyProfile();
      await teachersService.downloadGroupReport(perfil.id, activeCourse.id, format, `reporte_${activeCourse.code}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo descargar el reporte');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadStudentReport = async (studentId: string, studentName: string) => {
    setDownloadingStudentId(studentId);
    try {
      await teachersService.downloadStudentReport(studentId, `reporte_${studentName.replace(/\s+/g, '_')}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo descargar el reporte');
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = activeCourse.students.map((s) => ({
        inscripcion_id: s.inscripcionId,
        presente: attendance[s.inscripcionId] ?? false,
      }));
      await saveTodayAttendance(activeCourse.id, records);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <CourseTabs courses={courses} activeId={activeCourseId} onSelect={handleSelectCourse} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/teacher/course/[id]/grades', params: { id: String(activeCourse.id) } })}
        >
          <Ionicons name="create-outline" size={16} color={Colors.text} />
          <Text style={styles.actionBtnText}>Notas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSettingsOpen(true)}>
          <Ionicons name="settings-outline" size={16} color={Colors.text} />
          <Text style={styles.actionBtnText}>Configurar</Text>
        </TouchableOpacity>
        <View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setFormatMenuOpen((v) => !v)} disabled={downloading}>
            {downloading ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="download-outline" size={16} color={Colors.text} />}
            <Text style={styles.actionBtnText}>Reporte</Text>
          </TouchableOpacity>
          {formatMenuOpen && (
            <View style={styles.formatMenu}>
              <TouchableOpacity style={styles.formatOption} onPress={() => handleDownloadReport('pdf')}>
                <Text style={styles.formatOptionText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatOption} onPress={() => handleDownloadReport('xlsx')}>
                <Text style={styles.formatOptionText}>Excel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Control de Asistencia</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {activeCourse.students.length === 0 ? (
          <EmptyState message="Sin estudiantes en este grupo" />
        ) : (
          activeCourse.students.map((s) => (
            <StudentAttendanceRow
              key={s.inscripcionId}
              student={s}
              present={attendance[s.inscripcionId]}
              onToggle={() => toggleAtt(s.inscripcionId)}
              onDownloadReport={
                downloadingStudentId === s.id ? undefined : () => handleDownloadStudentReport(s.id, s.name)
              }
            />
          ))
        )}

        {activeCourse.students.length > 0 && (
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Guardar Asistencia</Text>}
          </TouchableOpacity>
        )}
      </Card>

      <CourseSettingsSheet
        visible={settingsOpen}
        course={activeCourse}
        onClose={() => setSettingsOpen(false)}
        onSaved={refresh}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  actionsRow: { flexDirection: 'row', gap: Space.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Space.md, paddingVertical: Space.sm,
  },
  actionBtnText: { fontSize: Font.sm, fontWeight: '600', color: Colors.text },
  formatMenu: {
    position: 'absolute', top: 44, right: 0, zIndex: 10,
    backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.accent, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4, minWidth: 90,
  },
  formatOption: { paddingHorizontal: Space.md, paddingVertical: Space.sm },
  formatOptionText: { fontSize: Font.sm, color: Colors.text, fontWeight: '600' },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text },
  sectionHeader: { marginBottom: Space.md, gap: 2 },
  dateText: { fontSize: Font.sm, color: Colors.text2 },

  saveBtn: {
    marginTop: Space.md, backgroundColor: Colors.accent, borderRadius: 10,
    padding: Space.md, alignItems: 'center',
    shadowColor: Colors.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  saveBtnText: { fontSize: Font.base, fontWeight: '700', color: Colors.white },
});
