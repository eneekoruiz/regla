import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast, type ToastType } from '../../context/toast';

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'error':
      return <AlertCircle size={18} className="shrink-0 text-[var(--rose)]" aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    case 'info':
    default:
      return <Info size={18} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />;
  }
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (!toasts.length) return null;

  return (
    <aside
      aria-label="Notificaciones del sistema"
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2 w-full max-w-[calc(100vw_-_24px)] sm:max-w-md pointer-events-none px-2"
    >
      {toasts.map(toast => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-center justify-between gap-3 w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-medium shadow-xl backdrop-blur-md transition-all animate-toast-enter ${
              isError
                ? 'border-[var(--rose)]/40 bg-[var(--rose-soft)]/95 text-[var(--rose)] shadow-rose-500/10'
                : isSuccess
                ? 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)]/95 text-[var(--text-primary)] shadow-black/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ToastIcon type={toast.type} />
              <span className="break-words leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 rounded-lg p-1 text-current opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
