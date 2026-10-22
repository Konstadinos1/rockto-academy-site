import { DOMAINS, LESSONS, QUESTION_BY_ID, QUESTIONS } from '../content/index';
import type { DomainId } from '../content/types';
import type { Attempt, Grading, Progress } from '../state/schema';
import { daysBetween } from './dates';

// Course evidence rules. These are this course's instructional thresholds, published on the
// Progress page; they are not an industry certification standard.

export const THRESHOLDS = {
  /** Minimum first-attempt multiple-choice accuracy for a domain to count as Demonstrated. */
  mcqAccuracy: 0.8,
  /** Minimum number of first-attempt multiple-choice answers before accuracy is judged. */
  minFirstAttemptMcq: 20,
  /** Distinct open responses (applied or advanced) scored at least 2. */
  openResponses: 2,
  openMinScore: 2,
  /** Correct spaced-retrieval answers needed after the delay for Reviewed. */
  reviewedCorrect: 3,
  reviewedDelayDays: 7,
} as const;

export type DomainState = 'not-assessed' | 'practiced' | 'demonstrated' | 'reviewed';

export const DOMAIN_STATE_LABEL: Record<DomainState, string> = {
  'not-assessed': 'Not assessed',
  practiced: 'Practiced',
  demonstrated: 'Demonstrated',
  reviewed: 'Reviewed',
};

export interface McqStats {
  correct: number;
  total: number;
}

export interface DomainEvidence {
  domainId: DomainId;
  state: DomainState;
  lessonsCompleted: number;
  lessonsTotal: number;
  firstAttemptMcq: McqStats;
  retryMcq: McqStats;
  openQualifying: { questionId: string; score: number; grading: Grading }[];
  openUngraded: number;
  selfReviewedOnly: boolean;
  spacedCorrect: number;
  missing: string[];
}

const PRACTICE_CONTEXTS = new Set(['practice', 'review']);

function practiceAttempts(progress: Progress, domainId: DomainId): Attempt[] {
  return progress.attempts.filter(
    (a) => PRACTICE_CONTEXTS.has(a.context) && QUESTION_BY_ID.get(a.questionId)?.domainId === domainId,
  );
}

function mcqStats(attempts: Attempt[]): McqStats {
  const mcq = attempts.filter((a) => a.result.kind === 'mcq');
  return { correct: mcq.filter((a) => a.result.kind === 'mcq' && a.result.correct).length, total: mcq.length };
}

function openQualifying(attempts: Attempt[]): DomainEvidence['openQualifying'] {
  const best = new Map<string, { questionId: string; score: number; grading: Grading }>();
  for (const a of attempts) {
    const q = QUESTION_BY_ID.get(a.questionId);
    if (a.result.kind !== 'open' || a.result.score === null || !q || q.difficulty === 'foundational') continue;
    if (a.result.score < THRESHOLDS.openMinScore) continue;
    const prev = best.get(a.questionId);
    if (!prev || a.result.score > prev.score) best.set(a.questionId, { questionId: a.questionId, score: a.result.score, grading: a.result.grading });
  }
  return [...best.values()];
}

function spacedCorrect(attempts: Attempt[]): number {
  if (!attempts.length) return 0;
  const firstAt = attempts.reduce((min, a) => (a.at < min ? a.at : min), attempts[0]?.at ?? '');
  return attempts.filter(
    (a) => !a.first && daysBetween(firstAt, a.at) >= THRESHOLDS.reviewedDelayDays && a.result.kind === 'mcq' && a.result.correct,
  ).length;
}

