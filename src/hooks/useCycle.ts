import { useContext } from 'react';
import { CycleContext } from '../context/cycle-context';

export const useCycle = () => {
  const context = useContext(CycleContext);
  if (!context) {
    throw new Error('useCycle must be used within a CycleProvider');
  }
  return context;
};
