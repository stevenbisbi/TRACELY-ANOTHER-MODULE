import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import unicatolicaLogo from "../../assets/unicatolica-svg.svg";
import campusBg from "../../assets/campus.png";
import { resetPassword } from "../../services/authService";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!token) {
      setError("El enlace no es válido. Solicita uno nuevo.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-left">
        <img src={campusBg} alt="Campus Unicatólica" className="auth-slide-img auth-slide-in" />
        <div className="auth-left-overlay" />
        <div className="auth-brand">
          <img src={unicatolicaLogo} alt="Unicatólica" className="auth-brand-logo" />
        </div>
        <div className="auth-slide-content">
          <span className="auth-slide-label">Campus Principal</span>
          <h2 className="auth-slide-headline">Tu progreso académico, siempre contigo</h2>
        </div>
      </div>

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
              {done ? "Contraseña actualizada" : "Crea una nueva contraseña"}
            </h1>
            <p className="auth-subtitle">
              {done
                ? "Ya puedes iniciar sesión con tu nueva contraseña."
                : "Ingresa y confirma tu nueva contraseña."}
            </p>
          </div>

          {done ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(52, 211, 153, 0.12)", border: "2px solid rgba(52, 211, 153, 0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
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
                Ir al login
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
                <label className="auth-label">Nueva contraseña</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label className="auth-label">Confirmar contraseña</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button className="auth-btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? "Guardando..." : "Restablecer contraseña"}
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
