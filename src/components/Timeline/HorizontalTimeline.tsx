import { useEffect, useRef } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { DayPill } from './DayPill';

export function HorizontalTimeline() {
  const { timelineDays, selectedDate, setSelectedDate } = useCycle();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = container.current;
    const selected = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !selected) return;
    strip.scrollTo({ left: selected.offsetLeft - strip.clientWidth / 2 + selected.clientWidth / 2, behavior: 'instant' });
  }, [selectedDate]);
  return <div ref={container} className="timeline-strip" role="group" aria-label="Seleccionar día">{timelineDays.map(day => <DayPill key={day.date} day={day} onSelect={setSelectedDate}/>)}</div>;
}
