import { useEffect, useRef, useState } from 'react';
import { Check, Upload, ArrowLeft } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { parseUniversalData, commitConfirmedImport, type ParsedImportData } from '../../services/universalImporter';
import { ModalFrame } from './ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from './modalStyles';
import { PassphraseModal } from './PassphraseModal';
import { decryptText } from '../../services/cryptoVault';

type ImportGroup = 'periods' | 'biomarkers' | 'intimacy' | 'symptoms';
export function UniversalImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logs, settings, importData } = useCycle();
  const [text, setText] = useState('');
  const [original, setOriginal] = useState('');
  const [parsed, setParsed] = useState<ParsedImportData | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [encryptedPayload, setEncryptedPayload] = useState('');
  const [passphraseOpen, setPassphraseOpen] = useState(false);
  const processing = useRef(false);
  const request = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { request.current++; }, []);
  const close = () => { request.current++; onClose(); };
  const analyze = async (source: string | File) => {
    if (processing.current) return;
    processing.current = true;
    const current = ++request.current;
    setBusy(true); setError('');
    try {
      if (source instanceof File) {
        if (!/\.(csv|xml|json|txt)$/i.test(source.name) || source.type.startsWith('image/') || source.type === 'application/pdf') throw new Error('No podemos leer imágenes o PDF. Pega el texto o usa un archivo CSV, XML, JSON o TXT.');
        if (source.size > 10 * 1024 * 1024) throw new Error('El archivo supera el límite de 10 MB.');
      }
      const content = typeof source === 'string' ? source : await source.text();
      if (!content.trim()) throw new Error('El archivo o texto está vacío.');
      if (content.length > 10 * 1024 * 1024) throw new Error('El contenido supera el límite de 10 MB.');
      if (content.startsWith('%PDF') || content.includes('\u0000')) throw new Error('No podemos interpretar este archivo. Pega el texto del registro.');
      try {
        const envelope = JSON.parse(content);
        if (envelope?.type === 'aura-encrypted-backup' && typeof envelope.payload === 'string') {
          setEncryptedPayload(envelope.payload); setPassphraseOpen(true); setOriginal(''); setParsed(null); return;
        }
      } catch { /* Continue with the regular import parser. */ }
      const result = await parseUniversalData(content);
      if (current !== request.current) return;
      if (![result.periods, result.biomarkers, result.intimacy, result.symptoms].some(items => items.length) && result.source !== 'backup_json') throw new Error('No se han encontrado registros. Comprueba las fechas y el formato.');
      setOriginal(content); setParsed(result);
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'No se ha podido interpretar el contenido.');
    } finally { if (current === request.current) setBusy(false); processing.current = false; }
  };
  const toggle = (group: ImportGroup, id: string) => setParsed(current => current ? { ...current, [group]: current[group].map(item => item.id === id ? { ...item, selected: !item.selected } : item) } : current);
  const selectedCount = parsed ? [...parsed.periods, ...parsed.biomarkers, ...parsed.intimacy, ...parsed.symptoms].filter(item => item.selected).length : 0;
  const confirm = () => {
    if (!parsed || processing.current || saved) return;
    processing.current = true; setError('');
    try {
      const payload = parsed.source === 'backup_json' ? original : JSON.stringify({ settings, logs: commitConfirmedImport(parsed, structuredClone(logs)) });
      if (!importData(payload)) throw new Error('El archivo no contiene datos válidos. No se ha completado la importación.');
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se han guardado los datos.'); }
    finally { processing.current = false; }
  };
  const sections = parsed ? [
    { key: 'periods' as const, title: 'Sangrado', items: parsed.periods.map(item => ({ ...item, label: `${item.startDate}${item.endDate ? ' a ' + item.endDate : ''} · ${item.daysCount} días` })) },
    { key: 'biomarkers' as const, title: 'Analíticas', items: parsed.biomarkers.map(item => ({ ...item, label: `${item.date} · ${item.name}: ${item.value} ${item.unit}` })) },
    { key: 'intimacy' as const, title: 'Intimidad', items: parsed.intimacy.map(item => ({ ...item, label: `${item.date} · ${({ protected: 'Con protección', unprotected: 'Sin protección', masturbation: 'Autoerotismo', other: 'Otra actividad' })[item.activity]}` })) },
    { key: 'symptoms' as const, title: 'Síntomas', items: parsed.symptoms.map(item => ({ ...item, label: `${item.date} · ${item.name}` })) }
  ] : [];
  const decryptBackup = async (passphrase: string) => {
    const decrypted = await decryptText(encryptedPayload, passphrase);
    const result = await parseUniversalData(decrypted);
    setOriginal(decrypted); setParsed(result); setPassphraseOpen(false); setEncryptedPayload(''); setError('');
  };
  return <><ModalFrame isOpen={isOpen} onClose={close} title="Importar registros"
    footer={saved ? <button type="button" onClick={close} className={modalPrimaryButton}>Listo</button> : parsed ? <>
      <button type="button" onClick={() => { setParsed(null); setError(''); }} className={modalSecondaryButton}><ArrowLeft size={17} aria-hidden="true" />Volver</button>
      <button type="button" onClick={confirm} disabled={!selectedCount && parsed.source !== 'backup_json'} className={modalPrimaryButton}><Check size={17} aria-hidden="true" />{parsed.source === 'backup_json' ? 'Restaurar copia' : `Importar ${selectedCount} registros`}</button>
    </> : undefined}>
    {saved ? <p role="status" className="text-sm text-[var(--accent)]">Los registros se han importado correctamente.</p> : !parsed ? <>
      <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void analyze(file); }} className="space-y-3 rounded-lg border border-dashed border-[var(--border-subtle)] p-4">
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className={modalSecondaryButton}><Upload size={18} aria-hidden="true" />Elegir archivo</button>
        <input ref={fileInput} type="file" accept=".csv,.xml,.json,.txt" aria-label="Archivo para importar" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void analyze(file); }} />
        <p className="text-sm text-[var(--text-secondary)]">CSV, XML, JSON o TXT. Máximo 10 MB.</p>
      </div>
      <label className="block space-y-2 text-sm font-semibold">Texto del registro<textarea rows={6} value={text} maxLength={500000} disabled={busy} onChange={event => setText(event.target.value)} className={modalField} /></label>
      <button type="button" onClick={() => void analyze(text)} disabled={busy || !text.trim()} className={modalPrimaryButton}>{busy ? 'Analizando…' : 'Revisar texto'}</button>
      {busy && <p role="status" className="text-sm">Leyendo registros…</p>}
    </> : parsed.source === 'backup_json' ? <>
      <h3 className="text-base font-semibold">Restaurar copia de Aura</h3>
      <p className="text-sm text-[var(--text-secondary)]">La copia sustituirá tus registros y ajustes actuales. Puedes cancelar y exportar los datos actuales antes de continuar.</p>
    </> : <>
      <p className="text-sm text-[var(--text-secondary)]">{parsed.sourceLabel}</p>
      {sections.filter(section => section.items.length > 0).map(section => <fieldset key={section.key}><legend className="mb-2 text-sm font-semibold">{section.title}</legend>
        <div className="divide-y divide-[var(--border-subtle)]">{section.items.map(item => <label key={item.id} className="flex min-h-11 items-start gap-3 py-3 text-sm"><input type="checkbox" checked={item.selected} onChange={() => toggle(section.key, item.id)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" /><span className="min-w-0 break-words">{item.label}</span></label>)}</div>
      </fieldset>)}
    </>}
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>
    <PassphraseModal isOpen={passphraseOpen} onClose={() => { setPassphraseOpen(false); setEncryptedPayload(''); }} title="Abrir copia cifrada" description="Introduce la frase secreta que se usó al exportar esta copia. Se descifra solo en este dispositivo." submitLabel="Descifrar copia" confirmation={false} onSubmit={decryptBackup} />
  </>;
}
