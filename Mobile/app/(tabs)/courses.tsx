import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/layout/AppHeader';
import CoursesScreen from '../../screens/teacher/CoursesScreen';
import { Colors } from '../../constants/theme';

export default function CoursesTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Mis Cursos" variant="light" />
      <View style={styles.body}>
        <CoursesScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
