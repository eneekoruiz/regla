import { ModalFrame } from './ModalFrame';
import { ShieldCheck, Heart, Sparkles, Droplet, Activity } from 'lucide-react';

interface HealthInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HealthInfoModal({ isOpen, onClose }: HealthInfoModalProps) {
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Guía de salud"
    footer={<button type="button" onClick={onClose} className="aura-button primary">Entendido</button>}>
    {/* Phase 1: Menstrual */}
    <div className="p-3.5 rounded-lg bg-[var(--rose-soft)] border border-[var(--border-subtle)] space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
        <Droplet className="w-3.5 h-3.5 fill-current" />
        <span>1. Fase Menstrual (Días 1-5 aprox)</span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
        Tus niveles de estrógeno y progesterona están en su punto más bajo. El cuerpo renueva el endometrio. La energía es introspectiva y pide descanso, alimentos tibios y calor suave en la pelvis.
      </p>
    </div>

    {/* Phase 2: Follicular */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
        <Sparkles className="w-3.5 h-3.5" />
        <span>2. Fase Folicular (Días 6-13 aprox)</span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
        Los estrógenos comienzan a subir. La mente gana claridad, tu piel se ilumina y tu energía aumenta. Es un momento ideal para proyectos creativos, ejercicios dinámicos y socialización.
      </p>
    </div>

    {/* Phase 3: Ovulation */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
        <Sparkles className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <span>3. Fase Ovulatoria (Ventana Fértil)</span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
        Pico máximo de estrógeno y liberación del óvulo. El moco cervical se vuelve transparente y elástico (tipo clara de huevo). Tu fuerza muscular y libido suelen estar en su punto más alto.
      </p>
    </div>

    {/* Phase 4: Luteal */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
        <Heart className="w-3.5 h-3.5" />
        <span>4. Fase Lútea (Días 15-28 aprox)</span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
        La progesterona toma el control para sostener el cuerpo. Es habitual sentir necesidad de ralentizar, enfocar la atención en tareas minuciosas y cuidar la hidratación para reducir el síndrome premenstrual.
      </p>
    </div>

    {/* SOP / PCOS Section */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
        <Activity className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        <span>Síndrome de Ovario Poliquístico (SOP)</span>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
        Si tus ciclos son irregulares o varían más de 7 días entre meses, activa el <b>Modo SOP</b> en Ajustes. Esto adapta los algoritmos para evitar generar ansiedad con falsas alarmas de retraso.
      </p>
    </div>

    {/* Ethics & Privacy */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] text-[var(--text-secondary)] space-y-1">
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
        <span>Compromiso Ético y Privacidad 100% Local</span>
      </div>
      <p className="text-[13px] leading-snug">
        Tus registros de salud no se venden ni se envían a servidores de publicidad. En modo privado, la información se guarda en este dispositivo.
      </p>
    </div>
  </ModalFrame>;
}
