import type { DailyLog, FlowIntensity, MedicalBiomarkers, SymptomCategory, UserSettings } from '../types/cycle';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../utils/dateKey';
import { importBackupJSON } from '../utils/storage';
import { validateLogs } from '../utils/dataValidation';

export interface ParsedPeriodItem {
  id: string;
  startDate: string;
  endDate?: string;
  flow?: FlowIntensity;
  daysCount: number;
  selected: boolean;
  days?: { date: string; flow?: FlowIntensity }[];
}
export interface ParsedBiomarkerItem {
  id: string; date: string; name: string; value: number; unit: string;
  clinicalInterpretation: string; selected: boolean;
}
export interface ParsedIntimacyItem {
  id: string; date: string; activity: 'unprotected' | 'protected' | 'masturbation' | 'other';
  hadEmergencyPill?: boolean; selected: boolean;
}
export interface ParsedSymptomItem {
  id: string; date: string; name: string; category: string; emoji: string; selected: boolean;
}
export interface ParsedImportData {
  source: 'flo_csv' | 'apple_health' | 'lab_report' | 'text' | 'backup_json' | 'generic_csv';
  sourceLabel: string;
  aiExplanation: string;
  periods: ParsedPeriodItem[];
  biomarkers: ParsedBiomarkerItem[];
  intimacy: ParsedIntimacyItem[];
  symptoms: ParsedSymptomItem[];
  backup?: { settings: UserSettings; logs: Record<string, DailyLog> };
  summary: { cyclesCount: number; periodDaysCount: number; biomarkersCount: number; intimacyCount: number; symptomsCount: number };
}

/** Preserve the calendar day written in exports, including HealthKit timestamps. */
export function normalizeImportDate(raw: string): string | null {
  const value = raw.trim();
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|[ T])/);
  if (iso) return isDateKey(iso[1]) ? iso[1] : null;
  const european = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!european) return null;
  const date = `${european[3]}-${european[2].padStart(2, '0')}-${european[1].padStart(2, '0')}`;
  return isDateKey(date) ? date : null;
}

const normalizeText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function interpretHormone(name: string, value: number, unit: string): string {
  if (!Number.isFinite(value) || value < 0 || !unit.trim()) return 'Resultado no válido: revisa el valor y la unidad del informe.';
  return `${name}: ${value} ${unit}. Compara con el intervalo de referencia del laboratorio y el contexto de la extracción. Un resultado aislado no confirma un diagnóstico ni la ovulación.`;
}

function result(source: ParsedImportData['source'], sourceLabel: string, periods: ParsedPeriodItem[] = [], biomarkers: ParsedBiomarkerItem[] = [], intimacy: ParsedIntimacyItem[] = [], symptoms: ParsedSymptomItem[] = []): ParsedImportData {
  const periodDaysCount = periods.reduce((count, item) => count + item.daysCount, 0);
  return {
    source, sourceLabel, periods, biomarkers, intimacy, symptoms,
    aiExplanation: `Procesado en este dispositivo: ${periodDaysCount} días de sangrado, ${biomarkers.length} resultados, ${intimacy.length} registros de intimidad y ${symptoms.length} síntomas. Revisa las fechas y unidades antes de guardar.`,
    summary: { cyclesCount: periods.length, periodDaysCount, biomarkersCount: biomarkers.length, intimacyCount: intimacy.length, symptomsCount: symptoms.length }
  };
}

