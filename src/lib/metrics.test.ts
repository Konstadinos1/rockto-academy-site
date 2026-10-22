import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/index';
import { emptyProgress, type Progress } from '../state/schema';
import { FIXED_NOW, mcqAttempt, mcqIn, openAttempt, openIn } from '../test/fixtures';
import { domainEvidence, mistakeQuestionIds, THRESHOLDS, totals } from './metrics';

const D = 'D03';
const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n)).toISOString();

function completeDomain(p: Progress): Progress {
  const completed = { ...p.completed };
  for (const l of LESSONS.filter((x) => x.domainId === D)) completed[l.id] = day(0);
  return { ...p, completed };
}

function withFirstMcq(p: Progress, correct: number, total: number): Progress {
  const qs = mcqIn(D).slice(0, total);
  return { ...p, attempts: [...p.attempts, ...qs.map((q, i) => mcqAttempt(q, i < correct, day(0)))] };
}

function withOpen(p: Progress, scores: (0 | 1 | 2 | 3 | null)[]): Progress {
  const qs = openIn(D).filter((q) => q.difficulty !== 'foundational');
  return { ...p, attempts: [...p.attempts, ...scores.map((s, i) => openAttempt(qs[i] ?? qs[0]!, s, day(1)))] };
}

describe('domain evidence thresholds', () => {
  it('starts as Not assessed', () => {
    expect(domainEvidence(emptyProgress(FIXED_NOW), D).state).toBe('not-assessed');
  });

  it('is Practiced, not Demonstrated, when lessons are incomplete', () => {
    const p = withOpen(withFirstMcq(emptyProgress(FIXED_NOW), 20, 20), [2, 3]);
    const ev = domainEvidence(p, D);
    expect(ev.state).toBe('practiced');
    expect(ev.missing[0]).toMatch(/Complete 10 more lesson/);
  });

  it('becomes Demonstrated at exactly 80% of 20 first-attempt MCQs plus two qualifying open responses', () => {
    const p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 16, 20), [2, 2]);
    expect(domainEvidence(p, D).state).toBe('demonstrated');
  });

  it('stays Practiced just below the accuracy threshold', () => {
    const p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 15, 20), [2, 2]);
    expect(domainEvidence(p, D).state).toBe('practiced');
  });

  it('does not count ungraded or low-scored open responses', () => {
    const p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 20, 20), [null, 1]);
    const ev = domainEvidence(p, D);
    expect(ev.state).toBe('practiced');
    expect(ev.openUngraded).toBe(1);
  });

  it('flags evidence that rests only on self-review', () => {
    const p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 20, 20), [3, 2]);
    expect(domainEvidence(p, D).selfReviewedOnly).toBe(true);
  });

  it('becomes Reviewed after enough correct retries at least seven days after the first attempt', () => {
    let p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 20, 20), [2, 2]);
    const retries = mcqIn(D).slice(0, THRESHOLDS.reviewedCorrect).map((q) => mcqAttempt(q, true, day(8), false, 'review'));
    p = { ...p, attempts: [...p.attempts, ...retries] };
    expect(domainEvidence(p, D).state).toBe('reviewed');
  });

  it('does not count early retries toward Reviewed', () => {
    let p = withOpen(withFirstMcq(completeDomain(emptyProgress(FIXED_NOW)), 20, 20), [2, 2]);
    const retries = mcqIn(D).slice(0, 3).map((q) => mcqAttempt(q, true, day(3), false, 'review'));
    p = { ...p, attempts: [...p.attempts, ...retries] };
    expect(domainEvidence(p, D).state).toBe('demonstrated');
  });

  it('keeps first attempts and retries in separate statistics', () => {
    const q = mcqIn(D)[0]!;
    const p = { ...emptyProgress(FIXED_NOW), attempts: [mcqAttempt(q, false, day(0)), mcqAttempt(q, true, day(1), false)] };
    const t = totals(p);
    expect(t.firstMcq).toEqual({ correct: 0, total: 1 });
    expect(t.retryMcq).toEqual({ correct: 1, total: 1 });
  });

  it('lists a question as a mistake only while its latest attempt is unsuccessful', () => {
    const q = mcqIn(D)[0]!;
    const missed = { ...emptyProgress(FIXED_NOW), attempts: [mcqAttempt(q, false, day(0))] };
    expect(mistakeQuestionIds(missed)).toEqual([q.id]);
    const fixed = { ...missed, attempts: [...missed.attempts, mcqAttempt(q, true, day(1), false)] };
    expect(mistakeQuestionIds(fixed)).toEqual([]);
  });
});
