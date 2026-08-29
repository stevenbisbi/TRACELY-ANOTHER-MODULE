import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/layout/AppHeader';
import ProgramsScreen from '../../../screens/admin/ProgramsScreen';
import { Colors } from '../../../constants/theme';

export default function AdminProgramsTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Programas" variant="light" />
      <View style={styles.body}>
        <ProgramsScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
