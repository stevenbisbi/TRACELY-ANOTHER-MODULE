import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors, Font, Space, Radius } from '../../constants/theme';

interface Props extends TextInputProps {
  label: string;
  hint?: string;
}

export default function FormField({ label, hint, style, ...inputProps }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.text3}
        {...inputProps}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space.xs },
  label: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  input: {
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.md,
    fontSize: Font.base, color: Colors.text,
  },
  hint: { fontSize: Font.xs, color: Colors.text3 },
});
