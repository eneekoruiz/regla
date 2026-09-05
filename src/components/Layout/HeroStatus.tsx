import { ArrowRight, ChevronDown, Droplets } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { diffDays, parseDateKey } from '../../utils/dateKey';

export function HeroStatus({ onRecordPeriod, onOpenLegend }: { onRecordPeriod: () => void; onOpenLegend: () => void }) {
  const { currentDayInfo: day, upcomingMilestones, todayDate, selectedDate, cycleStats, settings, logs, hasEnoughData } = useCycle();
  const hasCycle = hasEnoughData && day.dayOfCycle > 0;
  const isRecorded = Boolean(logs[selectedDate]?.isPeriod);
  const length = Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength));
  const elapsedDays = hasCycle && selectedDate === todayDate ? diffDays(parseDateKey(cycleStats.lastVerifiedPeriodStart), parseDateKey(todayDate)) : 0;
  const awaitingPeriod = hasCycle && elapsedDays >= length && !isRecorded;
  const cycleDay = hasCycle ? awaitingPeriod ? elapsedDays + 1 : day.dayOfCycle : 0;
  const daysNext = upcomingMilestones.daysUntilNextPeriod;
  let title = hasCycle ? `Día ${cycleDay} de tu ciclo` : 'Tu primer registro';
  let copy = hasCycle ? day.phaseName : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';
  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = 'No hay un inicio de ciclo registrado para esta fecha. Tus anotaciones se guardan igualmente.';
  }
  if (hasCycle && day.isPeriod) {
    title = isRecorded ? 'En tu periodo' : 'Periodo estimado';
    copy = isRecorded ? 'Ve a tu ritmo. Aquí puedes llevar un registro de cómo te sientes.' : 'Esta fecha es una previsión. Puedes confirmar o corregir el sangrado en tu registro.';
  } else if (hasCycle && selectedDate === todayDate && typeof daysNext === 'number') {
    title = daysNext > 0 ? `Tu regla, en unos ${daysNext} días` : daysNext === 0 ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
    copy = daysNext < 0 ? 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.' : `${day.phaseName} · Día ${cycleDay} del ciclo`;
  }
  if (awaitingPeriod) {
    title = elapsedDays === length ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
    copy = elapsedDays === length ? 'La fecha es orientativa. Registra tu regla cuando empiece.' : 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.';
  }
  const progress = hasCycle ? Math.min(1, cycleDay / length) : 0;
  const estimateSource = cycleStats.totalCyclesAnalyzed > 0
    ? `Basado en ${cycleStats.totalCyclesAnalyzed} ${cycleStats.totalCyclesAnalyzed === 1 ? 'ciclo registrado' : 'ciclos registrados'}`
    : 'Basado en tus ajustes iniciales';
  const circumference = 2 * Math.PI * 58;
  return <section className={`cycle-summary${hasCycle ? '' : ' is-first-record'}`} data-phase={hasCycle && !awaitingPeriod ? day.phase : 'unknown'} aria-labelledby="cycle-title">
    <div className="cycle-summary-top">
      <div>
        {hasCycle ? <button type="button" className="phase-chip" onClick={onOpenLegend}><span className="phase-dot"/>{awaitingPeriod ? 'Ciclo en curso' : day.phaseName}<ChevronDown size={14}/><span className="sr-only"> · Entender las fases</span></button> : <p className="eyebrow"><Droplets size={15}/>Un espacio para ti</p>}
        <h2 id="cycle-title" className="cycle-headline">{title}</h2>
        <p className="cycle-copy">{copy}</p>
      </div>
      {hasCycle && <div className="cycle-ring" role="img" aria-label={`Día ${cycleDay} del ciclo; duración estimada ${length} días`}>
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border-subtle)" strokeWidth="7"/>
          <circle cx="70" cy="70" r="58" fill="none" stroke="var(--phase-ink)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${progress * circumference} ${circumference}`} transform="rotate(-90 70 70)"/>
        </svg>
        <span className="cycle-ring-label"><span>DÍA</span><strong>{cycleDay}</strong><span>de ~{length} días</span></span>
      </div>}
    </div>
    {hasCycle ? <>
      <dl className="cycle-meta"><div><dt>Ciclo estimado</dt><dd>{length} días</dd></div><div><dt>Periodo habitual</dt><dd>{Math.round(cycleStats.estimatedPeriodLength || settings.averagePeriodLength)} días</dd></div></dl>
      <p className="muted-note">{estimateSource}. Las fechas son orientativas y no sirven como método anticonceptivo.</p>
    </> : <button type="button" className="aura-button primary first-record-button" onClick={onRecordPeriod}>Registrar mi regla<ArrowRight size={17}/></button>}
  </section>;
}
