import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import { TipoChip } from '../../components/ui/Badge';
import { useData } from '../../context/DataContext';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import { gradeColor, corteAvg, courseOverall } from '../../utils/helpers';
import type { StudentCourse } from '../../context/DataContext';

function gradeBadgeColors(value: number | null) {
  const c = gradeColor(value);
  return { bg: `${c}1F`, text: c };
}

function CourseSummaryCard({ course, onOpen }: { course: StudentCourse; onOpen: () => void }) {
  const overall = course.notaDefinitiva ?? courseOverall(course.cortes);
  const badge = gradeBadgeColors(overall);
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>{course.code}</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.gradeBadgeText, { color: badge.text }]}>{overall != null ? overall.toFixed(1) : '—'}</Text>
        </View>
      </View>
      <Text style={styles.cardCourseName}>{course.name}</Text>

      <View style={styles.corteMiniRow}>
        {course.cortes.map((ct) => {
          const avg = ct.notaCorte ?? corteAvg(ct.actividades);
          const color = gradeColor(avg);
          const pct = avg != null ? Math.max(0, Math.min(100, (avg / 5) * 100)) : 0;
          return (
            <View key={ct.id} style={styles.corteMiniItem}>
              <Text style={styles.corteMiniLabel}>P{ct.id} <Text style={styles.corteMiniWeight}>{ct.weight}%</Text></Text>
              <Text style={[styles.corteMiniGrade, { color }]}>{avg != null ? avg.toFixed(1) : '—'}</Text>
              <View style={styles.corteMiniTrack}>
                <View style={[styles.corteMiniFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.detailsBtn} onPress={onOpen}>
        <Text style={styles.detailsBtnText}>Ver detalles</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
      </TouchableOpacity>
    </Card>
  );
}

export default function GradesScreen() {
  const { studentSemData: semData, loading } = useData();
  const allCourses = semData?.courses ?? [];
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCorte, setActiveCorte] = useState(1);

  const filtered = search.trim()
    ? allCourses.filter(
        (c) =>
          c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          c.code.toLowerCase().includes(search.trim().toLowerCase())
      )
    : allCourses;

  if (loading && !semData) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!allCourses.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>No hay materias para este semestre</Text>
      </View>
    );
  }

  const overalls = allCourses.map((c) => c.notaDefinitiva ?? courseOverall(c.cortes)).filter((v): v is number => v != null);
  const gpaPromedio = overalls.length ? overalls.reduce((s, v) => s + v, 0) / overalls.length : null;
  const totalCreditos = allCourses.reduce((s, c) => s + c.credits, 0);

  const course = openId ? allCourses.find((c) => c.id === openId) ?? null : null;

  if (course) {
    const corte = course.cortes.find((c) => c.id === activeCorte) ?? course.cortes[0];
    const cvg = corte ? corte.notaCorte ?? corteAvg(corte.actividades) : null;
    const overall = course.notaDefinitiva ?? courseOverall(course.cortes);

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backToList} onPress={() => setOpenId(null)}>
          <Ionicons name="chevron-back" size={16} color={Colors.accent} />
          <Text style={styles.backToListText}>Mis Notas</Text>
        </TouchableOpacity>

        <Card>
          <View style={styles.courseHeader}>
            <View style={[styles.courseDot, { backgroundColor: course.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseTeacher}>{course.teacher} · {course.code}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.overallGrade, { color: gradeColor(overall) }]}>
                {overall != null ? overall.toFixed(2) : '—'}
              </Text>
              <Text style={styles.overallLabel}>acumulado</Text>
            </View>
          </View>

          <View style={styles.corteRow}>
            {course.cortes.map((ct) => {
              const avg = ct.notaCorte ?? corteAvg(ct.actividades);
              const isActive = activeCorte === ct.id;
              return (
                <TouchableOpacity
                  key={ct.id}
                  onPress={() => setActiveCorte(ct.id)}
                  style={[styles.cortePill, isActive && styles.cortePillActive]}
                >
                  <Text style={[styles.cortePillLabel, isActive && { color: Colors.accent }]}>{ct.label}</Text>
                  <Text style={[styles.cortePillGrade, { color: gradeColor(avg) }]}>
                    {avg != null ? avg.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.cortePillWeight}>{ct.weight}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {corte && (
          <Card>
            <View style={styles.corteHeader}>
              <Text style={styles.sectionTitle}>{corte.label}</Text>
              <Text style={styles.corteWeight}>{corte.weight}% de la nota final</Text>
            </View>

            {corte.actividades.length === 0 ? (
              <View style={styles.emptyInline}>
                <Text style={styles.emptyText}>Sin actividades en este corte</Text>
              </View>
            ) : (
              corte.actividades.map((act) => (
                <View key={act.id} style={styles.actRow}>
                  <TipoChip tipo={act.tipo} />
                  <Text style={styles.actLabel} numberOfLines={1}>{act.label}</Text>
                  {act.value != null ? (
                    <Text style={[styles.actGrade, { color: gradeColor(act.value) }]}>{act.value.toFixed(1)}</Text>
                  ) : (
                    <Text style={styles.actPending}>Pendiente</Text>
                  )}
                </View>
              ))
            )}

            {corte.actividades.length > 0 && (
              <View style={styles.corteFooter}>
                <View>
                  <Text style={styles.footerLabel}>Promedio {corte.label}</Text>
                  <Text style={[styles.footerVal, { color: gradeColor(cvg) }]}>
                    {cvg != null ? cvg.toFixed(2) : '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.footerLabel}>Peso final</Text>
                  <Text style={styles.footerVal}>{corte.weight}%</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { marginBottom: Space.md }]}>Resumen por Corte</Text>
          {course.cortes.map((ct) => {
            const avg = ct.notaCorte ?? corteAvg(ct.actividades);
            const done = ct.actividades.filter((a) => a.value != null).length;
            return (
              <View key={ct.id} style={styles.summaryRow}>
                <View style={[styles.corteNum, activeCorte === ct.id && styles.corteNumActive]}>
                  <Text style={[styles.corteNumText, activeCorte === ct.id && { color: Colors.accent }]}>{ct.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>{ct.label} <Text style={styles.summaryWeight}>({ct.weight}%)</Text></Text>
                  <Text style={styles.summaryDone}>{done}/{ct.actividades.length} evaluaciones</Text>
                </View>
                <Text style={[styles.summaryGrade, { color: gradeColor(avg) }]}>
                  {avg != null ? avg.toFixed(1) : '—'}
                </Text>
              </View>
            );
          })}
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Nota acumulada</Text>
            <Text style={[styles.summaryTotalVal, { color: gradeColor(overall) }]}>
              {overall != null ? overall.toFixed(2) : '—'}
            </Text>
          </View>

          {course.notaMinimaRequerida != null && (
            <View style={[
              styles.minReqBox,
              { backgroundColor: course.recuperable ? 'rgba(254,147,0,0.08)' : 'rgba(220,38,38,0.08)' },
            ]}>
              <View>
                <Text style={styles.minReqLabel}>Nota mínima requerida en lo pendiente</Text>
                <Text style={[styles.minReqVal, { color: course.recuperable ? Colors.accent : Colors.red }]}>
                  {Math.max(0, course.notaMinimaRequerida).toFixed(2)}
                </Text>
              </View>
              <Text style={[styles.minReqBadge, { color: course.recuperable ? Colors.green : Colors.red }]}>
                {course.recuperable ? '✓ Recuperable' : '✗ No recuperable'}
              </Text>
            </View>
          )}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsBar}>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{gpaPromedio != null ? gpaPromedio.toFixed(2) : '—'}</Text>
          <Text style={styles.statsBarLabel}>Promedio</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{allCourses.length}</Text>
          <Text style={styles.statsBarLabel}>Materias</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{totalCreditos}</Text>
          <Text style={styles.statsBarLabel}>Créditos</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.text3} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar materia..."
          placeholderTextColor={Colors.text3}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {!filtered.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Sin resultados para &quot;{search}&quot;</Text>
        </View>
      ) : (
        filtered.map((c) => (
          <CourseSummaryCard key={c.id} course={c} onOpen={() => { setOpenId(c.id); setActiveCorte(1); }} />
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyInline: { alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 28, marginBottom: Space.sm },
  emptyText: { fontSize: Font.base, color: Colors.text3, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  statsBarItem: { flex: 1, alignItems: 'center', gap: 2 },
  statsBarValue: { fontSize: Font.xl, fontWeight: '800', color: Colors.primaryAction, letterSpacing: -0.5 },
  statsBarLabel: { fontSize: Font.xs, color: Colors.white, fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Space.md, paddingVertical: Space.sm,
  },
  searchInput: { flex: 1, fontSize: Font.base, color: Colors.text },

  codeBadge: {
    backgroundColor: 'rgba(28,57,146,0.1)', borderRadius: Radius.sm,
    paddingHorizontal: Space.sm, paddingVertical: 3,
  },
  codeBadgeText: { fontSize: Font.xs, fontWeight: '700', color: Colors.accent },
  gradeBadge: { borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: 4 },
  gradeBadgeText: { fontSize: Font.lg, fontWeight: '800' },
  cardCourseName: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginTop: Space.sm },

  corteMiniRow: { flexDirection: 'row', gap: Space.md, marginTop: Space.md },
  corteMiniItem: { flex: 1, gap: 3 },
  corteMiniLabel: { fontSize: Font.xs, color: Colors.text3, fontWeight: '600' },
  corteMiniWeight: { color: Colors.text3, fontWeight: '400' },
  corteMiniGrade: { fontSize: Font.base, fontWeight: '700' },
  corteMiniTrack: { height: 4, backgroundColor: Colors.bg3, borderRadius: 3, overflow: 'hidden' },
  corteMiniFill: { height: '100%', borderRadius: 3 },

  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: Space.md, paddingTop: Space.sm },
  detailsBtnText: { fontSize: Font.sm, fontWeight: '700', color: Colors.accent },

  backToList: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backToListText: { fontSize: Font.base, fontWeight: '700', color: Colors.accent },

  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginBottom: Space.md },
  courseDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  courseName: { fontSize: Font.md, fontWeight: '700', color: Colors.text },
  courseTeacher: { fontSize: Font.sm, color: Colors.text2, marginTop: 2 },
  overallGrade: { fontSize: Font.xxl, fontWeight: '700', letterSpacing: -0.5 },
  overallLabel: { fontSize: Font.xs, color: Colors.text3 },

  corteRow: { flexDirection: 'row', gap: Space.sm },
  cortePill: {
    flex: 1, alignItems: 'center', padding: Space.sm,
    backgroundColor: Colors.bg3, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cortePillActive: { backgroundColor: 'rgba(28,57,146,0.06)', borderColor: 'rgba(28,57,146,0.3)' },
  cortePillLabel: { fontSize: Font.xs, fontWeight: '700', color: Colors.text2, textTransform: 'uppercase' },
  cortePillGrade: { fontSize: Font.md, fontWeight: '700', marginTop: 2 },
  cortePillWeight: { fontSize: Font.xs, color: Colors.text3 },

  corteHeader: { marginBottom: Space.md },
  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text },
  corteWeight: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  actLabel: { flex: 1, fontSize: Font.base, fontWeight: '500', color: Colors.text },
  actGrade: { fontSize: Font.xl, fontWeight: '700', letterSpacing: -0.5 },
  actPending: { fontSize: Font.sm, color: Colors.text3, fontStyle: 'italic' },

  corteFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Space.md, padding: Space.md, backgroundColor: Colors.bg3, borderRadius: Radius.md,
  },
  footerLabel: { fontSize: Font.xs, color: Colors.text2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  footerVal: { fontSize: Font.xxl, fontWeight: '700', letterSpacing: -0.5, color: Colors.text },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  corteNum: {
    width: 30, height: 30, borderRadius: Radius.sm,
    backgroundColor: Colors.bg3, alignItems: 'center', justifyContent: 'center',
  },
  corteNumActive: { backgroundColor: 'rgba(28,57,146,0.1)' },
  corteNumText: { fontSize: Font.base, fontWeight: '700', color: Colors.text2 },
  summaryLabel: { fontSize: Font.base, fontWeight: '500', color: Colors.text },
  summaryWeight: { fontSize: Font.xs, color: Colors.text3 },
  summaryDone: { fontSize: Font.xs, color: Colors.text3 },
  summaryGrade: { fontSize: Font.xl, fontWeight: '700' },
  summaryTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Space.md, paddingTop: Space.md, borderTopWidth: 2, borderTopColor: Colors.border,
  },
  summaryTotalLabel: { fontSize: Font.base, fontWeight: '600', color: Colors.text2 },
  summaryTotalVal: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  minReqBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Space.md, padding: Space.md, borderRadius: Radius.md,
  },
  minReqLabel: { fontSize: Font.xs, fontWeight: '700', color: Colors.text2, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  minReqVal: { fontSize: Font.lg, fontWeight: '700' },
  minReqBadge: { fontSize: Font.xs, fontWeight: '700' },
});
