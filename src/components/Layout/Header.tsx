import { BookOpen, CalendarDays, Grid2X2, Settings, Moon, Sun, MessageCircle, ShieldCheck, Download, CheckCircle2, WifiOff } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useSyncExternalStore } from 'react';
import { useCycle } from '../../hooks/useCycle';

export type AppView = 'diary' | 'calendar' | 'tools';

const systemTheme = typeof window !== 'undefined' && 'matchMedia' in window
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;
const subscribeTheme = (onChange: () => void) => {
  if (!systemTheme) return () => {};
  if (typeof systemTheme.addEventListener === 'function') {
    systemTheme.addEventListener('change', onChange);
    return () => systemTheme.removeEventListener('change', onChange);
  } else if (typeof (systemTheme as any).addListener === 'function') {
    (systemTheme as any).addListener(onChange);
    return () => (systemTheme as any).removeListener(onChange);
  }
  return () => {};
};


export function Header({ view, onChangeView, onOpenChat, onInstall, online = true }: {
  view: AppView;
  onChangeView: (view: AppView) => void;
  onOpenChat: () => void;
  onInstall: () => void;
  online?: boolean;
}) {
  const { installed } = usePwaInstall();
  const { setIsSettingsOpen, settings, updateSettings } = useCycle();
  const systemDark = useSyncExternalStore(subscribeTheme, () => systemTheme?.matches ?? false);
  const dark = settings.theme === 'dark' || settings.theme === 'refugio' || (settings.theme === 'system' && systemDark);
  const items = [
    { id: 'diary' as const, label: 'Mi diario', icon: BookOpen },
    { id: 'calendar' as const, label: 'Calendario', icon: CalendarDays },
    { id: 'tools' as const, label: 'Herramientas', icon: Grid2X2 },
  ];
  return <header className="app-navigation">
    <a href="#main-content" className="skip-link">Ir al contenido</a>
    <button className="brand" type="button" onClick={() => onChangeView('diary')} aria-label="Aura, ir a mi diario">
      <span className="brand-symbol" aria-hidden="true">a</span>
      <span>Aura<span className="brand-dot">.</span></span>
    </button>
    <span className="brand-caption">Tu espacio de salud</span>
    <nav className="primary-navigation" aria-label="Navegación principal">
      {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onChangeView(id)} className={`navigation-item ${view === id ? 'is-active' : ''}`} aria-current={view === id ? 'page' : undefined}>
        <Icon size={20} aria-hidden="true"/><span>{label}</span>
      </button>)}
    </nav>
    <div className="navigation-bottom">
      {!installed && (
        <button
          type="button"
          className="sidebar-install-banner"
          onClick={onInstall}
          title="Instalar aplicación Aura en tu dispositivo"
        >
          <div className="sidebar-install-icon">
            <Download size={18} aria-hidden="true" />
          </div>
          <div className="sidebar-install-info">
            <strong>Instalar app</strong>
            <span>Acceso directo y sin conexión</span>
          </div>
        </button>
      )}
      <button type="button" className="navigation-item desktop-chat" onClick={onOpenChat}><MessageCircle size={20}/><span>Confidente</span></button>
      <div className="navigation-utilities">
        {!installed && (
          <button
            type="button"
            className="mobile-install-pill"
            onClick={onInstall}
            title="Instalar Aura en tu móvil"
          >
            <Download size={14} aria-hidden="true" />
            <span>Instalar app</span>
          </button>
        )}
        <button type="button" className="aura-icon-button" title={dark ? 'Tema claro' : 'Tema oscuro'} aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'} onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button>
        <button type="button" className="aura-icon-button" title="Ajustes" aria-label="Ajustes" onClick={() => setIsSettingsOpen(true)}><Settings size={20}/></button>
      </div>
      <div className="navigation-footer">
        <p className="navigation-note"><ShieldCheck size={14}/>Tu salud, bajo tu control</p>
        <span className="sidebar-connection-status" role="status">
          {online ? <CheckCircle2 size={13} style={{ color: 'var(--accent)' }}/> : <WifiOff size={13} style={{ color: 'var(--rose)' }}/>}
          <span>{online ? 'Conectado' : 'Sin conexión'}</span>
        </span>
      </div>
    </div>
  </header>;
}
