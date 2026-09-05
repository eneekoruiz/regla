import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { ModalFrame } from './ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from './modalStyles';

export function PassphraseModal({ isOpen, onClose, title, description, submitLabel, confirmation = true, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  confirmation?: boolean;
  onSubmit: (passphrase: string) => Promise<void>;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passphrase.length < 12) return setError('Usa al menos 12 caracteres.');
    if (confirmation && passphrase !== repeat) return setError('Las frases no coinciden.');
    setBusy(true); setError('');
    try { await onSubmit(passphrase); setPassphrase(''); setRepeat(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido completar la operación.'); }
    finally { setBusy(false); }
  };
  return <ModalFrame isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title={title}
    footer={<><button type="button" disabled={busy} onClick={onClose} className={modalSecondaryButton}>Cancelar</button><button type="submit" form="passphrase-form" disabled={busy} className={modalPrimaryButton}><LockKeyhole size={17} aria-hidden="true" />{busy ? 'Procesando…' : submitLabel}</button></>}>
    <form id="passphrase-form" onSubmit={submit} className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
      <label className="block space-y-2 text-sm">Frase secreta<input autoFocus type="password" minLength={12} autoComplete={confirmation ? 'new-password' : 'current-password'} value={passphrase} onChange={event => setPassphrase(event.target.value)} className={modalField} /></label>
      {confirmation && <label className="block space-y-2 text-sm">Repite la frase<input type="password" minLength={12} autoComplete="new-password" value={repeat} onChange={event => setRepeat(event.target.value)} className={modalField} /></label>}
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">Aura no puede recuperar esta frase. Guárdala en un lugar seguro separado de la copia.</p>
      {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    </form>
  </ModalFrame>;
}
