import { ASSESSMENT, QUESTION_BY_ID, QUESTIONS } from '../content/index';
import type { OptionId } from '../content/types';
import { gradeMcq, UNGRADED_OPEN, type RubricScore } from '../lib/grading';
import { isFirstAttempt, mistakeQuestionIds } from '../lib/metrics';
import { newId, optionOrderFor, seededShuffle } from '../lib/random';
import { applyAttemptToReviews, dueReviews, pickReviewQuestion } from '../lib/review';
import type {
  Attempt,
  AttemptContext,
  AssessmentSession,
  Draft,
  PracticeScope,
  PracticeSession,
  Progress,
  Settings,
} from './schema';
import { MAX_TEXT } from './schema';

// Pure state transitions. Each returns a new Progress object and never mutates its input.

const nowIso = () => new Date().toISOString();

export function recordVisit(p: Progress, lessonId: string): Progress {
  const at = nowIso();
  const prev = p.visits[lessonId];
  return { ...p, visits: { ...p.visits, [lessonId]: { first: prev?.first ?? at, last: at, count: (prev?.count ?? 0) + 1 } } };
}

export function setLessonComplete(p: Progress, lessonId: string, complete: boolean): Progress {
  const completed = { ...p.completed };
  if (complete) completed[lessonId] = completed[lessonId] ?? nowIso();
  else delete completed[lessonId];
  return { ...p, completed };
}

export function saveNote(p: Progress, lessonId: string, text: string): Progress {
  const notes = { ...p.notes };
  const clipped = text.slice(0, MAX_TEXT);
  if (clipped.trim()) notes[lessonId] = { text: clipped, updatedAt: nowIso() };
  else delete notes[lessonId];
  return { ...p, notes };
}

export function revealExercise(p: Progress, lessonId: string, response: string): Progress {
  if (p.exercises[lessonId]) return p;
  return { ...p, exercises: { ...p.exercises, [lessonId]: { response: response.slice(0, MAX_TEXT), revealedAt: nowIso() } } };
}

export function updateSettings(p: Progress, patch: Partial<Settings>): Progress {
  return { ...p, settings: { ...p.settings, ...patch } };
}

function buildOptionOrder(sessionId: string, questionIds: string[]): Record<string, OptionId[]> {
  const order: Record<string, OptionId[]> = {};
  for (const id of questionIds) if (QUESTION_BY_ID.get(id)?.kind === 'mcq') order[id] = optionOrderFor(sessionId, id);
  return order;
}

export function practiceQuestionIds(p: Progress, scope: PracticeScope): string[] {
  switch (scope.type) {
    case 'lesson':
      return QUESTIONS.filter((q) => q.lessonId === scope.id).map((q) => q.id);
    case 'domain':
      return QUESTIONS.filter((q) => q.domainId === scope.id).map((q) => q.id);
    case 'mistakes':
      return mistakeQuestionIds(p);
    case 'question':
      return QUESTION_BY_ID.has(scope.id ?? '') ? [scope.id as string] : [];
    case 'review':
      return dueReviews(p)
        .map((item) => pickReviewQuestion(item, p)?.id)
        .filter((id): id is string => Boolean(id));
  }
}

export function startPractice(p: Progress, scope: PracticeScope): Progress {
  const id = newId('ps');
  const ids = practiceQuestionIds(p, scope);
  const questionIds = scope.type === 'domain' ? seededShuffle(ids, id) : ids;
  const session: PracticeSession = {
    id,
    scope,
    questionIds,
    index: 0,
    optionOrder: buildOptionOrder(id, questionIds),
    drafts: {},
    submitted: {},
    startedAt: nowIso(),
  };
  return { ...p, practice: session };
}

export function endPractice(p: Progress): Progress {
  return { ...p, practice: null };
}

export function setPracticeIndex(p: Progress, index: number): Progress {
  if (!p.practice) return p;
  const clamped = Math.max(0, Math.min(index, p.practice.questionIds.length));
  return { ...p, practice: { ...p.practice, index: clamped } };
}

export function setPracticeDraft(p: Progress, questionId: string, draft: Draft): Progress {
  if (!p.practice || p.practice.submitted[questionId]) return p;
  return { ...p, practice: { ...p.practice, drafts: { ...p.practice.drafts, [questionId]: { ...p.practice.drafts[questionId], ...draft } } } };
}

function buildAttempt(p: Progress, questionId: string, sessionId: string, context: AttemptContext, draft: Draft): Attempt | null {
  const q = QUESTION_BY_ID.get(questionId);
  if (!q) return null;
  const base = { id: newId('at'), questionId, sessionId, context, at: nowIso(), first: isFirstAttempt(p, questionId), hintUsed: Boolean(draft.hintShown) };
  if (q.kind === 'mcq') {
    if (!draft.optionId) return null;
    return { ...base, response: { kind: 'mcq', optionId: draft.optionId }, result: gradeMcq(q, draft.optionId) };
  }
  const text = (draft.text ?? '').trim();
  if (!text) return null;
  return { ...base, response: { kind: 'open', text: text.slice(0, MAX_TEXT) }, result: UNGRADED_OPEN };
}

