import { useEffect, useState } from 'react';
import { CheckCircle2, CloudUpload, LockKeyhole, RefreshCw, WifiOff } from 'lucide-react';
import { getSyncStatus, retryPendingSync } from '../../services/storageEngine';

export function SyncStatus() {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => {
    const update = () => setStatus(getSyncStatus());
    const events = ['aura:sync-changed', 'online', 'offline', 'aura:session-changed'];
    events.forEach(event => window.addEventListener(event, update));
    return () => events.forEach(event => window.removeEventListener(event, update));
  }, []);
  const Icon = status === 'offline' ? WifiOff : status === 'pending' ? CloudUpload : status === 'syncing' ? RefreshCw : status === 'synced' ? CheckCircle2 : LockKeyhole;
  const label = { local: 'Solo en tu dispositivo', offline: 'Sin conexión', pending: 'Copia pendiente', syncing: 'Sincronizando', synced: 'Copia sincronizada' }[status];
  return <div className="connection-status" role="status"><Icon size={14}/><span>{label}</span>{status === 'pending' && <button type="button" className="text-action" onClick={() => { void retryPendingSync().catch(() => undefined); }}>Reintentar</button>}</div>;
}
