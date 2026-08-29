import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Space, Radius } from '../../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

// Modal de formulario en bottom-sheet — base de todos los crear/editar del
// panel admin y de "Configurar curso" del docente. Un único patrón visual
// para todo lo que sea "abrir un formulario", igual que la web resuelve
// create/edit con el mismo componente de modal reutilizado.
export default function FormSheet({ visible, title, onClose, onSubmit, submitLabel = 'Guardar', submitting, error, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>{submitLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,58,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    maxHeight: '86%', paddingBottom: Space.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Space.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: Font.lg, fontWeight: '700', color: Colors.text },
  body: {},
  bodyContent: { padding: Space.lg, gap: Space.lg },

  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.08)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: Radius.md, padding: Space.md,
  },
  errorText: { color: Colors.red, fontSize: Font.sm, fontWeight: '500' },

  footer: { paddingHorizontal: Space.lg, paddingTop: Space.sm },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Space.md,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.white, fontSize: Font.base, fontWeight: '700' },
});
