import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import { toNum } from '../../services/apiTypes';
import * as studentsService from '../../services/studentsService';
import type { PensumItem } from '../../services/studentsService';

const ESTADO_META: Record<PensumItem['estado'], { label: string; bg: string; text: string }> = {
  aprobada: { label: '✓ Aprobada', bg: 'rgba(5,150,105,0.12)', text: Colors.green },
  en_curso: { label: '● En curso', bg: 'rgba(28,57,146,0.1)', text: Colors.accent },
  pendiente: { label: 'Pendiente', bg: Colors.bg3, text: Colors.text3 },
};

export default function CurriculumScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<PensumItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await studentsService.getPensum(user.id_institucional);
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el pensum');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading && !items) {
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
        <TouchableOpacity onPress={load} style={{ marginTop: Space.md }}>
          <Text style={{ color: Colors.accent, fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!items || !items.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎓</Text>
        <Text style={styles.emptyText}>No hay pensum disponible</Text>
      </View>
    );
  }

  const aprobadas = items.filter((i) => i.estado === 'aprobada');
  const creditosAprobados = aprobadas.reduce((s, i) => s + i.creditos, 0);
  const creditosTotales = items.reduce((s, i) => s + i.creditos, 0);
  const progreso = creditosTotales > 0 ? Math.round((creditosAprobados / creditosTotales) * 100) : 0;

  const bySemestre = new Map<number, PensumItem[]>();
  items.forEach((i) => {
    if (!bySemestre.has(i.semestre)) bySemestre.set(i.semestre, []);
    bySemestre.get(i.semestre)!.push(i);
  });
  const semestres = [...bySemestre.keys()].sort((a, b) => a - b);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statsBar}>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{progreso}%</Text>
          <Text style={styles.statsBarLabel}>Avance</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{aprobadas.length}/{items.length}</Text>
          <Text style={styles.statsBarLabel}>Materias</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Text style={styles.statsBarValue}>{creditosAprobados}/{creditosTotales}</Text>
          <Text style={styles.statsBarLabel}>Créditos</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progreso}%` }]} />
      </View>

      {semestres.map((sem) => (
        <Card key={sem}>
          <Text style={styles.semTitle}>Semestre {sem}</Text>
          {bySemestre.get(sem)!.map((it) => {
            const meta = ESTADO_META[it.estado];
            const nota = toNum(it.nota_definitiva);
            return (
              <View key={it.pensum_id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.nombre_asignatura}</Text>
                  <Text style={styles.itemCredits}>{it.creditos} créditos</Text>
                </View>
                {nota != null && <Text style={styles.itemGrade}>{nota.toFixed(1)}</Text>}
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </Card>
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

  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.accent, borderRadius: Radius.md,
    paddingVertical: Space.md,
  },
  statsBarItem: { flex: 1, alignItems: 'center', gap: 2 },
  statsBarValue: { fontSize: Font.lg, fontWeight: '800', color: Colors.primaryAction, letterSpacing: -0.5 },
  statsBarLabel: { fontSize: Font.xs, color: Colors.white, fontWeight: '600' },

  progressTrack: { height: 8, backgroundColor: Colors.bg3, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: Colors.green },

  semTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.sm },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemName: { fontSize: Font.sm, fontWeight: '600', color: Colors.text },
  itemCredits: { fontSize: Font.xs, color: Colors.text3, marginTop: 1 },
  itemGrade: { fontSize: Font.sm, fontWeight: '700', color: Colors.text },
  badge: { borderRadius: Radius.full, paddingHorizontal: Space.sm, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
