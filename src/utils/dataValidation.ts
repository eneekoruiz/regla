import type { DailyLog, UserSettings } from '../types/cycle';
import type { QuizResult } from '../types/quiz';
import { isDateKey } from './dateKey';

type DataObject = Record<string, unknown>;
type Rule = (value: unknown) => boolean;
const text: Rule = value => typeof value === 'string';
const bool: Rule = value => typeof value === 'boolean';
const number = (min: number, max: number): Rule => value => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const oneOf = (...values: string[]): Rule => value => typeof value === 'string' && values.includes(value);
const flow = oneOf('spotting', 'light', 'medium', 'heavy', 'very_heavy');
const dateOrEmpty: Rule = value => value === '' || isDateKey(value);

export function isObject(value: unknown): value is DataObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseDataJSON(raw: string): unknown {
  return JSON.parse(raw, (key, value: unknown) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('La copia contiene una propiedad no permitida.');
    }
    return value;
  });
}

function check(value: unknown, fields: Record<string, Rule>, label: string): asserts value is DataObject {
  if (!isObject(value)) throw new Error(`${label}: se esperaba un objeto.`);
  for (const [key, rule] of Object.entries(fields)) {
    if (value[key] !== undefined && !rule(value[key])) throw new Error(`${label}: campo ${key} no válido.`);
  }
}

function nested(value: unknown, fields: Record<string, Rule>, label: string): void {
  if (value !== undefined) check(value, fields, label);
}

export function validateSettings(value: unknown, defaults: UserSettings): UserSettings {
  check(value, {
    userName: text, averageCycleLength: number(15, 120), averagePeriodLength: number(1, 30),
    lutealPhaseLength: number(1, 30), lastPeriodStartDate: dateOrEmpty,
    theme: oneOf('light', 'dark', 'system', 'refugio'), hasPCOS: bool,
    worstDayOfPeriod: number(1, 30), typicalFlowIntensity: flow,
    regularityPreference: oneOf('very_regular', 'mostly_regular', 'irregular', 'pcos'),
    completedOnboardingCategories: v => Array.isArray(v) && v.every(oneOf('cycle', 'body', 'lifestyle'))
  }, 'Preferencias');
  nested(value.cycleProfile, {
    regularity: oneOf('regular', 'mostly_regular', 'irregular', 'pcos'),
    birthControl: oneOf('none', 'pill', 'iud_hormonal', 'iud_copper', 'implant', 'condom', 'other'),
    typicalCramps: oneOf('none', 'mild', 'moderate', 'severe'),
    cycleGoal: oneOf('track_health', 'prevent_pregnancy', 'trying_to_conceive'),
    takesDailyMedication: bool, birthControlReason: oneOf('contraception', 'pcos', 'endometriosis', 'acne', 'heavy_bleeding', 'other')
  }, 'Perfil del ciclo');
  nested(value.bodyProfile, { birthYear: number(1900, 9999), age: number(0, 130), heightCm: number(30, 300), weightKg: number(1, 600) }, 'Perfil corporal');
  nested(value.lifestyleProfile, {
    activityLevel: oneOf('sedentary', 'moderate', 'active', 'athlete'), stressLevel: oneOf('low', 'moderate', 'high'),
    sleepHoursAvg: number(0, 24), caffeineIntake: oneOf('none', 'low', 'moderate', 'high')
  }, 'Estilo de vida');
  nested(value.notificationPreferences, {
    enabled: bool, alertTime: v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
    daysBeforePeriod: number(0, 30), notifyFertileWindow: bool, discreetMode: bool
  }, 'Notificaciones');
  const result = { ...defaults, ...value } as UserSettings;
  if (result.averagePeriodLength > result.averageCycleLength || result.lutealPhaseLength >= result.averageCycleLength) {
    throw new Error('Las duraciones de las fases no pueden superar la duración del ciclo.');
  }
  return structuredClone(result);
}

