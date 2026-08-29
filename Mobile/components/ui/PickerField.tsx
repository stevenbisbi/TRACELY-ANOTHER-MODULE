import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export interface PickerOption {
  value: string;
  label: string;
  disabled?: boolean;
  sublabel?: string;
}

interface Props {
  label: string;
  placeholder?: string;
  value: string | null;
  options: PickerOption[];
  onSelect: (value: string) => void;
}

// Selector tipo <select> — RN no tiene un equivalente nativo simple, así que
// se resuelve con un campo tocable que abre una lista filtrable en modal.
export default function PickerField({ label, placeholder = 'Selecciona...', value, options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.text3} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.disabled && styles.optionDisabled]}
                  disabled={item.disabled}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionText}>{item.label}</Text>
                    {item.sublabel && <Text style={styles.optionSub}>{item.sublabel}</Text>}
                  </View>
                  {item.value === value && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Sin opciones</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Space.xs },
  label: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.md,
  },
  triggerText: { fontSize: Font.base, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.text3 },

  overlay: { flex: 1, backgroundColor: 'rgba(30,27,58,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Space.lg, maxHeight: '70%',
  },
  sheetTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    paddingVertical: Space.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionDisabled: { opacity: 0.4 },
  optionText: { fontSize: Font.base, color: Colors.text, fontWeight: '500' },
  optionSub: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  emptyText: { fontSize: Font.sm, color: Colors.text3, textAlign: 'center', paddingVertical: Space.lg },
});
