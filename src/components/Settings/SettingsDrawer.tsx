import { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Check, Bell, ChevronRight } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useAuth } from '../../hooks/useAuth';
import { ModalFrame } from '../Modals/ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from '../Modals/modalStyles';
import { MedicalExportModal } from '../Modals/MedicalExportModal';
import { UniversalImportModal } from '../Modals/UniversalImportModal';
import { LegalComplianceModal } from '../Modals/LegalComplianceModal';
import { CycleAnalyticsModal } from '../Modals/CycleAnalyticsModal';
import { SymptothermalModal } from '../Modals/SymptothermalModal';
import { MedicationTrackerModal } from '../Modals/MedicationTrackerModal';
import { CycleSyncingModal } from '../Modals/CycleSyncingModal';
import { ModularOnboardingModal } from '../Modals/ModularOnboardingModal';
import { PwaInstallModal } from '../Modals/PwaInstallModal';
import { PassphraseModal } from '../Modals/PassphraseModal';
import { encryptText } from '../../services/cryptoVault';
import type { UserSettings } from '../../types/cycle';

type Category = 'cycle' | 'body' | 'lifestyle';
type Props = { onOpenModularProfile?: (category?: Category) => void };
type Tool = 'report' | 'import' | 'legal' | 'analytics' | 'temperature' | 'medication' | 'guide' | 'profile' | 'install' | null;

export function SettingsDrawer(props: Props) {
  const { isSettingsOpen } = useCycle();
  return isSettingsOpen ? <SettingsContent {...props} /> : null;
}

