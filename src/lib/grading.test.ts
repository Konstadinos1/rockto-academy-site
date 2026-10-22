import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../content/index';
import type { McqQuestion, OpenQuestion } from '../content/types';
import { gradeMcq, isSuccess, rubricFor, toPublicQuestion, UNGRADED_OPEN, verdictLabel } from './grading';

const mcq = QUESTIONS.find((q): q is McqQuestion => q.kind === 'mcq');
const open = QUESTIONS.find((q): q is OpenQuestion => q.kind === 'open');
if (!mcq || !open) throw new Error('fixtures missing');

describe('grading', () => {
  it('grades the keyed option correct and every other option incorrect', () => {
    for (const o of mcq.options) expect(gradeMcq(mcq, o.id)).toEqual({ kind: 'mcq', correct: o.id === mcq.answer });
  });

  it('removes the answer key and option explanations from the public view', () => {
    const pub = toPublicQuestion(mcq);
    const serialized = JSON.stringify(pub);
    expect('answer' in pub).toBe(false);
    for (const o of mcq.options) expect(serialized).not.toContain(o.explanation);
  });

  it('removes the rubric and exemplar from the public view of open questions', () => {
    const serialized = JSON.stringify(toPublicQuestion(open));
    expect(serialized).not.toContain(open.exemplar);
    expect(serialized).not.toContain(open.mechanism);
  });

  it('treats an ungraded open answer as neither success nor failure', () => {
    expect(isSuccess(UNGRADED_OPEN)).toBeNull();
    expect(verdictLabel(null)).toBe('Not yet reviewed');
  });

  it('counts open scores of 2 or more as success', () => {
    expect(isSuccess({ kind: 'open', grading: 'self-reviewed', score: 1 })).toBe(false);
    expect(isSuccess({ kind: 'open', grading: 'self-reviewed', score: 2 })).toBe(true);
  });

  it('builds a 0–3 rubric that includes the question-specific requirements', () => {
    const rubric = rubricFor(open);
    expect(rubric.map((r) => r.score)).toEqual([0, 1, 2, 3]);
    expect(rubric[2]?.description).toContain(open.mechanism);
    expect(rubric[3]?.description).toContain(open.extension);
  });
});
