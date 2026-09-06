import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, CircleAlert, ClipboardList, Download, Droplets, FileDown, Heart, Leaf, MessageCircle, NotebookPen, Pill, Plus, RotateCcw, Thermometer, Upload, UserRound, WifiOff, X } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
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
import { generateDailyWellnessAdvice } from './services/wellnessAgent';

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

type ModalName = 'daily' | 'period' | 'intimacy' | 'legend' | 'chat' | 'profile' | 'analytics' | 'symptothermal' | 'medication' | 'care' | 'quiz' | 'import' | 'export' | 'install';
const Loading = () => <div className="view-loading" role="status">Cargando…</div>;


function MainScreen() {
  const { selectedDate, setSelectedDate, todayDate, logs, settings, currentDayInfo, isSettingsOpen, setIsSettingsOpen, saveQuizResult, hasEnoughData, cycleStats, upcomingMilestones } = useCycle();
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
  const [quizId, setQuizId] = useState(HEALTH_QUIZZES.stress.id);
  const [carePhase, setCarePhase] = useState<CyclePhase>('menstrual');
  const [periodModalType, setPeriodModalType] = useState<'period' | 'irregular'>('period');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const storageError = () => setStorageFailed(true);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('aura:storage-error', storageError);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('aura:storage-error', storageError); };
  }, []);
  const openModal = (next: ModalName) => { setIsSettingsOpen(false); setModal(next); };
  const closeModal = () => setModal(null);
  const openBleedingModal = (type: 'period' | 'irregular' = 'period') => { setPeriodModalType(type); openModal('period'); };
  const openChat = (message?: string) => { setChatMessage(message || null); openModal('chat'); };
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
  const hasEntries = Boolean(log && (hasPeriod || hasIntimacy || log.symptoms.length || log.notes || log.bbt !== undefined || log.medications?.length || log.quizResults?.length));
  const dateLabel = parseDateKey(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const title = view === 'diary' ? 'App menstrual' : view === 'calendar' ? 'Calendario' : 'Herramientas';
  const hasCycle = Boolean(hasEnoughData && currentDayInfo.dayOfCycle > 0);
  const isFuture = selectedDate > todayDate;
  const cycleLength = Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength || 28));
  const cycleDay = currentDayInfo.dayOfCycle;
  const daysNext = upcomingMilestones.daysUntilNextPeriod;
  const daysToNext = typeof daysNext === 'number' && daysNext > 0 ? daysNext : Math.max(0, cycleLength - cycleDay + 1);
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
    <Header view={view} onChangeView={changeView} onOpenChat={() => openChat()} onInstall={handleInstall}/>
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
        {view !== 'diary' && view !== 'tools' && <div className="page-topline"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{view === 'calendar' ? 'Tus registros y las fechas que vienen.' : 'Todo lo que necesitas para cuidar de ti.'}</p></div>
          <span className="connection-status" role="status">{online ? <CheckCircle2 size={15}/> : <WifiOff size={15}/>}<span>{online ? 'Conectado' : 'Sin conexión'}</span></span>
        </div>}
        {view === 'diary' && <div className="date-toolbar"><p className="date-heading">{dateLabel}</p><div className="date-toolbar-actions">
          {selectedDate !== todayDate && <button type="button" className="aura-icon-button" title="Volver a hoy" aria-label="Volver a hoy" onClick={() => setSelectedDate(todayDate)}><RotateCcw size={18}/></button>}
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
              />
              <section className="diary-section diary-record-section" aria-labelledby="record-title">
                <div className="section-heading"><div><h2 id="record-title">{selectedDate === todayDate ? '¿Cómo estás hoy?' : isFuture ? 'Previsión del día' : 'Tu registro del día'}</h2><p className="section-caption">{isFuture ? 'Este día todavía no ha llegado.' : 'Un pequeño momento para escucharte.'}</p></div>{!isFuture && <button type="button" className="aura-icon-button" title="Abrir registro diario" aria-label="Abrir registro diario" onClick={() => openModal('daily')}><Plus size={18}/></button>}</div>
                {isFuture ? <div className="future-day-card"><p>No puedes anotar este día porque es un día futuro y todavía no ha pasado.</p></div> : <>
                  <div className="quick-log-grid">
                    {hasPeriod ? (
                      <button type="button" className="quick-log period" aria-pressed={true} onClick={() => openBleedingModal('period')} title="Editar registro de regla">
                        <Droplets size={20}/>
                        <span>Regla registrada</span>
                      </button>
                    ) : isApproachingPeriod ? (
                      <button type="button" className="quick-log period" aria-pressed={false} onClick={() => openBleedingModal('period')} title="Confirmar si te ha bajado la regla hoy">
                        <Droplets size={20}/>
                        <span>{daysToNext > 3 ? '¿Se te adelantó hoy?' : '¿Te ha bajado hoy?'}</span>
                      </button>
                    ) : (
                      <button type="button" className="quick-log period" aria-pressed={hasIrregularBleeding} onClick={() => openBleedingModal('irregular')} title="Anotar sangrado imprevisto o manchado">
                        <Droplets size={20}/>
                        <span>{hasIrregularBleeding ? 'Sangrado irregular' : 'Sangrado irregular'}</span>
                      </button>
                    )}
                    <button type="button" className="quick-log" aria-pressed={Boolean(log?.symptoms.length || log?.notes)} onClick={() => openModal('daily')}>
                      <NotebookPen size={20}/>
                      <span>Síntomas y notas</span>
                    </button>
                    <button type="button" className="quick-log" aria-pressed={hasIntimacy} onClick={() => openModal('intimacy')}>
                      <Heart size={20}/>
                      <span>Intimidad</span>
                    </button>
                    <button type="button" className="quick-log" aria-pressed={hasMedications} onClick={() => openModal('medication')}>
                      <Pill size={20}/>
                      <span>{hasMedications ? 'Tomas registradas' : 'Pastillas y tomas'}</span>
                    </button>
                  </div>
                </>}
              </section>
              <QuizHistory results={log?.quizResults || []}/>
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
              ].map(group => (
                <section className="tool-group" key={group.title} aria-label={group.title}>
                  <div className="tool-group-heading">
                    <h2>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
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
                </section>
              ))}

              <section className="tool-group" aria-label="Cuestionarios de bienestar">
                <div className="tool-group-heading">
                  <h2>Cuestionarios de bienestar</h2>
                  <p>Chequeos guiados para evaluar tu descanso, estrés y cólicos.</p>
                </div>
                <div className="tool-grid">
                  {Object.values(HEALTH_QUIZZES).map(quiz => {
                    if (!quiz || !quiz.id) return null;
                    const questionsCount = quiz.questions?.length ?? 0;
                    return (
                      <button
                        type="button"
                        key={quiz.id}
                        className="tool-card"
                        onClick={() => {
                          setQuizId(quiz.id);
                          openModal('quiz');
                        }}
                      >
                        <div className="tool-card-top">
                          <div className="tool-card-icon">
                            <ClipboardList size={20} aria-hidden="true" />
                          </div>
                          <ArrowRight className="tool-arrow" size={17} aria-hidden="true" />
                        </div>
                        <div className="tool-card-body">
                          <strong>{quiz.title}</strong>
                          <span>{questionsCount} preguntas · Chequeo guiado</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </main>
    <Suspense fallback={<Loading/>}>
      {modal === 'install' && <PwaInstallModal onClose={closeModal}/>}
      {modal === 'period' && <PeriodFlowModal key={selectedDate} isOpen initialType={periodModalType} onClose={closeModal}/>}
      {modal === 'intimacy' && <IntimacyModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'daily' && <DailyLogBottomSheet key={selectedDate} isOpen onClose={closeModal} onOpenSymptothermal={() => openModal('symptothermal')} onOpenMedications={() => openModal('medication')}/>}
      {modal === 'legend' && <ColorLegendModal isOpen onClose={closeModal}/>}
      {modal === 'profile' && <ModularOnboardingModal isOpen onClose={closeModal}/>}
      {modal === 'analytics' && <CycleAnalyticsModal isOpen onClose={closeModal}/>}
      {modal === 'symptothermal' && <SymptothermalModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'medication' && <MedicationTrackerModal key={selectedDate} isOpen onClose={closeModal}/>}
      {modal === 'care' && <CycleSyncingModal isOpen initialPhase={carePhase} onClose={closeModal}/>}
      {modal === 'import' && <UniversalImportModal isOpen onClose={closeModal}/>}
      {modal === 'export' && <MedicalExportModal isOpen onClose={closeModal}/>}
      {modal === 'chat' && <ChatDrawer isOpen onClose={closeModal} initialMessage={chatMessage} onInitialMessageConsumed={() => setChatMessage(null)} onOpenQuizModal={id => { setQuizId(id); openModal('quiz'); }}/>}
      {modal === 'quiz' && <InteractiveQuizModal quiz={Object.values(HEALTH_QUIZZES).find(quiz => quiz.id === quizId) || HEALTH_QUIZZES.stress} isOpen onClose={closeModal} onComplete={result => { saveQuizResult(result, selectedDate); changeView('diary'); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })); }}/>}
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
  return <ErrorBoundary><MotionConfig reducedMotion="user"><AuthProvider><AuthenticatedApp/></AuthProvider></MotionConfig></ErrorBoundary>;
}
