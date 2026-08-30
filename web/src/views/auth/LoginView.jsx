import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import unicatolicaLogo from "../../assets/unicatolica-svg.svg";
import campusBg from "../../assets/campus.png";
import studentsBg from "../../assets/students.webp";
import sedePanceBg from "../../assets/sede-pance-unicatolica.jpg";

// ─── Slides del carrusel ───────────────────────────────────────────────────
// Mientras no tengas más imágenes, todos los slides usan campus.png
// Cuando tengas más fotos, reemplaza `image` con el import correspondiente
const SLIDES = [
  {
    image: studentsBg,
    label: "Campus Principal",
    stats: [
      { value: "4.200+", desc: "Estudiantes activos" },
      { value: "3", desc: "Sedes en Cali" },
      { value: "98%", desc: "Tasa de satisfacción" },
    ],
    headline: "Formando líderes con valores",
  },
  {
    image: campusBg,
    label: "Vida Universitaria",
    stats: [
      { value: "120+", desc: "Docentes especializados" },
      { value: "18", desc: "Programas académicos" },
      { value: "30+", desc: "Años de excelencia" },
    ],
    headline: "Excelencia académica con propósito",
  },
  {
    image: sedePanceBg,
    label: "Innovación & Tecnología",
    stats: [
      { value: "85%", desc: "Empleabilidad egresados" },
      { value: "20+", desc: "Semilleros de investigación" },
      { value: "100%", desc: "Cobertura digital" },
    ],
    headline: "Innovando para el futuro",
  },
];

// ─── Captcha simple ────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCaptcha(len = 5) {
  return Array.from({ length: len }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Si ya hay sesión activa, redirigir al dashboard correspondiente
  useEffect(() => {
    if (user) {
      const path = user.role === 'student' ? '/student/dashboard'
        : user.role === 'teacher' ? '/teacher/dashboard'
        : user.role === 'director' ? '/director/excusas'
        : '/admin/dashboard';
      navigate(path, { replace: true });
    }
  }, [user, navigate]);

  // Form state
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptcha());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Carrusel state
  const [activeSlide, setActiveSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Auto-advance carrusel cada 5 s
  const nextSlide = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
      setTransitioning(false);
    }, 400);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 7000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const goToSlide = (idx) => {
    if (idx === activeSlide) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveSlide(idx);
      setTransitioning(false);
    }, 400);
  };

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
  };

  const handleLogin = async () => {
    setError("");

    if (!id || !password) {
      setError("Completa todos los campos.");
      return;
    }
    if (!captchaInput) {
      setError("Ingresa el código de verificación.");
      return;
    }
    if (captchaInput.toUpperCase() !== captchaCode) {
      setError("Código de verificación incorrecto.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const userData = await loginService(id, password);
      login(userData.id, userData.role, userData.nombre, userData.token, userData.correo);
      navigate(
        userData.role === "student"
          ? "/student/dashboard"
          : userData.role === "teacher"
          ? "/teacher/dashboard"
          : "/admin/dashboard"
      );
    } catch (e) {
      setError(e.message || "ID o contraseña incorrectos.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const slide = SLIDES[activeSlide];

  return (
    <div className="auth-root">
      {/* ── Panel izquierdo: carrusel ── */}
      <div className="auth-left">
        {/* Imagen de fondo con transición */}
        <img
          key={activeSlide}
          src={slide.image}
          alt={slide.label}
          className={`auth-slide-img ${transitioning ? "auth-slide-out" : "auth-slide-in"}`}
        />
        {/* Overlay degradado */}
        <div className="auth-left-overlay" />

        {/* Logo arriba a la izquierda */}
        <div className="auth-brand">
          <img src={unicatolicaLogo} alt="Unicatólica" className="auth-brand-logo" />
        </div>

        {/* Contenido inferior: titular + stats + puntos */}
        <div className="auth-slide-content">
          <span className="auth-slide-label">{slide.label}</span>
          <h2 className="auth-slide-headline">{slide.headline}</h2>

          {/* Stats */}
          <div className="auth-stats-row">
            {slide.stats.map((s, i) => (
              <div key={i} className="auth-stat">
                <span className="auth-stat-value">{s.value}</span>
                <span className="auth-stat-desc">{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Puntos de navegación */}
          <div className="auth-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`auth-dot ${i === activeSlide ? "active" : ""}`}
                onClick={() => goToSlide(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          {/* Cabecera del formulario */}
          <div className="auth-form-header">
            <div className="auth-tracely-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Tracely
            </div>
            <h1 className="auth-title">Bienvenido de vuelta</h1>
            <p className="auth-subtitle">Ingresa tus credenciales institucionales para continuar</p>
          </div>

          {/* Error global */}
          {error && (
            <div className="auth-error-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Campo ID */}
          <div className="auth-field-group">
            <label className="auth-label">ID institucional</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                className="auth-input with-icon"
                type="text"
                placeholder="Ingresa tu ID"
                value={id}
                onChange={(e) => { setId(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="auth-field-group">
            <div className="auth-label-row">
              <label className="auth-label">Contraseña</label>
              <button
                className="auth-forgot-link"
                onClick={() => navigate("/forgot-password")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <input
                className="auth-input with-icon"
                type={showPass ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoComplete="current-password"
              />
              <button
                className="auth-eye-btn"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Verificación de seguridad (captcha visual) */}
          <div className="auth-field-group">
            <label className="auth-label">Verificación de seguridad</label>
            <div className="auth-captcha-row">
              <div className="auth-captcha-display" aria-label={`Código: ${captchaCode}`}>
                {captchaCode.split("").map((ch, i) => (
                  <span
                    key={i}
                    className="auth-captcha-char"
                    style={{
                      transform: `rotate(${(Math.random() * 16 - 8).toFixed(1)}deg)`,
                      color: ["#FE9300", "#34D399", "#F472B6", "#FCD34D", "#60A5FA", "#F87171"][i % 6],
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <button
                className="auth-captcha-refresh"
                onClick={refreshCaptcha}
                aria-label="Regenerar código"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </button>
            </div>
            <div className="auth-input-wrap" style={{ marginTop: "8px" }}>
              <span className="auth-input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </span>
              <input
                className="auth-input with-icon"
                type="text"
                placeholder="Ingresa el código de la imagen"
                value={captchaInput}
                onChange={(e) => { setCaptchaInput(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                maxLength={6}
                autoComplete="off"
              />
            </div>
            <p className="auth-captcha-hint">No distingue entre mayúsculas y minúsculas</p>
          </div>

          {/* Botón principal */}
          <button
            className={`auth-btn-primary ${loading ? "loading" : ""}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                Verificando...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Iniciar sesión
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}

