import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Radius, Space } from '../../constants/theme';

export interface SegmentedOption {
  key: string;
  label: string;
}

interface Props {
  options: SegmentedOption[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function SegmentedTabs({ options, activeKey, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.key === activeKey;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onSelect(o.key)}
          >
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, backgroundColor: Colors.bg3, padding: 4, borderRadius: Radius.md },
  segment: { flex: 1, paddingVertical: Space.sm, borderRadius: Radius.sm, alignItems: 'center' },
  segmentActive: {
    backgroundColor: Colors.white, shadowColor: Colors.accent, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  text: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  textActive: { color: Colors.accent, fontWeight: '700' },
});
