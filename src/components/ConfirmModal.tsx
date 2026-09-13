interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="modal-shell w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'px-4 py-2 text-sm font-semibold rounded-[10px] text-white transition-all duration-200' : 'btn-primary px-4 py-2 text-sm'}
            style={danger ? { background: 'linear-gradient(135deg, #ef4444, #b91c1c)' } : undefined}
            onMouseEnter={e => { if (danger) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 18px rgba(239,68,68,0.35)'; }}
            onMouseLeave={e => { if (danger) (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
