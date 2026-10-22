import type { McqQuestion, OpenQuestion, OptionId, Question } from '../content/types';
import type { AttemptResult, Grading } from '../state/schema';

// Deterministic multiple-choice grading and the published open-response rubric.
// Only this module and the feedback components read answer keys; question cards receive
// the public view below until an attempt has been recorded.

export type PublicQuestion =
  | (Omit<McqQuestion, 'answer' | 'options'> & { options: { id: OptionId; text: string }[] })
  | Pick<OpenQuestion, 'id' | 'lessonId' | 'domainId' | 'difficulty' | 'conceptTag' | 'scenario' | 'stem' | 'hint' | 'kind' | 'focus'>;

export function toPublicQuestion(q: Question): PublicQuestion {
  if (q.kind === 'mcq') {
    const { answer: _answer, options, ...rest } = q;
    return { ...rest, options: options.map(({ id, text }) => ({ id, text })) };
  }
  const { id, lessonId, domainId, difficulty, conceptTag, scenario, stem, hint, kind, focus } = q;
  return { id, lessonId, domainId, difficulty, conceptTag, scenario, stem, hint, kind, focus };
}

export function gradeMcq(q: McqQuestion, optionId: OptionId): AttemptResult {
  return { kind: 'mcq', correct: q.answer === optionId };
}

export const UNGRADED_OPEN: AttemptResult = { kind: 'open', grading: 'ungraded', score: null };

export type RubricScore = 0 | 1 | 2 | 3;

export interface RubricLevel {
  score: RubricScore;
  label: string;
  description: string;
}

/** The course-wide open-response policy, specialised with what this question asks for. */
export function rubricFor(q: OpenQuestion): RubricLevel[] {
  return [
    { score: 0, label: 'Not yet', description: 'Incorrect or unsupported diagnosis.' },
    { score: 1, label: 'Label only', description: 'Recognizes a label but misses the mechanism or the required application.' },
    { score: 2, label: 'Meets', description: `Explains the mechanism and applies a suitable control or evidence check. Here: ${q.mechanism} ${q.control}` },
    { score: 3, label: 'Strong', description: `Meets level 2 and also: ${q.extension}` },
  ];
}

export function verdictLabel(score: RubricScore | null): string {
  if (score === null) return 'Not yet reviewed';
  return ['Not yet', 'Label only', 'Meets', 'Strong'][score] ?? 'Not yet reviewed';
}

export const GRADING_LABEL: Record<Grading, string> = {
  ungraded: 'Not yet reviewed',
  'self-reviewed': 'Self-reviewed',
  'ai-graded': 'AI-graded (automated)',
  'human-reviewed': 'Human-reviewed',
};

/** Success for review scheduling and evidence: a correct MCQ or an open response scored 2 or more. */
export function isSuccess(result: AttemptResult): boolean | null {
  if (result.kind === 'mcq') return result.correct;
  if (result.score === null) return null;
  return result.score >= 2;
}
