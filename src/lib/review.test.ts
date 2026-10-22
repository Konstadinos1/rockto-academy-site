import { describe, expect, it } from 'vitest';
import { QUESTION_BY_ID } from '../content/index';
import type { McqQuestion } from '../content/types';
import { emptyProgress, type Progress } from '../state/schema';
import { FIXED_NOW, mcqAttempt } from '../test/fixtures';
import { applyAttemptToReviews, dueReviews, pickReviewQuestion, upcomingReviews } from './review';

const q = QUESTION_BY_ID.get('D02-L01-Q1') as McqQuestion;
const at = (iso: string) => new Date(iso).toISOString();

function afterAttempt(p: Progress, attempt: ReturnType<typeof mcqAttempt>): Progress {
  const next = { ...p, attempts: [...p.attempts, attempt] };
  return { ...next, reviews: applyAttemptToReviews(next, q, attempt) };
}

describe('review schedule', () => {
  it('schedules the lesson concept one day after a miss with default intervals', () => {
    const p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T09:00:00Z')));
    const item = p.reviews['D02-L01'];
    expect(item?.dueAt).toBe(at('2026-10-02T09:00:00Z'));
    expect(item?.step).toBe(0);
  });

  it('advances 1 → 3 → 7 → 14 → 30 days on successful reviews, then retires', () => {
    let p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T00:00:00Z')));
    const expected = [3, 7, 14, 30];
    let clock = new Date('2026-10-02T00:00:00Z');
    for (const days of expected) {
      p = afterAttempt(p, mcqAttempt(q, true, clock.toISOString(), false, 'review'));
      const item = p.reviews['D02-L01'];
      expect(item?.dueAt).toBe(new Date(clock.getTime() + days * 86_400_000).toISOString());
      clock = new Date(item?.dueAt ?? clock);
    }
    p = afterAttempt(p, mcqAttempt(q, true, clock.toISOString(), false, 'review'));
    expect(p.reviews['D02-L01']?.retired).toBe(true);
  });

  it('restarts the schedule after another miss', () => {
    let p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T00:00:00Z')));
    p = afterAttempt(p, mcqAttempt(q, true, at('2026-10-02T00:00:00Z'), false, 'review'));
    p = afterAttempt(p, mcqAttempt(q, false, at('2026-10-05T00:00:00Z'), false, 'review'));
    expect(p.reviews['D02-L01']?.step).toBe(0);
    expect(p.reviews['D02-L01']?.dueAt).toBe(at('2026-10-06T00:00:00Z'));
  });

  it('does not advance the schedule on ordinary practice successes', () => {
    let p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T00:00:00Z')));
    p = afterAttempt(p, mcqAttempt(q, true, at('2026-10-02T00:00:00Z'), false, 'practice'));
    expect(p.reviews['D02-L01']?.step).toBe(0);
  });

  it('ignores assessment attempts so the assessment does not create review items', () => {
    const p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T00:00:00Z'), true, 'assessment-coached'));
    expect(p.reviews).toEqual({});
  });

  it('respects custom intervals from settings', () => {
    const base = emptyProgress(FIXED_NOW);
    base.settings.reviewIntervals = [2, 5];
    const p = afterAttempt(base, mcqAttempt(q, false, at('2026-10-01T00:00:00Z')));
    expect(p.reviews['D02-L01']?.dueAt).toBe(at('2026-10-03T00:00:00Z'));
  });

  it('separates due from upcoming items and picks a different question on the same concept', () => {
    const p = afterAttempt(emptyProgress(FIXED_NOW), mcqAttempt(q, false, at('2026-10-01T00:00:00Z')));
    expect(dueReviews(p, new Date('2026-10-03T00:00:00Z'))).toHaveLength(1);
    expect(upcomingReviews(p, new Date('2026-10-01T12:00:00Z'))).toHaveLength(1);
    const item = p.reviews['D02-L01'];
    if (!item) throw new Error('missing review item');
    const pick = pickReviewQuestion(item, p);
    expect(pick?.lessonId).toBe('D02-L01');
    expect(pick?.id).not.toBe(q.id);
  });
});
