import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Space } from '../../constants/theme';

export default function AlertBanner({ courseNames }: { courseNames: string[] }) {
  if (!courseNames.length) return null;
  return (
    <View style={styles.alertBanner}>
      <Text style={styles.alertText}>
        ⚠ {courseNames.length} materia(s) requieren atención: {courseNames.join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    borderRadius: Radius.md,
    padding: Space.md,
  },
  alertText: { fontSize: Font.base, fontWeight: '500', color: Colors.red },
});
