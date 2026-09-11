import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Clock, Download, Droplets, FileDown, Heart, Leaf, MessageCircle, NotebookPen, Pill, Plus, RotateCcw, Sparkles, Thermometer, Upload, UserRound, WifiOff, X } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './context/ToastContext';
import { useToast } from './context/toast';
import { ToastContainer } from './components/UI/ToastContainer';
import { CycleProvider } from './context/CycleContext';
import { useCycle } from './hooks/useCycle';
import { usePwaInstall } from './hooks/usePwaInstall';
import { AuthScreens } from './components/Auth/AuthScreens';
import { Header } from './components/Layout/Header';
import type { AppView } from './components/Layout/Header';
import { MobileContainer } from './components/Layout/MobileContainer';
import { HeroStatus } from './components/Layout/HeroStatus';
import { ErrorBoundary } from './components/Layout/ErrorBoundary';
import { HorizontalTimeline } from './components/Timeline/HorizontalTimeline';
import { WellnessTipCard } from './components/Cards/WellnessTipCard';
import { BiomarkersCard } from './components/Cards/BiomarkersCard';
import { QuizHistory } from './components/Cards/QuizHistory';
import { HEALTH_QUIZZES } from './data/healthQuizzes';
import { parseDateKey } from './utils/cycleCalculator';
import { clearReportedStorageError, hasReportedStorageError } from './utils/storage';
import type { CyclePhase } from './types/cycle';
import type { ChatQuizKey } from './services/aiAgent';
import type { QuizAnswer } from './components/Chat/chatHistory';
import type { QuizResult } from './types/quiz';
import { generateDailyWellnessAdvice } from './services/wellnessAgent';
import { calculateUpcomingMilestones } from './services/predictiveEngine';


import { PeriodFlowModal } from './components/Modals/PeriodFlowModal';
import { DailyLogBottomSheet } from './components/Modals/DailyLogBottomSheet';
import { IntimacyModal } from './components/Modals/IntimacyModal';

import { AppleMonthlyCalendar } from './components/Calendar/AppleMonthlyCalendar';

function resilientLazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const key = 'aura_chunk_reload_attempt';
      const lastReload = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        try { sessionStorage.setItem(key, String(Date.now())); } catch {}
        window.location.reload();
      }
      throw error;
    }
  });
}

const SettingsDrawer = resilientLazy(() => import('./components/Settings/SettingsDrawer').then(m => ({ default: m.SettingsDrawer })));
const SettingsSection = resilientLazy(() => import('./components/Settings/SettingsDrawer').then(m => ({ default: m.SettingsSection })));
const ColorLegendModal = resilientLazy(() => import('./components/Modals/ColorLegendModal').then(m => ({ default: m.ColorLegendModal })));
const ChatDrawer = resilientLazy(() => import('./components/Chat/ChatDrawer').then(m => ({ default: m.ChatDrawer })));
const InteractiveQuizModal = resilientLazy(() => import('./components/Modals/InteractiveQuizModal').then(m => ({ default: m.InteractiveQuizModal })));
const ModularOnboardingModal = resilientLazy(() => import('./components/Modals/ModularOnboardingModal').then(m => ({ default: m.ModularOnboardingModal })));
const CycleAnalyticsModal = resilientLazy(() => import('./components/Modals/CycleAnalyticsModal').then(m => ({ default: m.CycleAnalyticsModal })));
const SymptothermalModal = resilientLazy(() => import('./components/Modals/SymptothermalModal').then(m => ({ default: m.SymptothermalModal })));
const MedicationTrackerModal = resilientLazy(() => import('./components/Modals/MedicationTrackerModal').then(m => ({ default: m.MedicationTrackerModal })));
const CycleSyncingModal = resilientLazy(() => import('./components/Modals/CycleSyncingModal').then(m => ({ default: m.CycleSyncingModal })));
const UniversalImportModal = resilientLazy(() => import('./components/Modals/UniversalImportModal').then(m => ({ default: m.UniversalImportModal })));
const MedicalExportModal = resilientLazy(() => import('./components/Modals/MedicalExportModal').then(m => ({ default: m.MedicalExportModal })));
const PwaInstallModal = resilientLazy(() => import('./components/Modals/PwaInstallModal').then(m => ({ default: m.PwaInstallModal })));
const PastCycleRecoveryModal = resilientLazy(() => import('./components/Modals/PastCycleRecoveryModal').then(m => ({ default: m.PastCycleRecoveryModal })));

