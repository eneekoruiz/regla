import { useState } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { SymptomChips } from './SymptomChips';
import { SymptomPickerModal } from '../Modals/SymptomPickerModal';

export function CycleStatusCard() {
  const { currentDayInfo, selectedDate, logSymptom, removeSymptom, hasEnoughData } = useCycle();
  const [pickerOpen, setPickerOpen] = useState(false);
  return <section className="min-w-0 space-y-4 text-[#22312F]">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold">{hasEnoughData ? `Día ${currentDayInfo.dayOfCycle} · ${currentDayInfo.phaseName}` : 'Registro diario'}</h3>
      <span className="text-sm text-[#566661]">{currentDayInfo.symptoms.length} síntomas</span>
    </div>
    <SymptomChips symptoms={currentDayInfo.symptoms} onToggleSymptom={symptom => logSymptom(selectedDate, symptom)} onRemove={id => removeSymptom(selectedDate, id)} onOpenPicker={() => setPickerOpen(true)} />
    {pickerOpen && <SymptomPickerModal key={selectedDate} isOpen onClose={() => setPickerOpen(false)} currentSymptoms={currentDayInfo.symptoms} onToggleSymptom={symptom => {
      if (currentDayInfo.symptoms.some(item => item.id === symptom.id)) removeSymptom(selectedDate, symptom.id);
      else logSymptom(selectedDate, symptom);
    }} />}
  </section>;
}
