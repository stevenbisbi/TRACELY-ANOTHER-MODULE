import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FormSheet from '../../components/ui/FormSheet';
import FormField from '../../components/ui/FormField';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import * as adminService from '../../services/adminService';
import type { ProgramStat } from '../../services/adminService';

export default function ProgramsScreen() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [creditos, setCreditos] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPrograms(await adminService.getProgramStats());
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los programas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setNombre(''); setCodigo(''); setCreditos(''); setFormError(null);
    setCreating(true);
  };

  const submitCreate = async () => {
    if (!nombre.trim() || !codigo.trim()) {
      setFormError('Nombre y código son obligatorios.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await adminService.createCareer({ nombre: nombre.trim(), codigo: codigo.trim(), total_creditos: Number(creditos) || 0 });
      setCreating(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? 'No se pudo crear la carrera');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return <EmptyState icon="⚠️" message={error} actionLabel="Reintentar" onAction={load} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.createBtnText}>Nueva carrera</Text>
        </TouchableOpacity>

        {programs.length === 0 ? (
          <EmptyState message="No hay programas registrados" />
        ) : (
          <View style={styles.grid}>
            {programs.map((p) => (
              <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/admin/program/${p.id}`)}>
                <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
                <View style={styles.cardStatsRow}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatVal}>{p.students}</Text>
                    <Text style={styles.cardStatLabel}>Est.</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatVal}>{p.avgGpa.toFixed(1)}</Text>
                    <Text style={styles.cardStatLabel}>GPA</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatVal}>{p.retention}%</Text>
                    <Text style={styles.cardStatLabel}>Retenc.</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FormSheet
        visible={creating}
        title="Nueva carrera"
        onClose={() => setCreating(false)}
        onSubmit={submitCreate}
        submitting={submitting}
        error={formError}
      >
        <FormField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ingeniería de Sistemas" />
        <FormField label="Código" value={codigo} onChangeText={setCodigo} placeholder="IS" autoCapitalize="characters" />
        <FormField label="Créditos totales" value={creditos} onChangeText={(t) => setCreditos(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="160" />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Space.sm,
  },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: Font.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  card: {
    width: '47%', backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    padding: Space.md, gap: Space.sm, shadowColor: Colors.accent, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
  },
  cardName: { fontSize: Font.sm, fontWeight: '700', color: Colors.text, minHeight: 34 },
  cardStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardStat: { alignItems: 'center' },
  cardStatVal: { fontSize: Font.base, fontWeight: '700', color: Colors.accent },
  cardStatLabel: { fontSize: 10, color: Colors.text3, marginTop: 1 },
});
