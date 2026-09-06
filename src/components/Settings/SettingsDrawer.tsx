import { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Check, Bell, ChevronRight, UserRound, Shield, Moon, FileText } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useAuth } from '../../hooks/useAuth';
import { ModalFrame } from '../Modals/ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from '../Modals/modalStyles';
import { MedicalExportModal } from '../Modals/MedicalExportModal';
import { UniversalImportModal } from '../Modals/UniversalImportModal';
import { LegalComplianceModal } from '../Modals/LegalComplianceModal';
import { ModularOnboardingModal } from '../Modals/ModularOnboardingModal';
import { PwaInstallModal } from '../Modals/PwaInstallModal';
import { PassphraseModal } from '../Modals/PassphraseModal';
import { encryptText } from '../../services/cryptoVault';
import { requestNotificationPermission } from '../../services/localNotificationEngine';
import type { UserSettings } from '../../types/cycle';

type Category = 'cycle' | 'body' | 'lifestyle';
type Props = { onOpenModularProfile?: (category?: Category) => void };
type Tool = 'report' | 'import' | 'legal' | 'profile' | 'install' | null;
type SettingsTab = 'account' | 'cycle' | 'privacy' | 'notifications';

export function SettingsDrawer(props: Props) {
  const { isSettingsOpen } = useCycle();
  return isSettingsOpen ? <SettingsContent {...props} /> : null;
}

