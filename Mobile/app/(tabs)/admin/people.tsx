import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../../components/layout/AppHeader';
import PeopleScreen from '../../../screens/admin/PeopleScreen';
import { Colors } from '../../../constants/theme';

export default function AdminPeopleTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Personas" variant="light" />
      <View style={styles.body}>
        <PeopleScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
