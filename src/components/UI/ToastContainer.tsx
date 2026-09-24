import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast, type ToastType } from '../../context/toast';

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'error':
      return <AlertCircle size={18} aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 size={18} aria-hidden="true" />;
    case 'info':
    default:
      return <Info size={18} aria-hidden="true" />;
  }
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <aside aria-label="Notificaciones del sistema" className="toast-stack">
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role={isError ? 'alert' : 'status'}
              aria-live={isError ? 'assertive' : 'polite'}
              className={`toast-item ${toast.type}`}
            >
              <div className="toast-content">
                <ToastIcon type={toast.type} />
                <span className="toast-message">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Cerrar notificación"
                className="toast-dismiss"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}
