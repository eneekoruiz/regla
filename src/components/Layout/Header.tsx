import { BookOpen, CalendarDays, Grid2X2, Settings, Moon, Sun, MessageCircle, ShieldCheck, Download, CheckCircle2, WifiOff } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useSyncExternalStore } from 'react';
import { useCycle } from '../../hooks/useCycle';

export type AppView = 'diary' | 'calendar' | 'tools' | 'settings';

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
  const { isSettingsOpen, setIsSettingsOpen, settings, updateSettings } = useCycle();
  const systemDark = useSyncExternalStore(subscribeTheme, () => systemTheme?.matches ?? false);
  const dark = settings.theme === 'dark' || settings.theme === 'refugio' || (settings.theme === 'system' && systemDark);

  return (
    <>
      <header className="app-navigation">
        <a href="#main-content" className="skip-link">Ir al contenido</a>

        <div className="brand-header-area">
          <div className="brand-row">
            <button className="brand" type="button" onClick={() => onChangeView('diary')} aria-label="Aura, ir a mi diario">
              <span className="brand-symbol" aria-hidden="true">a</span>
              <span>Aura<span className="brand-dot">.</span></span>
            </button>
            <button
              type="button"
              className="brand-theme-toggle"
              title={dark ? 'Tema claro' : 'Tema oscuro'}
              aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'}
              onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
            >
              {dark ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}
            </button>
          </div>
          <span className="brand-caption">Tu espacio de salud</span>
        </div>

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

        <div className="desktop-only-nav">
          <button
            type="button"
            onClick={() => onChangeView('diary')}
            className={`navigation-item ${view === 'diary' ? 'is-active' : ''}`}
            aria-current={view === 'diary' ? 'page' : undefined}
          >
            <BookOpen size={20} aria-hidden="true"/>
            <span>Mi diario</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('calendar')}
            className={`navigation-item ${view === 'calendar' ? 'is-active' : ''}`}
            aria-current={view === 'calendar' ? 'page' : undefined}
          >
            <CalendarDays size={20} aria-hidden="true"/>
            <span>Calendario</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('tools')}
            className={`navigation-item ${view === 'tools' ? 'is-active' : ''}`}
            aria-current={view === 'tools' ? 'page' : undefined}
          >
            <Grid2X2 size={20} aria-hidden="true"/>
            <span>Herramientas</span>
          </button>

          <button
            type="button"
            className="navigation-item"
            onClick={onOpenChat}
            aria-label="Abrir Chat"
          >
            <MessageCircle size={20} aria-hidden="true"/>
            <span>Chat</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('settings')}
            className={`navigation-item ${view === 'settings' ? 'is-active' : ''}`}
            aria-current={view === 'settings' ? 'page' : undefined}
            aria-label="Ajustes de la aplicación"
          >
            <Settings size={20} aria-hidden="true"/>
            <span>Ajustes</span>
          </button>
        </div>

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
          
          <button
            type="button"
            className="brand-theme-toggle mobile-only-theme"
            style={{ display: 'none' }}
            title={dark ? 'Tema claro' : 'Tema oscuro'}
            aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'}
            onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
          >
            {dark ? <Sun size={15} aria-hidden="true"/> : <Moon size={15} aria-hidden="true"/>}
          </button>
        </div>

        <div className="navigation-bottom">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="navigation-item"
            aria-label="Abrir panel lateral de ajustes rápidos"
          >
            <Settings size={20} aria-hidden="true" />
            <span>Configuración</span>
          </button>
          
          <div className="navigation-note">
            <ShieldCheck size={16} aria-hidden="true" className="text-[var(--text-secondary)]"/>
            <span>Tus datos se guardan de forma segura y privada en este dispositivo.</span>
          </div>
          <div className="navigation-footer">
            <span className="sidebar-connection-status" role="status">
              {online ? <CheckCircle2 size={13} style={{ color: 'var(--accent)' }}/> : <WifiOff size={13} style={{ color: 'var(--rose)' }}/>}
              <span>{online ? 'Conectado' : 'Sin conexión'}</span>
            </span>
          </div>
        </div>
      </header>

      <nav className="primary-navigation" aria-label="Navegación principal">
        <button
          type="button"
          onClick={() => onChangeView('diary')}
          className={`navigation-item ${view === 'diary' ? 'is-active' : ''}`}
          aria-current={view === 'diary' ? 'page' : undefined}
        >
          <BookOpen size={20} aria-hidden="true"/>
          <span>Mi diario</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView('calendar')}
          className={`navigation-item ${view === 'calendar' ? 'is-active' : ''}`}
          aria-current={view === 'calendar' ? 'page' : undefined}
        >
          <CalendarDays size={20} aria-hidden="true"/>
          <span>Calendario</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView('tools')}
          className={`navigation-item ${view === 'tools' ? 'is-active' : ''}`}
          aria-current={view === 'tools' ? 'page' : undefined}
        >
          <Grid2X2 size={20} aria-hidden="true"/>
          <span>Herramientas</span>
        </button>

        <button
          type="button"
          className="navigation-item desktop-only-nav"
          onClick={onOpenChat}
          aria-label="Abrir Chat"
        >
          <MessageCircle size={20} aria-hidden="true"/>
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeView('settings')}
          className={`navigation-item ${view === 'settings' ? 'is-active' : ''}`}
          aria-current={view === 'settings' ? 'page' : undefined}
          aria-label="Ajustes de la aplicación"
        >
          <Settings size={20} aria-hidden="true"/>
          <span>Ajustes</span>
        </button>
      </nav>
    </>
  );
}
