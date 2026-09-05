import { FlaskConical } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';

export function BiomarkersCard() {
  const { selectedDate, logs } = useCycle();
  const data = logs[selectedDate]?.biomarkers;
  if (!data) return null;
  const labels = { progesterone: 'Progesterona', estradiol: 'Estradiol', lh: 'Hormona luteinizante (LH)', fsh: 'Hormona foliculoestimulante (FSH)', amh: 'Antimülleriana (AMH)', betaHcg: 'Beta-hCG' } as const;
  const entries: { label: string; value: string }[] = Object.entries(labels).flatMap(([key, label]) => {
    const result = data[key as keyof typeof labels];
    return result && Number.isFinite(result.value) ? [{ label, value: `${result.value} ${result.unit}` }] : [];
  });
  if (data.bbt !== undefined && Number.isFinite(data.bbt)) entries.push({ label: 'Temperatura basal', value: `${data.bbt} °C` });
  if (!entries.length) return null;
  return <section className="diary-section" aria-labelledby="biomarkers-title">
    <div className="section-heading"><h2 id="biomarkers-title">Tus analíticas</h2><FlaskConical size={19}/></div>
    <dl className="biomarker-list">{entries.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    <p className="muted-note">La interpretación depende del laboratorio, la fase del ciclo y tu historia clínica. Revisa los resultados con tu profesional de salud.</p>
  </section>;
}
