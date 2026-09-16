import { CalendarDays, Grid2X2, Settings, Download, ShieldCheck } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useCycle } from '../../hooks/useCycle';
export type AppView = 'diary' | 'calendar' | 'tools';
export function Header({ onChangeView, onInstall }: {
  view: AppView; onChangeView: (view: AppView) => void; onOpenChat: () => void; onInstall: () => void;
}) {
  const { installed } = usePwaInstall();
  const { setIsSettingsOpen } = useCycle();
  return <header className="studio-header">
    <a href="#main-content" className="skip-link">Ir al contenido</a>
    <button className="brand" type="button" onClick={() => onChangeView('diary')} aria-label="Aura, ir a mi diario"><span className="brand-symbol" aria-hidden="true">a</span><span>Aura<span className="brand-dot">.</span></span></button>
    <span className="studio-promise"><ShieldCheck size={14}/>Privada. Gratuita. Tuya.</span>
    <nav className="studio-actions" aria-label="Navegación principal">
      <button type="button" className="aura-icon-button" aria-label="Calendario" title="Calendario" onClick={() => onChangeView('calendar')}><CalendarDays size={19}/></button>
      <button type="button" className="aura-icon-button" aria-label="Herramientas" title="Herramientas" onClick={() => onChangeView('tools')}><Grid2X2 size={19}/></button>
      {!installed && <button type="button" className="aura-icon-button install-action" aria-label="Instalar Aura" title="Instalar Aura" onClick={onInstall}><Download size={19}/></button>}
      <button type="button" className="aura-icon-button" aria-label="Ajustes" title="Ajustes" onClick={() => setIsSettingsOpen(true)}><Settings size={19}/></button>
    </nav>
  </header>;
}
