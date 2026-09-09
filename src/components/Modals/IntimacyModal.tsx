import { useState } from 'react';
import {
  AlertCircle,
  Check,
  FileText,
  Flame,
  Heart,
  Moon,
  Pill,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/toast';
import type { IntimacyLog } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import {
  modalField,
  modalPrimaryButton,
  modalSecondaryButton,
} from './modalStyles';

const ACTIVITIES = [
  {
    id: 'none' as const,
    label: 'Sin actividad',
    desc: 'Día tranquilo o de descanso',
    icon: Moon,
    iconColor: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800/80',
    activeBorder: 'border-slate-500 dark:border-slate-400',
    activeBg: 'bg-slate-100/80 dark:bg-slate-800/50 ring-2 ring-slate-400/40',
  },
  {
    id: 'protected' as const,
    label: 'Con protección',
    desc: 'Preservativo o método de barrera',
    icon: ShieldCheck,
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    activeBorder: 'border-emerald-500 dark:border-emerald-400',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40',
  },
  {
    id: 'unprotected' as const,
    label: 'Sin protección',
    desc: 'Sin método de barrera',
    icon: Heart,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-950/70',
    activeBorder: 'border-rose-400 dark:border-rose-400',
    activeBg: 'bg-rose-50/90 dark:bg-rose-950/40 ring-2 ring-rose-400/40',
  },
  {
    id: 'masturbation' as const,
    label: 'Autoerotismo',
    desc: 'Placer y bienestar a solas',
    icon: Sparkles,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-950/70',
    activeBorder: 'border-purple-400 dark:border-purple-400',
    activeBg: 'bg-purple-50/90 dark:bg-purple-950/40 ring-2 ring-purple-400/40',
  },
  {
    id: 'other' as const,
    label: 'Otra actividad',
    desc: 'Juegos, caricias u otras prácticas íntimas',
    icon: Flame,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-950/70',
    activeBorder: 'border-amber-400 dark:border-amber-400',
    activeBg: 'bg-amber-50/90 dark:bg-amber-950/40 ring-2 ring-amber-400/40',
  },
];

const LIBIDO_LEVELS = [
  {
    id: 'low' as const,
    label: 'Bajo',
    desc: 'Tranquilo / pausado',
    icon: Moon,
    iconColor: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800/80',
    activeStyle: 'border-slate-400 bg-slate-100/90 dark:border-slate-500 dark:bg-slate-800/50 ring-2 ring-slate-400/40',
  },
  {
    id: 'normal' as const,
    label: 'Habitual',
    desc: 'Equilibrado / medio',
    icon: Heart,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    activeStyle: 'border-emerald-500 bg-emerald-50/90 dark:border-emerald-400 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/40',
  },
  {
    id: 'high' as const,
    label: 'Alto',
    desc: 'Intenso / pico',
    icon: Flame,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-950/60',
    activeStyle: 'border-rose-400 bg-rose-50/90 dark:border-rose-400 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400/40',
  },
];

export function IntimacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logs, logIntimacyForDate } = useCycle();
  const toast = useToast();
  const log = logs[selectedDate];
  const existing = log?.intimacyLog;

  const [activity, setActivity] = useState<IntimacyLog['activity']>(existing?.activity ?? 'unprotected');
  const [hadEmergencyPill, setHadEmergencyPill] = useState<boolean>(existing?.hadEmergencyPill ?? false);
  const [hadOrgasm, setHadOrgasm] = useState<boolean>(existing?.hadOrgasm ?? false);
  const [hadPain, setHadPain] = useState<boolean>(existing?.hadPain ?? false);
  const [libido, setLibido] = useState<IntimacyLog['libido']>(existing?.libido);
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');
  const [error, setError] = useState<string>('');

  const save = (remove = false) => {
    try {
      logIntimacyForDate(
        selectedDate,
        remove
          ? null
          : {
              activity,
              hadEmergencyPill,
              hadOrgasm,
              hadPain,
              libido,
              notes: notes.trim() || undefined,
            }
      );
      toast.success(remove ? 'Registro íntimo eliminado' : 'Registro íntimo guardado');
      onClose();
    } catch {
      setError('No se ha guardado el registro. Vuelve a intentarlo.');
    }
  };

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dateFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('es-ES', { dateStyle: 'long' })
    : selectedDate;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Intimidad y bienestar sexual"
      description={dateFormatted}
      errorMessage={error}
      onClearError={() => setError('')}
      footer={
        <>
          {existing && (
            <button type="button" onClick={() => save(true)} className={modalSecondaryButton}>
              <Trash2 size={17} aria-hidden="true" /> Quitar
            </button>
          )}
          <button type="button" onClick={() => save()} className={modalPrimaryButton}>
            <Check size={17} aria-hidden="true" /> Guardar registro
          </button>
        </>
      }
    >
      {/* 1. Actividad sexual */}
      <fieldset className="space-y-2.5">
        <div className="flex items-center justify-between">
          <legend className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Tipo de actividad
          </legend>
          <span className="text-[11px] text-[var(--text-secondary)]">Selecciona una opción</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ACTIVITIES.map((act, index) => {
            const isSelected = activity === act.id;
            const isLastOdd = index === ACTIVITIES.length - 1 && ACTIVITIES.length % 2 !== 0;

            return (
              <button
                type="button"
                key={act.id}
                aria-pressed={isSelected}
                onClick={() => setActivity(act.id)}
                className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
                  isLastOdd ? 'sm:col-span-2' : ''
                } ${
                  isSelected
                    ? `${act.activeBorder} ${act.activeBg} shadow-xs`
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-card)] hover:bg-[var(--bg-card-inner)]'
                }`}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${act.iconBg} ${act.iconColor}`}
                >
                  <act.icon size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {act.label}
                    </span>
                    {isSelected && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Sensaciones y detalles */}
      <div className="space-y-2.5 pt-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Detalles y sensaciones
        </span>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Orgasmo */}
          <button
            type="button"
            role="checkbox"
            aria-checked={hadOrgasm}
            onClick={() => setHadOrgasm(v => !v)}
            className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all active:scale-[0.97] ${
              hadOrgasm
                ? 'border-rose-300 bg-rose-50/90 text-rose-950 ring-2 ring-rose-300/50 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 transition-transform group-hover:scale-105 dark:bg-rose-900/60 dark:text-rose-300">
                <Zap size={18} />
              </span>
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  hadOrgasm
                    ? 'bg-rose-500 text-white'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] text-transparent'
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="block text-sm font-semibold">Con orgasmo</span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                Clímax alcanzado
              </span>
            </div>
          </button>

          {/* Anticoncepción de urgencia */}
          <button
            type="button"
            role="checkbox"
            aria-checked={hadEmergencyPill}
            onClick={() => setHadEmergencyPill(v => !v)}
            className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all active:scale-[0.97] ${
              hadEmergencyPill
                ? 'border-amber-300 bg-amber-50/90 text-amber-950 ring-2 ring-amber-300/50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-transform group-hover:scale-105 dark:bg-amber-900/60 dark:text-amber-300">
                <Pill size={18} />
              </span>
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  hadEmergencyPill
                    ? 'bg-amber-500 text-white'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] text-transparent'
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="block text-sm font-semibold">Píldora de urgencia</span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                Día después tomada
              </span>
            </div>
          </button>

          {/* Dolor / Dispareunia */}
          <button
            type="button"
            role="checkbox"
            aria-checked={hadPain}
            onClick={() => setHadPain(v => !v)}
            className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all active:scale-[0.97] ${
              hadPain
                ? 'border-orange-300 bg-orange-50/90 text-orange-950 ring-2 ring-orange-300/50 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-105 dark:bg-orange-900/60 dark:text-orange-300">
                <AlertCircle size={18} />
              </span>
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  hadPain
                    ? 'bg-orange-500 text-white'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] text-transparent'
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="block text-sm font-semibold">Con dolor</span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                Dispareunia o molestia
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Deseo sexual (Libido) */}
      <fieldset className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <legend className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Deseo sexual / Libido
          </legend>
          <span className="text-[11px] text-[var(--text-secondary)]">Intensidad</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {LIBIDO_LEVELS.map(lvl => {
            const isSelected = libido === lvl.id;
            return (
              <button
                type="button"
                key={lvl.id}
                aria-pressed={isSelected}
                onClick={() => setLibido(lvl.id)}
                className={`group flex flex-col items-center rounded-2xl border p-3 text-center transition-all active:scale-95 ${
                  isSelected
                    ? `${lvl.activeStyle} shadow-xs`
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-card)] hover:bg-[var(--bg-card-inner)]'
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${lvl.iconBg} ${lvl.iconColor}`}
                >
                  <lvl.icon size={18} />
                </span>
                <span className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {lvl.label}
                </span>
                <span className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  {lvl.desc}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 4. Notas */}
      <div className="space-y-2 pt-1">
        <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <FileText size={14} className="text-[var(--text-secondary)]" />
            Notas personales <span className="font-normal lowercase text-[11px]">(opcional)</span>
          </span>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            maxLength={4000}
            rows={2}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Sensaciones, lubricación, estado de ánimo o notas para tu consulta..."
            className={`${modalField} rounded-xl text-sm`}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-[var(--rose)]">
          <AlertCircle size={15} /> {error}
        </p>
      )}
    </ModalFrame>
  );
}
