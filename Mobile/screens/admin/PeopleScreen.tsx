import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import SearchInput from '../../components/ui/SearchInput';
import FormSheet from '../../components/ui/FormSheet';
import FormField from '../../components/ui/FormField';
import PickerField from '../../components/ui/PickerField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Font, Space, Radius } from '../../constants/theme';
import * as adminService from '../../services/adminService';
import type { AdminStudentRow, AdminTeacherRow, AdminUserRow, Career } from '../../services/adminService';

type RoleTab = 'estudiante' | 'docente' | 'admin';

interface PersonRow {
  key: string;
  idInstitucional: string;
  nombre: string;
  correo: string;
  sub: string;
}

interface FormState {
  mode: 'create' | 'edit';
  idInstitucional: string;
  nombre: string;
  correo: string;
  password: string;
  carreraId: string | null;
  semestre: string;
}

const EMPTY_FORM: FormState = { mode: 'create', idInstitucional: '', nombre: '', correo: '', password: '', carreraId: null, semestre: '1' };

export default function PeopleScreen() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<RoleTab>('estudiante');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'estudiante') {
        const [rows, cs] = await Promise.all([adminService.getStudents({ search: search || undefined }), adminService.getCareers()]);
        setStudents(rows);
        setCareers(cs);
      } else if (tab === 'docente') {
        setTeachers(await adminService.getTeachers(search || undefined));
      } else {
        setAdmins(await adminService.getUsers({ rol: 'admin', search: search || undefined }));
      }
    } catch {
      // errores puntuales se muestran vía EmptyState al quedar la lista vacía
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const rows: PersonRow[] =
    tab === 'estudiante'
      ? students.map((s) => ({ key: s.id, idInstitucional: s.usuarioId, nombre: s.name, correo: s.correo, sub: `${s.program} · Sem. ${s.semester}` }))
      : tab === 'docente'
      ? teachers.map((t) => ({ key: t.id, idInstitucional: t.usuario_id, nombre: t.usuario?.nombre ?? '—', correo: t.usuario?.correo ?? '', sub: `${t.courses} curso(s) · ${t.students} estudiante(s)` }))
      : admins.map((a) => ({ key: a.id_institucional, idInstitucional: a.id_institucional, nombre: a.nombre, correo: a.correo, sub: 'Administrador' }));

  const openCreate = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM, mode: 'create' });
  };

  const openEdit = (row: PersonRow) => {
    setFormError(null);
    const student = tab === 'estudiante' ? students.find((s) => s.usuarioId === row.idInstitucional) : null;
    setForm({
      mode: 'edit',
      idInstitucional: row.idInstitucional,
      nombre: row.nombre,
      correo: row.correo,
      password: '',
      carreraId: student?.carreraId ?? null,
      semestre: String(student?.semester ?? 1),
    });
  };

  const submit = async () => {
    if (!form) return;
    if (!form.nombre.trim() || !form.correo.trim()) {
      setFormError('Nombre y correo son obligatorios.');
      return;
    }
    if (tab === 'estudiante' && !form.carreraId) {
      setFormError('Selecciona una carrera.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (form.mode === 'create') {
        if (!form.idInstitucional.trim() || form.password.length < 6) {
          setFormError('ID institucional requerido y contraseña de al menos 6 caracteres.');
          setSubmitting(false);
          return;
        }
        await adminService.createUser({
          id_institucional: form.idInstitucional.trim(),
          nombre: form.nombre.trim(),
          correo: form.correo.trim(),
          password: form.password,
          rol: tab,
          carrera_id: tab === 'estudiante' ? form.carreraId! : undefined,
          semestre_actual: tab === 'estudiante' ? Number(form.semestre) || 1 : undefined,
        });
      } else {
        const payload: { nombre: string; correo: string; password?: string } = { nombre: form.nombre.trim(), correo: form.correo.trim() };
        if (form.password.length > 0) {
          if (form.password.length < 6) {
            setFormError('La contraseña debe tener al menos 6 caracteres.');
            setSubmitting(false);
            return;
          }
          payload.password = form.password;
        }
        await adminService.updateUser(form.idInstitucional, payload);
        if (tab === 'estudiante') {
          const student = students.find((s) => s.usuarioId === form.idInstitucional);
          if (student) {
            await adminService.updateStudentAcademics(student.id, {
              carrera_id: form.carreraId!,
              semestre_actual: Number(form.semestre) || 1,
            });
          }
        }
      }
      setForm(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteUser(deleteTarget.idInstitucional);
      setDeleteTarget(null);
      await load();
    } catch {
      setDeleteTarget(null);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedTabs
          options={[
            { key: 'estudiante', label: 'Estudiantes' },
            { key: 'docente', label: 'Docentes' },
            { key: 'admin', label: 'Admins' },
          ]}
          activeKey={tab}
          onSelect={(k) => setTab(k as RoleTab)}
        />

        <SearchInput value={search} onChangeText={setSearch} placeholder="Buscar por nombre, ID o correo..." />

        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.createBtnText}>Crear {tab === 'estudiante' ? 'estudiante' : tab === 'docente' ? 'docente' : 'administrador'}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ paddingVertical: Space.lg }} />
        ) : rows.length === 0 ? (
          <EmptyState message="Sin resultados" />
        ) : (
          rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{row.nombre}</Text>
                <Text style={styles.rowSub}>{row.idInstitucional} · {row.correo}</Text>
                <Text style={styles.rowSub2}>{row.sub}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(row)} hitSlop={6} style={styles.iconBtn}>
                <Ionicons name="pencil" size={16} color={Colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteTarget(row)}
                hitSlop={6}
                style={styles.iconBtn}
                disabled={row.idInstitucional === currentUser?.id_institucional}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={row.idInstitucional === currentUser?.id_institucional ? Colors.text3 : Colors.red}
                />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {form && (
        <FormSheet
          visible
          title={form.mode === 'create' ? 'Crear persona' : 'Editar persona'}
          onClose={() => setForm(null)}
          onSubmit={submit}
          submitting={submitting}
          error={formError}
        >
          {form.mode === 'create' && (
            <FormField
              label="ID institucional"
              value={form.idInstitucional}
              onChangeText={(t) => setForm((f) => f && { ...f, idInstitucional: t })}
              autoCapitalize="none"
              placeholder="Ej: 2021-0342"
            />
          )}
          <FormField
            label="Nombre completo"
            value={form.nombre}
            onChangeText={(t) => setForm((f) => f && { ...f, nombre: t })}
          />
          <FormField
            label="Correo"
            value={form.correo}
            onChangeText={(t) => setForm((f) => f && { ...f, correo: t })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <FormField
            label={form.mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
            value={form.password}
            onChangeText={(t) => setForm((f) => f && { ...f, password: t })}
            secureTextEntry
            hint="Mínimo 6 caracteres"
          />
          {tab === 'estudiante' && (
            <>
              <PickerField
                label="Carrera"
                value={form.carreraId}
                options={careers.map((c) => ({ value: c.id, label: c.nombre }))}
                onSelect={(v) => setForm((f) => f && { ...f, carreraId: v })}
              />
              <FormField
                label="Semestre actual"
                value={form.semestre}
                onChangeText={(t) => setForm((f) => f && { ...f, semestre: t.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
            </>
          )}
        </FormSheet>
      )}

      <ConfirmDialog
        visible={deleteTarget != null}
        title="Eliminar persona"
        message={`Se eliminará a ${deleteTarget?.nombre ?? ''} y todos sus datos académicos asociados. Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Space.lg, gap: Space.md },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Space.sm,
  },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: Font.sm },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: Space.md,
  },
  rowName: { fontSize: Font.sm, fontWeight: '700', color: Colors.text },
  rowSub: { fontSize: Font.xs, color: Colors.text2, marginTop: 2 },
  rowSub2: { fontSize: Font.xs, color: Colors.text3, marginTop: 2 },
  iconBtn: { padding: 6 },
});