export function validateQuizResult(value: unknown): QuizResult {
  if (!isObject(value) || typeof value.quizId !== 'string' || !value.quizId.trim() || value.quizId.length > 128) {
    throw new Error('Identificador de cuestionario no válido.');
  }
  if (typeof value.completedAt !== 'string' || !isDateKey(value.completedAt.slice(0, 10)) || !value.completedAt.includes('T') || !Number.isFinite(Date.parse(value.completedAt))) {
    throw new Error('Fecha de finalización del cuestionario no válida.');
  }
  if (!isObject(value.answers)) throw new Error('Respuestas de cuestionario no válidas.');
  const answers = Object.entries(value.answers);
  if (answers.length === 0 || answers.length > 100) throw new Error('El cuestionario no contiene una lista de respuestas válida.');
  for (const [key, answer] of answers) {
    if (!key.trim() || key.length > 128 || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Pregunta no válida.');
    if (!(typeof answer === 'boolean' || (typeof answer === 'string' && answer.length <= 2000) || (typeof answer === 'number' && Number.isFinite(answer)))) {
      throw new Error('Respuesta no válida.');
    }
  }
  if (value.totalScore !== undefined && !(typeof value.totalScore === 'number' && Number.isFinite(value.totalScore))) throw new Error('Puntuación no válida.');
  return {
    quizId: value.quizId,
    completedAt: value.completedAt,
    answers: Object.fromEntries(answers) as QuizResult['answers'],
    ...(value.totalScore === undefined ? {} : { totalScore: value.totalScore as number })
  };
}

export function validateLogs(value: unknown): Record<string, DailyLog> {
  if (!isObject(value) || Object.keys(value).length > 50000) throw new Error('Registros no válidos.');
  const result: Record<string, DailyLog> = {};
  for (const [date, candidate] of Object.entries(value)) {
    if (!isDateKey(date)) throw new Error('El historial contiene una fecha no válida.');
    check(candidate, {
      date: v => v === date, isPeriod: bool, flow, isIrregularBleeding: bool, isCycleStart: bool,
      notes: text, weight: number(1, 600), sleepHours: number(0, 24), hydrationGlasses: number(0, 100),
      intimacy: oneOf('protected', 'unprotected', 'none'), cervicalMucus: oneOf('dry', 'sticky', 'creamy', 'egg_white'),
      bbt: number(25, 45), recordedAt: v => typeof v === 'string' && Number.isFinite(Date.parse(v))
    }, 'Registro');
    if (typeof candidate.isPeriod !== 'boolean') throw new Error('Falta el estado menstrual del registro.');
    if (candidate.quizResults !== undefined) {
      if (!Array.isArray(candidate.quizResults) || candidate.quizResults.length > 1000) throw new Error('Historial de cuestionarios no válido.');
      candidate.quizResults.forEach(validateQuizResult);
    }
    const symptoms = candidate.symptoms ?? [];
    if (!Array.isArray(symptoms) || symptoms.length > 1000) throw new Error('Lista de síntomas no válida.');
    for (const symptom of symptoms) {
      check(symptom, {
        id: text, name: text, emoji: text, severity: oneOf('mild', 'moderate', 'intense'),
        category: oneOf('pain', 'flow', 'mood', 'energy', 'digestion', 'sleep', 'skin', 'mucus', 'cravings', 'libido', 'temperature', 'intimacy', 'contraception', 'ovulation_test', 'general', 'other')
      }, 'Síntoma');
      if (!symptom.id || !symptom.name || !symptom.category) throw new Error('Síntoma incompleto.');
    }
    nested(candidate.intimacyLog, {
      activity: oneOf('unprotected', 'protected', 'masturbation', 'other', 'none'),
      hadEmergencyPill: bool, hadOrgasm: bool, hadPain: bool, libido: oneOf('high', 'normal', 'low'), notes: text
    }, 'Intimidad');
    if (candidate.medications !== undefined) {
      if (!Array.isArray(candidate.medications)) throw new Error('Lista de medicación no válida.');
      for (const medication of candidate.medications) {
        check(medication, { id: text, name: text, type: oneOf('pill', 'supplement', 'medication'), taken: bool, time: text, dose: text, target: text }, 'Medicación');
        if (!medication.id || !medication.name || typeof medication.taken !== 'boolean') throw new Error('Medicación incompleta.');
      }
    }
    if (candidate.biomarkers !== undefined) {
      check(candidate.biomarkers, { bbt: number(25, 45), notes: text }, 'Biomarcadores');
      const units: Record<string, string[]> = {
        progesterone: ['ng/mL', 'nmol/L'], estradiol: ['pg/mL', 'pmol/L'], lh: ['mIU/mL'],
        fsh: ['mIU/mL'], amh: ['ng/mL'], betaHcg: ['mIU/mL']
      };
      for (const [name, choices] of Object.entries(units)) {
        const marker = candidate.biomarkers[name];
        if (marker === undefined) continue;
        check(marker, { value: number(0, 1e9), unit: oneOf(...choices), interpretation: text, isPositiveSurge: bool, isPregnant: bool }, 'Biomarcador');
        if (marker.value === undefined || marker.unit === undefined) throw new Error('Biomarcador incompleto.');
      }
    }
    result[date] = structuredClone({ ...candidate, date, symptoms }) as DailyLog;
  }
  return result;
}
