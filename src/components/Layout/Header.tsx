import { BookOpen, CalendarDays, Grid2X2, Settings, Moon, Sun, MessageCircle, ShieldCheck, Download } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useSyncExternalStore } from 'react';
import { useCycle } from '../../hooks/useCycle';

export type AppView = 'diary' | 'calendar' | 'tools';

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const subscribeTheme = (onChange: () => void) => {
  systemTheme.addEventListener('change', onChange);
  return () => systemTheme.removeEventListener('change', onChange);
};

export function Header({ view, onChangeView, onOpenChat, onInstall }: {
  view: AppView;
  onChangeView: (view: AppView) => void;
  onOpenChat: () => void;
  onInstall: () => void;
}) {
  const { installed } = usePwaInstall();
  const { setIsSettingsOpen, settings, updateSettings } = useCycle();
  const systemDark = useSyncExternalStore(subscribeTheme, () => systemTheme.matches);
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
      <button type="button" className="navigation-item desktop-chat" onClick={onOpenChat}><MessageCircle size={20}/><span>Confidente</span></button>
      <div className="navigation-utilities">
        {!installed && <button type="button" className="aura-icon-button" title="Instalar Aura" aria-label="Instalar Aura" onClick={onInstall}><Download size={19}/></button>}
        <button type="button" className="aura-icon-button" title={dark ? 'Tema claro' : 'Tema oscuro'} aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'} onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button>
        <button type="button" className="aura-icon-button" title="Ajustes" aria-label="Ajustes" onClick={() => setIsSettingsOpen(true)}><Settings size={20}/></button>
      </div>
      <p className="navigation-note"><ShieldCheck size={15}/>Tu salud, bajo tu control</p>
    </div>
  </header>;
}
