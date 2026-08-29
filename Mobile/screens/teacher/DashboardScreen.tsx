import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { Colors, Font, Space } from '../../constants/theme';

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const { teacherSemData: semData, loading, error, refresh } = useData();
  const courses = semData?.courses ?? [];

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

  if (!courses.length) {
    return <EmptyState icon="📅" message="No hay cursos para este semestre" />;
  }

  const totalStudents = courses.reduce((a, c) => a + c.students.length, 0);
  const criticalStudents = courses.flatMap((c) => c.students.filter((s) => s.status === 'critical').map((s) => ({ ...s, courseName: c.name })));

  const goToCourse = (courseId: string) => router.push({ pathname: '/(tabs)/courses', params: { courseId } });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <StatCard iconName="school-outline" iconColor={Colors.accent} label="Cursos" value={String(courses.length)} sub="Este semestre" />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="people-outline" iconColor={Colors.purple} label="Estudiantes" value={String(totalStudents)} sub="Total inscritos" />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="alert-circle-outline" iconColor={Colors.red} label="Crítico" value={String(criticalStudents.length)} sub="En riesgo alto" valueColor={criticalStudents.length ? Colors.red : Colors.text} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="checkmark-circle-outline" iconColor={Colors.green} label="Asistencia" value={`${semData?.courses.length ? Math.round(courses.reduce((s, c) => s + (c.students.length ? c.students.filter((st) => st.status === 'active').length / c.students.length : 1), 0) / courses.length * 100) : 0}%`} sub="Promedio general" />
        </View>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Mis Cursos</Text>
        {courses.map((c) => (
          <TouchableOpacity key={c.id} style={styles.courseListRow} onPress={() => goToCourse(c.id)}>
            <View style={[styles.courseDot, { backgroundColor: c.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.courseListName} numberOfLines={1}>{c.name}</Text>
              <Text style={styles.courseListSub}>{c.code} · {c.students.length} est.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      {criticalStudents.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Estudiantes en Riesgo</Text>
          {criticalStudents.map((s) => (
            <View key={s.inscripcionId} style={styles.riskRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskName}>{s.name}</Text>
                <Text style={styles.riskSub}>{s.courseName}</Text>
              </View>
              <Text style={styles.riskPct}>{s.attendance}%</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  statsGridItem: { width: '47%' },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.md },

  courseListRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  courseDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  courseListName: { fontSize: Font.sm, fontWeight: '500', color: Colors.text },
  courseListSub: { fontSize: Font.xs, color: Colors.text2 },
  chevron: { fontSize: Font.lg, color: Colors.text3 },

  riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  riskName: { fontSize: Font.sm, fontWeight: '600', color: Colors.text },
  riskSub: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  riskPct: { fontSize: Font.base, fontWeight: '700', color: Colors.red },
});
