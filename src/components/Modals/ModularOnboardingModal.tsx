import { useState } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { CycleProfileData, LifestyleProfileData } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from './modalStyles';

type Category = 'cycle' | 'body' | 'lifestyle';
export function ModularOnboardingModal({ isOpen, onClose, initialCategory = null }: { isOpen: boolean; onClose: () => void; initialCategory?: Category | null }) {
  const { settings, updateProfileCategory } = useCycle();
  const [category, setCategory] = useState<Category | null>(initialCategory);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [cycle, setCycle] = useState<CycleProfileData>({
    regularity: settings.cycleProfile?.regularity ?? (settings.hasPCOS ? 'pcos' : settings.regularityPreference === 'very_regular' ? 'regular' : settings.regularityPreference ?? 'mostly_regular'),
    birthControl: settings.cycleProfile?.birthControl ?? 'none',
    takesDailyMedication: settings.cycleProfile?.takesDailyMedication ?? false,
    birthControlReason: settings.cycleProfile?.birthControlReason ?? 'contraception',
    typicalCramps: settings.cycleProfile?.typicalCramps ?? 'mild',
    cycleGoal: settings.cycleProfile?.cycleGoal ?? 'track_health'
  });
  const [body, setBody] = useState({ birthYear: settings.bodyProfile?.birthYear?.toString() ?? '', heightCm: settings.bodyProfile?.heightCm?.toString() ?? '', weightKg: settings.bodyProfile?.weightKg?.toString() ?? '' });
  const [lifestyle, setLifestyle] = useState<LifestyleProfileData>({ activityLevel: settings.lifestyleProfile?.activityLevel ?? 'moderate', stressLevel: settings.lifestyleProfile?.stressLevel ?? 'moderate', sleepHoursAvg: settings.lifestyleProfile?.sleepHoursAvg ?? 7, caffeineIntake: settings.lifestyleProfile?.caffeineIntake ?? 'low' });
  const titles = { cycle: 'Mi ciclo', body: 'Mi cuerpo', lifestyle: 'Estilo de vida' };
  const save = () => {
    if (!category) return;
    setError('');
    try {
      if (category === 'body') {
        const values = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value.trim() ? Number(value.replace(',', '.')) : undefined]));
        const { birthYear, heightCm, weightKg } = values;
        if ((birthYear !== undefined && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear())) ||
          (heightCm !== undefined && (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250)) ||
          (weightKg !== undefined && (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400))) {
          setError('Revisa el año de nacimiento, la altura (50 a 250 cm) y el peso (20 a 400 kg).'); return;
        }
        updateProfileCategory('body', values);
      } else if (category === 'cycle') updateProfileCategory('cycle', cycle);
      else updateProfileCategory('lifestyle', lifestyle);
      setSaved(titles[category] + ': cambios guardados.'); setCategory(null);
    } catch { setError('No se ha guardado el perfil. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} title={category ? titles[category] : 'Tu perfil'}
    footer={category ? <><button type="button" onClick={() => { setCategory(null); setError(''); }} className={modalSecondaryButton}><ArrowLeft size={17} aria-hidden="true" />Volver</button><button type="button" onClick={save} className={modalPrimaryButton}><Check size={17} aria-hidden="true" />Guardar cambios</button></> : <button type="button" onClick={onClose} className={modalPrimaryButton}>Listo</button>}>
    {!category && <div className="space-y-2">{(['cycle', 'body', 'lifestyle'] as const).map(value => <button key={value} type="button" onClick={() => { setCategory(value); setSaved(''); }} className="aura-button w-full justify-between"><span>{titles[value]}</span>{settings.completedOnboardingCategories?.includes(value) ? <Check size={18} aria-label="Completado" /> : <ChevronRight size={18} aria-hidden="true" />}</button>)}</div>}
    {category === 'cycle' && <div className="space-y-4">
      <label className="block space-y-2 text-sm">Regularidad<select className={modalField} value={cycle.regularity} onChange={event => setCycle(value => ({ ...value, regularity: event.target.value as CycleProfileData['regularity'] }))}><option value="regular">Regular</option><option value="mostly_regular">Bastante regular</option><option value="irregular">Irregular</option><option value="pcos">SOP diagnosticado</option></select></label>
      <label className="block space-y-2 text-sm">Anticonceptivo<select className={modalField} value={cycle.birthControl} onChange={event => setCycle(value => ({ ...value, birthControl: event.target.value as CycleProfileData['birthControl'] }))}>{[['none', 'Ninguno'], ['pill', 'Píldora'], ['iud_hormonal', 'DIU hormonal'], ['iud_copper', 'DIU de cobre'], ['implant', 'Implante'], ['condom', 'Preservativo'], ['other', 'Otro']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block space-y-2 text-sm">Motivo del anticonceptivo<select className={modalField} value={cycle.birthControlReason} onChange={event => setCycle(value => ({ ...value, birthControlReason: event.target.value as CycleProfileData['birthControlReason'] }))}>{[['contraception', 'Anticoncepción'], ['pcos', 'SOP'], ['endometriosis', 'Endometriosis'], ['acne', 'Acné'], ['heavy_bleeding', 'Sangrado abundante'], ['other', 'Otro']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={cycle.takesDailyMedication} onChange={event => setCycle(value => ({ ...value, takesDailyMedication: event.target.checked }))} className="h-5 w-5 accent-[var(--accent)]" />Tomo medicación diaria</label>
      <label className="block space-y-2 text-sm">Cólicos habituales<select className={modalField} value={cycle.typicalCramps} onChange={event => setCycle(value => ({ ...value, typicalCramps: event.target.value as CycleProfileData['typicalCramps'] }))}>{[['none', 'Ninguno'], ['mild', 'Leves'], ['moderate', 'Moderados'], ['severe', 'Intensos']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block space-y-2 text-sm">Objetivo<select className={modalField} value={cycle.cycleGoal} onChange={event => setCycle(value => ({ ...value, cycleGoal: event.target.value as CycleProfileData['cycleGoal'] }))}><option value="track_health">Conocer mi ciclo</option><option value="prevent_pregnancy">Evitar embarazo</option><option value="trying_to_conceive">Buscar embarazo</option></select></label>
    </div>}
    {category === 'body' && <div className="space-y-4">{([['birthYear', 'Año de nacimiento'], ['heightCm', 'Altura (cm)'], ['weightKg', 'Peso (kg)']] as const).map(([key, label]) => <label key={key} className="block space-y-2 text-sm">{label} (opcional)<input inputMode={key === 'birthYear' ? 'numeric' : 'decimal'} value={body[key]} onChange={event => setBody(value => ({ ...value, [key]: event.target.value }))} className={modalField} /></label>)}</div>}
    {category === 'lifestyle' && <div className="space-y-4">
      <label className="block space-y-2 text-sm">Actividad física<select value={lifestyle.activityLevel} onChange={event => setLifestyle(value => ({ ...value, activityLevel: event.target.value as LifestyleProfileData['activityLevel'] }))} className={modalField}>{[['sedentary', 'Baja'], ['moderate', 'Moderada'], ['active', 'Activa'], ['athlete', 'Deportiva intensa']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block space-y-2 text-sm">Estrés habitual<select value={lifestyle.stressLevel} onChange={event => setLifestyle(value => ({ ...value, stressLevel: event.target.value as LifestyleProfileData['stressLevel'] }))} className={modalField}><option value="low">Bajo</option><option value="moderate">Moderado</option><option value="high">Alto</option></select></label>
      <label className="block space-y-2 text-sm">Sueño habitual: {lifestyle.sleepHoursAvg} horas<input type="range" min={0} max={16} step={0.5} value={lifestyle.sleepHoursAvg} onChange={event => setLifestyle(value => ({ ...value, sleepHoursAvg: Number(event.target.value) }))} className="block min-h-11 w-full accent-[var(--accent)]" /></label>
      <label className="block space-y-2 text-sm">Cafeína<select value={lifestyle.caffeineIntake} onChange={event => setLifestyle(value => ({ ...value, caffeineIntake: event.target.value as LifestyleProfileData['caffeineIntake'] }))} className={modalField}>{[['none', 'Ninguna'], ['low', 'Poca'], ['moderate', 'Moderada'], ['high', 'Alta']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>}
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    {saved && <p role="status" className="text-sm text-[var(--accent)]">{saved}</p>}
  </ModalFrame>;
}
