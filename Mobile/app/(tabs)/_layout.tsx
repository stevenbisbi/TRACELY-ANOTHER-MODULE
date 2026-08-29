import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Colors, Radius, Space } from '../../constants/theme';
import { onAlertaNueva, onAlertaResuelta, disconnectSocket } from '../../services/socketService';
import RealtimeAlertToast, { RealtimeAlert } from '../../components/common/RealtimeAlertToast';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDef {
  key: string;
  path: string;
  outline: IconName;
  filled: IconName;
  badge?: boolean;
}

const STUDENT_TABS: TabDef[] = [
  { key: 'index', path: '/(tabs)', outline: 'home-outline', filled: 'home', badge: true },
  { key: 'grades', path: '/(tabs)/grades', outline: 'bar-chart-outline', filled: 'bar-chart' },
  { key: 'attendance', path: '/(tabs)/attendance', outline: 'checkmark-circle-outline', filled: 'checkmark-circle' },
  { key: 'profile', path: '/(tabs)/profile', outline: 'person-outline', filled: 'person' },
];

const TEACHER_TABS: TabDef[] = [
  { key: 'index', path: '/(tabs)', outline: 'home-outline', filled: 'home' },
  { key: 'courses', path: '/(tabs)/courses', outline: 'school-outline', filled: 'school' },
  { key: 'profile', path: '/(tabs)/profile', outline: 'person-outline', filled: 'person' },
];

const ADMIN_TABS: TabDef[] = [
  { key: 'overview', path: '/(tabs)/admin/overview', outline: 'stats-chart-outline', filled: 'stats-chart' },
  { key: 'people', path: '/(tabs)/admin/people', outline: 'people-outline', filled: 'people' },
  { key: 'programs', path: '/(tabs)/admin/programs', outline: 'library-outline', filled: 'library' },
  { key: 'profile', path: '/(tabs)/profile', outline: 'person-outline', filled: 'person' },
];

// Barra flotante propia, independiente del tabBar por defecto de React
// Navigation — se dibuja como overlay sobre el Stack de tabs (que se deja
// sin barra visual, ver `tabBarStyle: { display: 'none' }` abajo). Controlar
// cada píxel acá evita los paddings/posicionamiento interno del tabBar
// nativo, que es lo que hacía que los iconos quedaran fuera de la cápsula.
function FloatingTabBar({ tabs, unread }: { tabs: TabDef[]; unread: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (path: string) => {
    if (path === '/(tabs)') return pathname === '/';
    return pathname.startsWith(path.replace('/(tabs)', ''));
  };

  return (
    <View style={[styles.tabBar, { bottom: insets.bottom + Space.sm }]}>
      {tabs.map((tab) => {
        const focused = isActive(tab.path);
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => router.push(tab.path as never)}
          >
            <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              <Ionicons name={focused ? tab.filled : tab.outline} size={22} color={focused ? Colors.accent : Colors.text3} />
              {tab.badge && unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const { unread, refresh } = useData();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const [realtimeAlert, setRealtimeAlert] = useState<RealtimeAlert | null>(null);

  // Notificaciones en tiempo real (WebSocket) — solo para estudiantes.
  // Puramente aditivo: si el socket no conecta, el resto de la app sigue
  // funcionando igual vía REST.
  useEffect(() => {
    if (!isStudent) return;
    let active = true;
    onAlertaNueva((payload) => { if (active) { setRealtimeAlert({ ...payload, resuelta: false }); refresh(); } });
    onAlertaResuelta((payload) => { if (active) { setRealtimeAlert({ ...payload, resuelta: true }); refresh(); } });
    return () => { active = false; disconnectSocket(); };
  }, [isStudent, refresh]);

  const goToAlert = useCallback(() => {
    if (realtimeAlert?.categoria === 'asistencia') router.push('/(tabs)/attendance');
    else router.push('/(tabs)/grades');
  }, [realtimeAlert, router]);

  const tabs = isAdmin ? ADMIN_TABS : isTeacher ? TEACHER_TABS : STUDENT_TABS;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="curriculum" />
        <Tabs.Screen name="grades" />
        <Tabs.Screen name="attendance" />
        <Tabs.Screen name="courses" />
        <Tabs.Screen name="admin/overview" />
        <Tabs.Screen name="admin/people" />
        <Tabs.Screen name="admin/programs" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <FloatingTabBar tabs={tabs} unread={unread} />

      {isStudent && (
        <RealtimeAlertToast alert={realtimeAlert} onClose={() => setRealtimeAlert(null)} onNavigate={goToAlert} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: Space.lg,
    right: Space.lg,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: Colors.accent,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.full,
  },
  tabIconFocused: { backgroundColor: 'rgba(28,57,146,0.14)' },
  badge: {
    position: 'absolute', top: 0, right: 2,
    backgroundColor: Colors.red, borderRadius: 10,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: Colors.white },
});
