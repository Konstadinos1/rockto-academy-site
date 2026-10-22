import { QUESTIONS } from '../content/index';
import type { Question } from '../content/types';
import type { Attempt, Progress, ReviewItem } from '../state/schema';
import { addDays, isDue } from './dates';
import { isSuccess } from './grading';

// A simple, explainable spaced-review schedule. After an unsuccessful attempt the lesson's
// concept is scheduled after the first interval; each successful review moves it to the next
// interval; another miss starts again. The intervals are an instructional choice, configurable
// in Settings, not a claim of optimal timing.

export function applyAttemptToReviews(progress: Progress, question: Question, attempt: Attempt): Record<string, ReviewItem> {
  const success = isSuccess(attempt.result);
  if (success === null || attempt.context.startsWith('assessment')) return progress.reviews;
  const intervals = progress.settings.reviewIntervals;
  const key = question.lessonId;
  const existing = progress.reviews[key];
  const history = [...(existing?.history ?? []), { at: attempt.at, questionId: question.id, success }].slice(-50);

  if (!success) {
    const item: ReviewItem = {
      key,
      lessonId: question.lessonId,
      conceptTag: question.conceptTag,
      sourceQuestionId: question.id,
      missedAt: attempt.at,
      step: 0,
      dueAt: addDays(attempt.at, intervals[0] ?? 1),
      retired: false,
      history,
    };
    return { ...progress.reviews, [key]: item };
  }
  if (!existing || existing.retired || attempt.context !== 'review') {
    return existing ? { ...progress.reviews, [key]: { ...existing, history } } : progress.reviews;
  }
  const step = existing.step + 1;
  const retired = step >= intervals.length;
  const next = retired ? existing.dueAt : addDays(attempt.at, intervals[step] ?? 30);
  return { ...progress.reviews, [key]: { ...existing, step, dueAt: next, retired, history } };
}

export function dueReviews(progress: Progress, now: Date = new Date()): ReviewItem[] {
  return Object.values(progress.reviews)
    .filter((r) => !r.retired && isDue(r.dueAt, now))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function upcomingReviews(progress: Progress, now: Date = new Date()): ReviewItem[] {
  return Object.values(progress.reviews)
    .filter((r) => !r.retired && !isDue(r.dueAt, now))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** Picks a different question on the same lesson concept, so a missed idea is revisited through a new scenario. */
export function pickReviewQuestion(item: ReviewItem, progress: Progress): Question | undefined {
  const pool = QUESTIONS.filter((q) => q.lessonId === item.lessonId && q.id !== item.sourceQuestionId);
  const recentlyUsed = new Set(item.history.slice(-2).map((h) => h.questionId));
  const answeredWell = new Set(
    progress.attempts.filter((a) => isSuccess(a.result) === true).map((a) => a.questionId),
  );
  const ranked = [...pool].sort((a, b) => {
    const score = (q: Question) => (recentlyUsed.has(q.id) ? 2 : 0) + (answeredWell.has(q.id) ? 1 : 0);
    return score(a) - score(b) || a.id.localeCompare(b.id);
  });
  return ranked[0];
}
