import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Space } from '../../constants/theme';

interface Props {
  icon?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = '📭', message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.empty}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={{ marginTop: Space.md }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 32, marginBottom: Space.sm },
  text: { fontSize: Font.base, color: Colors.text3, textAlign: 'center' },
  action: { color: Colors.accent, fontWeight: '600', fontSize: Font.sm },
});
