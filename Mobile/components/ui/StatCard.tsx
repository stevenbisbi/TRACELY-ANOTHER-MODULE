import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radius, Space } from '../../constants/theme';

interface Props {
  icon?: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

export default function StatCard({ icon, iconName, iconColor = Colors.accent, label, value, sub, valueColor }: Props) {
  return (
    <View style={styles.card}>
      {iconName ? (
        <View style={[styles.iconBadge, { backgroundColor: `${iconColor}1A` }]}>
          <Ionicons name={iconName} size={16} color={iconColor} />
        </View>
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.accent,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: { fontSize: Font.lg, marginBottom: Space.sm },
  iconBadge: {
    width: 28, height: 28, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: Space.sm,
  },
  label: {
    fontSize: Font.xs,
    fontWeight: '700',
    color: Colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    color: Colors.text,
    lineHeight: 34,
  },
  sub: { fontSize: Font.xs, color: Colors.text3, marginTop: 3 },
});
