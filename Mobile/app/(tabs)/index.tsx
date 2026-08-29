import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import AppHeader from '../../components/layout/AppHeader';
import MainMenuScreen from '../../screens/student/MainMenuScreen';
import TeacherDashboardScreen from '../../screens/teacher/DashboardScreen';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';

export default function IndexTab() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Redirect href="/(tabs)/admin/overview" />;
  }

  if (user?.role === 'teacher') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Inicio" />
        <View style={styles.body}>
          <TeacherDashboardScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MainMenuScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