function clusterDays(input: { date: string; flow?: FlowIntensity }[]): ParsedPeriodItem[] {
  const days = [...new Map(input.map(day => [day.date, day])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const clusters: ParsedPeriodItem[] = [];
  for (const day of days) {
    const previous = clusters.at(-1);
    if (previous && diffDays(parseDateKey(previous.endDate!), parseDateKey(day.date)) <= 2) {
      previous.days!.push(day);
      previous.endDate = day.date;
      previous.daysCount += 1;
    } else {
      clusters.push({ id: `period_${day.date}`, startDate: day.date, endDate: day.date, flow: day.flow, daysCount: 1, days: [day], selected: true });
    }
  }
  return clusters;
}

/** CSV fields may contain delimiters, escaped quotes and line breaks. */
function parseCSV(content: string): string[][] {
  const firstLine = content.split(/\r?\n/, 1)[0];
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (const char of firstLine) {
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes && char === ',') commas++;
    if (!inQuotes && char === ';') semicolons++;
  }
  const separator = semicolons > commas ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  inQuotes = false;
  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') { field += '"'; index++; }
      else if (inQuotes || field.trim() === '') inQuotes = !inQuotes;
      else field += char;
    } else if (!inQuotes && (char === separator || char === '\n' || char === '\r')) {
      row.push(field.trim()); field = '';
      if (char !== separator) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && content[index + 1] === '\n') index++;
      }
    } else field += char;
  }
  if (inQuotes) throw new Error('El CSV tiene una celda entre comillas sin cerrar.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseFloCSV(content: string): ParsedImportData {
  const rows = parseCSV(content);
  if (rows.length < 2) throw new Error('El CSV está vacío o no contiene filas de datos.');
  const header = rows[0].map(normalizeText);
  const dateCol = header.findIndex(value => /date|fecha/.test(value));
  if (dateCol === -1) throw new Error('Falta la columna de fecha.');
  const periodCol = header.findIndex(value => /period|regla|flow|sangrado/.test(value));
  const symptomCol = header.findIndex(value => /symptom|sintoma/.test(value));
  const sexCol = header.findIndex(value => /sex|intim/.test(value));
  const days: { date: string; flow?: FlowIntensity }[] = [];
  const symptoms: ParsedSymptomItem[] = [];
  const intimacy: ParsedIntimacyItem[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    const date = normalizeImportDate(row[dateCol] ?? '');
    if (!date) throw new Error(`Fecha no válida en la fila ${index + 2}. Usa AAAA-MM-DD o DD/MM/AAAA.`);
    const bleeding = normalizeText(row[periodCol] ?? '');
    if (/^(yes|true|si|1|period|regla|light|medium|heavy|very_heavy|spotting|ligero|medio|moderado|abundante|muy abundante|manchado)$/.test(bleeding)) {
      let flow: FlowIntensity = 'medium';
      if (/heavy|abundante/.test(bleeding)) flow = 'heavy';
      if (/very_heavy|muy abundante/.test(bleeding)) flow = 'very_heavy';
      if (/light|ligero/.test(bleeding)) flow = 'light';
      if (/spotting|manchado/.test(bleeding)) flow = 'spotting';
      days.push({ date, flow });
    }
    for (const name of (row[symptomCol] ?? '').split(/[|+;]/).map(value => value.trim()).filter(Boolean)) {
      symptoms.push({ id: `import_sym_${date}_${normalizeText(name)}`, date, name, category: 'general', emoji: '🌸', selected: true });
    }
    const sex = normalizeText(row[sexCol] ?? '');
    if (sex && !['none', 'no', '0', 'false'].includes(sex)) {
      const activity = /unprotected|sin protec/.test(sex) ? 'unprotected' : /protected|con protec/.test(sex) ? 'protected' : /mastur/.test(sex) ? 'masturbation' : 'other';
      intimacy.push({ id: `import_intimacy_${date}`, date, activity, selected: true });
    }
  }
  return result('flo_csv', 'CSV de seguimiento menstrual', clusterDays(days), [], intimacy, symptoms);
}

