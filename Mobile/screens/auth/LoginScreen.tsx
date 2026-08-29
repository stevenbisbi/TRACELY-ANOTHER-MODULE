import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loggingIn } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!id || !password) {
      setError('Completa tu ID institucional y tu contraseña.');
      return;
    }
    try {
      await login(id.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'ID o contraseña incorrectos.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="checkmark" size={34} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.brandText}>Tracely</Text>
        <Text style={styles.heroSub}>Consulta tus calificaciones y asistencia</Text>

        <View style={styles.form}>
          {error !== '' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu código estudiantil"
              placeholderTextColor="rgba(255,255,255,0.55)"
              autoCapitalize="none"
              autoCorrect={false}
              value={id}
              onChangeText={(t) => { setId(t); setError(''); }}
              onSubmitEditing={handleLogin}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="rgba(255,255,255,0.55)"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.75)" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loggingIn && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loggingIn}
          >
            {loggingIn ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Unicatólica 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.accent },
  scroll: { flexGrow: 1, backgroundColor: Colors.accent, alignItems: 'center', paddingTop: 72, paddingBottom: Space.lg },

  iconOuter: {
    width: 88, height: 88, borderRadius: Radius.lg, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: Space.lg,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  iconInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryAction,
    alignItems: 'center', justifyContent: 'center',
  },
  brandText: { fontSize: Font.xxl, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  heroSub: { fontSize: Font.base, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },

  form: { width: '100%', paddingHorizontal: Space.lg, gap: Space.lg, marginTop: Space.xl },

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
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: Space.md },

  submitBtn: {
    backgroundColor: Colors.primaryAction, borderRadius: Radius.md, paddingVertical: Space.md,
    alignItems: 'center', justifyContent: 'center', marginTop: Space.sm,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.white, fontSize: Font.base, fontWeight: '700' },

  forgotBtn: { alignItems: 'center', paddingVertical: Space.sm },
  forgotText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: Font.sm },

  footer: { color: 'rgba(255,255,255,0.5)', fontSize: Font.xs, marginTop: Space.xl },
});
