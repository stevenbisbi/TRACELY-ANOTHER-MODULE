import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Colors } from '../constants/theme';
import { riskLevel, attendanceStatus, todayISO, RiskLevel, StudentStatus, Corte as CorteType } from '../utils/helpers';
import { toNum } from '../services/apiTypes';
import type { ApiAsignatura, ApiCorte } from '../services/apiTypes';
import * as studentsService from '../services/studentsService';
import * as teachersService from '../services/teachersService';

const PALETTE = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

export interface Notif {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  courseId: string | null;
  message: string;
  time: string;
  read: boolean;
}

export interface StudentCourse {
  id: string;
  name: string;
  code: string;
  teacher: string;
  attendance: number;
  absences: number;
  totalSesiones: number;
  ultimasSesiones: { fecha: string; presente: boolean }[];
  credits: number;
  status: 'active' | 'alert';
  color: string;
  cortes: CorteType[];
  notaDefinitiva: number | null;      // calculado por el backend (gradeMath.js)
  notaMinimaRequerida: number | null;
  recuperable: boolean;
}

export interface StudentSemData {
  semester: string;
  gpa: number | null;
  attendanceRate: number | null;
  riskLevel: RiskLevel;
  courses: StudentCourse[];
  notifications: Notif[];
}

export interface TeacherStudent {
  id: string;
  inscripcionId: string;
  name: string;
  idInst: string;
  attendance: number;
  absences: number;
  status: StudentStatus;
}

export interface TeacherCourse {
  id: string;
  name: string;
  code: string;
  color: string;
  credits: number;
  cortes: ApiCorte[];
  students: TeacherStudent[];
  todayAttendance: Record<string, boolean>; // por inscripcion_id
  umbralAdvertencia: number;
}

export interface TeacherSemData {
  courses: TeacherCourse[];
}

interface Profile {
  name: string;
  idLabel: string;
  sub: string;
  initials: string;
  avatarColor: string;
}

