import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CircleAlert, Eye, EyeOff, Heart, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { hapticSelect, hapticTick, hapticError } from '../../utils/haptics';
import { useAuth } from '../../hooks/useAuth';

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'reset_password';
const fieldClass = 'min-h-12 w-full rounded-lg border border-[#A5B6B0] bg-white pl-11 pr-12 text-base text-[#22312F] placeholder:text-[#596B65] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B60]';
const buttonClass = 'min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B60] disabled:cursor-not-allowed disabled:opacity-60';

export function AuthScreens() {
  const { setSession } = useAuth();
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('reset') || '');
  const [mode, setMode] = useState<AuthMode>(() => {
    const token = new URLSearchParams(window.location.search).get('reset') || '';
    return token ? 'reset_password' : 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeRequest.current?.abort(); };
  }, []);

  function cancelRequest() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsLoading(false);
  }

  function switchMode(next: AuthMode) {
    cancelRequest();
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    setError(null);
    setMessage(null);
    if (mode !== 'forgot_password' && (new TextEncoder().encode(password).length > 72 || ((mode === 'signup' || mode === 'reset_password') && password.length < 12))) {
      setError('La contraseña debe tener al menos 12 caracteres y no superar 72 bytes.');
      return;
    }
    if (mode === 'reset_password' && password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    hapticSelect();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
      const body = mode === 'forgot_password' ? { email: email.trim() }
        : mode === 'reset_password' ? { token: resetToken, password }
        : { email: email.trim(), password };
      const response = await fetch(`${apiBase}/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal, cache: 'no-store'
      });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
      if (!mounted.current || activeRequest.current !== controller) return;
      if (!response.ok) {
        const fallback = response.status === 401 ? 'Correo o contraseña incorrectos.'
          : response.status === 429 ? 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
          : 'El acceso con cuenta no está disponible ahora. Puedes continuar en modo privado local.';
        throw new Error(typeof data?.error === 'string' ? data.error.slice(0, 400) : fallback);
      }
      if (mode === 'forgot_password') {
        if (data?.accepted !== true) throw new Error('La recuperación por correo no está disponible. No se ha enviado ningún enlace.');
        setMessage('Solicitud recibida. Si la cuenta existe, recibirás instrucciones por correo.');
        return;
      }
      if (mode === 'reset_password') {
        setMessage('Contraseña actualizada. Ya puedes iniciar sesión con ella.');
        setPassword('');
        setPasswordConfirmation('');
        setResetToken('');
        setMode('login');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      const validToken = typeof data?.token === 'string' && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(data.token);
      const validUser = data?.user && (typeof data.user.id === 'string' || typeof data.user.id === 'number') &&
        String(data.user.id).length > 0 && typeof data.user.email === 'string' && data.user.email.includes('@');
      if (!validToken || !validUser) throw new Error('El servidor no ha confirmado una sesión válida. Puedes continuar en modo privado local.');
      setSession(data.token, { id: String(data.user.id), email: data.user.email });
      hapticTick();
    } catch (caught) {
      if (!mounted.current || activeRequest.current !== controller) return;
      hapticError();
      setError(controller.signal.aborted ? 'El servidor tarda demasiado en responder. Vuelve a probar o continúa en modo privado local.'
        : caught instanceof TypeError ? 'No se ha podido conectar. Puedes continuar en modo privado local sin conexión.'
        : caught instanceof Error ? caught.message : 'No se pudo completar el acceso. Vuelve a intentarlo.');
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current && activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  function enterLocal() {
    cancelRequest();
    setError(null);
    try {
      setSession('local-session', { id: 'local_user', email: 'modo_privado@dispositivo.local' });
      hapticSelect();
    } catch {
      setError('El navegador no permite guardar la sesión. Habilita el almacenamiento de este sitio y vuelve a probar.');
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-story" aria-label="Un espacio para conocerte">
        <p className="auth-eyebrow">CONOCERTE. CUIDARTE. A TU RITMO.</p>
        <p className="auth-statement">Tu cuerpo cambia.<br/>Tu espacio<br/><em>permanece.</em></p>
        <p className="auth-story-copy">Una forma tranquila de seguir tu ciclo y escuchar cómo te sientes. Sin exigencias, un día a la vez.</p>
        <ul className="auth-benefits"><li><BookOpen size={19}/>Tu historia, en un solo lugar</li><li><Heart size={19}/>Cuidados para cada momento</li><li><ShieldCheck size={19}/>Tú decides qué registrar y compartir</li></ul>
      </aside>
      <div className="auth-form-panel">
        <div className="auth-brand brand">
          <span className="brand-symbol" aria-hidden="true">a</span>
          <span>Aura<span className="brand-dot">.</span></span>
        </div>
        <h1 className="mb-2 text-2xl font-semibold leading-tight">
          {mode === 'login' ? 'Tu espacio de cuidado' : mode === 'signup' ? 'Crea tu cuenta' : mode === 'reset_password' ? 'Elige una nueva contraseña' : 'Recuperar acceso'}
        </h1>
        <p className="mb-7 text-sm leading-relaxed text-[#52655F]">
          {mode === 'login' ? 'Entra con tu cuenta o continúa en privado en este dispositivo.'
            : mode === 'signup' ? 'Registra tu ciclo y conserva tu información bajo tu control.'
            : mode === 'reset_password' ? 'Crea una contraseña nueva para volver a entrar en Aura.'
            : 'Te enviaremos un enlace de un solo uso si existe una cuenta con ese correo.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading}>
          {mode !== 'reset_password' && <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">Correo electrónico</label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-5 text-[#52655F]" />
              <input id="auth-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nombre@correo.com" className={fieldClass} />
            </div>
          </div>}
          {mode !== 'forgot_password' && (
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 size-5 text-[#52655F]" />
                <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' || mode === 'reset_password' ? 'new-password' : 'current-password'} required
                  minLength={mode === 'signup' ? 12 : undefined} value={password} onChange={e => setPassword(e.target.value)}
                  aria-describedby={mode === 'signup' ? 'password-help' : undefined} className={fieldClass} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}
                  className="absolute right-0.5 top-0.5 flex size-11 items-center justify-center rounded-lg text-[#52655F] focus-visible:outline-2 focus-visible:outline-[#176B60]">
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {(mode === 'signup' || mode === 'reset_password') && <p id="password-help" className="mt-2 text-xs text-[#52655F]">Usa al menos 12 caracteres. Se admiten espacios.</p>}
            </div>
          )}
          {mode === 'reset_password' && <div>
            <label htmlFor="auth-password-confirmation" className="mb-1.5 block text-sm font-medium">Repite la contraseña</label>
            <input id="auth-password-confirmation" name="passwordConfirmation" type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} className={fieldClass} />
          </div>}
          {error && <div role="alert" className="flex gap-2 rounded-lg border border-[#D9A7AF] bg-[#FFF1F3] p-3 text-sm text-[#8B2339]">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p className="min-w-0 break-words">{error}</p>
          </div>}
          {message && <p role="status" className="rounded-lg border border-[#A5B6B0] bg-white p-3 text-sm text-[#176B60]">{message}</p>}
          <button type="submit" disabled={isLoading} className={`${buttonClass} flex w-full items-center justify-center gap-2 bg-[#176B60] text-white hover:bg-[#125449]`}>
            {isLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="size-4" />}
            {isLoading ? 'Comprobando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset_password' ? 'Guardar contraseña' : 'Solicitar recuperación'}
          </button>
        </form>

        <div className="my-6 border-t border-[#CDD7D2]" />
        <button type="button" onClick={enterLocal} className={`${buttonClass} flex w-full items-center justify-center gap-2 border border-[#A5B6B0] bg-white text-[#176B60] hover:bg-[#EAF2EF]`}>
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0" /><span>Continuar en modo privado local</span>
        </button>
        <p className="mt-3 text-xs leading-relaxed text-[#52655F]">Sin cuenta ni conexión. Los datos quedan en este navegador; conserva una copia desde Ajustes.</p>
        <nav aria-label="Opciones de acceso" className="mt-5 flex flex-col items-start gap-1">
          {mode === 'login' ? <>
            <button type="button" onClick={() => switchMode('forgot_password')} className={`${buttonClass} -ml-4 text-[#52655F] hover:underline`}>¿Olvidaste tu contraseña?</button>
            <button type="button" onClick={() => switchMode('signup')} className={`${buttonClass} -ml-4 text-[#176B60] hover:underline`}>Crear una cuenta</button>
          </> : <button type="button" onClick={() => switchMode('login')} className={`${buttonClass} -ml-4 flex items-center gap-2 text-[#176B60] hover:underline`}>
            <ArrowLeft aria-hidden="true" className="size-4" />Volver a iniciar sesión
          </button>}
        </nav>
      </div>
    </main>
  );
}
