import { useState } from 'react';
import { Apple, Dumbbell, Brain } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { CyclePhase } from '../../types/cycle';
import { hapticSelect } from '../../utils/haptics';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalSelected, modalUnselected, modalSecondaryButton } from './modalStyles';

interface CycleSyncingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: CyclePhase;
}

export function CycleSyncingModal({ isOpen, onClose, initialPhase }: CycleSyncingModalProps) {
  const { currentDayInfo, hasEnoughData } = useCycle();
  const [selectedPhase, setSelectedPhase] = useState<CyclePhase>(initialPhase || currentDayInfo.phase || 'menstrual');
  const phaseDetails: Record<CyclePhase, {
    title: string;
    hormoneState: string;
    nutrition: string[];
    fitness: string[];
    mindset: string[];
  }> = {
    menstrual: {
      title: 'Fase Menstrual (Regla)',
      hormoneState: 'Estrógenos y progesterona en niveles basales (renovación celular y descanso).',
      nutrition: [
        'Alimentos ricos en hierro hemo y no hemo (lentejas, espinacas, carnes magras).',
        'Caldos calientes de huesos o verduras con jengibre y cúrcuma (antiinflamatorios).',
        'Frutos rojos ricos en antioxidantes y vitamina C para fijar el hierro.',
        'Evitar sal en exceso para prevenir hinchazón y retención de líquidos.'
      ],
      fitness: [
        'Priorizar el descanso reparador en los dos primeros días.',
        'Caminatas suaves al aire libre y estiramientos miofasciales.',
        'Yin yoga o movilidad pélvica para descomprimir la zona sacrolumbar.',
        'Evitar entrenamientos HIIT extenuantes que sobrecarguen el cortisol.'
      ],
      mindset: [
        'Tiempo para reflexionar, bajar el ritmo y escuchar el cuerpo.',
        'Foco en mimarse y planificar sin presiones.'
      ]
    },
    follicular: {
      title: 'Fase Folicular (Energía y Foco)',
      hormoneState: 'La FSH y los estrógenos suben de forma continua (vitalidad, concentración y fuerza).',
      nutrition: [
        'Alimentos fermentados (kéfir, chucrut, kimchi) para la microbiota intestinal.',
        'Proteínas magras (pescado azul, huevos, tofu) para la construcción celular.',
        'Semillas de lino y calabaza (apoyo al estrógeno saludable - Seed Cycling).',
        'Verduras crucíferas (brócoli, coliflor) que apoyan la metabolización hepática.'
      ],
      fitness: [
        'Comienza el pico de energía: ideal para levantamiento de pesas con progresión.',
        'Entrenamientos dinámicos, crossfit moderado o correr.',
        'Excelente capacidad aeróbica y rápida recuperación muscular.'
      ],
      mindset: [
        'Máxima neuroplasticidad y creatividad: ideal para aprender destrezas nuevas.',
        'Inicio de proyectos, reuniones de estrategia y brainstormings.'
      ]
    },
    ovulation: {
      title: 'Fase Ovulatoria (Ventana Fértil)',
      hormoneState: 'Pico máximo de estrógeno y LH. Días de mayor fecundidad.',
      nutrition: [
        'Comidas digestivas y ligeras con alto contenido en agua.',
        'Alimentos ricos en zinc y selenio (mariscos, frutos secos, semillas).',
        'Antioxidantes potentes para proteger el folículo maduro (bayas, té verde).',
        'Hidratación abundante para favorecer la calidad del moco cervical.'
      ],
      fitness: [
        '¡Tu punto álgido de fuerza muscular! Excelente para marcas personales (PR).',
        'HIIT de alta intensidad, sprint y levantamientos pesados.',
        'Atención a la estabilidad articular (la laxitud ligamentosa es mayor).'
      ],
      mindset: [
        'Máxima elocuencia, sociabilidad y magnetismo en conversaciones.',
        'Momento perfecto para presentaciones públicas, citas o negociaciones.'
      ]
    },
    luteal: {
      title: 'Fase Lútea (Calma y Progesterona)',
      hormoneState: 'La progesterona es la hormona reina (aumenta la temperatura y el gasto calórico basal).',
      nutrition: [
        'El metabolismo gasta 150-250 kcal más al día: añade carbohidratos complejos (boniato, avena, calabaza).',
        'Magnesio y vitamina B6 (chocolate negro >85%, plátano, semillas de girasol).',
        'Reduce el café y la cafeína si notas irritabilidad, dolor mamario o insomnio.',
        'Infusiones de melisa o manzanilla antes de dormir.'
      ],
      fitness: [
        'Pilates con control, yoga restaurativo y natación suave.',
        'Fuerza moderada con descansos más largos entre series.',
        'Evita entrenamientos extremos que eleven excesivamente el cortisol.'
      ],
      mindset: [
        'Orientada al detalle, ordenar el espacio y cerrar tareas pendientes.',
        'Aprender a poner límites amables y proteger tu descanso nocturno.'
      ]
    }
  };


  const currentInfo = phaseDetails[selectedPhase];
  const tabLabels: Record<CyclePhase, string> = { menstrual: 'Regla', follicular: 'Folicular', ovulation: 'Ovulación', luteal: 'Lútea' };
  const sections = [
    { title: 'Nutrición', icon: Apple, items: currentInfo.nutrition },
    { title: 'Actividad física', icon: Dumbbell, items: currentInfo.fitness },
    { title: 'Bienestar', icon: Brain, items: currentInfo.mindset }
  ];
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Guía de fases"
    footer={<button type="button" onClick={onClose} className={modalSecondaryButton}>Cerrar</button>}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Fases del ciclo">
      {(Object.keys(tabLabels) as CyclePhase[]).map(phase => <button type="button" key={phase} aria-pressed={selectedPhase === phase} onClick={() => { hapticSelect(); setSelectedPhase(phase); }} className={`${modalChoice} ${selectedPhase === phase ? modalSelected : modalUnselected}`}>
        <span className="block font-semibold">{tabLabels[phase]}</span>
        {hasEnoughData && currentDayInfo.phase === phase && <span className="block text-[13px]">Estimada hoy</span>}
      </button>)}
    </div>
    <section className="space-y-2" aria-label={currentInfo.title}>
      <h3 className="text-base font-semibold">{currentInfo.title}</h3>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{currentInfo.hormoneState}</p>
    </section>
    {sections.map(({ title, icon: Icon, items }) => <section key={title} className="space-y-3 border-t border-[var(--border-subtle)] pt-4" aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon size={18} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />{title}</h3>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">{items.map(item => <li key={item}>{item}</li>)}</ul>
    </section>)}
  </ModalFrame>;
}
