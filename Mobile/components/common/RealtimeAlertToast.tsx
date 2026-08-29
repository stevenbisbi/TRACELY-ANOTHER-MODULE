import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import type { AlertaPayload } from '../../services/socketService';

const AUTO_DISMISS_MS = 7000;

export interface RealtimeAlert extends AlertaPayload {
  resuelta: boolean;
}

interface Props {
  alert: RealtimeAlert | null;
  onClose: () => void;
  onNavigate: () => void;
}

// Banner de notificación en tiempo real (WebSocket) que aparece abajo,
// sin importar en qué vista de estudiante esté — avisa que hay una alerta
// nueva/resuelta y lleva a "Mis Notas"/"Asistencia" (el detalle vive ahí).
export default function RealtimeAlertToast({ alert, onClose, onNavigate }: Props) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alert) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [alert, onClose, translateY, opacity]);

  if (!alert) return null;

  const critica = alert.tipo === 'critica';
  const color = alert.resuelta ? Colors.green : critica ? Colors.red : Colors.orange;

  return (
    <Animated.View style={[styles.toast, { borderColor: color, transform: [{ translateY }], opacity }]}>
      <TouchableOpacity style={styles.content} onPress={() => { onNavigate(); onClose(); }} activeOpacity={0.85}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={alert.resuelta ? 'checkmark-circle' : 'alert-circle'} size={20} color={color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{alert.resuelta ? 'Alerta resuelta' : 'Nueva alerta'}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {alert.resuelta ? `Ya no estás en riesgo en ${alert.asignaturaNombre}.` : 'Revísala ahora.'}
            {!alert.resuelta && alert.asignaturaNombre ? ` — ${alert.asignaturaNombre}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={Colors.text3} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: Space.lg, right: Space.lg, bottom: 88, zIndex: 1000,
    backgroundColor: Colors.card, borderWidth: 1.5, borderRadius: Radius.lg,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.md },
  iconWrap: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  title: { fontSize: Font.sm, fontWeight: '800', color: Colors.text },
  body: { fontSize: Font.xs, color: Colors.text2, marginTop: 1 },
  closeBtn: { padding: 4 },
});