export function domainEvidence(progress: Progress, domainId: DomainId): DomainEvidence {
  const lessons = LESSONS.filter((l) => l.domainId === domainId);
  const lessonsCompleted = lessons.filter((l) => progress.completed[l.id]).length;
  const attempts = practiceAttempts(progress, domainId);
  const firstAttemptMcq = mcqStats(attempts.filter((a) => a.first));
  const retryMcq = mcqStats(attempts.filter((a) => !a.first));
  const qualifying = openQualifying(attempts);
  const openUngraded = attempts.filter((a) => a.result.kind === 'open' && a.result.grading === 'ungraded').length;
  const missing: string[] = [];
  if (lessonsCompleted < lessons.length) missing.push(`Complete ${lessons.length - lessonsCompleted} more lesson(s).`);
  if (firstAttemptMcq.total < THRESHOLDS.minFirstAttemptMcq) {
    missing.push(`Answer ${THRESHOLDS.minFirstAttemptMcq - firstAttemptMcq.total} more multiple-choice question(s) for the first time.`);
  } else if (firstAttemptMcq.correct / firstAttemptMcq.total < THRESHOLDS.mcqAccuracy) {
    missing.push('Raise first-attempt multiple-choice accuracy to 80% (only new first attempts change it).');
  }
  if (qualifying.length < THRESHOLDS.openResponses) {
    missing.push(`Score at least 2 on ${THRESHOLDS.openResponses - qualifying.length} more different applied or advanced open response(s).`);
  }
  const spaced = spacedCorrect(attempts);
  const demonstrated = missing.length === 0;
  let state: DomainState = attempts.length ? 'practiced' : 'not-assessed';
  if (demonstrated) state = spaced >= THRESHOLDS.reviewedCorrect ? 'reviewed' : 'demonstrated';
  if (demonstrated && state === 'demonstrated') {
    missing.push(`For Reviewed: ${THRESHOLDS.reviewedCorrect - spaced} more correct retry or review answer(s) at least ${THRESHOLDS.reviewedDelayDays} days after your first attempt in this domain.`);
  }
  return {
    domainId,
    state,
    lessonsCompleted,
    lessonsTotal: lessons.length,
    firstAttemptMcq,
    retryMcq,
    openQualifying: qualifying,
    openUngraded,
    selfReviewedOnly: qualifying.length > 0 && qualifying.every((q) => q.grading === 'self-reviewed'),
    spacedCorrect: spaced,
    missing,
  };
}

export function allDomainEvidence(progress: Progress): DomainEvidence[] {
  return DOMAINS.map((d) => domainEvidence(progress, d.id));
}

export function isFirstAttempt(progress: Progress, questionId: string): boolean {
  return !progress.attempts.some((a) => a.questionId === questionId);
}

export function latestAttempt(progress: Progress, questionId: string): Attempt | undefined {
  for (let i = progress.attempts.length - 1; i >= 0; i--) {
    const a = progress.attempts[i];
    if (a && a.questionId === questionId) return a;
  }
  return undefined;
}

/** Questions whose most recent practice attempt was unsuccessful (or self-scored below 2). */
export function mistakeQuestionIds(progress: Progress): string[] {
  const ids = new Set(progress.attempts.filter((a) => PRACTICE_CONTEXTS.has(a.context)).map((a) => a.questionId));
  return [...ids].filter((id) => {
    const last = latestAttempt(progress, id);
    if (!last) return false;
    if (last.result.kind === 'mcq') return !last.result.correct;
    return last.result.score !== null && last.result.score < 2;
  });
}

export function nextRecommendedLesson(progress: Progress): string | undefined {
  return LESSONS.find((l) => !progress.completed[l.id])?.id;
}

export function lastVisitedLesson(progress: Progress): string | undefined {
  let best: { id: string; last: string } | undefined;
  for (const [id, v] of Object.entries(progress.visits)) if (!best || v.last > best.last) best = { id, last: v.last };
  return best?.id;
}

export function totals(progress: Progress) {
  const practice = progress.attempts.filter((a) => PRACTICE_CONTEXTS.has(a.context));
  return {
    lessonsCompleted: Object.keys(progress.completed).length,
    lessonsTotal: LESSONS.length,
    questionsTotal: QUESTIONS.length,
    questionsAttempted: new Set(practice.map((a) => a.questionId)).size,
    firstMcq: mcqStats(practice.filter((a) => a.first)),
    retryMcq: mcqStats(practice.filter((a) => !a.first)),
    openScored: practice.filter((a) => a.result.kind === 'open' && a.result.score !== null).length,
    openUngraded: practice.filter((a) => a.result.kind === 'open' && a.result.grading === 'ungraded').length,
  };
}
