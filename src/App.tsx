import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, CircleAlert, ClipboardList, Droplets, FileDown, Heart, Leaf, MessageCircle, NotebookPen, Pill, Plus, RotateCcw, Thermometer, Upload, UserRound, WifiOff, X } from 'lucide-react';
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
import { clearReportedStorageError, hasReportedStorageError } from './utils/storage';
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

type ModalName = 'daily' | 'period' | 'intimacy' | 'legend' | 'chat' | 'profile' | 'analytics' | 'symptothermal' | 'medication' | 'care' | 'quiz' | 'import' | 'export' | 'install';
const Loading = () => <div className="view-loading" role="status">Cargando…</div>;

function MainScreen() {
  const { selectedDate, setSelectedDate, todayDate, logs, settings, currentDayInfo, isSettingsOpen, setIsSettingsOpen, saveQuizResult } = useCycle();
  const [view, setView] = useState<AppView>('diary');
  const [modal, setModal] = useState<ModalName | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storageFailed, setStorageFailed] = useState(() => hasReportedStorageError());
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [quizId, setQuizId] = useState(HEALTH_QUIZZES.stress.id);
  const [carePhase, setCarePhase] = useState<CyclePhase>('menstrual');
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
  const openChat = (message?: string) => { setChatMessage(message || null); openModal('chat'); };
  const openCare = (phase?: CyclePhase) => { setCarePhase(phase || currentDayInfo.phase); openModal('care'); };
  const changeView = (next: AppView) => { setView(next); window.scrollTo({ top: 0, behavior: 'instant' }); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })); };
  const log = logs[selectedDate];
  const healthAdvice = log?.flow === 'very_heavy' && selectedDate === todayDate ? generateDailyWellnessAdvice({ ...currentDayInfo, date: selectedDate, flow: log.flow }) : null;
  const hasPeriod = Boolean(log?.isPeriod || log?.isIrregularBleeding);
  const hasIntimacy = Boolean(log?.intimacyLog && log.intimacyLog.activity !== 'none');
  const hasEntries = Boolean(log && (hasPeriod || hasIntimacy || log.symptoms.length || log.notes || log.bbt !== undefined || log.medications?.length || log.quizResults?.length));
  const dateLabel = parseDateKey(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const title = view === 'diary' ? 'Mi diario' : view === 'calendar' ? 'Calendario' : 'Herramientas';
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
    <Header view={view} onChangeView={changeView} onOpenChat={() => openChat()} onInstall={() => openModal('install')}/>
    <main className="workspace" id="main-content" tabIndex={-1}>
      <div className="workspace-inner">
        {storageFailed && <div className="storage-alert" role="alert"><CircleAlert size={20}/><p>No se han podido guardar o recuperar algunos datos. Comprueba el espacio y los permisos de almacenamiento del navegador antes de continuar.</p><button type="button" className="aura-icon-button" aria-label="Cerrar aviso de almacenamiento" onClick={() => { clearReportedStorageError(); setStorageFailed(false); }}><X size={18}/></button></div>}
        <div className="page-topline"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{view === 'diary' ? `${settings.userName ? `${settings.userName}, este` : 'Este'} es tu espacio. A tu ritmo.` : view === 'calendar' ? 'Tus registros y las fechas que vienen.' : 'Todo lo que necesitas para cuidar de ti.'}</p></div>
          <span className="connection-status" role="status">{online ? <CheckCircle2 size={15}/> : <WifiOff size={15}/>}<span>{online ? 'Diario local' : 'Sin conexión'}</span></span>
        </div>
        {view !== 'calendar' && <div className="date-toolbar"><p className="date-heading">{dateLabel}</p><div className="date-toolbar-actions">
          {selectedDate !== todayDate && <button type="button" className="aura-icon-button" title="Volver a hoy" aria-label="Volver a hoy" onClick={() => setSelectedDate(todayDate)}><RotateCcw size={18}/></button>}
          <input className="date-picker" type="date" aria-label="Fecha del registro" value={selectedDate} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setSelectedDate(event.target.value); }}/>
        </div></div>}
        {view === 'diary' && <>
          <HorizontalTimeline/>
          {healthAdvice && <div className="health-notice" role="note" aria-label="Orientación sobre sangrado muy abundante"><CircleAlert size={22}/><div><h3>{healthAdvice.headline}</h3><p>{healthAdvice.advice}</p></div></div>}
          <div className="diary-grid">
            <div className="diary-primary">
              <HeroStatus onRecordPeriod={() => openModal('period')} onOpenLegend={() => openModal('legend')}/>
              <section className="diary-section" aria-labelledby="record-title">
                <div className="section-heading"><div><h2 id="record-title">{selectedDate === todayDate ? '¿Cómo estás hoy?' : 'Tu registro del día'}</h2><p className="section-caption">Un pequeño momento para escucharte.</p></div><button type="button" className="aura-icon-button" title="Abrir registro diario" aria-label="Abrir registro diario" onClick={() => openModal('daily')}><Plus size={18}/></button></div>
                <div className="quick-log-grid">
                  <button type="button" className="quick-log period" aria-pressed={hasPeriod} onClick={() => openModal('period')}><Droplets size={21}/><span>{hasPeriod ? 'Editar regla' : 'Registrar regla'}</span></button>
                  <button type="button" className="quick-log" aria-pressed={Boolean(log?.symptoms.length)} onClick={() => openModal('daily')}><NotebookPen size={21}/><span>Síntomas y notas</span></button>
                  <button type="button" className="quick-log" aria-pressed={hasIntimacy} onClick={() => openModal('intimacy')}><Heart size={21}/><span>Intimidad</span></button>
                </div>
                {hasEntries ? <div className="log-preview"><ul className="symptom-list">{hasPeriod && <li>Regla registrada</li>}{log?.symptoms.map(symptom => <li key={symptom.id}>{symptom.name}</li>)}{hasIntimacy && <li>Intimidad registrada</li>}{log?.bbt !== undefined && <li>{log.bbt} °C</li>}{log?.medications?.filter(medication => medication.taken).map(medication => <li key={medication.id}>{medication.name}</li>)}</ul>{log?.notes && <p>{log.notes}</p>}<button type="button" className="text-action" onClick={() => openModal('daily')}><Check size={15}/>Ver o editar registro<ArrowRight size={14}/></button></div> : <p className="empty-log"><ClipboardList size={21}/>Aún no hay anotaciones para este día.</p>}
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
        {view === 'calendar' && <section className="calendar-workspace" aria-label="Calendario del ciclo"><Suspense fallback={<Loading/>}><AppleMonthlyCalendar onSelectDate={date => { setSelectedDate(date); openModal('daily'); }} onOpenLegendModal={() => openModal('legend')} onOpenCycleSyncing={openCare}/></Suspense></section>}
        {view === 'tools' && <>
          {[
            { title: 'Conoce tu ciclo', description: 'Observa tus patrones y entiende tus registros.', ids: ['analytics', 'symptothermal', 'legend'] },
            { title: 'Cuídate a tu manera', description: 'Un poco de apoyo para tu día a día.', ids: ['medication', 'care', 'chat'] },
            { title: 'Tu historia, bajo tu control', description: 'Personaliza, conserva y comparte lo que tú elijas.', ids: ['profile', 'import', 'export'] },
          ].map(group => <section className="tool-group" key={group.title} aria-label={group.title}><div className="tool-group-heading"><h2>{group.title}</h2><p>{group.description}</p></div><div className="tool-grid">{group.ids.map(id => tools.find(tool => tool.id === id)!).map(tool => <button type="button" key={tool.id} className="tool-card" onClick={() => tool.id === 'care' ? openCare() : tool.id === 'chat' ? openChat() : openModal(tool.id)}><tool.icon size={24}/><strong>{tool.name}</strong><span>{tool.description}</span><ArrowRight className="tool-arrow" size={17} aria-hidden="true"/></button>)}</div></section>)}
          <h2 className="tool-section-title">Cuestionarios de bienestar</h2>
          <div className="tool-grid">{Object.values(HEALTH_QUIZZES).map(quiz => <button type="button" key={quiz.id} className="tool-card" onClick={() => { setQuizId(quiz.id); openModal('quiz'); }}><ClipboardList size={24}/><strong>{quiz.title}</strong><span>{quiz.questions.length} preguntas</span></button>)}</div>
        </>}
      </div>
    </main>
    <Suspense fallback={<Loading/>}>
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
