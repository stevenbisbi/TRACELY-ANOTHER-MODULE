import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, CheckCircle, Settings, LogOut, X, Pencil, Camera, Check, GraduationCap, Bell, BookOpen, FileText } from 'lucide-react';
import profileDefault from '../../assets/profile.png';
import { getStudentAlerts } from '../../services/alertService';

// ── Íconos ────────────────────────────────────────────────────
const IcoDashboard  = () => <LayoutDashboard size={16} />;
const IcoGrades     = () => <BarChart3 size={16} />;
const IcoAttendance = () => <CheckCircle size={16} />;
const IcoSettings   = () => <Settings size={16} />;
const IcoLogout     = () => <LogOut size={16} />;
const IcoClose      = () => <X size={14} strokeWidth={2.5} />;
const IcoEdit       = () => <Pencil size={13} />;
const IcoCamera     = () => <Camera size={14} />;
const IcoCurriculum = () => <GraduationCap size={16} />;
const IcoAlerts     = () => <Bell size={16} />;
const IcoCourses    = () => <BookOpen size={16} />;
const IcoExcusas    = () => <FileText size={16} />;

// ── Utilidades de foto ─────────────────────────────────────────
const PHOTO_PREFIX = 'tracely_photo_';

function getStoredPhoto(userId) {
  // Michael tiene su foto por defecto
  if (userId === '2021-0342') {
    const stored = localStorage.getItem(PHOTO_PREFIX + userId);
    return stored || profileDefault;
  }
  return localStorage.getItem(PHOTO_PREFIX + userId) || null;
}

function savePhoto(userId, base64) {
  localStorage.setItem(PHOTO_PREFIX + userId, base64);
}

// ── Modal de Configuración ────────────────────────────────────
function SettingsModal({ userData, role, onClose }) {
  const [name,        setName]        = useState(userData.name);
  const [editingName, setEditingName] = useState(false);
  const [lang,        setLang]        = useState('Español (Latinoamérica)');
  const [saved,       setSaved]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [photo,       setPhoto]       = useState(() => getStoredPhoto(userData.id));
  const fileRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen no debe superar 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setPhoto(base64);
      savePhoto(userData.id, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = localStorage.getItem('tracely_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/users/${userData.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nombre: name }),
        }
      );
      if (!res.ok) throw new Error('Error al guardar');
      // Actualizar la sesión en localStorage para que se refleje en sidebar
      const session = JSON.parse(localStorage.getItem('tracely_session') || '{}');
      session.nombre = name;
      localStorage.setItem('tracely_session', JSON.stringify(session));
      setSaved(true);
      // Recargar la página para que el sidebar muestre el nombre actualizado
      setTimeout(() => { window.location.reload(); }, 800);
    } catch {
      setSaveError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const correo = userData.correo
    || (role === 'student'
      ? `${name.split(' ')[0]?.toLowerCase()}.${name.split(' ')[1]?.toLowerCase() ?? ''}@unicatolica.edu.co`
      : `${name.split(' ').slice(-1)[0]?.toLowerCase()}@unicatolica.edu.co`);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Configuración</h2>
          <button className="close-btn" onClick={onClose}><IcoClose /></button>
        </div>

        {/* Avatar con botón de cámara */}
        <div className="settings-avatar-section">
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div className="settings-avatar">
              {photo
                ? <img src={photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : <span>{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              }
            </div>
            {/* Botón de cámara superpuesto */}
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}
              title="Cambiar foto"
            >
              <IcoCamera />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Haz clic en la cámara para cambiar
          </span>
        </div>

        <div className="settings-fields">
          {/* Nombre */}
          <div className="settings-field">
            <div className="settings-field-label">Nombre completo</div>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <button className="settings-save-inline" onClick={() => setEditingName(false)}><Check size={14} /></button>
              </div>
            ) : (
              <div className="settings-field-value-row">
                <span className="settings-field-value">{name}</span>
                <button className="settings-edit-btn" onClick={() => setEditingName(true)}><IcoEdit /> Editar</button>
              </div>
            )}
          </div>

          {/* Correo */}
          <div className="settings-field">
            <div className="settings-field-label">Correo institucional</div>
            <div className="settings-field-value-row">
              <span className="settings-field-value">{correo}</span>
              <span className="settings-field-badge">Gestionado por la universidad</span>
            </div>
          </div>

          {/* ID */}
          <div className="settings-field">
            <div className="settings-field-label">ID institucional</div>
            <div className="settings-field-value-row">
              <span className="settings-field-value">{userData.id}</span>
            </div>
          </div>

          {/* Programa / Departamento */}
          <div className="settings-field">
            <div className="settings-field-label">{role === 'student' ? 'Programa académico' : 'Departamento'}</div>
            <div className="settings-field-value-row">
              <span className="settings-field-value">
                {role === 'student' ? (userData.program ?? 'Tecnología en Desarrollo de Software') : (userData.department ?? 'Ingeniería')}
              </span>
            </div>
          </div>

          {/* Idioma */}
          <div className="settings-field">
            <div className="settings-field-label">Idioma</div>
            <select className="settings-select" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option>Español (Latinoamérica)</option>
              <option>Español (España)</option>
              <option>English</option>
            </select>
          </div>

          {/* Rol */}
          <div className="settings-field">
            <div className="settings-field-label">Rol</div>
            <div className="settings-field-value-row">
              <span className="settings-field-value" style={{ textTransform: 'capitalize' }}>
                {role === 'student' ? 'Estudiante' : role === 'teacher' ? 'Docente' : role === 'director' ? 'Director de programa' : 'Administrador'}
              </span>
            </div>
          </div>
        </div>

        {saveError && (
          <div style={{ color: 'var(--red)', fontSize: 12, padding: '0 28px 12px', textAlign: 'center' }}>
            {saveError}
          </div>
        )}
        <div className="settings-modal-footer">
          <button className="settings-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className={`settings-save-btn ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : saved ? <><Check size={14} /> Guardado</> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Sidebar principal ─────────────────────────────────────────
