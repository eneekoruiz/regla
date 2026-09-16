import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { ToastContext, type ToastContextValue, type ToastItem, type ToastType } from './toast';

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3800) => {
    const id = `toast-${Date.now()}-${++toastCounter}`;
    const item: ToastItem = { id, type, message, duration };

    setToasts(prev => {
      const next = [...prev, item];
      return next.slice(-3);
    });

    if (type === 'error') {
      try {
        navigator.vibrate?.([30, 40, 30]);
      } catch {}
    }

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const error = useCallback((message: string, duration = 4500) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const success = useCallback((message: string, duration = 3200) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration = 3500) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const value = useMemo<ToastContextValue>(() => ({
    toasts,
    showToast,
    dismissToast,
    error,
    success,
    info
  }), [toasts, showToast, dismissToast, error, success, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
