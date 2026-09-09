import { useState } from 'react';
import { AlertCircle, Download, Upload, LogOut, Trash2, Check, Bell, BellRing, Calendar, Plus, ChevronRight, UserRound, Shield, FileText, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/toast';
import { ModalFrame } from '../Modals/ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from '../Modals/modalStyles';
import { MedicalExportModal } from '../Modals/MedicalExportModal';
import { UniversalImportModal } from '../Modals/UniversalImportModal';
import { LegalComplianceModal } from '../Modals/LegalComplianceModal';
import { ModularOnboardingModal } from '../Modals/ModularOnboardingModal';
import { PwaInstallModal } from '../Modals/PwaInstallModal';
import { PassphraseModal } from '../Modals/PassphraseModal';
import { DeviceNotificationModal } from '../Modals/DeviceNotificationModal';
import { encryptText } from '../../services/cryptoVault';
import { getNotificationPermission } from '../../services/localNotificationEngine';
import type { UserSettings } from '../../types/cycle';

type Category = 'cycle' | 'body' | 'lifestyle';
type Props = { onOpenModularProfile?: (category?: Category) => void; inline?: boolean };
type Tool = 'report' | 'import' | 'legal' | 'profile' | 'install' | null;
type SettingsTab = 'account' | 'integrations' | 'privacy' | 'notifications';

export function SettingsDrawer(props: Props) {
  const { isSettingsOpen } = useCycle();
  return isSettingsOpen ? <SettingsContent {...props} /> : null;
}

export function SettingsSection(props: Props) {
  return <SettingsContent {...props} inline />;
}

function SettingsContent({ onOpenModularProfile, inline = false }: Props) {
  const { setIsSettingsOpen, settings, updateSettings, exportData, destroyAllData, logs, todayDate, notificationPrefs, updateNotificationPrefs } = useCycle();
  const { signOut, user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<SettingsTab>('account');
  const [tool, setTool] = useState<Tool>(null);
  const [profileCategory, setProfileCategory] = useState<Category>('cycle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [encryptedBackupOpen, setEncryptedBackupOpen] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [customDayInput, setCustomDayInput] = useState('');
  const close = () => setIsSettingsOpen(false);
  const closeTool = () => setTool(null);
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'aura-copia-' + todayDate + '.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Copia de seguridad descargada.');
      setMessage('Copia de seguridad exportada.'); setError('');
    } catch { setError('No se ha podido exportar la copia.'); }
  };
  const downloadEncrypted = async (passphrase: string) => {
    try {
      const payload = JSON.stringify({ version: 1, type: 'aura-encrypted-backup', payload: await encryptText(exportData(), passphrase) });
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'aura-copia-cifrada-' + todayDate + '.aura.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setEncryptedBackupOpen(false);
      toast.success('Copia cifrada descargada.');
      setMessage('Copia cifrada exportada.'); setError('');
    } catch { setError('No se ha podido cifrar o exportar la copia.'); }
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch { setError('No se ha completado la operación. Vuelve a intentarlo.'); }
    finally { setBusy(false); }
  };
  const openProfile = (category: Category) => {
    if (onOpenModularProfile) { close(); onOpenModularProfile(category); }
    else { setProfileCategory(category); setTool('profile'); }
  };

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIos = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  const tabs = [
    { value: 'account' as const, label: 'Cuenta' },
    { value: 'privacy' as const, label: 'Privacidad' },
    { value: 'notifications' as const, label: 'Alertas' },
    ...(isMobile ? [{ value: 'integrations' as const, label: 'Apps' }] : []),
  ];

  const tabContent = (
    <>
      <div className="flex rounded-xl bg-[var(--bg-root)] p-1 border border-[var(--border-subtle)]" aria-label="Secciones de ajustes">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => { setTab(value); setError(''); setMessage(''); }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              tab === value
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <UserRound size={20} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Cuenta conectada</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.email || settings.userName || 'Tu cuenta'}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
              <Check size={13}/> Activa
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2.5">
            {Object.keys(logs).length} días registrados en este dispositivo.
          </p>
        </div>
        <button type="button" onClick={() => setTool('install')} className={modalSecondaryButton}>
          <Download size={17} aria-hidden="true"/>Instalar Aura en este dispositivo
        </button>
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <button type="button" disabled={busy} onClick={() => void run(async () => { await signOut(); close(); })} className={modalSecondaryButton}>
            <LogOut size={17} aria-hidden="true" />Cerrar sesión
          </button>
        </div>
      </div>}

      {tab === 'integrations' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Integraciones de Salud</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Conecta Aura con otras aplicaciones de tu dispositivo móvil para sincronizar métricas.</p>
          </div>
          <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
            {isIos && (
              <label className="flex items-center justify-between min-h-10 cursor-pointer">
                <span className="text-sm font-semibold">Apple Health</span>
                <input type="checkbox" className="h-5 w-5 rounded accent-[var(--accent)] cursor-pointer" onChange={() => toast.info('Requiere la versión nativa de iOS. Disponible próximamente.')} />
              </label>
            )}
            {isAndroid && (
              <label className="flex items-center justify-between min-h-10 cursor-pointer">
                <span className="text-sm font-semibold">Google Health Connect</span>
                <input type="checkbox" className="h-5 w-5 rounded accent-[var(--accent)] cursor-pointer" onChange={() => toast.info('Requiere la app nativa de Android. Disponible próximamente.')} />
              </label>
            )}
            {!isIos && !isAndroid && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">Solo disponible en dispositivos iOS o Android nativos.</p>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-2">La sincronización con apps externas requiere permisos del sistema operativo y actualmente se encuentra en desarrollo.</p>
        </div>
      </div>}

      {tab === 'privacy' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Apariencia</p>
          <label className="block space-y-1.5 text-xs">
            <select aria-label="Apariencia" value={settings.theme} onChange={event => { try { updateSettings({ theme: event.target.value as UserSettings['theme'] }); } catch { setError('No se ha guardado la apariencia.'); } }} className={modalField}>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="system">Según el dispositivo</option>
              <option value="refugio">Refugio</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Copias de seguridad y traslados</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Exporta o restaura tu historial en este dispositivo o trasládalo con cifrado.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button type="button" onClick={download} className={modalSecondaryButton}>
              <Download size={16} aria-hidden="true" />Exportar copia
            </button>
            <button type="button" onClick={() => setEncryptedBackupOpen(true)} className={modalSecondaryButton}>
              <Download size={16} aria-hidden="true" />Copia cifrada
            </button>
            <button type="button" onClick={() => setTool('import')} className={modalSecondaryButton}>
              <Upload size={16} aria-hidden="true" />Importar datos
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Informes clínicos y privacidad</p>
          <div className="flex flex-col gap-2 pt-1">
            <button type="button" onClick={() => setTool('report')} className={modalSecondaryButton}>
              <FileText size={16} aria-hidden="true" />Informe de salud para consulta médica
            </button>
            <button type="button" onClick={() => setTool('legal')} className={modalSecondaryButton}>
              <Shield size={16} aria-hidden="true" />Privacidad y límites sanitarios de Aura
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--rose)]/30 bg-[var(--rose-soft)]/20 p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--rose)]">Zona de peligro</p>
          <p className="text-xs text-[var(--text-secondary)]">Borra permanentemente todos los registros locales de este navegador.</p>
          <button type="button" onClick={() => setConfirmWipe(true)} className="aura-button rose w-full">
            <Trash2 size={16} aria-hidden="true" />Eliminar datos locales
          </button>
        </div>
      </div>}

      {tab === 'notifications' && (() => {
        const activeReminders: number[] = Array.isArray(notificationPrefs.periodReminders) && notificationPrefs.periodReminders.length > 0
          ? notificationPrefs.periodReminders
          : [notificationPrefs.daysBeforePeriod ?? 7];

        const toggleReminderDay = (days: number) => {
          let next: number[];
          if (activeReminders.includes(days)) {
            next = activeReminders.filter(d => d !== days);
            if (next.length === 0) next = [7];
          } else {
            next = [...activeReminders, days].sort((a, b) => b - a);
          }
          updateNotificationPrefs({ periodReminders: next, daysBeforePeriod: next[0] });
        };

        const handleAddCustomDay = () => {
          const num = parseInt(customDayInput.trim(), 10);
          if (!isNaN(num) && num >= 0 && num <= 30 && !activeReminders.includes(num)) {
            const next = [...activeReminders, num].sort((a, b) => b - a);
            updateNotificationPrefs({ periodReminders: next, daysBeforePeriod: next[0] });
            setCustomDayInput('');
          }
        };

        const permission = typeof window !== 'undefined' ? getNotificationPermission() : 'default';
        const isDeviceActive = permission === 'granted';

        return (
          <div className="space-y-4">
            {/* Detección de notificaciones en este dispositivo */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${isDeviceActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                  {isDeviceActive ? <BellRing size={18} /> : <Bell size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isDeviceActive ? 'Notificaciones activadas en este dispositivo' : 'Permiso no activado en este dispositivo'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDeviceActive ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>
                      {isDeviceActive ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug mt-0.5">
                    {isDeviceActive
                      ? 'Este dispositivo puede recibir alertas locales de tu ciclo.'
                      : 'Actívalas para que tu navegador pueda avisarte en este móvil o PC.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDeviceModal(true)}
                className={`aura-button sm w-full flex items-center justify-center gap-2 ${isDeviceActive ? '' : 'primary'}`}
              >
                {isDeviceActive ? (
                  <>
                    <BellRing size={15} />
                    Probar notificación en este dispositivo
                  </>
                ) : (
                  <>
                    <Bell size={15} />
                    Activar notificaciones en este dispositivo
                  </>
                )}
              </button>
            </div>

            {/* Configuración completamente personalizable de recordatorios */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3.5">
              <label className="flex min-h-10 items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] block">
                    Activar recordatorios del ciclo
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">Avisos personalizados previos a tu regla</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPrefs.enabled}
                  onChange={event => updateNotificationPrefs({ enabled: event.target.checked })}
                  className="h-5 w-5 rounded accent-[var(--accent)] cursor-pointer"
                />
              </label>

              {notificationPrefs.enabled && (
                <div className="space-y-3.5 border-t border-[var(--border-subtle)] pt-3">
                  {/* Antelación y cantidad de avisos personalizables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Avisos antes de tu regla
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                        {activeReminders.length} {activeReminders.length === 1 ? 'aviso programado' : 'avisos programados'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { days: 7, label: '7 días antes' },
                        { days: 5, label: '5 días antes' },
                        { days: 3, label: '3 días antes' },
                        { days: 2, label: '2 días antes' },
                        { days: 1, label: '1 día antes' },
                        { days: 0, label: 'El mismo día' }
                      ].map(preset => {
                        const isSelected = activeReminders.includes(preset.days);
                        return (
                          <button
                            type="button"
                            key={preset.days}
                            onClick={() => toggleReminderDay(preset.days)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] shadow-2xs'
                                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-inner)]'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Añadir día a medida */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        placeholder="Otro día (0 a 30)..."
                        value={customDayInput}
                        onChange={e => setCustomDayInput(e.target.value)}
                        className="w-36 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomDay}
                        disabled={!customDayInput.trim()}
                        className="aura-button sm text-xs py-1 px-2.5 disabled:opacity-40"
                      >
                        <Plus size={13} /> Añadir
                      </button>
                    </div>
                  </div>

                  {/* Repetición mensual / por ciclo */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">
                      Repetición de los recordatorios
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateNotificationPrefs({ repeatMonthly: true })}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all ${
                          notificationPrefs.repeatMonthly !== false
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Check size={13} />
                        Todos los meses
                      </button>
                      <button
                        type="button"
                        onClick={() => updateNotificationPrefs({ repeatMonthly: false })}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all ${
                          notificationPrefs.repeatMonthly === false
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Calendar size={13} />
                        Solo este ciclo
                      </button>
                    </div>
                  </div>

                  {/* Hora del aviso */}
                  <div className="pt-1">
                    <label className="block space-y-1 text-xs font-semibold text-[var(--text-primary)]">
                      <span>Hora del aviso</span>
                      <input
                        type="time"
                        value={notificationPrefs.alertTime}
                        onChange={event => {
                          if (event.target.value) updateNotificationPrefs({ alertTime: event.target.value });
                        }}
                        className={modalField}
                      />
                    </label>
                  </div>

                  {/* Opciones adicionales */}
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <label className="flex min-h-10 items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.discreetMode}
                        onChange={event => updateNotificationPrefs({ discreetMode: event.target.checked })}
                        className="h-4 w-4 rounded accent-[var(--accent)]"
                      />
                      <span>Modo discreto (frases neutras sin palabras íntimas)</span>
                    </label>
                    <label className="flex min-h-10 items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.notifyFertileWindow}
                        onChange={event => updateNotificationPrefs({ notifyFertileWindow: event.target.checked })}
                        className="h-4 w-4 rounded accent-[var(--accent)]"
                      />
                      <span>Avisos de ventana de fertilidad estimada</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}
    </>
  );

  return (
    <>
      {inline ? (
        <section className="settings-inline-panel rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6 space-y-5" aria-label="Ajustes de la aplicación">
          {error && (
            <div
              role="alert"
              className="modal-error-banner flex items-center justify-between gap-3 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose-soft)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--rose)] shadow-sm animate-modal-shake"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={18} className="shrink-0 text-[var(--rose)]" />
                <span className="break-words leading-snug">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Cerrar aviso de error"
                className="shrink-0 rounded-md p-1 text-[var(--rose)] hover:bg-[var(--rose)]/20 active:scale-95 transition-all"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {tabContent}
        </section>
      ) : (
        <ModalFrame isOpen onClose={close} title="Configuración" errorMessage={error} onClearError={() => setError('')}
          footer={<button type="button" onClick={close} className={modalSecondaryButton}>Cerrar</button>}>
          {tabContent}
        </ModalFrame>
      )}
    {tool === 'report' && <MedicalExportModal isOpen onClose={closeTool} />}
    {tool === 'install' && <PwaInstallModal onClose={closeTool}/>}
    {tool === 'import' && <UniversalImportModal isOpen onClose={closeTool} />}
    {tool === 'legal' && <LegalComplianceModal isOpen onClose={closeTool} />}
    {tool === 'profile' && <ModularOnboardingModal isOpen initialCategory={profileCategory} onClose={closeTool} />}
    {showDeviceModal && (
      <DeviceNotificationModal
        isOpen
        onClose={() => setShowDeviceModal(false)}
        prefs={notificationPrefs}
        onUpdatePrefs={updateNotificationPrefs}
      />
    )}
    <PassphraseModal isOpen={encryptedBackupOpen} onClose={() => setEncryptedBackupOpen(false)} title="Exportar copia cifrada" description="Protege tu copia con una frase secreta antes de guardarla o trasladarla. La copia se cifra en este dispositivo." submitLabel="Cifrar y descargar" onSubmit={downloadEncrypted} />
    {confirmWipe && <ModalFrame isOpen onClose={() => { if (!busy) setConfirmWipe(false); }} title="¿Eliminar los datos locales?" errorMessage={error} onClearError={() => setError('')} footer={<><button type="button" disabled={busy} onClick={() => setConfirmWipe(false)} className={modalSecondaryButton}>Cancelar</button><button type="button" disabled={busy} onClick={() => void run(async () => { await destroyAllData(); setConfirmWipe(false); close(); })} className="aura-button rose"><Trash2 size={17} aria-hidden="true" />{busy ? 'Eliminando…' : 'Eliminar definitivamente'}</button></>}>
      <p className="text-sm text-[var(--text-secondary)]">Se borrarán los registros y ajustes de Aura de este dispositivo. Esta acción no se puede deshacer.</p>
      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    </ModalFrame>}
  </>);
}
