import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, ArrowUp, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';

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
    try { await processDailyNote(note, selectedDate); setInput(''); }
    catch { setError('No se ha guardado la nota. El texto se conserva para que puedas reintentarlo.'); }
    finally { pending.current = false; setProcessing(false); }
  };
  return <section className="min-w-0 space-y-3 border-t border-[var(--border-subtle)] pt-4">
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-2">
      <div className="space-y-2"><label htmlFor="daily-note-input" className="block text-sm font-semibold">Tu nota</label><textarea id="daily-note-input" ref={inputRef} rows={3} value={input} maxLength={4000} onChange={event => setInput(event.target.value)} disabled={processing} aria-describedby={error ? 'daily-note-error' : undefined} placeholder="¿Cómo te sientes?" className="aura-field resize-y" /></div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" disabled={processing} aria-pressed={listening} onClick={toggleSpeech} className="aura-button">{listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}{listening ? 'Detener dictado' : 'Dictar'}</button>
        <button type="submit" disabled={!input.trim() || processing || listening} className="aura-button primary"><ArrowUp size={18} aria-hidden="true" />{processing ? 'Guardando…' : 'Registrar'}</button>
      </div>
    </form>
    <div className="flex flex-wrap gap-2">{suggestions.map(([label, note]) => <button type="button" key={label} disabled={processing} onClick={() => { setInput(note); inputRef.current?.focus(); }} className="aura-button">{label}</button>)}</div>
    {error && <p id="daily-note-error" role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    {lastChroniclerResponse && <div className="flex items-start gap-3 border-t border-[var(--border-subtle)] pt-3">
      <div role="status" className="min-w-0 flex-1 space-y-2 text-sm text-[var(--text-primary)]"><p>{lastChroniclerResponse.empathyMessage}</p><ul className="space-y-1 text-[var(--text-secondary)]">{lastChroniclerResponse.data.extractedSummary.map((summary, index) => <li key={index}>{summary}</li>)}</ul></div>
      <button type="button" onClick={clearLastChroniclerResponse} aria-label="Cerrar confirmación" className="aura-icon-button"><X size={18} aria-hidden="true" /></button>
    </div>}
  </section>;
}
