import { LESSONS, QUESTIONS } from '../content/index';
import type { McqQuestion, OptionId } from '../content/types';
import { addDays } from '../lib/dates';
import { applyAttemptToReviews } from '../lib/review';
import { emptyProgress, type Attempt, type Progress } from './schema';

// Sample data for the explicitly labelled demonstration mode. It is stored under a separate
// key and never mixed with a learner's own progress.

const DEMO_SESSION = 'demo_session';

function wrongOption(q: McqQuestion): OptionId {
  return q.options.find((o) => o.id !== q.answer)?.id ?? 'a';
}

export function buildDemoProgress(now: Date = new Date()): Progress {
  const start = addDays(now.toISOString(), -12);
  let p: Progress = { ...emptyProgress(new Date(start)) };
  const firstLessons = LESSONS.slice(0, 4);
  firstLessons.forEach((l, i) => {
    const at = addDays(start, i);
    p.visits[l.id] = { first: at, last: at, count: 1 };
    p.completed[l.id] = at;
  });
  const fifth = LESSONS[4];
  if (fifth) p.visits[fifth.id] = { first: addDays(start, 5), last: addDays(start, 5), count: 2 };
  p.notes[LESSONS[0]?.id ?? 'D01-L01'] = {
    text: 'Demo note: the harness, not the model, holds the credentials. Ask "which code executes this?"',
    updatedAt: addDays(start, 1),
  };

  const mcqs = QUESTIONS.filter((q): q is McqQuestion => q.kind === 'mcq' && firstLessons.some((l) => l.id === q.lessonId));
  mcqs.forEach((q, i) => {
    const missed = i % 5 === 3;
    const attempt: Attempt = {
      id: `demo_at_${i}`,
      questionId: q.id,
      sessionId: DEMO_SESSION,
      context: 'practice',
      at: addDays(start, Math.floor(i / 3)),
      first: true,
      hintUsed: false,
      response: { kind: 'mcq', optionId: missed ? wrongOption(q) : q.answer },
      result: { kind: 'mcq', correct: !missed },
    };
    p = { ...p, attempts: [...p.attempts, attempt] };
    p = { ...p, reviews: applyAttemptToReviews(p, q, attempt) };
  });

  const open = QUESTIONS.find((q) => q.kind === 'open' && q.lessonId === firstLessons[0]?.id);
  if (open) {
    p.attempts.push({
      id: 'demo_at_open',
      questionId: open.id,
      sessionId: DEMO_SESSION,
      context: 'practice',
      at: addDays(start, 2),
      first: true,
      hintUsed: false,
      response: { kind: 'open', text: 'Demo response: the vendor treats model refusals as the control, but the application executes actions.' },
      result: { kind: 'open', grading: 'self-reviewed', score: 2 },
    });
  }
  return p;
}
