import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/authService';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!token.trim()) {
      setError('Ingresa el código del enlace que recibiste por correo.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'El enlace es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.flex, styles.centeredResult]}>
        <View style={styles.iconOuter}>
          <View style={[styles.iconInner, { backgroundColor: Colors.green }]}>
            <Ionicons name="checkmark" size={30} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.title}>Contraseña actualizada</Text>
        <Text style={styles.sub}>Ya puedes iniciar sesión con tu nueva contraseña.</Text>
        <TouchableOpacity style={[styles.submitBtn, { marginTop: Space.xl, width: '100%' }]} onPress={() => router.replace('/login')}>
          <Text style={styles.submitText}>Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="lock-closed-outline" size={28} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.title}>Restablecer contraseña</Text>
        <Text style={styles.sub}>
          Abre el enlace que recibiste por correo desde este dispositivo para completar el proceso automáticamente,
          o pega aquí el código si lo copiaste manualmente.
        </Text>

        <View style={styles.form}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!params.token && (
            <View style={styles.field}>
              <Text style={styles.label}>Código del enlace</Text>
              <TextInput
                style={styles.input}
                placeholder="Pega aquí el código recibido"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="none"
                autoCorrect={false}
                value={token}
                onChangeText={(t) => { setToken(t); setError(''); }}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Nueva contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="rgba(255,255,255,0.55)"
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite la contraseña"
              placeholderTextColor="rgba(255,255,255,0.55)"
              secureTextEntry
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(''); }}
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>Restablecer contraseña</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.accent },
  scroll: { flexGrow: 1, backgroundColor: Colors.accent, alignItems: 'center', paddingTop: 72, paddingBottom: Space.xl, paddingHorizontal: Space.lg },
  centeredResult: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.lg },
  backBtn: { position: 'absolute', top: 56, left: Space.lg, padding: 4 },

  iconOuter: {
    width: 80, height: 80, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Space.lg,
  },
  iconInner: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryAction,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: Font.xl, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  sub: { fontSize: Font.sm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: Space.sm, paddingHorizontal: Space.md },

  form: { width: '100%', gap: Space.lg, marginTop: Space.xl },

  errorBox: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.md, padding: Space.md,
  },
  errorText: { color: Colors.white, fontSize: Font.sm, fontWeight: '500' },

  field: { gap: Space.xs },
  label: { fontSize: Font.sm, fontWeight: '700', color: Colors.white },
  input: {
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.md,
    fontSize: Font.base, color: Colors.white,
  },

  submitBtn: {
    backgroundColor: Colors.primaryAction, borderRadius: Radius.md, paddingVertical: Space.md,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.white, fontSize: Font.base, fontWeight: '700' },
});
