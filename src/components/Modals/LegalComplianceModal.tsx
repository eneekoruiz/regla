import { DialogSurface } from './ModalFrame';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Scale, BookOpen, AlertTriangle, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { hapticSelect } from '../../utils/haptics';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'science' | 'privacy' | 'medical'>('science');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <DialogSurface isOpen={isOpen} onClose={onClose} label="Información y privacidad">
        {/* Backdrop */}
        

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full min-w-0"
        >
          {/* Header */}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="h-11 w-11 shrink-0 rounded-lg bg-[var(--bg-chip)] text-[var(--text-secondary)] flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Información y privacidad</h2>
                <p className="text-[13px] text-[var(--text-secondary)] font-medium">
                  Ciclo, registros y uso de Aura
                </p>
              </div>
            </div>
            <button type="button" aria-label="Cerrar" onClick={onClose}
              className="aura-icon-button">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Pills */}
          <div className="px-5 pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 bg-[var(--bg-card)] p-1 border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  hapticSelect();
                  setActiveSection('science');
                }}
                aria-pressed={activeSection === 'science'}
                className={`min-h-11 min-w-0 flex-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSection === 'science'
                    ? 'bg-[var(--accent)] text-[var(--accent-on)] '
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Base Científica</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticSelect();
                  setActiveSection('privacy');
                }}
                aria-pressed={activeSection === 'privacy'}
                className={`min-h-11 min-w-0 flex-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSection === 'privacy'
                    ? 'bg-[var(--accent)] text-[var(--accent-on)] '
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Privacidad RGPD</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticSelect();
                  setActiveSection('medical');
                }}
                aria-pressed={activeSection === 'medical'}
                className={`min-h-11 min-w-0 flex-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeSection === 'medical'
                    ? 'bg-[var(--accent)] text-[var(--accent-on)] '
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Aviso Médico</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="min-w-0 px-5 py-4 space-y-3.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            {/* 1. BASE CIENTÍFICA */}
            {activeSection === 'science' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] text-[13px]">
                    <Sparkles className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span>Cómo calculamos las fechas</span>
                  </div>
                  <p>
                    Aura parte de una duración de ciclo de 28 días y una fase lútea de 14 días si no has configurado otras. Son valores iniciales, no una medida de tu cuerpo. Los registros permiten ajustar la duración estimada del ciclo. El estudio de <a className="underline" href="https://www.nature.com/articles/s41746-019-0152-7" target="_blank" rel="noreferrer">Bull et al. (2019)</a> describe variación entre personas; no valida el algoritmo de Aura.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    1. Ovulación orientativa
                  </span>
                  <p>
                    El calendario resta la fase lútea configurada a la duración estimada del ciclo. Ambas pueden variar. Este cálculo no confirma la ovulación ni evalúa la salud hormonal.
                  </p>
                  <div className="p-2 rounded-lg bg-[var(--bg-pill)] font-mono text-[13px] text-center text-[var(--text-primary)] font-bold">
                    Día Ovulación = Duración Ciclo - Duración Fase Lútea
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    2. Fechas de posible fertilidad
                  </span>
                  <p>
                    Aura marca desde cinco días antes hasta un día después de la ovulación estimada: siete fechas en el calendario. Es una aproximación que puede equivocarse. No identifica días seguros y no debe usarse como método anticonceptivo.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    3. Variaciones en tus registros
                  </span>
                  <p>
                    El algoritmo filtra duraciones y reduce el peso de algunos ciclos distintos al resto para calcular una tendencia. Es una decisión estadística de Aura, no un criterio diagnóstico de FIGO. Tus registros originales se conservan. Si hay cambios que te preocupan, consulta con un profesional sanitario.
                  </p>
                </div>
              </div>
            )}

            {/* 2. PRIVACIDAD RGPD / AEPD */}
            {activeSection === 'privacy' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tus registros personales</span>
                  </div>
                  <p className="text-[13px] text-[var(--text-primary)]">
                    En 2021, la FTC multó a Flo por transferir datos de salud a Facebook y Google. En nuestra aplicación, <strong>no existe ninguna telemetría de terceros ni venta de datos</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    1. Arquitectura Local-First y Categoría Especial (Art. 9 RGPD)
                  </span>
                  <p>
                    Tus registros ginecológicos, síntomas, analíticas y vida sexual están clasificados como <strong>datos de salud especialmente protegidos</strong>. En modo privado se guardan en este dispositivo. Conserva una copia de seguridad para poder recuperarlos.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    2. Derecho al Olvido y Purga Total (Art. 17 RGPD)
                  </span>
                  <p>
                    En cualquier momento puedes pulsar el botón <em>"Eliminar todos los datos locales"</em> en Ajustes para borrar los registros locales de Aura. Las copias que hayas exportado se conservan fuera de la aplicación.
                  </p>
                </div>
              </div>
            )}

            {/* 3. AVISO MÉDICO OBLIGATORIO (MDR UE 2017/745) */}
            {activeSection === 'medical' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[var(--bg-chip)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-secondary)]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Descargo Médico Regulatorio (MDR UE 2017/745)</span>
                  </div>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                    De conformidad con el Reglamento Europeo de Productos Sanitarios (MDR UE 2017/745) y las directrices de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS):
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">
                    Naturaleza Informativa y de Autoconocimiento
                  </span>
                  <p>
                    Esta aplicación es un asistente digital de registro, autoconocimiento y cálculo biométrico probabilístico. <strong>No constituye un dispositivo médico de diagnóstico clínico ni un método anticonceptivo garantizado</strong>.
                  </p>
                  <p className="">
                    Las predicciones de fertilidad son estimaciones estadísticas y no deben utilizarse como único método para prevenir el embarazo ni para autodiagnosticar patologías ginecológicas. Ante cualquier sangrado irregular prolongado, dolor pélvico severo o sospecha de patología, consulta siempre con un médico especialista en ginecología.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-root)] flex min-w-0 flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--text-tertiary)] font-mono">
              Aura
            </span>
            <button type="button" aria-label="Cerrar" onClick={onClose}
              className="aura-button primary"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </DialogSurface>
    </AnimatePresence>
  );
};
