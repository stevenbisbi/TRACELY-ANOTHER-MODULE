import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { BadgeVariant, TipoColor, Font, Radius } from '../../constants/theme';

type BadgeKey = keyof typeof BadgeVariant;

export function Badge({ variant, label }: { variant: BadgeKey; label: string }) {
  const theme = BadgeVariant[variant] ?? BadgeVariant.active;
  return (
    <View style={[styles.base, { backgroundColor: theme.bg }]}>
      <Text style={[styles.text, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

export function TipoChip({ tipo }: { tipo: string }) {
  const theme = TipoColor[tipo] ?? { bg: 'rgba(99,85,165,0.10)', text: '#6355A5' };
  return (
    <View style={[styles.base, { backgroundColor: theme.bg }]}>
      <Text style={[styles.text, { color: theme.text }]}>{tipo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Font.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
