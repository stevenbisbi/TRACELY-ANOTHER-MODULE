import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import * as usersService from '../../services/usersService';

const ROLE_LABEL: Record<string, string> = {
  student: 'Estudiante',
  teacher: 'Docente',
  admin: 'Administrador',
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { profile } = useData();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setNameInput(profile.name);
    setError('');
    setEditing(true);
  };

  const save = async () => {
    if (!user || !nameInput.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await usersService.updateName(user.id_institucional, nameInput.trim());
      await refreshUser();
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo actualizar el nombre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Avatar initials={profile.initials} color={profile.avatarColor} size="lg" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.name || '—'}</Text>
          <Text style={styles.roleTag}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Información personal</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nombre completo</Text>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                placeholder="Tu nombre completo"
                placeholderTextColor={Colors.text3}
              />
              <TouchableOpacity onPress={save} disabled={saving} style={styles.iconBtn}>
                {saving ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="checkmark" size={20} color={Colors.green} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} disabled={saving} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color={Colors.text3} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.editRow}>
              <Text style={styles.fieldValue}>{profile.name || '—'}</Text>
              <TouchableOpacity onPress={startEdit} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="pencil" size={16} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          {error !== '' && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldLabel}>Correo</Text>
            <View style={styles.managedTag}>
              <Text style={styles.managedTagText}>Gestionado por la universidad</Text>
            </View>
          </View>
          <Text style={styles.fieldValueReadonly}>{user?.correo ?? '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ID institucional</Text>
          <Text style={styles.fieldValueReadonly}>{profile.idLabel}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{user?.role === 'student' ? 'Programa' : 'Rol'}</Text>
          <Text style={styles.fieldValueReadonly}>{profile.sub}</Text>
        </View>
      </Card>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.red} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.lg },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: Space.sm },
  name: { fontSize: Font.lg, fontWeight: '700', color: Colors.text },
  roleTag: { fontSize: Font.sm, color: Colors.text2, marginTop: 2 },

  sectionTitle: { fontSize: Font.md, fontWeight: '700', color: Colors.text, marginBottom: Space.md },
  field: { gap: 4, paddingVertical: Space.xs },
  fieldLabel: { fontSize: Font.xs, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: Font.base, fontWeight: '600', color: Colors.text, flex: 1 },
  fieldValueReadonly: { fontSize: Font.base, color: Colors.text2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  editInput: {
    flex: 1, fontSize: Font.base, color: Colors.text, borderBottomWidth: 1.5, borderBottomColor: Colors.accent,
    paddingVertical: 4,
  },
  iconBtn: { padding: 4 },
  errorText: { fontSize: Font.xs, color: Colors.red, marginTop: 4 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  managedTag: { backgroundColor: Colors.bg3, borderRadius: Radius.full, paddingHorizontal: Space.sm, paddingVertical: 2 },
  managedTagText: { fontSize: 10, color: Colors.text3, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Space.sm },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
    backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: Radius.md, paddingVertical: Space.md,
  },
  logoutText: { color: Colors.red, fontWeight: '700', fontSize: Font.base },
});
