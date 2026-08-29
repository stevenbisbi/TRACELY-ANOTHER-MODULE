import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import unicatolicaLogo from "../../assets/unicatolica-svg.svg";
import campusBg from "../../assets/campus.png";
import { requestPasswordReset } from "../../services/authService";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Ingresa tu correo institucional.");
      return;
    }
    if (!email.includes("@")) {
      setError("Ingresa un correo válido.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Panel izquierdo estático (sin carrusel) */}
      <div className="auth-left">
        <img src={campusBg} alt="Campus Unicatólica" className="auth-slide-img auth-slide-in" />
        <div className="auth-left-overlay" />
        <div className="auth-brand">
          <img src={unicatolicaLogo} alt="Unicatólica" className="auth-brand-logo" />
        </div>
        <div className="auth-slide-content">
          <span className="auth-slide-label">Campus Principal</span>
          <h2 className="auth-slide-headline">Tu progreso académico, siempre contigo</h2>
          <div className="auth-stats-row">
            <div className="auth-stat">
              <span className="auth-stat-value">4.200+</span>
              <span className="auth-stat-desc">Estudiantes activos</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">18</span>
              <span className="auth-stat-desc">Programas académicos</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">30+</span>
              <span className="auth-stat-desc">Años de excelencia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <div className="auth-tracely-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Tracely
            </div>
            <h1 className="auth-title">
              {sent ? "Revisa tu correo" : "¿Olvidaste tu contraseña?"}
            </h1>
            <p className="auth-subtitle">
              {sent
                ? "Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña en los próximos minutos."
                : "Ingresa tu correo institucional y te enviaremos un enlace de restablecimiento."}
            </p>
          </div>

          {sent ? (
            <>
              {/* Ícono de éxito */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                padding: "12px 0",
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(52, 211, 153, 0.12)",
                  border: "2px solid rgba(52, 211, 153, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>

              <button className="auth-btn-primary" onClick={() => navigate("/login")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Volver al login
              </button>
            </>
          ) : (
            <>
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

              <div className="auth-field-group">
                <label className="auth-label">Correo institucional</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    className="auth-input with-icon"
                    type="email"
                    placeholder="tu.correo@unicatolica.edu.co"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button className="auth-btn-primary" onClick={handleSubmit} disabled={loading}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {loading ? "Enviando..." : "Solicitar enlace"}
              </button>

              <button className="auth-back-btn" onClick={() => navigate("/login")}>
                <ArrowLeft size={14} /> Volver al login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

