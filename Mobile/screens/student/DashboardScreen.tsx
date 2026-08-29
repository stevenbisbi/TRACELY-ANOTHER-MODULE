import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import RingChart from '../../components/charts/RingChart';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import AlertBanner from '../../components/students/AlertBanner';
import NotifItem from '../../components/students/NotifItem';
import CourseCard from '../../components/students/CourseCard';
import { useData } from '../../context/DataContext';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import { gradeColor, attColor } from '../../utils/helpers';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const { studentSemData: semData, loading, error, refresh } = useData();

  if (loading && !semData) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity onPress={refresh} style={{ marginTop: Space.md }}>
          <Text style={{ color: Colors.accent, fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!semData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyText}>No hay datos para este semestre</Text>
      </View>
    );
  }

  const { semester, gpa, attendanceRate, riskLevel, courses, notifications } = semData;
  const unread = notifications.filter((n) => !n.read).length;
  const alertCourses = courses.filter((c) => c.status === 'alert');

  const riskLabel = riskLevel === 'low' ? '✓ BAJO' : riskLevel === 'medium' ? '⚠ MEDIO' : '⛔ ALTO';
  const riskColor = riskLevel === 'low' ? Colors.green : riskLevel === 'medium' ? Colors.orange : Colors.red;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.semesterPill}>
        <Text style={styles.semesterLabel}>Semestre Actual</Text>
        <Text style={styles.semesterValue}>{semester}</Text>
      </View>

      <AlertBanner courseNames={alertCourses.map((c) => c.name)} />

      <View style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <StatCard iconName="bar-chart-outline" iconColor={Colors.accent} label="Promedio" value={gpa != null ? gpa.toFixed(1) : '—'} sub="Escala 0-5" valueColor={gradeColor(gpa)} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="checkmark-circle-outline" iconColor={Colors.green} label="Asistencia" value={attendanceRate != null ? `${attendanceRate}%` : '—'} sub="Mínimo 80%" valueColor={attColor(attendanceRate)} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="book-outline" iconColor={Colors.purple} label="Materias" value={String(courses.length)} sub={`${courses.reduce((a, c) => a + c.credits, 0)} créditos`} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="alert-circle-outline" iconColor={Colors.orange} label="Alertas" value={String(unread)} sub="Sin leer" valueColor={unread ? Colors.red : Colors.text} />
        </View>
      </View>

      <Card>
        <Text style={styles.riskTitle}>Nivel de Riesgo Académico</Text>
        <View style={styles.riskCenter}>
          <RingChart value={gpa ?? 0} max={5} size={140} color={gradeColor(gpa)} label={gpa != null ? gpa.toFixed(1) : '—'} sublabel="" />
          <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel}</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          {unread > 0 && <Badge variant="alert" label={`${unread} nuevas`} />}
        </View>
        {notifications.length === 0 ? (
          <Text style={styles.emptyInlineText}>Sin notificaciones</Text>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} notif={n} onPress={() => router.push('/(tabs)/grades')} />
          ))
        )}
      </Card>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Mis Materias</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/grades')}>
          <Text style={styles.sectionLink}>Ver notas →</Text>
        </TouchableOpacity>
      </View>

      {courses.map((c) => (
        <CourseCard key={c.id} course={c} onPress={() => router.push('/(tabs)/grades')} />
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 32, marginBottom: Space.sm },
  emptyText: { fontSize: Font.base, color: Colors.text3, textAlign: 'center' },
  emptyInlineText: { fontSize: Font.base, color: Colors.text3, textAlign: 'center', paddingVertical: Space.md },

  semesterPill: {
    backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingVertical: Space.md, paddingHorizontal: Space.md,
  },
  semesterLabel: { fontSize: Font.xs, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.6 },
  semesterValue: { fontSize: Font.base, fontWeight: '700', color: Colors.white, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  statsGridItem: { width: '47%' },

  riskTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.md, textAlign: 'center' },
  riskCenter: { alignItems: 'center', gap: Space.md },
  riskLabel: { fontSize: Font.base, fontWeight: '800', letterSpacing: 0.5 },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', letterSpacing: -0.2, color: Colors.text },
  sectionLink: { fontSize: Font.sm, color: Colors.accent, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
