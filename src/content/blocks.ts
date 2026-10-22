import type { Block, FlowStep, McqDraft, OpenDraft, OptionId, TraceLine, Difficulty } from './types';

// Small constructors that keep authored content readable. They only build plain data.

export const p = (text: string): Block => ({ t: 'p', text });
export const h = (text: string): Block => ({ t: 'h', text });
export const ul = (...items: string[]): Block => ({ t: 'ul', items });
export const ol = (...items: string[]): Block => ({ t: 'ol', items });
export const note = (text: string): Block => ({ t: 'callout', tone: 'note', text });
export const warn = (text: string): Block => ({ t: 'callout', tone: 'warn', text });
export const key = (text: string): Block => ({ t: 'callout', tone: 'key', text });

export function table(caption: string, head: string[], rows: string[][]): Block {
  return { t: 'table', caption, head, rows };
}

export function code(caption: string, lang: string, source: string, notes?: string[]): Block {
  return notes ? { t: 'code', caption, lang, code: source, notes } : { t: 'code', caption, lang, code: source };
}

export function trace(caption: string, lines: TraceLine[]): Block {
  return { t: 'trace', caption, lines };
}

export function flow(caption: string, steps: FlowStep[]): Block {
  return { t: 'flow', caption, steps };
}

type OptionPair = [text: string, explanation: string];

interface McqExtras {
  scenario?: Block[];
  hint?: string;
  conceptTag?: string;
  sourceIds?: string[];
}

const OPTION_IDS: readonly OptionId[] = ['a', 'b', 'c', 'd'];

export function mcq(
  difficulty: Difficulty,
  stem: string,
  options: [OptionPair, OptionPair, OptionPair, OptionPair],
  answer: OptionId,
  extras: McqExtras = {},
): McqDraft {
  const built = options.map(([text, explanation], i) => ({ id: OPTION_IDS[i] as OptionId, text, explanation }));
  return { difficulty, stem, options: built as McqDraft['options'], answer, ...extras };
}

interface OpenParts {
  mechanism: string;
  control: string;
  extension: string;
  exemplar: string;
  followUp: string;
  scenario?: Block[];
  hint?: string;
  conceptTag?: string;
  sourceIds?: string[];
}

export function openQ(focus: 'diagnosis' | 'control', difficulty: Difficulty, stem: string, parts: OpenParts): OpenDraft {
  return { focus, difficulty, stem, ...parts };
}
