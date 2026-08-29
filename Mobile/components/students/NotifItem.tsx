import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Space } from '../../constants/theme';
import type { Notif } from '../../context/DataContext';

const DOT_COLOR: Record<Notif['type'], string> = {
  alert: Colors.red,
  warning: Colors.orange,
  success: Colors.green,
  info: Colors.accent,
};

export default function NotifItem({ notif, onPress }: { notif: Notif; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.notifItem, !notif.courseId && { opacity: 0.9 }]}
      onPress={notif.courseId ? onPress : undefined}
      activeOpacity={notif.courseId ? 0.6 : 1}
    >
      <View style={[styles.notifDot, { backgroundColor: DOT_COLOR[notif.type] }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifMsg, !notif.read && { color: Colors.text, fontWeight: '600' }]}>{notif.message}</Text>
        {notif.time !== '' && <Text style={styles.notifTime}>{notif.time}</Text>}
      </View>
      {notif.courseId != null && <Text style={{ fontSize: Font.sm, color: Colors.accent }}>→</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Space.md,
    paddingVertical: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  notifMsg: { fontSize: Font.base, color: Colors.text2, lineHeight: 18 },
  notifTime: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
});