function parseAppleHealth(content: string): ParsedImportData {
  if (typeof DOMParser === 'undefined') throw new Error('La importación XML necesita el navegador.');
  if (/<!ENTITY/i.test(content)) throw new Error('El XML contiene entidades externas no admitidas.');
  const document = new DOMParser().parseFromString(content, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('El XML de Salud de Apple no es válido.');
  const days: { date: string; flow?: FlowIntensity }[] = [];
  const intimacy: ParsedIntimacyItem[] = [];
  const biomarkers: ParsedBiomarkerItem[] = [];
  for (const record of Array.from(document.getElementsByTagName('Record'))) {
    const type = record.getAttribute('type') ?? '';
    if (!/MenstrualFlow|IntermenstrualBleeding|SexualActivity|BasalBodyTemperature|Progesterone/.test(type)) continue;
    const date = normalizeImportDate(record.getAttribute('startDate') ?? '');
    if (!date) throw new Error('Un registro de Apple Health contiene una fecha no válida.');
    const value = record.getAttribute('value') ?? '';
    if (/MenstrualFlow/.test(type)) {
      if (value === '5' || /None$/.test(value)) continue;
      const flows: Record<string, FlowIntensity> = { '1': 'medium', '2': 'light', '3': 'medium', '4': 'heavy' };
      const flow = flows[value] ?? (/Light$/.test(value) ? 'light' : /Medium$|Unspecified$/.test(value) ? 'medium' : /Heavy$/.test(value) ? 'heavy' : undefined);
      if (flow) days.push({ date, flow });
    } else if (/IntermenstrualBleeding/.test(type)) {
      days.push({ date, flow: 'spotting' });
    } else if (/SexualActivity/.test(type)) {
      const protection = record.querySelector('MetadataEntry[key="HKSexualActivityProtectionUsed"]')?.getAttribute('value');
      intimacy.push({ id: `apple_intimacy_${date}`, date, activity: protection === '1' ? 'protected' : protection === '0' ? 'unprotected' : 'other', selected: true });
    } else {
      let amount = Number(value);
      if (!value || !Number.isFinite(amount) || amount < 0) throw new Error('Un biomarcador de Apple Health no es válido.');
      let unit = record.getAttribute('unit') ?? '';
      const isTemperature = /BasalBodyTemperature/.test(type);
      if (isTemperature && ['degF', '°F'].includes(unit)) { amount = Math.round(((amount - 32) * 5 / 9) * 100) / 100; unit = '°C'; }
      if (isTemperature && unit === 'degC') unit = '°C';
      const name = isTemperature ? 'Temperatura basal (BBT)' : 'Progesterona';
      biomarkers.push({ id: `apple_${type}_${date}`, date, name, value: amount, unit, clinicalInterpretation: interpretHormone(name, amount, unit), selected: true });
    }
  }
  return result('apple_health', 'Salud de Apple', clusterDays(days), biomarkers, intimacy);
}

function parseLabReport(text: string): ParsedImportData {
  const biomarkers: ParsedBiomarkerItem[] = [];
  const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/);
  const labDate = dateMatch ? normalizeImportDate(dateMatch[0]) : formatDateKey(new Date());
  if (!labDate) throw new Error('La fecha del informe no es válida.');
  const patterns = [
    ['Progesterona', 'progesteron[ae]', 'ng/mL'], ['Estradiol (E2)', '(?:17[- ]beta[- ])?estradiol', 'pg/mL'],
    ['LH', '\\b(?:lh|luteinizante)\\b', 'mIU/mL'], ['FSH', '\\bfsh\\b', 'mIU/mL'],
    ['AMH', '\\b(?:amh|antim[uü]lleriana)\\b', 'ng/mL'], ['Beta-hCG', '\\b(?:beta[- ]?hcg|gonadotropina)\\b', 'mIU/mL'],
    ['Prolactina', 'prolactina', 'ng/mL'], ['TSH', '\\btsh\\b', 'µUI/mL']
  ];
  for (const [name, keyword, fallbackUnit] of patterns) {
    const pattern = new RegExp(`${keyword}(?:\\s*\\([^)]*\\))?\\)?\\s*[:=]?\\s*(?<amount>-?\\d+(?:[.,]\\d+)?)\\s*(?<unit>[a-zA-Zµμ]+/[a-zA-Z]+)?`, 'i');
    const match = pattern.exec(text);
    if (!match?.groups) continue;
    const value = Number(match.groups.amount.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) throw new Error(`Valor no válido para ${name}.`);
    const unit = match.groups.unit || fallbackUnit;
    biomarkers.push({ id: `lab_${name}_${labDate}`, date: labDate, name, value, unit, clinicalInterpretation: interpretHormone(name, value, unit), selected: true });
  }
  const parsed = result('lab_report', 'Informe de laboratorio', [], biomarkers);
  if (!dateMatch) parsed.aiExplanation += ' No se encontró fecha: se propone hoy; compruébala antes de guardar.';
  return parsed;
}