function SettingsContent({ onOpenModularProfile }: Props) {
  const { setIsSettingsOpen, settings, updateSettings, exportData, destroyAllData, logs, todayDate, notificationPrefs, updateNotificationPrefs, sendTestNotification } = useCycle();
  const { signOut, user } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('cycle');
  const [tool, setTool] = useState<Tool>(null);
  const [profileCategory, setProfileCategory] = useState<Category>('cycle');
  const [cycleLength, setCycleLength] = useState(String(settings.averageCycleLength));
  const [periodLength, setPeriodLength] = useState(String(settings.averagePeriodLength));
  const [startDate, setStartDate] = useState(settings.lastPeriodStartDate);
  const [pcos, setPcos] = useState(Boolean(settings.hasPCOS));
  const [worstDay, setWorstDay] = useState(settings.worstDayOfPeriod ?? 1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [encryptedBackupOpen, setEncryptedBackupOpen] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const close = () => setIsSettingsOpen(false);
  const closeTool = () => setTool(null);
  const saveCycle = () => {
    const length = Number(cycleLength), duration = Number(periodLength);
    if (!Number.isInteger(length) || length < 15 || length > 90 || !Number.isInteger(duration) || duration < 1 || duration > 15 || duration > length ||
      (startDate && (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate > todayDate || Number.isNaN(new Date(startDate + 'T12:00:00').getTime())))) {
      setError('Revisa la duración del ciclo (15 a 90 días), el sangrado (1 a 15 días) y una fecha de inicio no futura.'); return;
    }
    try { updateSettings({ averageCycleLength: length, averagePeriodLength: duration, lastPeriodStartDate: startDate, hasPCOS: pcos, worstDayOfPeriod: worstDay }); close(); }
    catch { setError('No se han guardado los ajustes. Vuelve a intentarlo.'); }
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'aura-copia-' + todayDate + '.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Copia de seguridad exportada.'); setError('');
    } catch { setError('No se ha podido exportar la copia.'); }
  };
  const downloadEncrypted = async (passphrase: string) => {
    const payload = JSON.stringify({ version: 1, type: 'aura-encrypted-backup', payload: await encryptText(exportData(), passphrase) });
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'aura-copia-cifrada-' + todayDate + '.aura.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setEncryptedBackupOpen(false); setMessage('Copia cifrada exportada.'); setError('');
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
  return <>
    <ModalFrame isOpen onClose={close} title="Ajustes"
      footer={<><button type="button" onClick={close} className={modalSecondaryButton}>{tab === 'cycle' ? 'Cancelar' : 'Cerrar'}</button>{tab === 'cycle' && <button type="button" onClick={saveCycle} className={modalPrimaryButton}><Check size={17} aria-hidden="true" />Guardar cambios</button>}</>}>
      <div className="flex rounded-xl bg-[var(--bg-root)] p-1 border border-[var(--border-subtle)]" aria-label="Secciones de ajustes">
        {([['cycle', 'Ciclo'], ['account', 'Cuenta'], ['privacy', 'Datos y copias'], ['notifications', 'Avisos']] as const).map(([value, label]) => (
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
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.email || settings.userName || 'Modo privado local'}</p>
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

      {tab === 'cycle' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Tu perfil de bienestar</p>
          <p className="text-xs text-[var(--text-secondary)]">Completa o actualiza tus cuestionarios para afinar las recomendaciones de Aura.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
            {([['cycle', 'Mi ciclo'], ['body', 'Mi cuerpo'], ['lifestyle', 'Estilo de vida']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => openProfile(value)} className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30 transition-all">
                <span>{label}</span><ChevronRight size={15} aria-hidden="true" className="text-[var(--text-secondary)]" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Parámetros del ciclo</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-medium">
              <span>Duración media del ciclo (días)</span>
              <input type="number" min={15} max={90} value={cycleLength} onChange={event => setCycleLength(event.target.value)} className={modalField} />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              <span>Duración del sangrado (días)</span>
              <input type="number" min={1} max={15} value={periodLength} onChange={event => setPeriodLength(event.target.value)} className={modalField} />
            </label>
          </div>
          <label className="block space-y-1.5 text-xs font-medium">
            <span>Último inicio de regla</span>
            <input type="date" max={todayDate} value={startDate} onChange={event => setStartDate(event.target.value)} className={modalField} />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-xs font-medium cursor-pointer">
            <input type="checkbox" checked={pcos} onChange={event => setPcos(event.target.checked)} className="h-5 w-5 rounded accent-[var(--accent)]" />
            <span>SOP / ciclos irregulares</span>
          </label>
          <label className="block space-y-1.5 text-xs font-medium">
            <span>Día de mayor molestia</span>
            <select value={worstDay} onChange={event => setWorstDay(Number(event.target.value))} className={modalField}>
              {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Día {value}</option>)}
            </select>
          </label>
        </div>
      </div>}

      {tab === 'privacy' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Apariencia</p>
          <label className="block space-y-1.5 text-xs">
            <select value={settings.theme} onChange={event => { try { updateSettings({ theme: event.target.value as UserSettings['theme'] }); } catch { setError('No se ha guardado la apariencia.'); } }} className={modalField}>
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

      {tab === 'notifications' && <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-3.5 space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.enabled}
              onChange={async event => {
                const willEnable = event.target.checked;
                if (willEnable && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                  const perm = await requestNotificationPermission();
                  if (perm === 'granted') {
                    updateNotificationPrefs({ enabled: true });
                    setMessage('Recordatorios activados (1 semana antes de tu regla).');
                  } else {
                    updateNotificationPrefs({ enabled: false });
                    setError('Se necesita permiso del navegador para mostrar recordatorios.');
                  }
                } else {
                  updateNotificationPrefs({ enabled: willEnable });
                }
              }}
              className="h-5 w-5 rounded accent-[var(--accent)]"
            />
            <span>Activar recordatorios del ciclo (1 semana antes)</span>
          </label>
          {notificationPrefs.enabled && <div className="space-y-3 border-t border-[var(--border-subtle)] pt-3">
            <label className="flex min-h-11 items-center gap-3 text-xs cursor-pointer">
              <input type="checkbox" checked={notificationPrefs.discreetMode} onChange={event => updateNotificationPrefs({ discreetMode: event.target.checked })} className="h-5 w-5 rounded accent-[var(--accent)]" />
              <span>Mensajes discretos (sin detalles íntimos en pantalla de bloqueo)</span>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-xs cursor-pointer">
              <input type="checkbox" checked={notificationPrefs.notifyFertileWindow} onChange={event => updateNotificationPrefs({ notifyFertileWindow: event.target.checked })} className="h-5 w-5 rounded accent-[var(--accent)]" />
              <span>Avisos de ventana de fertilidad estimada</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium">
                <span>Hora del aviso</span>
                <input type="time" value={notificationPrefs.alertTime} onChange={event => { if (event.target.value) updateNotificationPrefs({ alertTime: event.target.value }); }} className={modalField} />
              </label>
              <label className="block space-y-1.5 text-xs font-medium">
                <span>Antelación del aviso</span>
                <select value={notificationPrefs.daysBeforePeriod} onChange={event => updateNotificationPrefs({ daysBeforePeriod: Number(event.target.value) })} className={modalField}>
                  {[1, 2, 3, 5, 7].map(value => <option key={value} value={value}>{value === 7 ? '1 semana antes (7 días)' : `${value} días antes`}</option>)}
                </select>
              </label>
            </div>
            <button type="button" disabled={busy} onClick={() => void run(async () => { const success = await sendTestNotification(); if (success) setMessage('Notificación enviada.'); else setError('No se pudo enviar. Comprueba el permiso de notificaciones del navegador.'); })} className={modalSecondaryButton}>
              <Bell size={16} aria-hidden="true" />Probar notificación en este dispositivo
            </button>
          </div>}
        </div>
      </div>}

      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}
    </ModalFrame>
    {tool === 'report' && <MedicalExportModal isOpen onClose={closeTool} />}
    {tool === 'install' && <PwaInstallModal onClose={closeTool}/>}
    {tool === 'import' && <UniversalImportModal isOpen onClose={closeTool} />}
    {tool === 'legal' && <LegalComplianceModal isOpen onClose={closeTool} />}
    {tool === 'profile' && <ModularOnboardingModal isOpen initialCategory={profileCategory} onClose={closeTool} />}
    <PassphraseModal isOpen={encryptedBackupOpen} onClose={() => setEncryptedBackupOpen(false)} title="Exportar copia cifrada" description="Protege tu copia con una frase secreta antes de guardarla o trasladarla. La copia se cifra en este dispositivo." submitLabel="Cifrar y descargar" onSubmit={downloadEncrypted} />
    {confirmWipe && <ModalFrame isOpen onClose={() => { if (!busy) setConfirmWipe(false); }} title="¿Eliminar los datos locales?" footer={<><button type="button" disabled={busy} onClick={() => setConfirmWipe(false)} className={modalSecondaryButton}>Cancelar</button><button type="button" disabled={busy} onClick={() => void run(async () => { await destroyAllData(); setConfirmWipe(false); close(); })} className="aura-button rose"><Trash2 size={17} aria-hidden="true" />{busy ? 'Eliminando…' : 'Eliminar definitivamente'}</button></>}>
      <p className="text-sm text-[var(--text-secondary)]">Se borrarán los registros y ajustes de Aura de este dispositivo. Esta acción no se puede deshacer.</p>
      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    </ModalFrame>}
  </>;
}