type ModalName = 'daily' | 'period' | 'intimacy' | 'legend' | 'chat' | 'profile' | 'analytics' | 'symptothermal' | 'medication' | 'care' | 'quiz' | 'import' | 'export' | 'install' | 'recovery';
const Loading = () => <div className="view-loading" role="status">Cargando…</div>;


function MainScreen() {
  const { selectedDate, setSelectedDate, todayDate, logs, settings, currentDayInfo, isSettingsOpen, setIsSettingsOpen, saveQuizResult, cycleStats, upcomingMilestones } = useCycle();
  const { installed, canPrompt, isIos, install } = usePwaInstall();
  const isMobile = isIos || (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    try {
      return !sessionStorage.getItem('aura_dismiss_install_banner');
    } catch {
      return true;
    }
  });
  const [view, setView] = useState<AppView>('diary');
  const [modal, setModal] = useState<ModalName | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storageFailed, setStorageFailed] = useState(() => hasReportedStorageError());
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [chatQuizKey, setChatQuizKey] = useState<ChatQuizKey | null>(null);
  const [completedQuizFeedback, setCompletedQuizFeedback] = useState<{ quizKey: ChatQuizKey; answers: Record<string, QuizAnswer> } | null>(null);
  const [quizId, setQuizId] = useState(HEALTH_QUIZZES.stress.id);
  const [openToolGroup, setOpenToolGroup] = useState<string>('Conoce tu ciclo');
  const [carePhase, setCarePhase] = useState<CyclePhase>('menstrual');
  const [hasAutoOpenedDaily, setHasAutoOpenedDaily] = useState(false);

  useEffect(() => {
    if (!hasAutoOpenedDaily && view === 'diary' && todayDate) {
      const todayLog = logs[todayDate];
      const hasLoggedToday = Boolean(
        todayLog?.isPeriod ||
        todayLog?.isIrregularBleeding ||
        (todayLog?.symptoms && todayLog.symptoms.length > 0) ||
        todayLog?.notes ||
        todayLog?.bbt ||
        (todayLog?.intimacyLog && todayLog.intimacyLog.activity !== 'none')
      );
      if (!hasLoggedToday) {
        const timer = setTimeout(() => {
          setModal('daily');
        }, 350);
        setHasAutoOpenedDaily(true);
        return () => clearTimeout(timer);
      }
      setHasAutoOpenedDaily(true);
    }
  }, [hasAutoOpenedDaily, view, logs, todayDate]);
  const [periodModalType, setPeriodModalType] = useState<'period' | 'irregular'>('period');
  const toast = useToast();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const storageError = () => {
      setStorageFailed(true);
      toast.error('Atención: El almacenamiento local ha fallado. Comprueba el espacio de tu navegador.');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('aura:storage-error', storageError);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('aura:storage-error', storageError); };
  }, [toast]);
  const openModal = (next: ModalName) => { setIsSettingsOpen(false); setModal(next); };
  const closeModal = () => setModal(null);
  const openBleedingModal = (type: 'period' | 'irregular' = 'period') => { setPeriodModalType(type); openModal('period'); };
  const openChat = (message?: string) => { setChatMessage(message || null); openModal('chat'); };
  const openChatWithQuiz = (quizKey: ChatQuizKey) => { setChatQuizKey(quizKey); openModal('chat'); };
  const openChatWithCompletedQuiz = (quizKey: ChatQuizKey, answers: Record<string, QuizAnswer>) => { setCompletedQuizFeedback({ quizKey, answers }); openModal('chat'); };
  const openCare = (phase?: CyclePhase) => { setCarePhase(phase || currentDayInfo.phase); openModal('care'); };
  const handleInstall = async () => {
    if (canPrompt && !installed) {
      try {
        await install();
        return;
      } catch {
        // Fallback to guided modal
      }
    }
    openModal('install');
  };
  const changeView = (next: AppView) => { setView(next); window.scrollTo({ top: 0, behavior: 'instant' }); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })); };
  const log = logs[selectedDate];
  const healthAdvice = log?.flow === 'very_heavy' && selectedDate === todayDate ? generateDailyWellnessAdvice({ ...currentDayInfo, date: selectedDate, flow: log.flow }) : null;
  const hasPeriod = Boolean(log?.isPeriod || log?.isIrregularBleeding);
  const hasIntimacy = Boolean(log?.intimacyLog && log.intimacyLog.activity !== 'none');
  const allQuizResults = useMemo(() => {
    const list: QuizResult[] = [];
    for (const l of Object.values(logs)) {
      if (l.quizResults && l.quizResults.length > 0) {
        list.push(...l.quizResults);
      }
    }
    return list.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }, [logs]);
  const dateLabel = parseDateKey(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const isFuture = selectedDate > todayDate;
  const cycleLength = Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength || 28));
  const cycleDay = currentDayInfo.dayOfCycle;
  const selectedMilestones = useMemo(() => {
    return calculateUpcomingMilestones(cycleStats, selectedDate);
  }, [cycleStats, selectedDate]);
  const daysNext = selectedMilestones.daysUntilNextPeriod;
  const daysToNext = typeof daysNext === 'number' && daysNext > 0 ? daysNext : Math.max(0, cycleLength - cycleDay + 1);
  const daysToOvu = selectedMilestones.daysUntilNextOvulation;
  const isApproachingPeriod = (typeof daysNext === 'number' && daysNext <= 10) || (!daysNext && daysToNext <= 10) || hasPeriod;
  const hasMedications = Boolean(log?.medications?.some(m => m.taken));
  const hasIrregularBleeding = Boolean(log?.isIrregularBleeding);
  const tools = [
    { id: 'analytics' as const, name: 'Tendencias del ciclo', description: 'Historial, duración y variaciones', icon: BarChart3 },
    { id: 'symptothermal' as const, name: 'Temperatura y moco', description: 'Tus observaciones del día', icon: Thermometer },
    { id: 'medication' as const, name: 'Medicación', description: 'Tomas, dosis y suplementos', icon: Pill },
    { id: 'care' as const, name: 'Cuidados del ciclo', description: 'Bienestar en cada fase', icon: Leaf },
    { id: 'profile' as const, name: 'Mi perfil', description: 'Ciclo, cuerpo y hábitos', icon: UserRound },
    { id: 'chat' as const, name: 'Confidente', description: 'Preguntas y orientación general', icon: MessageCircle },
    { id: 'import' as const, name: 'Importar registros', description: 'Texto, CSV y copias de seguridad', icon: Upload },
    { id: 'export' as const, name: 'Informe de salud', description: 'Tu historial para la consulta', icon: FileDown },
    { id: 'legend' as const, name: 'Fases del ciclo', description: 'Comprender tu calendario', icon: CalendarDays },
  ];
  return <MobileContainer>
    <Header view={view} onChangeView={changeView} onOpenChat={() => openChat()} onOpenProfile={() => openModal('profile')} onInstall={handleInstall} online={online}/>
    <main className="workspace" id="main-content" tabIndex={-1}>
      <div className="workspace-inner">
        {storageFailed && <div className="storage-alert" role="alert"><CircleAlert size={20}/><p>No se han podido guardar o recuperar algunos datos. Comprueba el espacio y los permisos de almacenamiento del navegador antes de continuar.</p><button type="button" className="aura-icon-button" aria-label="Cerrar aviso de almacenamiento" onClick={() => { clearReportedStorageError(); setStorageFailed(false); }}><X size={18}/></button></div>}
        {!installed && isMobile && showInstallBanner && (
          <aside className="install-banner" aria-label="Instalar aplicación">
            <div className="install-banner-content">
              <div className="install-banner-icon">
                <Download size={20} aria-hidden="true" />
              </div>
              <div className="install-banner-text">
                <strong>Instala Aura en tu {isIos ? 'iPhone' : 'móvil'}</strong>
                <span>{isIos ? 'Añade la app a tu pantalla de inicio en 3 pasos rápidos.' : 'Instalación directa con un toque para acceder a tu diario.'}</span>
              </div>
            </div>
            <div className="install-banner-actions">
              <button
                type="button"
                className="aura-button primary sm"
                onClick={handleInstall}
              >
                <Download size={15} aria-hidden="true" />
                Instalar
              </button>
              <button
                type="button"
                className="aura-icon-button sm"
                aria-label="Cerrar aviso de instalación"
                onClick={() => {
                  setShowInstallBanner(false);
                  try { sessionStorage.setItem('aura_dismiss_install_banner', 'true'); } catch {}
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </aside>
        )}
        <div className="page-topline">
          <div>
            <h1 className="page-title">
              {view === 'diary' ? 'Mi diario' : view === 'calendar' ? 'Calendario' : view === 'tools' ? 'Herramientas' : 'Ajustes'}
            </h1>
            <p className="page-subtitle">
              {view === 'diary'
                ? (settings.userName ? `¡Hola, ${settings.userName}!` : 'Tu espacio de salud y bienestar.')
                : view === 'calendar'
                  ? 'Tus registros y las fechas que vienen.'
                  : view === 'tools'
                    ? 'Todo lo que necesitas para cuidar de ti.'
                    : 'Personaliza tu ciclo, avisos y privacidad.'}
            </p>
          </div>
          <span className="connection-status" role="status">
            {online ? <CheckCircle2 size={15} aria-hidden="true" style={{ color: 'var(--accent)' }}/> : <WifiOff size={15} aria-hidden="true" style={{ color: 'var(--rose)' }}/>}
            <span>{online ? 'Conectado' : 'Sin conexión'}</span>
          </span>
        </div>
        {!online && (
          <div className="mobile-connection-status" role="status">
            <WifiOff size={14} aria-hidden="true" />
            <span>Sin conexión</span>
          </div>
        )}
        {view === 'diary' && <div className="date-toolbar"><p className="date-heading">{dateLabel}</p><div className="date-toolbar-actions">
          {selectedDate !== todayDate && (
            <button
              type="button"
              className="aura-button sm today-pill-button"
              title="Volver a hoy"
              aria-label="Volver a hoy"
              onClick={() => setSelectedDate(todayDate)}
            >
              <RotateCcw size={14} aria-hidden="true"/>
              <span>Hoy</span>
            </button>
          )}
          <input className="date-picker" type="date" aria-label="Fecha del registro" value={selectedDate} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setSelectedDate(event.target.value); }}/>
        </div></div>}
        {view === 'diary' && <HorizontalTimeline/>}
        {view === 'diary' && <>
          {healthAdvice && <div className="health-notice" role="note" aria-label="Orientación sobre sangrado muy abundante"><CircleAlert size={22}/><div><h3>{healthAdvice.headline}</h3><p>{healthAdvice.advice}</p></div></div>}
          <div className="diary-grid">
            <div className="diary-primary">
              <HeroStatus
                onRecordPeriod={() => openBleedingModal('period')}
                onOpenLegend={() => openModal('legend')}
                onOpenDailyModal={() => openModal('daily')}
                onOpenRecoveryModal={() => openModal('recovery')}
              >
                <div className="diary-record-inner">
                  {isFuture ? (
                    <div className="future-forecast-container">
                      <div className="future-forecast-card" data-phase={currentDayInfo.phase}>
                        <div className="future-forecast-icon">
                          {currentDayInfo.isOvulationDay || (currentDayInfo.isFertileWindow && !currentDayInfo.isPeriod) ? (
                            <Sparkles size={18} aria-hidden="true" />
                          ) : currentDayInfo.isPeriod ? (
                            <Droplets size={18} aria-hidden="true" />
                          ) : currentDayInfo.phase === 'luteal' ? (
                            <Clock size={18} aria-hidden="true" />
                          ) : (
                            <Leaf size={18} aria-hidden="true" />
                          )}
                        </div>
                        <div className="future-forecast-content">
                          <h3 className="future-forecast-title">
                            {currentDayInfo.isOvulationDay
                              ? 'Día de ovulación estimada'
                              : currentDayInfo.isFertileWindow && !currentDayInfo.isPeriod
                                ? 'Ventana de fertilidad estimada'
                                : currentDayInfo.isPeriod
                                  ? 'Inicio estimado de menstruación'
                                  : currentDayInfo.phase === 'luteal'
                                    ? 'Fase lútea (post-ovulación)'
                                    : 'Fase folicular en desarrollo'}
                          </h3>
                          <p className="future-forecast-desc">
                            {currentDayInfo.isOvulationDay
                              ? 'Día con mayor probabilidad de concepción del ciclo. El óvulo permanece viable entre 12 y 24 horas.'
                              : currentDayInfo.isFertileWindow && !currentDayInfo.isPeriod
                                ? daysToOvu > 1
                                  ? `Días fértiles estimados. El pico de máxima ovulación se prevé en ${daysToOvu} días.`
                                  : daysToOvu === 1
                                    ? 'Víspera del pico de máxima ovulación estimada. Probabilidad de concepción muy alta.'
                                    : 'Pico de máxima probabilidad de concepción.'
                                : currentDayInfo.isPeriod
                                  ? `Fecha prevista para tu siguiente regla según tu ciclo medio de ${cycleLength} días.`
                                  : currentDayInfo.phase === 'luteal'
                                    ? `Predominio de progesterona. Faltarán ${daysToNext} días para el siguiente ciclo.`
                                    : 'Aumento paulatino de estrógenos y maduración folicular tras la regla.'}
                          </p>
                          <span className="future-forecast-tip">
                            {currentDayInfo.isFertileWindow && !currentDayInfo.isPeriod
                              ? 'Etapa clave si buscas concebir o si quieres evitar embarazo.'
                              : currentDayInfo.isPeriod
                                ? 'Ten a mano tus productos menstruales habituales.'
                                : currentDayInfo.phase === 'luteal'
                                  ? 'Prioriza el descanso y la hidratación.'
                                  : 'Suele acompañarse de mayor vitalidad y energía.'}
                          </span>
                        </div>
                      </div>
                      <p className="future-day-note">
                        Las anotaciones de síntomas y sangrado se habilitarán automáticamente al llegar este día.
                      </p>
                    </div>
                  ) : (
                    <div className="quick-log-grid">
                      <button
                        type="button"
                        className="quick-log primary-add"
                        onClick={() => openModal('daily')}
                        title="Añadir registro (+)"
                      >
                        <Plus size={18} className="stroke-[2.5]" />
                        <span>Añadir (+)</span>
                      </button>
                      <button
                        type="button"
                        className="quick-log period"
                        aria-pressed={hasPeriod || hasIrregularBleeding}
                        onClick={() => openModal('daily')}
                        title="Registro de sangrado (normal, irregular o sin sangrado)"
                      >
                        <Droplets size={18}/>
                        <span>{hasPeriod || hasIrregularBleeding ? 'Sangrado anotado' : 'Sangrado'}</span>
                      </button>
                      <button
                        type="button"
                        className="quick-log"
                        aria-pressed={Boolean(log?.symptoms.length || log?.notes)}
                        onClick={() => openModal('daily')}
                        title="Síntomas y notas"
                      >
                        <NotebookPen size={18}/>
                        <span>Síntomas</span>
                      </button>
                      <button
                        type="button"
                        className="quick-log"
                        aria-pressed={hasIntimacy}
                        onClick={() => openModal('intimacy')}
                        title="Intimidad"
                      >
                        <Heart size={18}/>
                        <span>Intimidad</span>
                      </button>
                      <button
                        type="button"
                        className="quick-log"
                        aria-pressed={hasMedications}
                        onClick={() => openModal('medication')}
                        title="Pastillas y tomas"
                      >
                        <Pill size={18}/>
                        <span>Pastillas</span>
                      </button>
                    </div>
                  )}
                </div>
              </HeroStatus>
              <BiomarkersCard/>
            </div>
            <aside className="diary-secondary" aria-label="Cuidados y acompañamiento">
              <WellnessTipCard key={selectedDate} onOpenChat={openChat}/>
              <button type="button" className="confidente-link" onClick={() => openChat()} aria-label="Abrir chat confidente"><span className="confidente-symbol"><MessageCircle size={22}/></span><span><strong>Hablemos de cómo estás</strong><small>Tu Confidente, también sin conexión</small></span><ArrowRight size={18}/></button>
            </aside>
          </div>
        </>}

        <ErrorBoundary fallbackTitle="No pudimos cargar esta sección" onReset={() => setView('diary')}>
          {view === 'calendar' && (
            <section className="calendar-workspace" aria-label="Calendario del ciclo">
              <AppleMonthlyCalendar
                onSelectDate={date => { setSelectedDate(date); openModal('daily'); }}
                onOpenLegendModal={() => openModal('legend')}
                onOpenCycleSyncing={openCare}
              />
            </section>
          )}
          {view === 'tools' && (
            <div className="tools-workspace">
              {[
                {
                  title: 'Conoce tu ciclo',
                  description: 'Observa tus patrones y entiende tus registros.',
                  ids: ['analytics', 'symptothermal', 'legend']
                },
                {
                  title: 'Cuídate a tu manera',
                  description: 'Un poco de apoyo para tu día a día.',
                  ids: ['medication', 'care', 'chat']
                }
              ].map(group => {
                const isOpen = openToolGroup === group.title;
                return (
                  <section className={`tool-group ${isOpen ? 'is-open' : ''}`} key={group.title} aria-label={group.title}>
                    <button type="button" className="tool-group-heading" onClick={() => setOpenToolGroup(isOpen ? '' : group.title)} aria-expanded={isOpen}>
                      <div className="tool-group-heading-text">
                        <h2>{group.title}</h2>
                        <p>{group.description}</p>
                      </div>
                      <ChevronDown className="tool-group-icon" size={20} />
                    </button>
                    {isOpen && (
                      <div className="tool-group-content">
                        <div className="tool-grid">
                          {group.ids
                            .map(id => tools.find(tool => tool.id === id))
                            .filter((tool): tool is (typeof tools)[number] => Boolean(tool))
                            .map(tool => (
                              <button
                                type="button"
                                key={tool.id}
                                className="tool-card"
                                onClick={() =>
                                  tool.id === 'care' ? openCare() : tool.id === 'chat' ? openChat() : openModal(tool.id)
                                }
                              >
                                <div className="tool-card-top">
                                  <div className="tool-card-icon">
                                    <tool.icon size={20} aria-hidden="true" />
                                  </div>
                                  <ArrowRight className="tool-arrow" size={17} aria-hidden="true" />
                                </div>
                                <div className="tool-card-body">
                                  <strong>{tool.name}</strong>
                                  <span>{tool.description}</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}

              {(() => {
                const title = 'Cuestionarios de bienestar';
                const isOpen = openToolGroup === title;
                return (
                  <section className={`tool-group ${isOpen ? 'is-open' : ''}`} aria-label={title}>
                    <button type="button" className="tool-group-heading" onClick={() => setOpenToolGroup(isOpen ? '' : title)} aria-expanded={isOpen}>
                      <div className="tool-group-heading-text">
                        <h2>{title}</h2>
                        <p>Chequeos interactivos guiados por Confidente con feedback y recomendaciones.</p>
                      </div>
                      <ChevronDown className="tool-group-icon" size={20} />
                    </button>
                    {isOpen && (
                      <div className="tool-group-content">
                        <div className="quiz-grid">
                          {Object.values(HEALTH_QUIZZES).map(quiz => {
                            if (!quiz || !quiz.id) return null;
                            const questionsCount = quiz.questions?.length ?? 0;
                            const quizKey = (Object.keys(HEALTH_QUIZZES) as ChatQuizKey[]).find(k => HEALTH_QUIZZES[k].id === quiz.id) || 'stress';
                            return (
                              <button
                                type="button"
                                key={quiz.id}
                                className="quiz-card"
                                data-quiz={quiz.id}
                                onClick={() => openChatWithQuiz(quizKey)}
                              >
                                <div className="quiz-card-cover">
                                  <span className="quiz-card-emoji" role="img" aria-label={quiz.title}>{quiz.iconEmoji || '📋'}</span>
                                  <span className="quiz-card-time">{quiz.estimatedTime}</span>
                                </div>
                                <div className="quiz-card-body">
                                  <div className="quiz-card-main">
                                    <strong className="quiz-card-title">{quiz.title}</strong>
                                    <span className="quiz-card-subtitle">{questionsCount} preguntas</span>
                                  </div>
                                  <div className="quiz-card-action">
                                    <span>Comenzar</span>
                                    <ArrowRight size={14} aria-hidden="true" />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {allQuizResults.length > 0 && (
                          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
                            <QuizHistory results={allQuizResults} />
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          )}
          {view === 'settings' && (
            <div className="settings-workspace max-w-2xl mx-auto py-1">
              <Suspense fallback={<Loading/>}>
                <SettingsSection onOpenModularProfile={() => openModal('profile')} />
              </Suspense>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
    <Suspense fallback={<Loading/>}>
      {modal === 'install' && <PwaInstallModal onClose={closeModal}/>}
      {modal === 'recovery' && <PastCycleRecoveryModal isOpen onClose={closeModal}/>}
      {modal === 'period' && <PeriodFlowModal key={selectedDate} isOpen initialType={periodModalType} onClose={closeModal}/>}
      {modal === 'intimacy' && <IntimacyModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'daily' && <DailyLogBottomSheet key={selectedDate} isOpen onClose={closeModal} onOpenSymptothermal={() => openModal('symptothermal')} onOpenMedications={() => openModal('medication')}/>}
      {modal === 'legend' && <ColorLegendModal isOpen onClose={closeModal} onOpenPhaseGuide={phase => { closeModal(); setTimeout(() => openCare(phase), 150); }}/>}
      {modal === 'profile' && <ModularOnboardingModal isOpen onClose={closeModal}/>}
      {modal === 'analytics' && <CycleAnalyticsModal isOpen onClose={closeModal}/>}
      {modal === 'symptothermal' && <SymptothermalModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'medication' && <MedicationTrackerModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'care' && <CycleSyncingModal isOpen initialPhase={carePhase} onClose={closeModal}/>}
      {modal === 'import' && <UniversalImportModal isOpen onClose={closeModal}/>}
      {modal === 'export' && <MedicalExportModal isOpen onClose={closeModal}/>}
      {modal === 'chat' && (
        <ChatDrawer
          isOpen
          onClose={closeModal}
          initialMessage={chatMessage}
          onInitialMessageConsumed={() => setChatMessage(null)}
          onOpenQuizModal={id => { setQuizId(id); openModal('quiz'); }}
          initialQuizKey={chatQuizKey}
          onInitialQuizConsumed={() => setChatQuizKey(null)}
          initialCompletedQuiz={completedQuizFeedback}
          onInitialCompletedQuizConsumed={() => setCompletedQuizFeedback(null)}
        />
      )}
      {modal === 'quiz' && (
        <InteractiveQuizModal
          quiz={Object.values(HEALTH_QUIZZES).find(quiz => quiz.id === quizId) || HEALTH_QUIZZES.stress}
          isOpen
          onClose={closeModal}
          onComplete={result => {
            saveQuizResult(result, selectedDate);
            closeModal();
            toast.success('Chequeo guardado. Cuídate mucho 🌸');
            const key = (Object.keys(HEALTH_QUIZZES) as ChatQuizKey[]).find(k => HEALTH_QUIZZES[k].id === result.quizId) || 'stress';
            openChatWithCompletedQuiz(key, result.answers);
          }}
        />
      )}
      {isSettingsOpen && <SettingsDrawer onOpenModularProfile={() => openModal('profile')}/>}
    </Suspense>
  </MobileContainer>;
}

function AuthenticatedApp() {
  const { session, loading } = useAuth();
  if (loading) return <div className="app-loading" role="status"><span className="loading-spinner"/>Abriendo tu espacio…</div>;
  if (!session) return <AuthScreens/>;
  return <CycleProvider><MainScreen/></CycleProvider>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ToastProvider>
            <AuthenticatedApp />
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
