import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/layout/AppHeader';
import OverviewScreen from '../../../screens/admin/OverviewScreen';
import { Colors } from '../../../constants/theme';

export default function AdminOverviewTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Resumen" variant="light" />
      <View style={styles.body}>
        <OverviewScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
