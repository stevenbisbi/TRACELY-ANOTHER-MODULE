import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { Colors } from '../constants/theme';

function useProtectedRoute(user: unknown, restoring: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key || restoring) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';
    if (!user && !inAuthScreen) {
      router.replace('/login');
    } else if (user && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [user, restoring, segments, navState?.key, router]);
}

function RootLayoutNav() {
  const { user, restoring } = useAuth();
  useProtectedRoute(user, restoring);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="teacher/course/[id]/grades"
          options={{ headerShown: true, title: 'Registrar notas', presentation: 'modal' }}
        />
        <Stack.Screen
          name="admin/program/[id]"
          options={{ headerShown: true, title: 'Detalle del programa', presentation: 'modal' }}
        />
      </Stack>
      {restoring && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </DataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg,
  },
});
