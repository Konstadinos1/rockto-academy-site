import { QUESTIONS } from '../content/index';
import type { McqQuestion, OpenQuestion } from '../content/types';
import type { Attempt } from '../state/schema';

// Shared builders for unit tests. Attempts are synthetic and reference real question ids.

export const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z');

export function mcqIn(domainId: string): McqQuestion[] {
  return QUESTIONS.filter((q): q is McqQuestion => q.kind === 'mcq' && q.domainId === domainId);
}

export function openIn(domainId: string): OpenQuestion[] {
  return QUESTIONS.filter((q): q is OpenQuestion => q.kind === 'open' && q.domainId === domainId);
}

export function wrongOption(q: McqQuestion): McqQuestion['answer'] {
  return (['a', 'b', 'c', 'd'] as const).find((o) => o !== q.answer) ?? 'a';
}

let counter = 0;

export function mcqAttempt(q: McqQuestion, correct: boolean, at: string, first = true, context: Attempt['context'] = 'practice'): Attempt {
  counter += 1;
  const optionId = correct ? q.answer : wrongOption(q);
  return {
    id: `at_test${counter}`,
    questionId: q.id,
    sessionId: 'ps_test',
    context,
    at,
    first,
    hintUsed: false,
    response: { kind: 'mcq', optionId },
    result: { kind: 'mcq', correct },
  };
}

export function openAttempt(q: OpenQuestion, score: 0 | 1 | 2 | 3 | null, at: string): Attempt {
  counter += 1;
  return {
    id: `at_test${counter}`,
    questionId: q.id,
    sessionId: 'ps_test',
    context: 'practice',
    at,
    first: true,
    hintUsed: false,
    response: { kind: 'open', text: 'A synthetic answer.' },
    result: score === null ? { kind: 'open', grading: 'ungraded', score: null } : { kind: 'open', grading: 'self-reviewed', score },
  };
}