function parseFreeTextNotes(text: string): ParsedImportData {
  const months: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const toDate = (day: string, month: string, year?: string) => normalizeImportDate(`${day}/${months[month.toLowerCase()]}/${year || new Date().getFullYear()}`);
  const periods: ParsedPeriodItem[] = [];
  const intimacy: ParsedIntimacyItem[] = [];
  const range = /(?:regla|periodo|sangrado)\s+(?:del?\s+)?(\d{1,2})\s+(?:al?|hasta)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de\s+)?(\d{4}))?/gi;
  for (const match of text.matchAll(range)) {
    const start = toDate(match[1], match[3], match[4]);
    const end = toDate(match[2], match[3], match[4]);
    if (!start || !end || end < start) throw new Error('El intervalo de regla contiene fechas no válidas.');
    periods.push({ id: `text_period_${start}`, startDate: start, endDate: end, daysCount: diffDays(parseDateKey(start), parseDateKey(end)) + 1, flow: 'medium', selected: true });
  }
  const sex = /(?:relaciones|sexo|intimidad)(?:\s+(sin|con)\s+protecci[oó]n)?\s+(?:el\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de\s+)?(\d{4}))?/gi;
  for (const match of text.matchAll(sex)) {
    const date = toDate(match[2], match[3], match[4]);
    if (!date) throw new Error('La fecha del registro de intimidad no es válida.');
    intimacy.push({ id: `text_intimacy_${date}`, date, activity: !match[1] ? 'other' : match[1].toLowerCase() === 'sin' ? 'unprotected' : 'protected', selected: true });
  }
  return result('text', 'Notas de seguimiento', periods, [], intimacy);
}

export async function parseUniversalData(rawContent: string): Promise<ParsedImportData> {
  if (rawContent.length > 20_000_000) throw new Error('El archivo supera el tamaño permitido de 20 MB.');
  const content = rawContent.replace(/^\uFEFF/, '').trim();
  if (!content) throw new Error('No hay datos para importar.');
  if (content.startsWith('{') || content.startsWith('[')) {
    const backup = importBackupJSON(content);
    const days = Object.values(backup.logs).filter(log => log.isPeriod).map(log => ({ date: log.date, flow: log.flow }));
    const parsed = result('backup_json', 'Copia de seguridad de Aura', clusterDays(days));
    parsed.backup = backup;
    parsed.aiExplanation = `Copia validada con ${Object.keys(backup.logs).length} días. Se conservan notas, síntomas, medicación, intimidad y biomarcadores completos.`;
    return parsed;
  }
  let parsed: ParsedImportData;
  if (/<HealthData|HKCategoryTypeIdentifier|HKQuantityTypeIdentifier/.test(content)) parsed = parseAppleHealth(content);
  else if (/date|fecha|period|regla|flow|sangrado|symptom|sintoma/i.test(content.split(/\r?\n/, 1)[0]) && /[,;]/.test(content.split(/\r?\n/, 1)[0])) parsed = parseFloCSV(content);
  else if (/progesteron|estradiol|luteinizante|\blh\b|\bfsh\b|\bamh\b|antim[uü]lleriana|beta[- ]?hcg|prolactina|\btsh\b/i.test(content)) parsed = parseLabReport(content);
  else parsed = parseFreeTextNotes(content);
  if (![parsed.periods, parsed.biomarkers, parsed.intimacy, parsed.symptoms].some(items => items.length > 0)) {
    throw new Error('No se encontraron registros compatibles. Revisa el formato y las fechas del archivo.');
  }
  return parsed;
}

