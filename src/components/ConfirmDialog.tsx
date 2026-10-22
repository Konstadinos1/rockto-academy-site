import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

// Native <dialog> gives focus trapping, Escape handling and an inert background.
export function ConfirmDialog({ open, title, confirmLabel, danger, confirmDisabled, onConfirm, onCancel, children }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>
        {title}
      </h2>
      <div style={{ color: 'var(--text-2)' }}>{children}</div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1.2rem' }}>
        <button type="button" className="btn" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn danger' : 'btn primary'} onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