function SettingsContent({ onOpenModularProfile }: Props) {
  const { setIsSettingsOpen, settings, updateSettings, exportData, destroyAllData, logs, selectedDate, todayDate, notificationPrefs, updateNotificationPrefs, sendTestNotification } = useCycle();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<'cycle' | 'privacy' | 'medical' | 'account'>('cycle');
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
      footer={<><button type="button" onClick={close} className={modalSecondaryButton}>{tab === 'cycle' ? 'Cancelar' : 'Cerrar'}</button>{tab === 'cycle' && <button type="button" onClick={saveCycle} className={modalPrimaryButton}><Check size={17} aria-hidden="true" />Guardar y cerrar</button>}</>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Secciones de ajustes">
        {([['cycle', 'Ciclo'], ['privacy', 'Privacidad'], ['medical', 'Informes'], ['account', 'Mis datos']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => { setTab(value); setError(''); setMessage(''); }} className={'aura-button' + (tab === value ? ' primary' : '')}>{label}</button>)}
      </div>
      {tab === 'cycle' && <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{([['cycle', 'Mi ciclo'], ['body', 'Mi cuerpo'], ['lifestyle', 'Estilo de vida']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => openProfile(value)} className={modalSecondaryButton}>{label}<ChevronRight size={17} aria-hidden="true" /></button>)}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm">Duración media del ciclo (días)<input type="number" min={15} max={90} value={cycleLength} onChange={event => setCycleLength(event.target.value)} className={modalField} /></label>
          <label className="block space-y-2 text-sm">Duración del sangrado (días)<input type="number" min={1} max={15} value={periodLength} onChange={event => setPeriodLength(event.target.value)} className={modalField} /></label>
        </div>
        <label className="block space-y-2 text-sm">Último inicio de regla<input type="date" max={todayDate} value={startDate} onChange={event => setStartDate(event.target.value)} className={modalField} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={pcos} onChange={event => setPcos(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />SOP / ciclos irregulares</label>
        <label className="block space-y-2 text-sm">Día de mayor molestia<select value={worstDay} onChange={event => setWorstDay(Number(event.target.value))} className={modalField}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Día {value}</option>)}</select></label>
        <div className="grid grid-cols-1 gap-2 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">{([['analytics', 'Tendencias'], ['temperature', 'Sintotérmico'], ['medication', 'Medicación'], ['guide', 'Guía de fases']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTool(value)} className={modalSecondaryButton}>{label}<ChevronRight size={17} aria-hidden="true" /></button>)}</div>
      </div>}
      {tab === 'privacy' && <div className="space-y-4">
        <label className="block space-y-2 text-sm">Apariencia<select value={settings.theme} onChange={event => { try { updateSettings({ theme: event.target.value as UserSettings['theme'] }); } catch { setError('No se ha guardado la apariencia.'); } }} className={modalField}><option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Según el dispositivo</option><option value="refugio">Refugio</option></select></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={notificationPrefs.enabled} onChange={event => updateNotificationPrefs({ enabled: event.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />Activar recordatorios</label>
        {notificationPrefs.enabled && <>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={notificationPrefs.discreetMode} onChange={event => updateNotificationPrefs({ discreetMode: event.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />Mensajes discretos</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={notificationPrefs.notifyFertileWindow} onChange={event => updateNotificationPrefs({ notifyFertileWindow: event.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />Avisos de fertilidad estimada</label>
          <label className="block space-y-2 text-sm">Hora del aviso<input type="time" value={notificationPrefs.alertTime} onChange={event => { if (event.target.value) updateNotificationPrefs({ alertTime: event.target.value }); }} className={modalField} /></label>
          <label className="block space-y-2 text-sm">Antelación<select value={notificationPrefs.daysBeforePeriod} onChange={event => updateNotificationPrefs({ daysBeforePeriod: Number(event.target.value) })} className={modalField}>{[1, 2, 3].map(value => <option key={value} value={value}>{value} días antes</option>)}</select></label>
          <button type="button" disabled={busy} onClick={() => void run(async () => { const success = await sendTestNotification(); if (success) setMessage('Notificación enviada.'); else setError('No se pudo enviar. Comprueba el permiso de notificaciones del navegador.'); })} className={modalSecondaryButton}><Bell size={17} aria-hidden="true" />Probar notificación</button>
        </>}
        <button type="button" onClick={() => setTool('legal')} className={modalSecondaryButton}>Privacidad y límites de Aura</button>
      </div>}
      {tab === 'medical' && <div className="space-y-3"><button type="button" onClick={() => setTool('report')} className={modalPrimaryButton}><Download size={17} aria-hidden="true" />Informe para consulta</button><button type="button" onClick={() => setTool('legal')} className={modalSecondaryButton}>Información y privacidad</button></div>}
      {tab === 'account' && <div className="space-y-4">
        <button type="button" onClick={() => setTool('install')} className={modalSecondaryButton}><Download size={17} aria-hidden="true"/>Instalar Aura</button>
        <p className="text-sm text-[var(--text-secondary)]">{Object.keys(logs).length} días registrados en este dispositivo.</p>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={download} className={modalSecondaryButton}><Download size={17} aria-hidden="true" />Exportar copia</button><button type="button" onClick={() => setEncryptedBackupOpen(true)} className={modalSecondaryButton}><Download size={17} aria-hidden="true" />Copia cifrada</button><button type="button" onClick={() => setTool('import')} className={modalSecondaryButton}><Upload size={17} aria-hidden="true" />Importar o restaurar</button></div>
        <button type="button" onClick={() => setConfirmWipe(true)} className="aura-button rose"><Trash2 size={17} aria-hidden="true" />Eliminar datos locales</button>
        <button type="button" disabled={busy} onClick={() => void run(async () => { await signOut(); close(); })} className={modalSecondaryButton}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button>
      </div>}
      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
      {message && <p role="status" className="text-sm text-[var(--accent)]">{message}</p>}
    </ModalFrame>
    {tool === 'report' && <MedicalExportModal isOpen onClose={closeTool} />}
    {tool === 'install' && <PwaInstallModal onClose={closeTool}/>}
    {tool === 'import' && <UniversalImportModal isOpen onClose={closeTool} />}
    {tool === 'legal' && <LegalComplianceModal isOpen onClose={closeTool} />}
    {tool === 'analytics' && <CycleAnalyticsModal isOpen onClose={closeTool} />}
    {tool === 'temperature' && <SymptothermalModal key={selectedDate} isOpen onClose={closeTool} />}
    {tool === 'medication' && <MedicationTrackerModal key={selectedDate} isOpen onClose={closeTool} />}
    {tool === 'guide' && <CycleSyncingModal isOpen onClose={closeTool} />}
    {tool === 'profile' && <ModularOnboardingModal isOpen initialCategory={profileCategory} onClose={closeTool} />}
    <PassphraseModal isOpen={encryptedBackupOpen} onClose={() => setEncryptedBackupOpen(false)} title="Exportar copia cifrada" description="Protege tu copia con una frase secreta antes de guardarla o trasladarla. La copia se cifra en este dispositivo." submitLabel="Cifrar y descargar" onSubmit={downloadEncrypted} />
    {confirmWipe && <ModalFrame isOpen onClose={() => { if (!busy) setConfirmWipe(false); }} title="¿Eliminar los datos locales?" footer={<><button type="button" disabled={busy} onClick={() => setConfirmWipe(false)} className={modalSecondaryButton}>Cancelar</button><button type="button" disabled={busy} onClick={() => void run(async () => { await destroyAllData(); setConfirmWipe(false); close(); })} className="aura-button rose"><Trash2 size={17} aria-hidden="true" />{busy ? 'Eliminando…' : 'Eliminar definitivamente'}</button></>}>
      <p className="text-sm text-[var(--text-secondary)]">Se borrarán los registros y ajustes de Aura de este dispositivo. Esta acción no se puede deshacer.</p>
      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    </ModalFrame>}
  </>;
}
