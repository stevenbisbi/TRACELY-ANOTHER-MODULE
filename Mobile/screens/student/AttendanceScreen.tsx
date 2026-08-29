import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import AlertBanner from '../../components/students/AlertBanner';
import { useData } from '../../context/DataContext';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import { attColor } from '../../utils/helpers';

export default function AttendanceScreen() {
  const { studentSemData: semData, loading } = useData();
  const courses = semData?.courses ?? [];

  if (loading && !semData) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!courses.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>No hay materias para este semestre</Text>
      </View>
    );
  }

  const avg = courses.reduce((s, c) => s + c.attendance, 0) / courses.length;
  const atRisk = courses.filter((c) => c.attendance < 80);
  const totalFaltas = courses.reduce((s, c) => s + c.absences, 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <View style={styles.statsBar}>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{avg.toFixed(0)}%</Text>
          <Text style={styles.statsBarLabel}>Global</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{atRisk.length}</Text>
          <Text style={styles.statsBarLabel}>En riesgo</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{totalFaltas}</Text>
          <Text style={styles.statsBarLabel}>Faltas</Text>
        </View>
      </View>

      <AlertBanner courseNames={atRisk.map((c) => c.name)} />

      {courses.map((c) => {
        const ok = c.attendance >= 80;
        return (
          <Card key={c.id}>
            <View style={styles.topRow}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{c.code}</Text>
              </View>
              <View style={styles.topRight}>
                <View style={[styles.statusPill, { backgroundColor: ok ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.12)' }]}>
                  <Text style={[styles.statusPillText, { color: ok ? Colors.green : Colors.orange }]}>
                    {ok ? '✓ Al día' : '⚠ Atención'}
                  </Text>
                </View>
                <Text style={[styles.attBig, { color: attColor(c.attendance) }]}>{c.attendance}%</Text>
              </View>
            </View>

            <Text style={styles.courseName}>{c.name}</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${c.attendance}%`, backgroundColor: attColor(c.attendance) }]} />
            </View>

            {!ok && (
              <View style={styles.warningRow}>
                <Text style={styles.warningText}>⚠ Estás por debajo del mínimo requerido en esta materia</Text>
              </View>
            )}

            <View style={styles.boxRow}>
              <View style={[styles.box, { backgroundColor: Colors.bg3 }]}>
                <Text style={styles.boxVal}>{c.totalSesiones}</Text>
                <Text style={styles.boxLabel}>Total</Text>
              </View>
              <View style={[styles.box, { backgroundColor: 'rgba(5,150,105,0.1)' }]}>
                <Text style={[styles.boxVal, { color: Colors.green }]}>{c.totalSesiones - c.absences}</Text>
                <Text style={styles.boxLabel}>Asistidas</Text>
              </View>
              <View style={[styles.box, { backgroundColor: 'rgba(220,38,38,0.08)' }]}>
                <Text style={[styles.boxVal, { color: Colors.red }]}>{c.absences}</Text>
                <Text style={styles.boxLabel}>Faltas</Text>
              </View>
            </View>

            {c.ultimasSesiones.length > 0 && (
              <View style={styles.sessionsBlock}>
                <View style={styles.sessionsHeader}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.text3} />
                  <Text style={styles.sessionsLabel}>Últimas sesiones</Text>
                </View>
                <View style={styles.sessionsRow}>
                  {c.ultimasSesiones.map((s, i) => (
                    <View
                      key={`${s.fecha}-${i}`}
                      style={[styles.sessionChip, { backgroundColor: s.presente ? Colors.green : Colors.red }]}
                    />
                  ))}
                </View>
              </View>
            )}
          </Card>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 32, marginBottom: Space.sm },
  emptyText: { fontSize: Font.base, color: Colors.text3 },

  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  statsBarItem: { flex: 1, alignItems: 'center', gap: 2 },
  statsBarValue: { fontSize: Font.xl, fontWeight: '800', color: Colors.primaryAction, letterSpacing: -0.5 },
  statsBarLabel: { fontSize: Font.xs, color: Colors.white, fontWeight: '600' },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  codeBadge: {
    backgroundColor: 'rgba(28,57,146,0.1)', borderRadius: Radius.sm,
    paddingHorizontal: Space.sm, paddingVertical: 3, alignSelf: 'flex-start',
  },
  codeBadgeText: { fontSize: Font.xs, fontWeight: '700', color: Colors.accent },
  topRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: Space.sm, paddingVertical: 3 },
  statusPillText: { fontSize: Font.xs, fontWeight: '700' },
  attBig: { fontSize: Font.xxl, fontWeight: '800', letterSpacing: -0.5 },

  courseName: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginTop: Space.sm, marginBottom: Space.md },

  progressTrack: { height: 8, backgroundColor: Colors.bg3, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },

  warningRow: {
    marginTop: Space.sm, padding: Space.sm,
    backgroundColor: 'rgba(220,38,38,0.07)', borderRadius: Radius.sm,
  },
  warningText: { fontSize: Font.xs, color: Colors.red, fontWeight: '500' },

  boxRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  box: { flex: 1, borderRadius: Radius.md, paddingVertical: Space.sm, alignItems: 'center', gap: 2 },
  boxVal: { fontSize: Font.lg, fontWeight: '700', color: Colors.text },
  boxLabel: { fontSize: Font.xs, color: Colors.text3, fontWeight: '600' },

  sessionsBlock: { marginTop: Space.md },
  sessionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Space.sm },
  sessionsLabel: { fontSize: Font.xs, color: Colors.text3, fontWeight: '700' },
  sessionsRow: { flexDirection: 'row', gap: Space.sm },
  sessionChip: { flex: 1, height: 8, borderRadius: 4 },
});
