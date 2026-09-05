import { jsPDF } from 'jspdf';
import type { DailyLog, UserSettings } from '../types/cycle';
import type { MedicalReportData, MedicalReportOptions, SymptomFrequency } from '../types/medicalReport';
import type { CycleStatistics } from '../types/prediction';
import { diffDays, formatDateKey, parseDateKey } from '../utils/cycleCalculator';
import { extractPeriodClusters } from './predictiveEngine';

/**
 * Builds the structured medical data for gynaecological consultation
 */
export function generateMedicalReportData(
  logs: Record<string, DailyLog>,
  settings: UserSettings,
  stats: CycleStatistics,
  options: MedicalReportOptions
): MedicalReportData {
  const monthsBack = options.monthsBack || 6;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const cutoffStr = formatDateKey(cutoffDate);

  const fallbackAnchor = settings.lastPeriodStartDate || formatDateKey(new Date());
  const allClusters = extractPeriodClusters(logs, fallbackAnchor, settings.averagePeriodLength);

  // Filter clusters within requested time span
  const relevantClusters = allClusters.filter((c) => c.startDate >= cutoffStr);
  const totalCyclesRecorded = relevantClusters.length;

  // Build cycle intervals
  const cycles = [];
  for (let i = 0; i < relevantClusters.length; i++) {
    const curr = relevantClusters[i];
    const next = relevantClusters[i + 1];

    let cycleLengthDays = stats.estimatedCycleLength;
    if (next) {
      cycleLengthDays = diffDays(parseDateKey(curr.startDate), parseDateKey(next.startDate));
    }

    // Collect symptoms logged in this cycle
    const cycleEnd = next ? next.startDate : formatDateKey(new Date());
    const cycleSymptoms = new Set<string>();

    for (const [dateKey, log] of Object.entries(logs)) {
      if (dateKey >= curr.startDate && dateKey < cycleEnd) {
        log.symptoms.forEach((s) => cycleSymptoms.add(s.name));
      }
    }

    cycles.push({
      startDate: curr.startDate,
      endDate: curr.endDate,
      cycleLengthDays,
      bleedingDays: curr.bleedingDays,
      predominantFlow: curr.bleedingDays >= 6 ? 'Abundante' : 'Moderado / Normal',
      symptomsList: Array.from(cycleSymptoms)
    });
  }

  // Calculate symptom recurrence across cycles
  const symptomMap = new Map<string, { id: string; name: string; emoji: string; count: number; days: number; severities: string[] }>();

  for (const [dateKey, log] of Object.entries(logs)) {
    if (dateKey >= cutoffStr) {
      log.symptoms.forEach((s) => {
        const existing = symptomMap.get(s.id) || {
          id: s.id,
          name: s.name,
          emoji: s.emoji || '•',
          count: 0,
          days: 0,
          severities: []
        };
        existing.days += 1;
        if (s.severity) existing.severities.push(s.severity);
        symptomMap.set(s.id, existing);
      });
    }
  }

  const symptomFrequencies: SymptomFrequency[] = Array.from(symptomMap.values())
    .map((item) => {
      const percentage = totalCyclesRecorded > 0 ? Math.min(100, Math.round((item.days / Math.max(1, totalCyclesRecorded)) * 100)) : 0;
      const typicalSeverity = item.severities.includes('intense') ? 'Fuerte' : item.severities.includes('mild') ? 'Leve' : 'Moderada';

      return {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        cycleCount: Math.min(totalCyclesRecorded, item.days),
        totalLoggedDays: item.days,
        percentageOfCycles: percentage,
        typicalSeverity
      };
    })
    .sort((a, b) => b.totalLoggedDays - a.totalLoggedDays);

  const variability = stats.variabilityDays;
  let regularityDiagnosis = 'Ciclos regulares';
  if (variability > 3.0) regularityDiagnosis = 'Ciclos con variabilidad moderada';
  if (variability > 4.5) regularityDiagnosis = 'Ciclos irregulares';

  return {
    generatedDate: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    timeSpanLabel: `Últimos ${monthsBack} meses`,
    patientName: options.patientName || settings.userName || 'Usuaria de Aura',
    averageCycleLength: stats.estimatedCycleLength,
    averagePeriodLength: stats.estimatedPeriodLength,
    variabilityDays: stats.variabilityDays,
    regularityDiagnosis,
    lastPeriodStartDate: stats.lastVerifiedPeriodStart,
    totalCyclesRecorded,
    cycles,
    symptomFrequencies
  };
}

/**
 * Generates a clean, professional medical PDF report
 */
