import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const AUTO_DISMISS_MS = 7000;

// Banner de notificación en tiempo real (WebSocket) — distinto del `.toast`
// de confirmación de esquina inferior derecha: este aparece abajo a la
// izquierda para avisar de una alerta nueva/actualizada/resuelta mientras
// el estudiante tiene la app abierta, sin importar en qué vista esté. El
// detalle (nota mínima requerida, etc.) vive en "Mis Alertas" — este toast
// solo avisa y lleva ahí.
export default function RealtimeAlertToast({ alert, onClose, onNavigate }) {
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [alert, onClose]);

  const resuelta = alert?.resuelta;
  const critica = alert?.tipo === 'critica';
  const color = resuelta ? 'var(--green)' : critica ? 'var(--red)' : 'var(--orange)';

  const handleClick = () => {
    onNavigate?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--card)', border: `1.5px solid ${color}`,
            borderRadius: 12, padding: '12px 16px', boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
            maxWidth: 440, cursor: 'pointer',
          }}
          onClick={handleClick}
        >
          <div style={{ color, display: 'flex', flexShrink: 0 }}>
            {resuelta ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {resuelta ? 'Alerta resuelta' : 'Nueva alerta'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {resuelta ? `Ya no estás en riesgo en ${alert?.asignaturaNombre}.` : 'Revísala ahora.'}
              {!resuelta && alert?.asignaturaNombre && (
                <span style={{ display: 'block', color: 'var(--text3)', marginTop: 1 }}>{alert.asignaturaNombre}</span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4, flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
