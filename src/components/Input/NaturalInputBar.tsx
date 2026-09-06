import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Mic, MicOff, ArrowUp, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/ToastContext';

interface SpeechSession {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechSession; webkitSpeechRecognition?: new () => SpeechSession };
const suggestions = [
  ['Segundo día con dolor', 'hoy estoy en mi segundo día, me duele la tripa y estoy cansada'],
  ['Mucha energía', 'me siento con mucha energía y motivada'],
  ['Antojos y sensibilidad', 'tengo antojos y estoy sensible'],
  ['Cólicos leves', 'cólicos suaves y algo de hinchazón']
];
export function NaturalInputBar() {
  const { processDailyNote, selectedDate, lastChroniclerResponse, clearLastChroniclerResponse } = useCycle();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const recognition = useRef<SpeechSession | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const win = window as SpeechWindow;
    const Speech = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Speech) return;
    const session = new Speech();
    session.continuous = false; session.interimResults = false; session.lang = 'es-ES';
    session.onstart = () => setListening(true);
    session.onend = () => setListening(false);
    session.onerror = () => { setListening(false); setError('No se ha podido usar el micrófono. Puedes escribir la nota.'); };
    session.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput(previous => (previous ? previous + ' ' + transcript : transcript).slice(0, 4000));
      setListening(false);
    };
    recognition.current = session;
    return () => { session.onstart = null; session.onend = null; session.onerror = null; session.onresult = null; session.abort(); recognition.current = null; };
  }, []);
  const toggleSpeech = () => {
    setError('');
    if (!recognition.current) { setError('El dictado no está disponible en este navegador. Puedes escribir la nota.'); return; }
    try { if (listening) recognition.current.stop(); else recognition.current.start(); }
    catch { setError('No se ha podido iniciar el dictado. Vuelve a intentarlo.'); }
  };
  const submit = async () => {
    if (pending.current || !input.trim()) return;
    pending.current = true; setProcessing(true); setError('');
    const note = input.trim();
    try {
      await processDailyNote(note, selectedDate);
      setInput('');
      // Mejora 9: vibración háptica suave al confirmar el guardado
      try { navigator.vibrate?.(20); } catch {}
      toast.success('Nota registrada');
    }
    catch { setError('No se ha guardado la nota. El texto se conserva para que puedas reintentarlo.'); }
    finally { pending.current = false; setProcessing(false); }
  };
  return <section className="min-w-0 space-y-3 border-t border-[var(--border-subtle)] pt-4">
    {error && (
      <div
        role="alert"
        className="modal-error-banner flex items-center justify-between gap-2.5 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose-soft)] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--rose)] animate-modal-shake"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle size={16} className="shrink-0 text-[var(--rose)]" />
          <span id="daily-note-error" className="break-words leading-snug">{error}</span>
        </div>
        <button
          type="button"
          onClick={() => setError('')}
          aria-label="Cerrar aviso de error"
          className="shrink-0 rounded p-0.5 text-[var(--rose)] hover:bg-[var(--rose)]/20 active:scale-95"
        >
          <X size={14} />
        </button>
      </div>
    )}
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-2">
      <div className="space-y-2">
        <label htmlFor="daily-note-input" className="block text-sm font-semibold">Tu nota</label>
        <textarea
          id="daily-note-input"
          ref={inputRef}
          rows={3}
          value={input}
          maxLength={4000}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={event => { setInput(event.target.value); if (error) setError(''); }}
          disabled={processing}
          aria-describedby={error ? 'daily-note-error' : undefined}
          placeholder="¿Cómo te sientes?"
          className={`aura-field resize-y ${error ? 'field-shake' : ''}`}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" disabled={processing} aria-pressed={listening} onClick={toggleSpeech} className="aura-button">{listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}{listening ? 'Detener dictado' : 'Dictar'}</button>
        <button type="submit" disabled={!input.trim() || processing || listening} className="aura-button primary"><ArrowUp size={18} aria-hidden="true" />{processing ? 'Guardando…' : 'Registrar'}</button>
      </div>
    </form>
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.map(([label, note]) => (
        <button
          type="button"
          key={label}
          disabled={processing}
          onClick={() => { setInput(note); inputRef.current?.focus(); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-2xs transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)] opacity-70" />
          <span>{label}</span>
        </button>
      ))}
    </div>
    {lastChroniclerResponse && <div className="flex items-start gap-3 border-t border-[var(--border-subtle)] pt-3">
      <div role="status" className="min-w-0 flex-1 space-y-2 text-sm text-[var(--text-primary)]"><p>{lastChroniclerResponse.empathyMessage}</p><ul className="space-y-1 text-[var(--text-secondary)]">{lastChroniclerResponse.data.extractedSummary.map((summary, index) => <li key={index}>{summary}</li>)}</ul></div>
      <button type="button" onClick={clearLastChroniclerResponse} aria-label="Cerrar confirmación" className="aura-icon-button"><X size={18} aria-hidden="true" /></button>
    </div>}
  </section>;
}