interface DataContextType {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  semestre: string | null;
  setSemestre: (s: string) => void;
  semestres: string[];
  studentSemData: StudentSemData | null;
  teacherSemData: TeacherSemData | null;
  unread: number;
  profile: Profile;
  saveTodayAttendance: (asignaturaId: string, records: { inscripcion_id: string; presente: boolean }[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

function buildCortes(asignatura: ApiAsignatura, notasByActividad: Map<string, number>): CorteType[] {
  const cortes = [...(asignatura.cortes ?? [])].sort((a, b) => a.numero_corte - b.numero_corte);
  return cortes.map((c) => ({
    id: c.numero_corte,
    uuid: c.id,
    label: `Corte ${c.numero_corte}`,
    weight: toNum(c.peso_porcentual) ?? 0,
    actividades: (c.actividades ?? []).map((a) => ({
      id: a.id,
      label: a.nombre,
      tipo: a.tipo,
      weight: toNum(a.porcentaje_en_corte),
      value: notasByActividad.get(a.id) ?? null,
    })),
    notaCorte: toNum(c.nota_corte),
    completo: c.corte_completo ?? false,
  }));
}

function buildNotifications(courses: StudentCourse[]): Notif[] {
  const notifications: Notif[] = [];
  courses
    .filter((c) => c.attendance < 80)
    .forEach((c) => {
      notifications.push({
        id: `att-${c.id}`,
        type: c.attendance < 70 ? 'alert' : 'warning',
        courseId: c.id,
        message: `Asistencia baja en ${c.name} (${c.attendance}%)`,
        time: '',
        read: false,
      });
    });

  const pending = courses.reduce(
    (sum, c) => sum + c.cortes.reduce((s, ct) => s + ct.actividades.filter((a) => a.value == null).length, 0),
    0
  );
  if (pending > 0) {
    notifications.push({
      id: 'pending',
      type: 'info',
      courseId: null,
      message: `Tienes ${pending} actividad(es) pendientes por calificar`,
      time: '',
      read: false,
    });
  }
  return notifications;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semestre, setSemestre] = useState<string | null>(null);
  const [carreraNombre, setCarreraNombre] = useState<string | null>(null);

  const [studentBySemester, setStudentBySemester] = useState<Record<string, StudentSemData>>({});
  const [teacherBySemester, setTeacherBySemester] = useState<Record<string, TeacherSemData>>({});

  const load = useCallback(async () => {
    if (!user || (user.role !== 'student' && user.role !== 'teacher')) return;
    setLoading(true);
    setError(null);
    try {
      if (user.role === 'student') {
        const [perfil, inscripciones, attResp] = await Promise.all([
          studentsService.getMyProfile(),
          studentsService.getCalificaciones(user.id_institucional),
          studentsService.getAttendance(user.id_institucional),
        ]);
        setCarreraNombre(perfil.carrera?.nombre ?? null);

        const attByAsignatura = new Map(attResp.courses.map((c) => [c.id, c]));

        // Agrupar por semestre académico de la asignatura
        const bySemester: Record<string, StudentCourse[]> = {};
        inscripciones.forEach((insc, idx) => {
          const asig = insc.asignatura;
          if (!asig) return;

          const notasByActividad = new Map<string, number>();
          for (const cal of insc.calificaciones ?? []) {
            const nota = toNum(cal.nota);
            if (nota != null) notasByActividad.set(cal.actividad_id, nota);
          }

          const att = attByAsignatura.get(asig.id);
          const attendance = att?.attendance ?? 100;

          const course: StudentCourse = {
            id: asig.id,
            name: asig.nombre,
            code: asig.NRC,
            teacher: asig.docente?.usuario?.nombre ?? '',
            attendance,
            absences: att ? Math.max(0, att.total - att.presentes) : 0,
            totalSesiones: att?.total ?? 0,
            ultimasSesiones: att?.ultimasSesiones ?? [],
            credits: asig.pensum?.creditos ?? 0,
            status: att?.status ?? (attendance < 80 ? 'alert' : 'active'),
            color: PALETTE[idx % PALETTE.length],
            cortes: buildCortes(asig, notasByActividad),
            notaDefinitiva: toNum(insc.nota_definitiva_calculada),
            notaMinimaRequerida: toNum(insc.nota_minima_requerida),
            recuperable: insc.recuperable ?? true,
          };
          (bySemester[asig.semestre_academico ?? 'Sin semestre'] ??= []).push(course);
        });

        const semMap: Record<string, StudentSemData> = {};
        for (const [sem, courses] of Object.entries(bySemester)) {
          const overalls = courses.map((c) => c.notaDefinitiva).filter((v): v is number => v != null);
          const gpa = overalls.length ? overalls.reduce((s, v) => s + v, 0) / overalls.length : null;
          const attendances = courses.map((c) => c.attendance);
          const attendanceRate = attendances.length
            ? Math.round(attendances.reduce((s, v) => s + v, 0) / attendances.length)
            : null;

          semMap[sem] = {
            semester: sem,
            gpa,
            attendanceRate,
            riskLevel: riskLevel(gpa, attendanceRate),
            courses,
            notifications: buildNotifications(courses),
          };
        }
        setStudentBySemester(semMap);
        setTeacherBySemester({});
        const keys = Object.keys(semMap).sort();
        setSemestre((prev) => (prev && semMap[prev] ? prev : keys[keys.length - 1] ?? null));
      } else {
        const perfil = await teachersService.getMyProfile();
        const [subjects, dash] = await Promise.all([
          teachersService.getMySubjects(perfil.id),
          teachersService.getDashboard(perfil.id),
        ]);
        // El dashboard no trae semestre ni créditos: se cruzan desde /subjects
        const subjectById = new Map(subjects.map((s) => [s.id, s]));

        // % de asistencia y faltas por estudiante (historial completo por asignatura).
        // También se saca de aquí la asistencia de hoy: el campo presenteHoy del
        // dashboard no distingue "ausente" de "sin registrar".
        const hoy = todayISO();
        const attLists = await Promise.all(dash.courses.map((c) => teachersService.getAsignaturaAttendance(c.id)));
        const statsByInscripcion = new Map<string, { total: number; present: number; hoy: boolean | null }>();
        for (const list of attLists) {
          for (const insc of list) {
            const regs = insc.asistencias ?? [];
            const registroHoy = regs.find((a) => a.fecha === hoy);
            statsByInscripcion.set(insc.id, {
              total: regs.length,
              present: regs.filter((a) => a.presente).length,
              hoy: registroHoy ? registroHoy.presente : null,
            });
          }
        }

        const semMap: Record<string, TeacherSemData> = {};
        dash.courses.forEach((c, idx) => {
          const meta = subjectById.get(c.id);
          const sem = meta?.semestre_academico ?? 'Sin semestre';

          const todayMap: Record<string, boolean> = {};
          const students: TeacherStudent[] = c.students.map((s) => {
            const agg = statsByInscripcion.get(s.inscripcion_id);
            if (agg?.hoy != null) todayMap[s.inscripcion_id] = agg.hoy;
            const pct = agg && agg.total > 0 ? Math.round((agg.present / agg.total) * 100) : 100;
            return {
              id: s.id,
              inscripcionId: s.inscripcion_id,
              name: s.name,
              idInst: s.id_inst,
              attendance: pct,
              absences: agg ? agg.total - agg.present : 0,
              status: attendanceStatus(pct),
            };
          });

          const course: TeacherCourse = {
            id: c.id,
            name: c.name,
            code: c.code,
            color: PALETTE[idx % PALETTE.length],
            credits: meta?.pensum?.creditos ?? 0,
            cortes: [...c.cortes].sort((a, b) => a.numero_corte - b.numero_corte),
            students,
            todayAttendance: todayMap,
            umbralAdvertencia: toNum(c.umbral_advertencia) ?? 3.5,
          };
          (semMap[sem] ??= { courses: [] }).courses.push(course);
        });

        setTeacherBySemester(semMap);
        setStudentBySemester({});
        const keys = Object.keys(semMap).sort();
        setSemestre((prev) => (prev && semMap[prev] ? prev : keys[keys.length - 1] ?? null));
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTodayAttendance = useCallback(
    async (asignaturaId: string, records: { inscripcion_id: string; presente: boolean }[]) => {
      await teachersService.saveDayAttendance({ asignatura_id: asignaturaId, fecha: todayISO(), records });
      await load();
    },
    [load]
  );

  const semestres = useMemo(() => {
    const keys = user?.role === 'teacher' ? Object.keys(teacherBySemester) : Object.keys(studentBySemester);
    return keys.sort();
  }, [studentBySemester, teacherBySemester, user?.role]);

  const studentSemData = semestre ? studentBySemester[semestre] ?? null : null;
  const teacherSemData = semestre ? teacherBySemester[semestre] ?? null : null;
  const unread = studentSemData?.notifications.filter((n) => !n.read).length ?? 0;

  const profile: Profile = useMemo(() => {
    const name = user?.nombre ?? '';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
    return {
      name,
      idLabel: user?.id_institucional ?? '',
      sub: carreraNombre ?? (user?.role === 'teacher' ? 'Docente' : user?.role === 'admin' ? 'Administrador' : 'Estudiante'),
      initials,
      avatarColor: user?.role === 'teacher' ? Colors.accent : user?.role === 'admin' ? Colors.orange : Colors.purple,
    };
  }, [user, carreraNombre]);

  return (
    <DataContext.Provider
      value={{
        loading,
        error,
        refresh: load,
        semestre,
        setSemestre,
        semestres,
        studentSemData,
        teacherSemData,
        unread,
        profile,
        saveTodayAttendance,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
