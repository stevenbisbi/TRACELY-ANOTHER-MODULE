import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import FormSheet from '../ui/FormSheet';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import * as teachersService from '../../services/teachersService';
import { toNum } from '../../services/apiTypes';
import type { TeacherCourse } from '../../context/DataContext';

interface Props {
  visible: boolean;
  course: TeacherCourse;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_WEIGHTS = [30, 30, 40];

// Espejo de CourseSettingsModal.jsx en la web: pesos de los 3 cortes (deben
// sumar 100%) + umbral de advertencia.
export default function CourseSettingsSheet({ visible, course, onClose, onSaved }: Props) {
  const cortes = [...course.cortes].sort((a, b) => a.numero_corte - b.numero_corte);
  const [weights, setWeights] = useState<string[]>(() => cortes.map((c) => String(toNum(c.peso_porcentual) ?? 0)));
  const [umbral, setUmbral] = useState(String(course.umbralAdvertencia));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setWeights(cortes.map((c) => String(toNum(c.peso_porcentual) ?? 0)));
      setUmbral(String(course.umbralAdvertencia));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, course.id]);

  const sum = weights.reduce((s, w) => s + (Number(w) || 0), 0);

  const restoreDefaults = () => setWeights(DEFAULT_WEIGHTS.map(String));

  const submit = async () => {
    if (sum !== 100) {
      setError('Los pesos de los 3 cortes deben sumar 100%.');
      return;
    }
    const umbralNum = Number(umbral);
    if (Number.isNaN(umbralNum) || umbralNum < 0 || umbralNum > 5) {
      setError('El umbral debe ser un número entre 0 y 5.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await teachersService.updateCortes(
        course.id,
        cortes.map((c, i) => ({ id: c.id, peso_porcentual: Number(weights[i]) || 0 }))
      );
      await teachersService.updateUmbral(course.id, umbralNum);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo guardar la configuración');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSheet
      visible={visible}
      title="Configurar curso"
      onClose={onClose}
      onSubmit={submit}
      submitting={submitting}
      error={error}
    >
      <View style={styles.field}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Peso de los cortes</Text>
          <TouchableOpacity onPress={restoreDefaults}>
            <Text style={styles.restoreText}>Restaurar 30/30/40</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.corteRow}>
          {cortes.map((c, i) => (
            <View key={c.id} style={styles.corteBox}>
              <Text style={styles.corteLabel}>Corte {c.numero_corte}</Text>
              <TextInput
                style={styles.corteInput}
                value={weights[i]}
                onChangeText={(t) => setWeights((w) => w.map((v, j) => (j === i ? t.replace(/[^0-9]/g, '') : v)))}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.corteSuffix}>%</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sumText, sum !== 100 && styles.sumTextError]}>Suma actual: {sum}%</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Umbral de advertencia (0.0 – 5.0)</Text>
        <TextInput
          style={styles.umbralInput}
          value={umbral}
          onChangeText={setUmbral}
          keyboardType="decimal-pad"
          placeholder="3.5"
          placeholderTextColor={Colors.text3}
        />
        <Text style={styles.hint}>Nota definitiva por debajo de este valor genera una alerta.</Text>
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space.sm },
  label: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restoreText: { fontSize: Font.xs, fontWeight: '600', color: Colors.accent },

  corteRow: { flexDirection: 'row', gap: Space.sm },
  corteBox: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, paddingVertical: Space.sm, gap: 4,
  },
  corteLabel: { fontSize: Font.xs, color: Colors.text3, fontWeight: '700', textTransform: 'uppercase' },
  corteInput: { fontSize: Font.lg, fontWeight: '700', color: Colors.text, textAlign: 'center', minWidth: 40 },
  corteSuffix: { fontSize: Font.xs, color: Colors.text3 },
  sumText: { fontSize: Font.xs, color: Colors.text3 },
  sumTextError: { color: Colors.red, fontWeight: '600' },

  umbralInput: {
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.md,
    fontSize: Font.base, color: Colors.text,
  },
  hint: { fontSize: Font.xs, color: Colors.text3 },
});