export function generateMedicalReportPDF(data: MedicalReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Box / Branding
  doc.setFillColor(248, 245, 242);
  doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(40, 40, 45);
  doc.text('INFORME DE SEGUIMIENTO GINECOLÓGICO', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  doc.text(`Generado: ${data.generatedDate}  |  Periodo: ${data.timeSpanLabel}  |  Paciente: ${data.patientName}`, 20, y + 15);

  y += 30;

  // 1. Biometric Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 35);
  doc.text('1. RESUMEN DE PARÁMETROS DEL CICLO', 14, y);
  y += 4;

  doc.setDrawColor(225, 220, 215);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 55);

  const col1 = 18;
  const col2 = 105;

  doc.text(`• Duración media del ciclo: ${data.averageCycleLength} días (±${data.variabilityDays} d)`, col1, y);
  doc.text(`• Regularidad observada: ${data.regularityDiagnosis}`, col2, y);
  y += 5.5;

  doc.text(`• Duración media de sangrado: ${data.averagePeriodLength} días`, col1, y);
  doc.text(`• Fecha de último inicio de regla: ${data.lastPeriodStartDate}`, col2, y);
  y += 5.5;

  doc.text(`• Total de ciclos registrados en el periodo: ${data.totalCyclesRecorded}`, col1, y);
  y += 9;

  // 2. Cycle History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 35);
  doc.text('2. HISTORIAL CRONOLÓGICO DE CICLOS', 14, y);
  y += 4;

  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Table Header
  doc.setFillColor(242, 239, 235);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 65);

  doc.text('Fecha Inicio', 18, y + 4.8);
  doc.text('Fin Sangrado', 55, y + 4.8);
  doc.text('Días Sangrado', 95, y + 4.8);
  doc.text('Duración Ciclo', 135, y + 4.8);
  doc.text('Flujo', 170, y + 4.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 55);

  if (data.cycles.length === 0) {
    doc.text('No hay suficientes ciclos registrados en este periodo.', 18, y + 5);
    y += 8;
  } else {
    data.cycles.forEach((cycle, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(252, 250, 248);
        doc.rect(14, y, pageWidth - 28, 6.5, 'F');
      }
      doc.text(cycle.startDate, 18, y + 4.5);
      doc.text(cycle.endDate || '-', 55, y + 4.5);
      doc.text(`${cycle.bleedingDays} días`, 95, y + 4.5);
      doc.text(`${cycle.cycleLengthDays} días`, 135, y + 4.5);
      doc.text(cycle.predominantFlow, 170, y + 4.5);
      y += 6.5;
    });
  }

  y += 7;

  // 3. Recurrent Symptoms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 35);
  doc.text('3. SÍNTOMAS PREDOMINANTES Y RECURRENTES', 14, y);
  y += 4;

  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 55);

  if (data.symptomFrequencies.length === 0) {
    doc.text('No se han registrado síntomas físicos o emocionales en este periodo.', 18, y + 4);
    y += 8;
  } else {
    data.symptomFrequencies.slice(0, 6).forEach((symptom) => {
      doc.text(`• ${symptom.name}:`, 18, y + 4);
      doc.text(`Registrado en ${symptom.totalLoggedDays} ocasiones (Intensidad típica: ${symptom.typicalSeverity})`, 75, y + 4);
      y += 5.5;
    });
  }

  y += 8;

  // Doctor Notes Section
  doc.setDrawColor(210, 205, 200);
  doc.roundedRect(14, y, pageWidth - 28, 26, 2, 2, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 110);
  doc.text('OBSERVACIONES CLÍNICAS / ESPACIO MÉDICO:', 18, y + 6);

  // Footer Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 150);
  doc.text(
    'Documento generado de forma privada y local por la aplicación Aura Ciclo. Sin almacenamiento en servidores remotos.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates a clean plain-text summary suitable for copying or instant messaging
 */
export function generateMedicalReportText(data: MedicalReportData): string {
  let text = `📋 INFORME DE SEGUIMIENTO GINECOLÓGICO — AURA\n`;
  text += `📅 Fecha: ${data.generatedDate} (${data.timeSpanLabel})\n`;
  text += `👤 Paciente: ${data.patientName}\n\n`;
  text += `1. PARÁMETROS DEL CICLO:\n`;
  text += `• Duración media del ciclo: ${data.averageCycleLength} días (±${data.variabilityDays} d)\n`;
  text += `• Duración media de sangrado: ${data.averagePeriodLength} días\n`;
  text += `• Regularidad: ${data.regularityDiagnosis}\n`;
  text += `• Último inicio de regla: ${data.lastPeriodStartDate}\n\n`;

  text += `2. HISTORIAL DE CICLOS:\n`;
  if (data.cycles.length === 0) {
    text += `(Sin suficientes ciclos registrados)\n`;
  } else {
    data.cycles.forEach((c) => {
      text += `• Inicio: ${c.startDate} | Sangrado: ${c.bleedingDays} días | Ciclo: ${c.cycleLengthDays} días\n`;
    });
  }

  text += `\n3. SÍNTOMAS PREDOMINANTES:\n`;
  if (data.symptomFrequencies.length === 0) {
    text += `• Ningún síntoma recurrente anotado\n`;
  } else {
    data.symptomFrequencies.slice(0, 5).forEach((s) => {
      text += `• ${s.name}: ${s.totalLoggedDays} días registrados (Intensidad: ${s.typicalSeverity})\n`;
    });
  }

  return text;
}
