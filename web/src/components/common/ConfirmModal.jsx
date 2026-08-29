import { AlertTriangle } from 'lucide-react';

// Modal de confirmación genérico — reutiliza las clases .overlay/.panel del
// resto de la app para mantener consistencia visual. Uso:
// <ConfirmModal title="..." message="..." onConfirm={...} onCancel={...} />
export default function ConfirmModal({
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="overlay" style={{ zIndex: 400 }} onClick={onCancel}>
      <div className="panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: danger ? 'rgba(220,38,38,0.10)' : 'rgba(254,147,0,0.10)',
            color: danger ? 'var(--red)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{title}</div>
            {message && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{message}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            className="btn"
            style={{ background: danger ? 'var(--red)' : 'var(--accent)', color: 'white' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
