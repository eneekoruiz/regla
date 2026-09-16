import type { CyclePhase } from '../types/cycle';
import { BIOLOGICAL_LABELS } from './biologicalMachine';

export const GUIDE_PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'] as const;
export function getCareGuide(phase: CyclePhase) {
  return {
    title: BIOLOGICAL_LABELS[phase],
    description: 'La fase es orientativa. El calendario no mide hormonas ni determina tu energía o estado de ánimo.',
    sections: [
      { title: 'Alimentación', items: ['Come de forma variada y regular, según tus necesidades.', 'Consulta antes de empezar suplementos o modificar medicación.'] },
      { title: 'Movimiento', items: [phase === 'menstrual' ? 'Si tienes molestias leves, prueba movimiento suave o calor templado protegido con una tela.' : 'Elige la actividad que te resulte cómoda hoy.', 'No hay una intensidad de ejercicio obligatoria para cada fase. Para si aparece dolor.'] },
      { title: 'Bienestar', items: ['Anota lo que sientes para observar tus propios patrones.', 'Si el dolor, el sangrado o los cambios de ánimo limitan tu día, busca apoyo profesional.'] },
    ],
  };
}
