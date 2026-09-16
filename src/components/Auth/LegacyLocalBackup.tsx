import { useState } from 'react';
import { exportBackupJSON, getDefaultSettings, LOGS_KEY, SETTINGS_KEY } from '../../utils/storage';

/** Keep previous local records recoverable without creating a local session or uploading them. */
export function LegacyLocalBackup() {
  const [available] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(LOGS_KEY) || '{}')).length > 0; }
    catch { return false; }
  });
  const [error, setError] = useState('');
  if (!available) return null;
  const download = () => {
    try {
      const backup = exportBackupJSON(JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(getDefaultSettings())), JSON.parse(localStorage.getItem(LOGS_KEY) || '{}'));
      const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'aura-registros-anteriores.json'; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('No se ha podido generar la copia. Los registros originales siguen en este dispositivo.'); }
  };
  return <aside className="mt-5 rounded-lg border border-[#CDD7D2] p-3 text-sm text-[#52655F]" aria-label="Registros anteriores">
    <p>Tienes registros del antiguo modo local. Descarga una copia para importarla desde tu cuenta cuando quieras. Esta copia contiene tus datos y no está cifrada.</p>
    <button type="button" onClick={download} className="mt-2 min-h-11 font-semibold underline">Descargar registros anteriores</button>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
