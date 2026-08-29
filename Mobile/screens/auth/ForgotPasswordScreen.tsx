import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/authService';
import { Colors, Font, Space, Radius } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!correo.trim()) {
      setError('Ingresa tu correo institucional.');
      return;
    }
    setLoading(true);
    try {
      await authService.requestPasswordReset(correo.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name={sent ? 'mail-open-outline' : 'key-outline'} size={30} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.sub}>
          {sent
            ? 'Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.'
            : 'Ingresa tu correo institucional y te enviaremos un enlace para restablecerla.'}
        </Text>

        {!sent && (
          <View style={styles.form}>
            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                style={styles.input}
                placeholder="tucorreo@unicatolica.edu.co"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={correo}
                onChangeText={(t) => { setCorreo(t); setError(''); }}
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>Enviar enlace</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.loginLinkBtn} onPress={() => router.replace('/login')}>
          <Text style={styles.loginLinkText}>Volver a iniciar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.accent },
  scroll: { flexGrow: 1, backgroundColor: Colors.accent, alignItems: 'center', paddingTop: 72, paddingBottom: Space.xl, paddingHorizontal: Space.lg },
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

  loginLinkBtn: { marginTop: Space.xl, paddingVertical: Space.sm },
  loginLinkText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: Font.sm },
});
