import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Colors, Font, Space, Radius } from '../../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmación para acciones destructivas (eliminar usuario/materia/carrera/
// actividad). El logout, en cambio, no usa esto — es inmediato, igual que en
// la web. Si `onConfirm` falla (ej. el backend rechaza el borrado por tener
// dependientes), el llamador pasa `error` y el diálogo se queda abierto
// mostrando el motivo, en vez de cerrarse silenciosamente.
export default function ConfirmDialog({
  visible, title, message, confirmLabel = 'Eliminar', destructive = true, loading, error, onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={destructive ? Colors.red : Colors.white} />
              ) : (
                <Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,27,58,0.45)', alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Space.lg, gap: Space.xs },
  title: { fontSize: Font.md, fontWeight: '700', color: Colors.text },
  message: { fontSize: Font.sm, color: Colors.text2, marginBottom: Space.md },
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.08)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: Radius.md, padding: Space.sm, marginBottom: Space.md, marginTop: -Space.sm,
  },
  errorText: { color: Colors.red, fontSize: Font.xs, fontWeight: '500' },
  row: { flexDirection: 'row', gap: Space.sm },
  cancelBtn: { flex: 1, paddingVertical: Space.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.bg3 },
  cancelText: { fontSize: Font.sm, fontWeight: '600', color: Colors.text2 },
  confirmBtn: { flex: 1, paddingVertical: Space.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.accent },
  confirmBtnDestructive: { backgroundColor: 'rgba(220,38,38,0.1)' },
  confirmText: { fontSize: Font.sm, fontWeight: '700', color: Colors.white },
  confirmTextDestructive: { color: Colors.red },
});
