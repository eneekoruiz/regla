import type { FlowIntensity } from '../types/cycle';

export const getPeriodGradientClass = (flow?: FlowIntensity, isSelected?: boolean, isRefugio?: boolean) => {
  const f = flow || 'medium';

  // Modo Refugio / Camuflaje: Oculta los colores rojos por tonos neutros e inofensivos
  if (isRefugio) {
    if (isSelected) return 'bg-gradient-to-br from-indigo-400 to-indigo-500 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50';
    return 'bg-gradient-to-b from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/30';
  }

  if (isSelected) {
    switch (f) {
      case 'spotting': return 'bg-gradient-to-br from-rose-300 to-rose-400 text-white shadow-lg shadow-rose-300/40 border border-rose-200/50';
      case 'light': return 'bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-lg shadow-rose-400/40 border border-rose-300/50';
      case 'medium': return 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/40 border border-rose-400/50';
      case 'heavy': return 'bg-gradient-to-br from-rose-700 to-rose-800 text-white shadow-lg shadow-rose-700/40 border border-rose-600/50';
      case 'very_heavy': return 'bg-gradient-to-br from-rose-900 to-rose-950 text-rose-100 shadow-lg shadow-rose-900/40 border border-rose-800/50';
    }
  } else {
    // Unselected - Subtle elegant gradients that don't look like literal blood
    switch (f) {
      case 'spotting': return 'bg-gradient-to-b from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 text-rose-500 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30';
      case 'light': return 'bg-gradient-to-b from-rose-100 to-rose-200/60 dark:from-rose-900/40 dark:to-rose-900/30 text-rose-600 dark:text-rose-300 border border-rose-300/50 dark:border-rose-800/50';
      case 'medium': return 'bg-gradient-to-b from-rose-200 to-rose-300/70 dark:from-rose-800/50 dark:to-rose-800/40 text-rose-700 dark:text-rose-200 border border-rose-400/50 dark:border-rose-700/50';
      case 'heavy': return 'bg-gradient-to-b from-rose-300 to-rose-400/80 dark:from-rose-700/60 dark:to-rose-700/50 text-rose-800 dark:text-rose-100 border border-rose-500/50 dark:border-rose-600/50';
      case 'very_heavy': return 'bg-gradient-to-b from-rose-400 to-rose-600/90 dark:from-rose-600/80 dark:to-rose-600/70 text-white border border-rose-600/50 dark:border-rose-500/50';
    }
  }
  return '';
};