function withAttempt(p: Progress, attempt: Attempt): Progress {
  const q = QUESTION_BY_ID.get(attempt.questionId);
  const next = { ...p, attempts: [...p.attempts, attempt] };
  return q ? { ...next, reviews: applyAttemptToReviews(next, q, attempt) } : next;
}

/** Records the current practice answer. Idempotent: a second submit for the same question is ignored. */
export function submitPractice(p: Progress, questionId: string): Progress {
  const s = p.practice;
  if (!s || s.submitted[questionId] || !s.questionIds.includes(questionId)) return p;
  const context: AttemptContext = s.scope.type === 'review' ? 'review' : 'practice';
  const attempt = buildAttempt(p, questionId, s.id, context, s.drafts[questionId] ?? {});
  if (!attempt) return p;
  const next = withAttempt(p, attempt);
  return { ...next, practice: { ...s, submitted: { ...s.submitted, [questionId]: attempt.id } } };
}

/** Learner self-review of an open response against the published rubric. */
export function selfReview(p: Progress, attemptId: string, score: RubricScore): Progress {
  const idx = p.attempts.findIndex((a) => a.id === attemptId);
  const attempt = p.attempts[idx];
  if (!attempt || attempt.result.kind !== 'open') return p;
  if (attempt.result.grading === 'ai-graded' || attempt.result.grading === 'human-reviewed') return p;
  const updated: Attempt = { ...attempt, result: { ...attempt.result, grading: 'self-reviewed', score } };
  const attempts = [...p.attempts];
  attempts[idx] = updated;
  const q = QUESTION_BY_ID.get(updated.questionId);
  const base = { ...p, attempts };
  return q ? { ...base, reviews: applyAttemptToReviews(base, q, updated) } : base;
}

export function recordAiGrade(p: Progress, attemptId: string, score: RubricScore, rationale: string): Progress {
  const attempts = p.attempts.map((a) =>
    a.id === attemptId && a.result.kind === 'open'
      ? { ...a, result: { ...a.result, grading: 'ai-graded' as const, score, rationale: rationale.slice(0, MAX_TEXT) } }
      : a,
  );
  return { ...p, attempts };
}

export function challengeGrade(p: Progress, attemptId: string, note: string): Progress {
  const attempts = p.attempts.map((a) =>
    a.id === attemptId && a.result.kind === 'open'
      ? { ...a, result: { ...a.result, challenge: { at: nowIso(), note: note.slice(0, MAX_TEXT) } } }
      : a,
  );
  return { ...p, attempts };
}

export function startAssessment(p: Progress, mode: 'coached' | 'exam'): Progress {
  const id = newId('as');
  const questionIds = ASSESSMENT.map((q) => q.id);
  const session: AssessmentSession = {
    id,
    mode,
    questionIds,
    index: 0,
    optionOrder: buildOptionOrder(id, questionIds),
    drafts: {},
    submitted: {},
    startedAt: nowIso(),
  };
  return { ...p, assessment: session };
}

export function setAssessmentIndex(p: Progress, index: number): Progress {
  if (!p.assessment) return p;
  const clamped = Math.max(0, Math.min(index, p.assessment.questionIds.length - 1));
  return { ...p, assessment: { ...p.assessment, index: clamped } };
}

export function setAssessmentDraft(p: Progress, questionId: string, draft: Draft): Progress {
  const s = p.assessment;
  if (!s || s.finishedAt || s.submitted[questionId]) return p;
  return { ...p, assessment: { ...s, drafts: { ...s.drafts, [questionId]: { ...s.drafts[questionId], ...draft } } } };
}

/** Coached mode: lock in and grade one answer immediately. */
export function submitAssessmentAnswer(p: Progress, questionId: string): Progress {
  const s = p.assessment;
  if (!s || s.mode !== 'coached' || s.finishedAt || s.submitted[questionId]) return p;
  const attempt = buildAttempt(p, questionId, s.id, 'assessment-coached', s.drafts[questionId] ?? {});
  if (!attempt) return p;
  return { ...withAttempt(p, attempt), assessment: { ...s, submitted: { ...s.submitted, [questionId]: attempt.id } } };
}

/** Exam mode: grade every answered item at once; unanswered items stay unanswered, not incorrect. */
export function finishAssessment(p: Progress): Progress {
  const s = p.assessment;
  if (!s || s.finishedAt) return p;
  let next = p;
  const submitted = { ...s.submitted };
  if (s.mode === 'exam') {
    for (const qid of s.questionIds) {
      if (submitted[qid]) continue;
      const attempt = buildAttempt(next, qid, s.id, 'assessment-exam', s.drafts[qid] ?? {});
      if (!attempt) continue;
      next = withAttempt(next, attempt);
      submitted[qid] = attempt.id;
    }
  }
  return { ...next, assessment: { ...s, submitted, finishedAt: nowIso() } };
}

export function discardAssessment(p: Progress): Progress {
  return { ...p, assessment: null };
}
