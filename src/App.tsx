import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowRight, BarChart3, CalendarDays, Check, CircleAlert, ClipboardList, Droplets, FileDown, Heart, Leaf, MessageCircle, NotebookPen, Pill, RotateCcw, Thermometer, Upload, UserRound, X } from 'lucide-react';
import { DeviceHealthModal } from './components/Modals/DeviceHealthModal';
import { ModalFrame } from './components/Modals/ModalFrame';
import { SmartGreetingBottomSheet } from './components/Modals/SmartGreetingBottomSheet';
import { CycleRecoveryBottomSheet } from './components/Modals/CycleRecoveryBottomSheet';
import { detectCycleRecovery } from './services/predictiveEngine';
import { useDailyGreeting } from './hooks/useDailyGreeting';
import { SyncStatus } from './components/Layout/SyncStatus';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { CycleProvider } from './context/CycleContext';
import { useCycle } from './hooks/useCycle';
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
import { clearReportedStorageError, getDataStorageKey, hasReportedStorageError } from './utils/storage';
import type { CyclePhase } from './types/cycle';
import { generateDailyWellnessAdvice } from './services/wellnessAgent';

const AppleMonthlyCalendar = lazy(() => import('./components/Calendar/AppleMonthlyCalendar').then(m => ({ default: m.AppleMonthlyCalendar })));
const DailyLogBottomSheet = lazy(() => import('./components/Modals/DailyLogBottomSheet').then(m => ({ default: m.DailyLogBottomSheet })));
const SettingsDrawer = lazy(() => import('./components/Settings/SettingsDrawer').then(m => ({ default: m.SettingsDrawer })));
const ColorLegendModal = lazy(() => import('./components/Modals/ColorLegendModal').then(m => ({ default: m.ColorLegendModal })));
const ChatDrawer = lazy(() => import('./components/Chat/ChatDrawer').then(m => ({ default: m.ChatDrawer })));
const InteractiveQuizModal = lazy(() => import('./components/Modals/InteractiveQuizModal').then(m => ({ default: m.InteractiveQuizModal })));
const ModularOnboardingModal = lazy(() => import('./components/Modals/ModularOnboardingModal').then(m => ({ default: m.ModularOnboardingModal })));
const PeriodFlowModal = lazy(() => import('./components/Modals/PeriodFlowModal').then(m => ({ default: m.PeriodFlowModal })));
const IntimacyModal = lazy(() => import('./components/Modals/IntimacyModal').then(m => ({ default: m.IntimacyModal })));
const CycleAnalyticsModal = lazy(() => import('./components/Modals/CycleAnalyticsModal').then(m => ({ default: m.CycleAnalyticsModal })));
const SymptothermalModal = lazy(() => import('./components/Modals/SymptothermalModal').then(m => ({ default: m.SymptothermalModal })));
const MedicationTrackerModal = lazy(() => import('./components/Modals/MedicationTrackerModal').then(m => ({ default: m.MedicationTrackerModal })));
const CycleSyncingModal = lazy(() => import('./components/Modals/CycleSyncingModal').then(m => ({ default: m.CycleSyncingModal })));
const UniversalImportModal = lazy(() => import('./components/Modals/UniversalImportModal').then(m => ({ default: m.UniversalImportModal })));
const MedicalExportModal = lazy(() => import('./components/Modals/MedicalExportModal').then(m => ({ default: m.MedicalExportModal })));
const PwaInstallModal = lazy(() => import('./components/Modals/PwaInstallModal').then(m => ({ default: m.PwaInstallModal })));

type ModalName = 'device' | 'calendar' | 'tools' | 'history' | 'daily' | 'period' | 'intimacy' | 'legend' | 'chat' | 'profile' | 'analytics' | 'symptothermal' | 'medication' | 'care' | 'quiz' | 'import' | 'export' | 'install';
const Loading = () => <div className="view-loading" role="status">Cargando…</div>;

