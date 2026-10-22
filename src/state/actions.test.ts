import { describe, expect, it } from 'vitest';
import { ASSESSMENT, QUESTION_BY_ID } from '../content/index';
import type { McqQuestion } from '../content/types';
import { wrongOption } from '../test/fixtures';
import {
  finishAssessment,
  saveNote,
  selfReview,
  setAssessmentDraft,
  setPracticeDraft,
  startAssessment,
  startPractice,
  submitAssessmentAnswer,
  submitPractice,
} from './actions';
import { emptyProgress, MAX_TEXT } from './schema';

const mcq = QUESTION_BY_ID.get('D01-L01-Q1') as McqQuestion;

describe('practice actions', () => {
  it('records one attempt per submit and ignores repeated submits', () => {
    let p = startPractice(emptyProgress(), { type: 'lesson', id: 'D01-L01' });
    p = setPracticeDraft(p, mcq.id, { optionId: mcq.answer });
    p = submitPractice(p, mcq.id);
    p = submitPractice(p, mcq.id);
    expect(p.attempts).toHaveLength(1);
    expect(p.attempts[0]?.first).toBe(true);
    expect(p.attempts[0]?.result).toEqual({ kind: 'mcq', correct: true });
  });

  it('marks a later attempt on the same question as a retry', () => {
    let p = startPractice(emptyProgress(), { type: 'lesson', id: 'D01-L01' });
    p = submitPractice(setPracticeDraft(p, mcq.id, { optionId: wrongOption(mcq) }), mcq.id);
    p = startPractice(p, { type: 'question', id: mcq.id });
    p = submitPractice(setPracticeDraft(p, mcq.id, { optionId: mcq.answer }), mcq.id);
    expect(p.attempts.map((a) => a.first)).toEqual([true, false]);
  });

  it('does not submit an empty answer', () => {
    const p = startPractice(emptyProgress(), { type: 'lesson', id: 'D01-L01' });
    expect(submitPractice(p, mcq.id).attempts).toHaveLength(0);
  });

  it('records open answers as ungraded until reviewed, then as self-reviewed', () => {
    const openId = 'D01-L01-Q4';
    let p = startPractice(emptyProgress(), { type: 'lesson', id: 'D01-L01' });
    p = submitPractice(setPracticeDraft(p, openId, { text: 'Because the boundary is…' }), openId);
    expect(p.attempts[0]?.result).toEqual({ kind: 'open', grading: 'ungraded', score: null });
    p = selfReview(p, p.attempts[0]!.id, 2);
    expect(p.attempts[0]?.result).toMatchObject({ grading: 'self-reviewed', score: 2 });
  });

  it('clips notes to the maximum length and removes empty notes', () => {
    let p = saveNote(emptyProgress(), 'D01-L01', 'x'.repeat(MAX_TEXT + 10));
    expect(p.notes['D01-L01']?.text).toHaveLength(MAX_TEXT);
    p = saveNote(p, 'D01-L01', '   ');
    expect(p.notes['D01-L01']).toBeUndefined();
  });
});

describe('assessment actions', () => {
  it('starts with every item unanswered and option orders for each MCQ', () => {
    const p = startAssessment(emptyProgress(), 'coached');
    expect(p.assessment?.questionIds).toHaveLength(50);
    expect(Object.keys(p.assessment?.optionOrder ?? {})).toHaveLength(30);
    expect(Object.keys(p.assessment?.submitted ?? {})).toHaveLength(0);
  });

  it('locks coached answers after submission', () => {
    const item = ASSESSMENT.find((q): q is McqQuestion => q.kind === 'mcq')!;
    let p = startAssessment(emptyProgress(), 'coached');
    p = submitAssessmentAnswer(setAssessmentDraft(p, item.id, { optionId: item.answer }), item.id);
    const changed = setAssessmentDraft(p, item.id, { optionId: wrongOption(item) });
    expect(changed.assessment?.drafts[item.id]?.optionId).toBe(item.answer);
    expect(p.attempts[0]?.context).toBe('assessment-coached');
  });

  it('in exam mode grades only answered items at the end and leaves the rest unanswered', () => {
    const items = ASSESSMENT.filter((q): q is McqQuestion => q.kind === 'mcq').slice(0, 2);
    let p = startAssessment(emptyProgress(), 'exam');
    p = setAssessmentDraft(p, items[0]!.id, { optionId: items[0]!.answer });
    p = setAssessmentDraft(p, items[1]!.id, { optionId: wrongOption(items[1]!) });
    expect(submitAssessmentAnswer(p, items[0]!.id).attempts).toHaveLength(0);
    p = finishAssessment(p);
    expect(p.attempts.map((a) => a.result)).toEqual([
      { kind: 'mcq', correct: true },
      { kind: 'mcq', correct: false },
    ]);
    expect(Object.keys(p.assessment?.submitted ?? {})).toHaveLength(2);
    expect(p.assessment?.finishedAt).toBeDefined();
  });

  it('does not change a finished assessment', () => {
    const p = finishAssessment(startAssessment(emptyProgress(), 'exam'));
    expect(finishAssessment(p)).toBe(p);
  });
});
