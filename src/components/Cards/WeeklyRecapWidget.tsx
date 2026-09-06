import { useMemo } from "react";
import { CalendarDays, TrendingUp } from "lucide-react";
import { useCycle } from "../../hooks/useCycle";
import { formatDateKey, parseDateKey } from "../../utils/dateKey";

/**
 * Mejora 5: Widget "Esta semana en tu ciclo".
 * Muestra un resumen de la semana anterior (ultimos 7 dias).
 */
export function WeeklyRecapWidget() {
  const { logs, todayDate, currentDayInfo, hasEnoughData } = useCycle();

  const recap = useMemo(() => {
    const today = parseDateKey(todayDate);
    const days: string[] = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(formatDateKey(d));
    }
    let periodDays = 0;
    const symptomCount: Record<string, number> = {};
    let loggedDays = 0;
    for (const dk of days) {
      const log = logs[dk];
      if (!log) continue;
      loggedDays++;
      if (log.isPeriod) periodDays++;
      for (const s of log.symptoms || []) {
        symptomCount[s.name] = (symptomCount[s.name] || 0) + 1;
      }
    }
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    return { periodDays, topSymptoms, loggedDays };
  }, [logs, todayDate]);

  if (!hasEnoughData || recap.loggedDays === 0) return null;

  const phase = hasEnoughData ? currentDayInfo.phaseName : "";

  return (
    <section className="weekly-recap-widget" aria-label="Resumen de la semana">
      <div className="weekly-recap-header">
        <CalendarDays size={15} aria-hidden="true" />
        <span>Tu semana en el ciclo</span>
      </div>
      <div className="weekly-recap-body">
        {recap.periodDays > 0 && (
          <div className="weekly-recap-chip period">
            ?? {recap.periodDays} {recap.periodDays === 1 ? "dia de regla" : "dias de regla"}
          </div>
        )}
        {phase && (
          <div className="weekly-recap-chip phase">
            <TrendingUp size={12} />
            Fase actual: <strong>{phase.toLowerCase()}</strong>
          </div>
        )}
        {recap.topSymptoms.length > 0 && (
          <div className="weekly-recap-symptoms">
            <span className="weekly-recap-symptoms-label">Sintomas frecuentes</span>
            <ul>
              {recap.topSymptoms.map((s) => (
                <li key={s.name}>
                  {s.name}
                  {s.count > 1 && <span className="weekly-recap-count">{s.count}&times;</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recap.loggedDays < 5 && (
          <p className="weekly-recap-hint">
            Llevas {recap.loggedDays} de 7 dias registrados. Cuantos mas dias apuntes, mas precisas seran tus previsiones.
          </p>
        )}
      </div>
    </section>
  );
}
