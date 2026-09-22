import { useEffect, useState } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { authorizeNativeHealth, hasNativeHealth } from '../../services/nativeHealth';
import { ModalFrame } from './ModalFrame';

export function DeviceHealthModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useCycle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = hasNativeHealth();
  useEffect(() => {
    const failed = () => setError('No se ha completado una lectura o escritura en Salud. Tus registros siguen guardados en Aura. Revisa los permisos del sistema.');
    window.addEventListener('aura:health-error', failed);
    return () => window.removeEventListener('aura:health-error', failed);
  }, []);
  const connect = async () => {
    setBusy(true); setError('');
    try {
      const result = await authorizeNativeHealth();
      if (!result.granted) throw new Error('No se ha autorizado la conexión. Puedes cambiar los permisos en los ajustes de Salud.');
      updateSettings({ nativeHealthEnabled: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha conectado Salud.'); }
    finally { setBusy(false); }
  };
  return <ModalFrame isOpen onClose={onClose} title="Salud y widgets" closeDisabled={busy}>
    <p>Conecta el sangrado menstrual de Apple Salud o Health Connect. Tus anotaciones existentes tienen prioridad. Solo se comparte sangrado con Salud; las notas y los síntomas permanecen en Aura.</p>
    <p className="text-sm text-[var(--text-secondary)]">Si utilizas una cuenta con nube, el historial importado también forma parte de tu copia sincronizada.</p>
    {!supported && <p className="advice-tip">Esta versión funciona en el navegador. La conexión con Salud y los widgets se activan en la aplicación nativa para iOS o Android.</p>}
    {supported && <><button type="button" disabled={busy} className="aura-button primary" onClick={() => { if (settings.nativeHealthEnabled) updateSettings({ nativeHealthEnabled: false }); else void connect(); }}>{busy ? 'Conectando…' : settings.nativeHealthEnabled ? 'Desconectar Salud' : 'Conectar y elegir permisos'}</button>
      <p className="text-sm text-[var(--text-secondary)]">La primera conexión importa el historial permitido. Después se actualiza al abrir Aura. Desconectar no borra lo ya guardado en Salud.</p>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!settings.nativeWidgetEnabled} onChange={event => updateSettings({ nativeWidgetEnabled: event.target.checked })}/>Mostrar el ciclo en los widgets de inicio</label>
      <p className="text-sm text-[var(--text-secondary)]">Los widgets pueden ser vistos por otras personas que usen tu dispositivo. Sin activar esta opción, muestran un mensaje discreto.</p></>}
    {error && <p role="alert">{error}</p>}
  </ModalFrame>;
}
