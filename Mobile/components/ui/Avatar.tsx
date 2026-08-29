import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font } from '../../constants/theme';

interface Props {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  ringColor?: string;
}

const SIZES: Record<NonNullable<Props['size']>, { box: number; font: number }> = {
  sm: { box: 36, font: Font.xs },
  md: { box: 50, font: Font.base },
  lg: { box: 64, font: Font.xl },
};

export default function Avatar({ initials, color, size = 'md', onPress, ringColor }: Props) {
  const { box, font } = SIZES[size];
  const content = (
    <View
      style={[
        styles.circle,
        { width: box, height: box, borderRadius: box / 2, backgroundColor: color },
        ringColor && { borderWidth: 2, borderColor: ringColor },
      ]}
    >
      <Text style={[styles.text, { fontSize: font }]}>{initials}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} hitSlop={4}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', color: Colors.white },
});
