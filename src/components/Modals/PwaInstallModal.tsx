import { CheckCircle2, Download, PlusSquare, Share, Smartphone } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { ModalFrame } from './ModalFrame';

export function PwaInstallModal({ onClose }: { onClose: () => void }) {
  const { installed, canPrompt, pending, error, isIos, install } = usePwaInstall();
  return <ModalFrame isOpen onClose={onClose} title="Aura, más cerca de ti" description="Un acceso directo a tu diario desde la pantalla de inicio." closeDisabled={pending}
    footer={<button type="button" className="aura-button primary" disabled={pending} onClick={canPrompt && !installed ? () => void install() : onClose}>{canPrompt && !installed ? <><Download size={18}/>{pending ? 'Abriendo instalación…' : 'Instalar Aura'}</> : 'Entendido'}</button>}>
    <div className="install-intro"><span className="install-symbol"><Smartphone size={30}/></span><p>Tu ciclo, tus notas y tus cuidados. A mano, también sin conexión después de la primera carga.</p></div>
    {installed ? <p className="install-success" role="status"><CheckCircle2 size={20}/>Aura ya está instalada en este dispositivo.</p> : !canPrompt && <>
      <p className="muted-note">{isIos ? 'En Safari, sigue estos pasos:' : 'Si tu navegador permite instalar aplicaciones:'}</p>
      <ol className="install-steps">
        <li><Share size={20}/><span>{isIos ? 'Abre el menú Compartir del navegador.' : 'Abre el menú del navegador.'}</span></li>
        <li><PlusSquare size={20}/><span>{isIos ? 'Elige «Añadir a la pantalla de inicio».' : 'Busca «Instalar Aura» o «Añadir a la pantalla de inicio».'}</span></li>
        <li><CheckCircle2 size={20}/><span>Confirma en «Añadir» o «Instalar».</span></li>
      </ol>
      <p className="muted-note">Si no aparece la opción, puedes seguir usando Aura desde este navegador.</p>
    </>}
    <p className="muted-note">Instalar Aura no crea una copia de seguridad. Exporta tus registros desde Ajustes para conservarlos.</p>
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
