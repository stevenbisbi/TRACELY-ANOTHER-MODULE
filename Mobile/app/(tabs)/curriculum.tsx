import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppHeader from '../../components/layout/AppHeader';
import CurriculumScreen from '../../screens/student/CurriculumScreen';
import { Colors } from '../../constants/theme';

export default function CurriculumTab() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Mi Carrera" variant="light" onBack={() => router.push('/(tabs)')} />
      <View style={styles.body}>
        <CurriculumScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
