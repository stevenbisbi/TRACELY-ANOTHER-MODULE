import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Space, Radius } from '../../constants/theme';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChangeText, placeholder = 'Buscar...' }: Props) {
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={18} color={Colors.text3} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Space.md, paddingVertical: Space.sm,
  },
  input: { flex: 1, fontSize: Font.base, color: Colors.text },
});
