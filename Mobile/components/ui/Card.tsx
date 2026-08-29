import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Radius, Space } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPad?: boolean;
}

export default function Card({ children, style, noPad }: Props) {
  return (
    <View style={[styles.card, noPad && { padding: 0 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.accent,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
