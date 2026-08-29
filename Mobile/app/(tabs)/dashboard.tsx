import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/layout/AppHeader';
import StudentDashboardScreen from '../../screens/student/DashboardScreen';
import { useData } from '../../context/DataContext';
import { Colors } from '../../constants/theme';

export default function DashboardTab() {
  const router = useRouter();
  const { unread } = useData();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Dashboard"
        variant="light"
        onBack={() => router.push('/(tabs)')}
        bellCount={unread}
        onBellPress={() => router.push('/(tabs)')}
      />
      <View style={styles.body}>
        <StudentDashboardScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
