import React, { useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import NotifItem from '../../components/students/NotifItem';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export default function MainMenuScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { profile, studentSemData: semData, unread } = useData();

  const gpa = semData?.gpa ?? null;
  const attendanceRate = semData?.attendanceRate ?? null;
  const materias = semData?.courses.length ?? 0;
  const notifications = semData?.notifications ?? [];

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' as const, color: Colors.accent, onPress: () => router.push('/(tabs)/dashboard') },
    { key: 'grades', label: 'Mis Notas', icon: 'book-outline' as const, color: Colors.primaryAction, onPress: () => router.push('/(tabs)/grades') },
    { key: 'attendance', label: 'Asistencia', icon: 'checkmark-circle-outline' as const, color: Colors.accent, onPress: () => router.push('/(tabs)/attendance') },
    { key: 'progress', label: 'Progreso', icon: 'trending-up-outline' as const, color: Colors.primaryAction, onPress: () => router.push('/(tabs)/curriculum') },
  ];

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerBlock}
      >
        <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
              <Text style={styles.avatarText}>{profile.initials}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.name || '—'}</Text>
            <Text style={styles.sub}>{profile.sub}</Text>
          </View>
          <TouchableOpacity onPress={() => scrollRef.current?.scrollToEnd({ animated: true })} hitSlop={8} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{gpa != null ? gpa.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{attendanceRate != null ? `${attendanceRate}%` : '—'}</Text>
            <Text style={styles.statLabel}>Asistencia</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{materias}</Text>
            <Text style={styles.statLabel}>Materias</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Menú Principal</Text>
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.key} style={styles.gridItem} onPress={item.onPress}>
              <View style={[styles.gridIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={26} color={Colors.white} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread}</Text>
            </View>
          )}
        </View>
        {notifications.length === 0 ? (
          <Text style={styles.emptyText}>Sin notificaciones</Text>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} notif={n} onPress={() => router.push('/(tabs)/grades')} />
          ))
        )}

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.accent },
  content: {},

  headerBlock: { paddingTop: 64, paddingBottom: Space.xl, paddingHorizontal: Space.lg, gap: Space.lg },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  avatarRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.primaryAction,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Font.base, fontWeight: '700', color: Colors.white },
  name: { fontSize: Font.lg, fontWeight: '700', color: Colors.white },
  sub: { fontSize: Font.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bellBtn: { padding: 2 },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.red, borderRadius: Radius.full,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.white },

  statsRow: { flexDirection: 'row', gap: Space.sm },
  statPill: {
    flex: 1, borderRadius: Radius.lg, paddingVertical: Space.md, alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  statValue: { fontSize: Font.xl, fontWeight: '800', letterSpacing: -0.5, color: Colors.primaryAction },
  statLabel: { fontSize: Font.xs, color: Colors.white, fontWeight: '600' },

  body: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Space.lg, gap: Space.lg, marginTop: -Space.md,
  },

  sectionTitle: { fontSize: Font.lg, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md },
  gridItem: {
    width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingVertical: Space.lg, alignItems: 'center', gap: Space.sm,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#1C3992', shadowOpacity: 0.06, shadowRadius: 8, elevation: 1,
  },
  gridIcon: {
    width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  gridLabel: { fontSize: Font.sm, fontWeight: '700', color: Colors.text },

  unreadBadge: {
    backgroundColor: Colors.red, borderRadius: Radius.full,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: Font.xs, fontWeight: '800', color: Colors.white },
  emptyText: { fontSize: Font.base, color: Colors.text3, textAlign: 'center', paddingVertical: Space.md },
});