export default function Sidebar({ role, page, userData, unread, onLogout, mobileOpen }) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [photoKey, setPhotoKey]         = useState(0); // fuerza re-render del avatar
  const [activeAlerts, setActiveAlerts] = useState(0);

  // Badge de alertas activas en la navegación — solo aplica a estudiantes.
  useEffect(() => {
    if (role !== 'student' || !userData.id) return;
    let cancelado = false;
    getStudentAlerts(userData.id)
      .then((alerts) => { if (!cancelado) setActiveAlerts(alerts.filter((a) => a.estado === 'activa').length); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [role, userData.id, page]);

  const studentNav = [
    { id: 'dashboard',   icon: <IcoDashboard />,   label: 'Dashboard',  path: '/student/dashboard' },
    { id: 'grades',      icon: <IcoGrades />,      label: 'Notas',      path: '/student/grades' },
    { id: 'attendance',  icon: <IcoAttendance />,  label: 'Asistencia', path: '/student/attendance' },
    { id: 'curriculum',  icon: <IcoCurriculum />,  label: 'Mi Carrera', path: '/student/curriculum' },
    { id: 'alerts',      icon: <IcoAlerts />,      label: 'Mis Alertas', path: '/student/alerts', badge: activeAlerts },
    { id: 'excusas',     icon: <IcoExcusas />,     label: 'Excusas',    path: '/student/excusas' },
  ];
  const teacherNav = [
    { id: 'dashboard', icon: <IcoDashboard />, label: 'Dashboard',  path: '/teacher/dashboard' },
    { id: 'courses',   icon: <IcoCourses />,   label: 'Mis Cursos', path: '/teacher/courses' },
  ];
  const adminNav   = [{ id: 'dashboard', icon: <IcoDashboard />, label: 'Dashboard', path: '/admin/dashboard' }];
  const directorNav = [{ id: 'excusas', icon: <IcoExcusas />, label: 'Excusas', path: '/director/excusas' }];
  const nav = role === 'student' ? studentNav
    : role === 'teacher' ? teacherNav
    : role === 'director' ? directorNav
    : adminNav;

  const handleNav = (item) => navigate(item.path);
  const handleLogout = () => {
    onLogout();
    // replace: true reemplaza la entrada actual del historial
    // Así al presionar atrás no vuelve a la sesión anterior
    navigate('/login', { replace: true });
    // Limpiar el historial del navegador
    window.history.replaceState(null, '', '/login');
  };

  const photo = getStoredPhoto(userData.id);

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-avatar-wrap">
          <div className="sidebar-avatar" key={photoKey}>
            {photo
              ? <img src={photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <span>{userData.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
            }
          </div>
          <div className="sidebar-name">{userData.name?.split(' ').slice(0, 2).join(' ')}</div>
          <div className="sidebar-role">
            {role === 'student' ? (userData.program?.split(' ')[0] ?? 'Estudiante')
              : role === 'teacher' ? (userData.department?.split(' ')[0] ?? 'Docente')
              : role === 'director' ? 'Dirección'
              : 'Admin'}
          </div>
        </div>

        <div className="sidebar-divider" />

        <div style={{ width: '100%' }}>
          <div className="nav-label">Navegación</div>
          {nav.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => handleNav(item)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'dashboard' && unread > 0 && <span className="nav-badge">{unread}</span>}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-footer-btn" onClick={() => setShowSettings(true)}>
            <span className="nav-icon"><IcoSettings /></span><span>Configuración</span>
          </button>
          <button className="sidebar-footer-btn logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><IcoLogout /></span><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {showSettings && (
        <SettingsModal
          userData={userData}
          role={role}
          onClose={() => { setShowSettings(false); setPhotoKey(k => k + 1); }}
        />
      )}
    </>
  );
}