function MainScreen() {
  const { selectedDate, setSelectedDate, todayDate, logs, settings, cycleStats, recoverPeriod, currentDayInfo, isSettingsOpen, setIsSettingsOpen, saveQuizResult } = useCycle();
  const view = 'diary';
  const [modal, setModal] = useState<ModalName | null>(null);
  const [recoveryDismissed, setRecoveryDismissed] = useState('');
  let recoveryKey = `regla_catchup_${todayDate}`;
  let recoveryStored = false;
  try { recoveryKey = getDataStorageKey(recoveryKey); recoveryStored = localStorage.getItem(recoveryKey) === 'true'; } catch { /* In-memory dismissal remains available. */ }
  const recovery = !recoveryStored && recoveryDismissed !== recoveryKey ? detectCycleRecovery(cycleStats, todayDate) : null;
  const skipRecovery = () => {
    setRecoveryDismissed(recoveryKey);
    try { localStorage.setItem(recoveryKey, 'true'); } catch { /* Skipping never changes health records. */ }
  };

  const [storageFailed, setStorageFailed] = useState(() => hasReportedStorageError());
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [quizId, setQuizId] = useState(HEALTH_QUIZZES.stress.id);
  const [carePhase, setCarePhase] = useState<CyclePhase>('menstrual');
  useEffect(() => {

    const storageError = () => setStorageFailed(true);


    window.addEventListener('aura:storage-error', storageError);
    return () => { window.removeEventListener('aura:storage-error', storageError); };
  }, []);
  const openModal = (next: ModalName) => { setIsSettingsOpen(false); setModal(next); };
  const closeModal = () => setModal(null);
  const openChat = (message?: string) => { setChatMessage(message || null); openModal('chat'); };
  const openCare = (phase?: CyclePhase) => { setCarePhase(phase || currentDayInfo.phase); openModal('care'); };
  const changeView = (next: AppView) => { if (next === 'diary') closeModal(); else openModal(next); };
  const greeting = useDailyGreeting(todayDate, Boolean(logs[todayDate]), modal !== null || isSettingsOpen || Boolean(recovery));
  const log = logs[selectedDate];
  const healthAdvice = log?.flow === 'very_heavy' && selectedDate === todayDate ? generateDailyWellnessAdvice({ ...currentDayInfo, date: selectedDate, flow: log.flow }) : null;
  const hasPeriod = Boolean(log?.isPeriod || log?.isIrregularBleeding || log?.flow);
  const hasIntimacy = Boolean(log?.intimacyLog && log.intimacyLog.activity !== 'none');
  const hasEntries = Boolean(log && (hasPeriod || hasIntimacy || log.symptoms.length || log.notes || log.bbt !== undefined || log.medications?.length || log.quizResults?.length));
  const dateLabel = parseDateKey(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const tools = [
    { id: 'device' as const, name: 'Salud y widgets', description: 'Apple Salud, Health Connect e inicio', icon: Heart },
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
    <Header view={view} onChangeView={changeView} onOpenChat={() => openChat()} onInstall={() => openModal('install')}/>
    <main className="workspace studio-workspace" id="main-content" tabIndex={-1}>
      <div className="workspace-inner studio-canvas">
        {storageFailed && <div className="storage-alert" role="alert"><CircleAlert size={20}/><p>No se han podido guardar o recuperar algunos datos. Comprueba el espacio y los permisos de almacenamiento del navegador antes de continuar.</p><button type="button" className="aura-icon-button" aria-label="Cerrar aviso de almacenamiento" onClick={() => { clearReportedStorageError(); setStorageFailed(false); }}><X size={18}/></button></div>}
        <div className="studio-topline"><div><h1 className="page-title">Mi diario</h1><p className="page-subtitle">{settings.userName ? settings.userName + ', un' : 'Un'} momento para escucharte.</p></div><SyncStatus/></div>
        <div className="date-toolbar"><p className="date-heading">{dateLabel}</p><div className="date-toolbar-actions">
          {selectedDate !== todayDate && <button type="button" className="aura-icon-button" aria-label="Volver a hoy" onClick={() => setSelectedDate(todayDate)}><RotateCcw size={16}/></button>}
          <input className="date-picker" type="date" aria-label="Fecha del registro" value={selectedDate} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setSelectedDate(event.target.value); }}/>
        </div></div>
        <HorizontalTimeline/>
        {healthAdvice && <div className="health-notice" role="note" aria-label="Orientación sobre sangrado muy abundante"><CircleAlert size={22}/><div><h3>{healthAdvice.headline}</h3><p>{healthAdvice.advice}</p></div></div>}
        <HeroStatus onRecordPeriod={() => openModal('period')} onOpenLegend={() => openModal('legend')}/>
        <section className="daily-actions" aria-label="Registro rápido">
          <button type="button" className="quick-log period" aria-pressed={hasPeriod} onClick={() => openModal('period')}><Droplets size={19}/><span>{hasPeriod ? 'Editar regla' : 'Registrar regla'}</span></button>
          <button type="button" className="quick-log" aria-pressed={Boolean(log?.symptoms.length)} onClick={() => openModal('daily')}><NotebookPen size={19}/><span>Síntomas y notas</span></button>
          <button type="button" className="quick-log" aria-pressed={hasIntimacy} onClick={() => openModal('intimacy')}><Heart size={19}/><span>Intimidad</span></button>
        </section>
        <div className="daily-status">{hasEntries ? <button type="button" className="text-action" onClick={() => openModal('history')}><Check size={14}/>Tu registro está guardado<ArrowRight size={14}/></button> : <span>Lo que sientas, cuando quieras.</span>}</div>
        <WellnessTipCard key={selectedDate} onOpenChat={openChat}/>
        <button type="button" className="confidente-link" onClick={() => openChat()} aria-label="Abrir chat confidente"><span className="confidente-symbol"><MessageCircle size={22}/></span><span><strong>Tu Confidente</strong><small>Un espacio para hablar de cómo estás</small></span><ArrowRight size={18}/></button>
        {!(settings.completedOnboardingCategories?.length) && <button type="button" className="profile-invitation text-action" onClick={() => openModal('profile')}>Haz Aura un poco más tuya <span>Perfil opcional</span><ArrowRight size={14}/></button>}

      </div>
    </main>
    <Suspense fallback={<Loading/>}>
      {recovery && modal === null && !isSettingsOpen && <CycleRecoveryBottomSheet key={recovery.anchor} recovery={recovery} today={todayDate} onConfirm={recoverPeriod} onSkip={skipRecovery}/>}
      {greeting.isOpen && <SmartGreetingBottomSheet isOpen onClose={greeting.dismiss} onOpenFull={() => { greeting.dismiss(); openModal('daily'); }}/>}
      {modal === 'calendar' && <ModalFrame isOpen onClose={closeModal} title="Calendario" className="calendar-dialog"><AppleMonthlyCalendar onSelectDate={date => { setSelectedDate(date); openModal('daily'); }} onOpenLegendModal={() => openModal('legend')} onOpenCycleSyncing={openCare}/></ModalFrame>}
      {modal === 'tools' && <ModalFrame isOpen onClose={closeModal} title="Herramientas">
          {[
            { title: 'Conoce tu ciclo', description: 'Observa tus patrones y entiende tus registros.', ids: ['analytics', 'symptothermal', 'legend'] },
            { title: 'Cuídate a tu manera', description: 'Un poco de apoyo para tu día a día.', ids: ['medication', 'care', 'chat'] },
            { title: 'Tu historia, bajo tu control', description: 'Personaliza, conserva y comparte lo que tú elijas.', ids: ['profile', 'import', 'export', 'device'] },
          ].map(group => <section className="tool-group" key={group.title} aria-label={group.title}><div className="tool-group-heading"><h2>{group.title}</h2><p>{group.description}</p></div><div className="tool-grid">{group.ids.map(id => tools.find(tool => tool.id === id)!).map(tool => <button type="button" key={tool.id} className="tool-card" onClick={() => tool.id === 'care' ? openCare() : tool.id === 'chat' ? openChat() : openModal(tool.id)}><tool.icon size={24}/><strong>{tool.name}</strong><span>{tool.description}</span><ArrowRight className="tool-arrow" size={17} aria-hidden="true"/></button>)}</div></section>)}
          <h2 className="tool-section-title">Cuestionarios de bienestar</h2>
          <div className="tool-grid">{Object.values(HEALTH_QUIZZES).map(quiz => <button type="button" key={quiz.id} className="tool-card" onClick={() => { setQuizId(quiz.id); openModal('quiz'); }}><ClipboardList size={24}/><strong>{quiz.title}</strong><span>{quiz.questions.length} preguntas</span></button>)}</div>
        </ModalFrame>}
      {modal === 'history' && <ModalFrame isOpen onClose={closeModal} title="Tu registro del día"><ul className="symptom-list">{hasPeriod && <li>{log?.isPeriod ? 'Regla registrada' : log?.flow === 'spotting' ? 'Manchado registrado' : 'Sangrado irregular registrado'}</li>}{log?.symptoms.map(symptom => <li key={symptom.id}>{symptom.name}</li>)}</ul>{log?.notes && <p>{log.notes}</p>}<QuizHistory results={log?.quizResults || []}/><BiomarkersCard/><button type="button" className="aura-button" onClick={() => openModal('daily')}>Editar síntomas y notas</button></ModalFrame>}
      {modal === 'device' && <DeviceHealthModal onClose={closeModal}/>}
      {modal === 'install' && <PwaInstallModal onClose={closeModal}/>}
      {modal === 'period' && <PeriodFlowModal key={selectedDate} isOpen onClose={closeModal}/>}
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
