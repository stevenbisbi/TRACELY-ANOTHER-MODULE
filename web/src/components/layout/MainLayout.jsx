import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../layout/Sidebar';
import Topbar  from '../layout/Topbar';
import RealtimeAlertToast from '../common/RealtimeAlertToast';
import { useAuth }       from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { connectSocket, onAlertaNueva, onAlertaResuelta, disconnectSocket } from '../../services/socketService';

const PAGE_TITLES = {
  dashboard:   'Dashboard',
  grades:      'Notas y Calificaciones',
  attendance:  'Control de Asistencia',
  curriculum:  'Mi Carrera',
  alerts:      'Mis Alertas',
  courses:     'Mis Cursos',
};

// Deduce la página activa desde la URL real — única fuente de verdad
function pageFromPath(pathname) {
  if (pathname.includes('/grades'))     return 'grades';
  if (pathname.includes('/attendance')) return 'attendance';
  if (pathname.includes('/curriculum')) return 'curriculum';
  if (pathname.includes('/alerts'))     return 'alerts';
  if (pathname.includes('/courses'))    return 'courses';
  return 'dashboard';
}

export default function MainLayout({ children }) {
  const { user, logout }        = useAuth();
  const { semestre, setSemestre, semestres } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageFromPath(location.pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState(null);

  // Cerrar el menú móvil al cambiar de página
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const role = user?.role ?? 'student';

  // Notificaciones en tiempo real (WebSocket) — solo para estudiantes.
  // Puramente aditivo: si el socket no conecta, el resto de la app sigue
  // funcionando igual vía REST.
  useEffect(() => {
    if (role !== 'student') return;
    connectSocket();
    onAlertaNueva((payload) => setRealtimeAlert({ ...payload, resuelta: false }));
    onAlertaResuelta((payload) => setRealtimeAlert({ ...payload, resuelta: true }));
    return () => disconnectSocket();
  }, [role]);

  const goToAlerts = () => navigate('/student/alerts');

  // userData usa los datos reales del usuario autenticado (vienen del login real)
  // user = { id, role, nombre } — guardado en localStorage por AuthContext
  const userData = {
    name:       user?.nombre ?? user?.id ?? 'Usuario',
    id:         user?.id ?? '',
    avatar:     null,   // se puede extender con foto de perfil
    // Campos extra por rol (valores por defecto hasta que lleguen del backend)
    program:    role === 'student' ? 'Tecnología en Desarrollo de Software' : undefined,
    department: role === 'teacher' ? 'Ingeniería' : undefined,
    role:       role,
  };

  return (
    <div className="app">
      {role === 'student' && (
        <RealtimeAlertToast
          alert={realtimeAlert}
          onClose={() => setRealtimeAlert(null)}
          onNavigate={goToAlerts}
        />
      )}
      <div className={`sidebar-backdrop ${mobileNavOpen ? 'show' : ''}`} onClick={() => setMobileNavOpen(false)} />
      <Sidebar
        role={role}
        page={page}
        userData={userData}
        unread={0}
        onLogout={logout}
        mobileOpen={mobileNavOpen}
      />
      <main className="main">
        <Topbar
          semestre={semestre}
          setSemestre={setSemestre}
          semestres={semestres}
          role={role}
          pageTitle={PAGE_TITLES[page] ?? 'Dashboard'}
          userName={userData.name}
          onMenuClick={() => setMobileNavOpen((v) => !v)}
        />
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
