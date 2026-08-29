import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui/Badge';
import { Colors, Font, Radius, Space } from '../../constants/theme';
import type { TeacherStudent } from '../../context/DataContext';

const STATUS_LABEL: Record<TeacherStudent['status'], string> = {
  active: 'OK', warning: 'Aviso', risk: 'Riesgo', critical: 'Crítico',
};

export default function StudentAttendanceRow({
  student, present, onToggle, onDownloadReport,
}: {
  student: TeacherStudent;
  present: boolean | undefined;
  onToggle: () => void;
  onDownloadReport?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.sub}>{student.absences} inasistencias · {student.attendance}%</Text>
      </View>
      <Badge variant={student.status as any} label={STATUS_LABEL[student.status]} />
      {onDownloadReport && (
        <TouchableOpacity onPress={onDownloadReport} hitSlop={6} style={styles.reportBtn}>
          <Ionicons name="document-text-outline" size={18} color={Colors.accent} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.attChip,
          present === undefined ? styles.attUnset : present ? styles.attPresent : styles.attAbsent,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.attChipText}>{present === undefined ? '?' : present ? '✓' : '✕'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bg3, borderWidth: 1.5, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Font.xs, fontWeight: '700', color: Colors.text2 },
  reportBtn: { padding: 4 },
  name: { fontSize: Font.base, fontWeight: '500', color: Colors.text },
  sub: { fontSize: Font.xs, color: Colors.text3 },

  attChip: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  attUnset: { backgroundColor: Colors.bg3 },
  attPresent: { backgroundColor: 'rgba(5,150,105,0.12)' },
  attAbsent: { backgroundColor: 'rgba(220,38,38,0.10)' },
  attChipText: { fontSize: Font.md, fontWeight: '700', color: Colors.text2 },
});
