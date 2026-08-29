import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../context/DataContext';
import { Colors, Font, Space, Radius } from '../../constants/theme';

interface Props {
  title: string;
  variant?: 'gradient' | 'light';
  onBack?: () => void;
  bellCount?: number;
  onBellPress?: () => void;
}

export default function AppHeader({ title, variant = 'gradient', onBack, bellCount, onBellPress }: Props) {
  const router = useRouter();
  const { profile, semestre, setSemestre, semestres } = useData();
  const light = variant === 'light';

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={light ? styles.headerCompact : styles.header}
    >
      {light ? (
        <View style={styles.compactTopRow}>
          <View style={styles.compactLeft}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
            <Text style={styles.compactTitle}>{title}</Text>
          </View>
          {onBellPress && (
            <TouchableOpacity onPress={onBellPress} hitSlop={8} style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={Colors.white} />
              {!!bellCount && bellCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{bellCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push('/(tabs)/profile')}>
              <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
                <Text style={styles.avatarText}>{profile.initials}</Text>
              </View>
              <View>
                <Text style={styles.name}>{profile.name || '—'}</Text>
                <Text style={styles.sub}>{profile.sub}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{title}</Text>
        </>
      )}

      {semestres.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semRow}>
          {semestres.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.semChip, semestre === s && styles.semChipActive]}
              onPress={() => setSemestre(s)}
            >
              <Text style={[styles.semChipText, semestre === s && styles.semChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: Space.lg,
    paddingHorizontal: Space.lg,
    gap: Space.sm,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Space.xs,
  },
  avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Font.sm, fontWeight: '700', color: Colors.white },
  name: { fontSize: Font.base, fontWeight: '700', color: Colors.white },
  sub: { fontSize: Font.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  title: { fontSize: Font.xxl, fontWeight: '700', color: Colors.white, letterSpacing: -0.5 },

  semRow: { flexDirection: 'row', gap: Space.sm },
  semChip: {
    paddingHorizontal: Space.md, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  semChipActive: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.7)' },
  semChipText: { fontSize: Font.xs, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  semChipTextActive: { color: Colors.white },

  headerCompact: {
    paddingTop: 56,
    paddingBottom: Space.md,
    paddingHorizontal: Space.lg,
    gap: Space.sm,
  },
  compactTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flex: 1 },
  backBtn: { padding: 2, marginLeft: -6 },
  compactTitle: { fontSize: Font.xl, fontWeight: '700', color: Colors.white, letterSpacing: -0.4 },
  bellBtn: { padding: 2 },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.red, borderRadius: Radius.full,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.white },
});
