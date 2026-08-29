import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Font, Space } from '../../constants/theme';
import * as adminService from '../../services/adminService';
import type { AdminOverview, RecentActivityItem } from '../../services/adminService';

const SEVERITY_COLOR: Record<RecentActivityItem['severity'], string> = {
  critical: Colors.red,
  high: Colors.orange,
  info: Colors.accent,
};

export default function OverviewScreen() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ov, act] = await Promise.all([adminService.getOverview(), adminService.getRecentActivity()]);
      setOverview(ov);
      setActivity(act);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el resumen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !overview) {
    return <EmptyState icon="⚠️" message={error ?? 'Sin datos'} actionLabel="Reintentar" onAction={load} />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.accent]} />}
    >
      <View style={styles.semesterPill}>
        <Text style={styles.semesterLabel}>Semestre Activo</Text>
        <Text style={styles.semesterValue}>{overview.activeSemester}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <StatCard iconName="people-outline" iconColor={Colors.accent} label="Estudiantes" value={String(overview.totalStudents)} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="person-outline" iconColor={Colors.purple} label="Docentes" value={String(overview.totalTeachers)} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="school-outline" iconColor={Colors.primaryAction} label="Materias" value={String(overview.totalCourses)} />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="alert-circle-outline" iconColor={Colors.red} label="En Riesgo" value={String(overview.atRiskCount)} valueColor={overview.atRiskCount ? Colors.red : Colors.text} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsGridItem}>
          <StatCard iconName="bar-chart-outline" iconColor={Colors.accent} label="GPA Global" value={overview.avgGpa.toFixed(1)} sub="Escala 0-5" />
        </View>
        <View style={styles.statsGridItem}>
          <StatCard iconName="checkmark-circle-outline" iconColor={Colors.green} label="Asistencia" value={`${overview.attendanceGlobal}%`} sub="Promedio global" />
        </View>
        <View style={[styles.statsGridItem, { width: '100%' }]}>
          <StatCard iconName="trending-up-outline" iconColor={Colors.green} label="Retención" value={`${overview.retentionRate}%`} sub="Estudiantes que no reprueban" />
        </View>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        {activity.length === 0 ? (
          <Text style={styles.emptyText}>Sin actividad reciente</Text>
        ) : (
          activity.map((a) => (
            <View key={a.id} style={styles.activityRow}>
              <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[a.severity] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activityMessage}>{a.message}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  semesterPill: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: Space.md, paddingHorizontal: Space.md },
  semesterLabel: { fontSize: Font.xs, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.6 },
  semesterValue: { fontSize: Font.base, fontWeight: '700', color: Colors.white, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  statsGridItem: { width: '47%' },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.md },
  emptyText: { fontSize: Font.sm, color: Colors.text3, textAlign: 'center', paddingVertical: Space.md },

  activityRow: { flexDirection: 'row', gap: Space.sm, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityMessage: { fontSize: Font.sm, color: Colors.text },
  activityTime: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
});