export function commitConfirmedImport(data: ParsedImportData, currentLogs: Record<string, DailyLog>): Record<string, DailyLog> {
  if (data.source === 'backup_json') {
    if (!data.backup) throw new Error('Faltan los datos de la copia de seguridad.');
    return validateLogs({ ...currentLogs, ...data.backup.logs });
  }
  const updatedLogs = validateLogs(currentLogs);
  const getLog = (date: string): DailyLog => {
    if (!isDateKey(date)) throw new Error('Fecha no válida en la importación.');
    return updatedLogs[date] ??= { date, isPeriod: false, symptoms: [] };
  };
  const timestamp = new Date().toISOString();
  for (const period of data.periods.filter(item => item.selected)) {
    if (!isDateKey(period.startDate) || !Number.isInteger(period.daysCount) || period.daysCount < 1 || period.daysCount > 366) throw new Error('Duración de sangrado no válida.');
    const days = period.days ?? Array.from({ length: period.daysCount }, (_, offset) => {
      const date = parseDateKey(period.startDate); date.setDate(date.getDate() + offset);
      return { date: formatDateKey(date), flow: period.flow };
    });
    for (const [index, day] of days.entries()) {
      const existing = getLog(day.date);
      const flow = day.flow ?? period.flow ?? 'medium';
      updatedLogs[day.date] = { ...existing, isPeriod: flow !== 'spotting', flow, isCycleStart: index === 0 && flow !== 'spotting', recordedAt: timestamp };
    }
  }
  for (const marker of data.biomarkers.filter(item => item.selected)) {
    if (!Number.isFinite(marker.value) || marker.value < 0) throw new Error('Biomarcador no válido.');
    const existing = getLog(marker.date);
    const bio: MedicalBiomarkers = { ...existing.biomarkers };
    const name = normalizeText(marker.name);
    const unit = marker.unit.replace(/mui/ig, 'mIU');
    if (name.includes('progesteron') && ['ng/mL', 'nmol/L'].includes(unit)) bio.progesterone = { value: marker.value, unit: unit as 'ng/mL' | 'nmol/L', interpretation: marker.clinicalInterpretation };
    else if (name.includes('estradiol') && ['pg/mL', 'pmol/L'].includes(unit)) bio.estradiol = { value: marker.value, unit: unit as 'pg/mL' | 'pmol/L' };
    else if (name === 'lh' && unit === 'mIU/mL') bio.lh = { value: marker.value, unit };
    else if (name === 'fsh' && unit === 'mIU/mL') bio.fsh = { value: marker.value, unit };
    else if (name === 'amh' && unit === 'ng/mL') bio.amh = { value: marker.value, unit };
    else if (/beta|hcg/.test(name) && unit === 'mIU/mL') bio.betaHcg = { value: marker.value, unit };
    else if (/temperatura|bbt/.test(name) && unit === '°C') {
      if (marker.value < 25 || marker.value > 45) throw new Error('Temperatura basal fuera del intervalo admitido.');
      bio.bbt = marker.value;
      existing.bbt = marker.value;
    } else {
      // Preserve unsupported analyses and units verbatim rather than discarding or relabelling them.
      const line = `${marker.name}: ${marker.value} ${marker.unit}`;
      bio.notes = [...new Set([...(bio.notes?.split('\n') ?? []), line])].join('\n');
    }
    updatedLogs[marker.date] = { ...existing, biomarkers: bio, recordedAt: timestamp };
  }
  for (const item of data.intimacy.filter(value => value.selected)) {
    const existing = getLog(item.date);
    updatedLogs[item.date] = { ...existing, intimacy: item.activity === 'unprotected' || item.activity === 'protected' ? item.activity : 'none', intimacyLog: { ...existing.intimacyLog, activity: item.activity, ...(item.hadEmergencyPill === undefined ? {} : { hadEmergencyPill: item.hadEmergencyPill }) }, recordedAt: timestamp };
  }
  for (const symptom of data.symptoms.filter(item => item.selected)) {
    const existing = getLog(symptom.date);
    if (!existing.symptoms.some(item => item.id === symptom.id || normalizeText(item.name) === normalizeText(symptom.name))) {
      existing.symptoms.push({ id: symptom.id, name: symptom.name, category: (symptom.category || 'general') as SymptomCategory, emoji: symptom.emoji || '🌸' });
    }
    existing.recordedAt = timestamp;
  }
  return validateLogs(updatedLogs);
}
