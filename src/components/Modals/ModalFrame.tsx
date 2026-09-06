import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { containDialogFocus } from '../../utils/dialogFocus';

interface DialogSurfaceProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  closeDisabled?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

// Nested dialogs share one scroll lock, regardless of their unmount order.
let openDialogCount = 0;
let originalBodyOverflow = '';

export function DialogSurface({ isOpen, onClose, label, children, className = '', closeDisabled = false, errorMessage }: DialogSurfaceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    dialog.focus();
    if (openDialogCount === 0) originalBodyOverflow = document.body.style.overflow;
    openDialogCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      openDialogCount -= 1;
      if (openDialogCount === 0) document.body.style.overflow = originalBodyOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      else if (openDialogCount === 0) document.getElementById('main-content')?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (errorMessage && dialogRef.current) {
      dialogRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        navigator.vibrate?.([30, 40, 30]);
      } catch {}
    }
  }, [errorMessage]);

  if (!isOpen) return null;
  return <dialog ref={dialogRef} aria-label={label} aria-busy={closeDisabled || undefined} tabIndex={-1}
    onKeyDown={containDialogFocus}
    onCancel={event => { event.preventDefault(); if (!closeDisabled) onClose(); }}
    onPointerDown={event => {
      const box = event.currentTarget.getBoundingClientRect();
      backdropPress.current = event.target === event.currentTarget &&
        (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
    }}
    onClick={() => {
      if (!backdropPress.current) return;
      backdropPress.current = false;
      if (!closeDisabled) onClose();
    }}
    className={`aura-dialog m-auto box-border w-[calc(100%_-_24px)] min-w-0 max-w-xl max-h-[calc(100dvh_-_24px)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-0 text-[var(--text-primary)] shadow-xl backdrop:bg-black/50 [overflow-wrap:anywhere] [&_fieldset]:min-w-0 [&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full ${className}`}>
    {children}
  </dialog>;
}

interface ModalFrameProps extends Omit<DialogSurfaceProps, 'label'> {
  title: string;
  description?: string;
  footer?: ReactNode;
}

export function ModalFrame({ title, description, footer, children, errorMessage, onClearError, ...props }: ModalFrameProps) {
  return <DialogSurface {...props} errorMessage={errorMessage} onClearError={onClearError} label={title}>
    <header className="modal-heading flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
      <div className="min-w-0 self-center">
        <h2 className="text-base font-semibold leading-snug">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>}
      </div>
      <button type="button" onClick={props.onClose} disabled={props.closeDisabled} aria-label={`Cerrar ${title}`} className="aura-icon-button disabled:cursor-wait disabled:opacity-50"><X size={20} aria-hidden="true" /></button>
    </header>
    {errorMessage && (
      <div
        role="alert"
        aria-live="assertive"
        className="modal-error-banner sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--rose)]/30 bg-[var(--rose-soft)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--rose)] shadow-sm animate-modal-shake"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle size={18} className="shrink-0 text-[var(--rose)]" aria-hidden="true" />
          <span className="break-words leading-snug">{errorMessage}</span>
        </div>
        {onClearError && (
          <button
            type="button"
            onClick={onClearError}
            aria-label="Cerrar aviso de error"
            className="shrink-0 rounded-md p-1 text-[var(--rose)] hover:bg-[var(--rose)]/20 active:scale-95 transition-all"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    )}
    <div className="min-w-0 space-y-5 px-4 py-4 sm:px-5">{children}</div>
    {footer && <footer className="modal-footer flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 sm:px-5 [&>button]:max-w-full">{footer}</footer>}
  </DialogSurface>;
}
