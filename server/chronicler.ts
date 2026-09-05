/**
 * Backend API handler for Agente Cronista
 * Can be run in Node.js, Express, Fastify, Next.js or Edge functions
 */
import { analyzeChronicleNote } from '../src/services/chroniclerAgent';
import type { ChroniclerContext, ChroniclerResponse } from '../src/types/chronicler';

export interface ChronicleRequestBody {
  text: string;
  context?: Partial<ChroniclerContext>;
}

export async function handleChronicleRequest(body: ChronicleRequestBody): Promise<ChroniclerResponse> {
  const text = typeof body?.text === 'string' ? body.text : '';
  try {
    if (!text.trim() || text.length > 20000) throw new Error('Invalid note');
    const today = new Date().toISOString().split('T')[0];
    const fullContext: ChroniclerContext = {
      todayDate: body.context?.todayDate || today,
      selectedDate: body.context?.selectedDate || today,
      currentDayOfCycle: body.context?.currentDayOfCycle,
      currentPhase: body.context?.currentPhase
    };

    return await analyzeChronicleNote(text, fullContext);
  } catch {
    return {
      success: false,
      data: {
        targetDate: new Date().toISOString().split('T')[0],
        period: { detected: false, isPeriod: false },
        physicalSymptoms: [],
        moods: [],
        energy: null,
        notes: text.slice(0, 20000),
        confidence: 0,
        extractedSummary: []
      },
      empathyMessage: 'No se ha podido interpretar tu nota. Revísala y vuelve a intentarlo.',
      error: 'No se ha podido procesar la nota.'
    };
  }
}
