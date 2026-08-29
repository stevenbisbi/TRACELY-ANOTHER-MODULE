import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/layout/AppHeader';
import ProfileScreen from '../../screens/shared/ProfileScreen';
import { Colors } from '../../constants/theme';

export default function ProfileTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Perfil" variant="light" />
      <View style={styles.body}>
        <ProfileScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  body: { flex: 1, backgroundColor: Colors.bg },
});
