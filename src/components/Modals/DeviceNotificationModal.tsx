import { useState, useEffect } from 'react';
import { Bell, BellRing, Check, ShieldCheck, Smartphone, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ModalFrame } from './ModalFrame';
import { modalPrimaryButton, modalSecondaryButton } from './modalStyles';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  getCamouflagedMessage
} from '../../services/localNotificationEngine';
import type { NotificationPreference } from '../../types/notifications';

interface DeviceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: NotificationPreference;
  onUpdatePrefs: (patch: Partial<NotificationPreference>) => void;
}

export function DeviceNotificationModal({
  isOpen,
  onClose,
  prefs,
  onUpdatePrefs
}: DeviceNotificationModalProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setTestSent(false);
      setError('');
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    setError('');
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        onUpdatePrefs({ enabled: true });
      } else if (result === 'denied') {
        setError('El navegador tiene los avisos bloqueados para esta web. Habilítalos en los ajustes de tu navegador o desde el icono del candado en la barra de direcciones.');
      }
    } catch {
      setError('No se pudo solicitar el permiso en este momento.');
    }
  };

  const handleSendTest = async () => {
    setIsSending(true);
    setError('');
    setTestSent(false);
    try {
      const msg = getCamouflagedMessage('period_approaching', prefs.discreetMode, 2);
      const success = await sendLocalNotification(msg.title, msg.body, 'test-instant-notif');
      if (success) {
        setTestSent(true);
      } else {
        setError('No se pudo enviar la notificación de prueba. Asegúrate de tener los permisos activos.');
      }
    } catch {
      setError('Ocurrió un problema al enviar la notificación.');
    } finally {
      setIsSending(false);
    }
  };

  const isGranted = permission === 'granted';
  const previewMsg = getCamouflagedMessage('period_approaching', prefs.discreetMode, 2);

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Notificaciones en este dispositivo"
      description="Avisos privados y locales para no perderte nada"
      errorMessage={error}
      onClearError={() => setError('')}
      footer={
        <button type="button" onClick={onClose} className={modalPrimaryButton}>
          <Check size={16} aria-hidden="true" /> Entendido
        </button>
      }
    >
      <div className="space-y-4">
        {/* Estado actual del dispositivo */}
        <div
          className={`rounded-2xl border p-4 transition-all ${
            isGranted
              ? 'border-emerald-500/40 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/30'
              : 'border-amber-400/40 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                isGranted
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              {isGranted ? <BellRing size={20} /> : <Bell size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {isGranted ? 'Notificaciones activadas' : 'Permiso pendiente de activación'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isGranted
                      ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  }`}
                >
                  {isGranted ? 'Listo' : 'Acción requerida'}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {isGranted
                  ? 'Este dispositivo tiene permiso para mostrar alertas locales de tu ciclo en tu barra de estado o pantalla de bloqueo.'
                  : 'Para recibir avisos antes de tu regla o en tu ventana fértil, activa el permiso del navegador en este dispositivo.'}
              </p>
            </div>
          </div>

          {!isGranted && (
            <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-900/50 flex justify-end">
              <button
                type="button"
                onClick={handleRequestPermission}
                className="aura-button primary sm flex items-center gap-1.5"
              >
                <Bell size={14} />
                Activar notificaciones en este dispositivo
              </button>
            </div>
          )}
        </div>

        {/* Garantías de privacidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <ShieldCheck size={14} className="text-[var(--accent)]" />
              100% Local y Privado
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Los avisos se programan en tu propio navegador. Ningún servidor conoce tus fechas ni te rastrea.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <Smartphone size={14} className="text-[var(--accent)]" />
              Modo Discreto
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Oculta nombres médicos o palabras íntimas en la pantalla de bloqueo con frases neutras.
            </p>
          </div>
        </div>

        {/* Zona de prueba e interactividad si está concedido */}
        {isGranted && (
          <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[var(--accent)]" />
                Vista previa en pantalla de bloqueo
              </span>
              <button
                type="button"
                onClick={() => onUpdatePrefs({ discreetMode: !prefs.discreetMode })}
                className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                {prefs.discreetMode ? <EyeOff size={13} /> : <Eye size={13} />}
                {prefs.discreetMode ? 'Modo discreto: Activo' : 'Modo discreto: Desactivado'}
              </button>
            </div>

            {/* Simulación visual de notificación */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9px]">🌸</span>
                  {previewMsg.title}
                </span>
                <span>ahora</span>
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)] pl-5.5">
                {previewMsg.body}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-[var(--text-secondary)]">
                Comprueba cómo vibra y aparece en tu pantalla.
              </span>
              <button
                type="button"
                disabled={isSending}
                onClick={handleSendTest}
                className={modalSecondaryButton}
              >
                <BellRing size={15} aria-hidden="true" />
                {isSending ? 'Enviando...' : 'Probar notificación ahora'}
              </button>
            </div>

            {testSent && (
              <div
                role="status"
                className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
              >
                <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>¡Notificación enviada! Revisa el centro de notificaciones de tu dispositivo.</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </ModalFrame>
  );
}
