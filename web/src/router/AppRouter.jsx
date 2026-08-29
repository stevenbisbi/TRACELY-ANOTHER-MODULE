import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth }       from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import MainLayout from '../components/layout/MainLayout';

import LoginPage          from '../views/auth/LoginView';
import ForgotPasswordPage from '../views/auth/ForgotPasswordPage';
import ResetPasswordPage  from '../views/auth/ResetPasswordPage';
import StudentDashboard   from '../views/student/DashboardPage';
import GradesPage         from '../views/student/GradesPages';
import AttendancePage     from '../views/student/AttendancePage';
import CurriculumPage     from '../views/student/CurriculumPage';
import AlertsPage         from '../views/student/AlertsPage';
import ExcusasPage        from '../views/student/ExcusasPage';
import TeacherDashboard   from '../views/teacher/DashboardPage';
import TeacherCoursesPage from '../views/teacher/TeacherCoursesPage';
import AdminDashboard     from '../views/admin/AdminDashboard';
import DirectorExcusas    from '../views/director/ExcusasInboxPage';
import ReglamentoPage     from '../views/admin/ReglamentoPage';
import NotFoundPage       from '../views/shared/NotFoundPage';

// ── Bloquea el botón atrás cuando el usuario está autenticado ──
function BlockBackButton() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    // Bloquear navegación hacia atrás siempre
    window.history.pushState(null, '', window.location.href);
    const handlePop = () => {
      if (!user) {
        // Si no hay sesión, ir al login
        navigate('/login', { replace: true });
      } else {
        // Si hay sesión, mantener en la página actual
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [user, location, navigate]);

  return null;
}

// ── Rutas protegidas ──────────────────────────────────────────
function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function StudentLayout({ View }) {
  const { user }        = useAuth();
  const { semestre }    = useAppContext();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const goTo = (page, courseId) => {
    const path = `/student/${page}`;
    navigate(courseId ? `${path}?course=${courseId}` : path);
  };

  return (
    <MainLayout>
      <View
        estudianteId={user?.id}
        semestre={semestre}
        initialCourseId={searchParams.get('course')}
        onNavigate={goTo}
        onNotifClick={(courseId, categoria) => goTo(categoria === 'asistencia' ? 'attendance' : 'grades', courseId)}
      />
    </MainLayout>
  );
}

function TeacherLayout({ View }) {
  const { user }        = useAuth();
  const { semestre }    = useAppContext();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const goTo = (page, courseId) => {
    const path = `/teacher/${page}`;
    navigate(courseId ? `${path}?course=${courseId}` : path);
  };

  return (
    <MainLayout>
      <View
        docenteId={user?.id}
        semestre={semestre}
        initialCourseId={searchParams.get('course')}
        onNavigate={goTo}
      />
    </MainLayout>
  );
}

function DirectorLayout({ View }) {
  return <MainLayout><View /></MainLayout>;
}

function AdminLayout({ View }) {
  return <MainLayout><View /></MainLayout>;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'admin')   return <Navigate to="/admin/dashboard"   replace />;
  if (user.role === 'director') return <Navigate to="/director/excusas" replace />;
  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <BlockBackButton />
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/"                element={<RoleRedirect />} />

        <Route path="/student/dashboard" element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={StudentDashboard} /></PrivateRoute>} />
        <Route path="/student/grades"    element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={GradesPage} /></PrivateRoute>} />
        <Route path="/student/attendance"element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={AttendancePage} /></PrivateRoute>} />
        <Route path="/student/curriculum"element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={CurriculumPage} /></PrivateRoute>} />
        <Route path="/student/alerts"    element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={AlertsPage} /></PrivateRoute>} />
        <Route path="/student/excusas"   element={<PrivateRoute allowedRoles={['student']}><StudentLayout View={ExcusasPage} /></PrivateRoute>} />
        <Route path="/teacher/dashboard" element={<PrivateRoute allowedRoles={['teacher']}><TeacherLayout View={TeacherDashboard} /></PrivateRoute>} />
        <Route path="/teacher/courses"   element={<PrivateRoute allowedRoles={['teacher']}><TeacherLayout View={TeacherCoursesPage} /></PrivateRoute>} />
        <Route path="/admin/dashboard"   element={<PrivateRoute allowedRoles={['admin']}><AdminLayout View={AdminDashboard} /></PrivateRoute>} />
        <Route path="/director/excusas"  element={<PrivateRoute allowedRoles={['director']}><DirectorLayout View={DirectorExcusas} /></PrivateRoute>} />
        <Route path="/admin/reglamento"  element={<PrivateRoute allowedRoles={['admin']}><AdminLayout View={ReglamentoPage} /></PrivateRoute>} />
        <Route path="*"                  element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
