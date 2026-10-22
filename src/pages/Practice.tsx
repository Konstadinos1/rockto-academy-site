import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { QuestionCard } from '../components/QuestionCard';
import { DOMAINS, LESSON_BY_ID, LESSONS, QUESTION_BY_ID } from '../content/index';
import { formatDate } from '../lib/dates';
import { isSuccess } from '../lib/grading';
import { mistakeQuestionIds } from '../lib/metrics';
import { dueReviews, upcomingReviews } from '../lib/review';
import { usePageTitle } from '../lib/usePageTitle';
import {
  endPractice,
  practiceQuestionIds,
  selfReview,
  setPracticeDraft,
  setPracticeIndex,
  startPractice,
  submitPractice,
} from '../state/actions';
import type { PracticeScope, PracticeSession, Progress } from '../state/schema';
import { useStore } from '../state/store';

function scopeLabel(scope: PracticeScope): string {
  switch (scope.type) {
    case 'domain':
      return `Domain ${scope.id}`;
    case 'lesson':
      return `Lesson ${scope.id}`;
    case 'mistakes':
      return 'Mistake retry';
    case 'review':
      return 'Spaced review';
    case 'question':
      return `Follow-up ${scope.id}`;
  }
}

function Chooser() {
  const { progress, update } = useStore();
  const [domain, setDomain] = useState('D01');
  const [lesson, setLesson] = useState(LESSONS[0]?.id ?? '');
  const due = dueReviews(progress);
  const upcoming = upcomingReviews(progress);
  const mistakes = mistakeQuestionIds(progress);
  const start = (scope: PracticeScope) => update((p) => startPractice(p, scope));
  const domainCount = practiceQuestionIds(progress, { type: 'domain', id: domain }).length;

  return (
    <div className="stack" style={{ maxWidth: '58rem' }}>
      <header>
        <p className="eyebrow">Coached practice</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Practice</h1>
        <p className="lede">
          One question at a time. Submit an answer to see the correction and the reasoning for every option. Answers are locked once
          submitted; later tries are recorded as retries, separately from first attempts.
        </p>
      </header>

      <section className="card" aria-labelledby="review-h">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 id="review-h" style={{ fontSize: '1.2rem' }}>
            Review due
          </h2>
          <span className={`chip ${due.length ? 'accent' : ''}`}>{due.length} due</span>
        </div>
        {due.length ? (
          <>
            <ul style={{ paddingLeft: '1.2rem' }}>
              {due.map((r) => (
                <li key={r.key}>
                  <strong>{LESSON_BY_ID.get(r.lessonId)?.title ?? r.lessonId}</strong>{' '}
                  <span className="muted">
                    — missed {r.sourceQuestionId} on {formatDate(r.missedAt)}; review step {r.step + 1} of {progress.settings.reviewIntervals.length}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="btn primary" onClick={() => start({ type: 'review' })}>
              Start review ({due.length})
            </button>
          </>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nothing is due.{' '}
            {upcoming[0]
              ? `Next review: ${LESSON_BY_ID.get(upcoming[0].lessonId)?.title} on ${formatDate(upcoming[0].dueAt)}.`
              : 'When you miss a question, its concept is scheduled here and revisited with a different question.'}
          </p>
        )}
      </section>

      <div className="grid-auto">
        <section className="card" aria-labelledby="domain-h">
          <h2 id="domain-h" style={{ fontSize: '1.1rem' }}>
            By domain
          </h2>
          <div className="field" style={{ marginTop: '0.7rem' }}>
            <label htmlFor="domain-select">Domain</label>
            <select id="domain-select" className="select" value={domain} onChange={(e) => setDomain(e.target.value)}>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" style={{ marginTop: '0.8rem' }} disabled={!domainCount} onClick={() => start({ type: 'domain', id: domain })}>
            Start {domainCount} questions
          </button>
        </section>
        <section className="card" aria-labelledby="lesson-h">
          <h2 id="lesson-h" style={{ fontSize: '1.1rem' }}>
            By lesson
          </h2>
          <div className="field" style={{ marginTop: '0.7rem' }}>
            <label htmlFor="lesson-select">Lesson</label>
            <select id="lesson-select" className="select" value={lesson} onChange={(e) => setLesson(e.target.value)}>
              {LESSONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} — {l.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" style={{ marginTop: '0.8rem' }} disabled={!lesson} onClick={() => start({ type: 'lesson', id: lesson })}>
            Start 5 questions
          </button>
        </section>
        <section className="card" aria-labelledby="mistakes-h">
          <h2 id="mistakes-h" style={{ fontSize: '1.1rem' }}>
            Retry mistakes
          </h2>
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Questions whose latest attempt was incorrect or self-scored below 2.
          </p>
          <button type="button" className="btn" disabled={!mistakes.length} onClick={() => start({ type: 'mistakes' })}>
            {mistakes.length ? `Retry ${mistakes.length}` : 'No mistakes to retry'}
          </button>
        </section>
      </div>
    </div>
  );
}

function Summary({ session, progress, onDone }: { session: PracticeSession; progress: Progress; onDone: () => void }) {
  const attempts = Object.values(session.submitted)
    .map((id) => progress.attempts.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const mcq = attempts.filter((a) => a.result.kind === 'mcq');
  const correct = mcq.filter((a) => isSuccess(a.result) === true).length;
  const firstMcq = mcq.filter((a) => a.first);
  const open = attempts.filter((a) => a.result.kind === 'open');
  const pending = open.filter((a) => a.result.kind === 'open' && a.result.score === null).length;
  const skipped = session.questionIds.length - attempts.length;
  return (
    <section className="card fade-in" style={{ maxWidth: '46rem' }} aria-labelledby="summary-h">
      <p className="eyebrow">{scopeLabel(session.scope)} · session complete</p>
      <h1 id="summary-h" style={{ fontSize: '1.8rem', margin: '0.4rem 0 1rem' }}>
        Session summary
      </h1>
      <dl className="grid-auto" style={{ gap: '1rem' }}>
        <div className="stat">
          <dt className="stat-label">Multiple choice correct</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {correct}/{mcq.length}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {firstMcq.length} first attempts · {mcq.length - firstMcq.length} retries
          </dd>
        </div>
        <div className="stat">
          <dt className="stat-label">Open responses</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {open.length}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            {pending ? `${pending} awaiting self-review` : 'all reviewed'}
          </dd>
        </div>
        <div className="stat">
          <dt className="stat-label">Not answered</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {skipped}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
            counted as unanswered, not incorrect
          </dd>
        </div>
      </dl>
      <p className="muted" style={{ fontSize: '0.88rem' }}>
        Multiple-choice and open-response results are reported separately; there is no combined score.
      </p>
      <div className="row">
        <button type="button" className="btn primary" onClick={onDone}>
          Finish
        </button>
        <Link className="btn" to="/progress">
          See progress
        </Link>
        <Link className="btn" to="/mistakes">
          Mistake notebook
        </Link>
      </div>
    </section>
  );
}

function Session({ session }: { session: PracticeSession }) {
  const { progress, update } = useStore();
  const focusRef = useRef<HTMLDivElement>(null);
  const total = session.questionIds.length;
  const qid = session.questionIds[session.index];
  const question = qid ? QUESTION_BY_ID.get(qid) : undefined;
  const attemptId = qid ? session.submitted[qid] : undefined;
  const attempt = attemptId ? progress.attempts.find((a) => a.id === attemptId) : undefined;
  const answered = Object.keys(session.submitted).length;

  useEffect(() => {
    focusRef.current?.focus();
  }, [session.index]);

  if (session.index >= total) return <Summary session={session} progress={progress} onDone={() => update(endPractice)} />;
  if (!qid || !question) {
    return (
      <div className="empty" role="alert">
        <p>This question is not available in the current content version.</p>
        <button type="button" className="btn" onClick={() => update((p) => setPracticeIndex(p, session.index + 1))}>
          Skip to the next question
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem', maxWidth: '46rem' }}>
        <div style={{ flex: '1 1 14rem' }}>
          <p className="eyebrow">{scopeLabel(session.scope)} · coached mode</p>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Answered in this session">
            <span style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
        <button type="button" className="btn ghost small" onClick={() => update((p) => setPracticeIndex(p, total))}>
          End session
        </button>
      </div>
      <div ref={focusRef} tabIndex={-1} style={{ outline: 'none' }} key={qid}>
        <QuestionCard
          question={question}
          optionOrder={session.optionOrder[qid]}
          draft={session.drafts[qid] ?? {}}
          attempt={attempt}
          mode="coached"
          revealFeedback={Boolean(attempt)}
          position={`Question ${session.index + 1} of ${total}`}
          onDraft={(d) => update((p) => setPracticeDraft(p, qid, d))}
          onSubmit={() => update((p) => submitPractice(p, qid))}
          onSelfReview={(id, score) => update((p) => selfReview(p, id, score))}
        />
      </div>
      <nav className="row" aria-label="Question navigation" style={{ marginTop: '1.4rem', maxWidth: '46rem', justifyContent: 'space-between' }}>
        <button type="button" className="btn" disabled={session.index === 0} onClick={() => update((p) => setPracticeIndex(p, session.index - 1))}>
          ← Previous
        </button>
        <button type="button" className={attempt ? 'btn primary' : 'btn'} onClick={() => update((p) => setPracticeIndex(p, session.index + 1))}>
          {session.index + 1 === total ? 'Finish session' : attempt ? 'Next question →' : 'Skip for now →'}
        </button>
      </nav>
    </div>
  );
}

export function PracticePage() {
  usePageTitle('Practice');
  const { progress } = useStore();
  return progress.practice ? <Session session={progress.practice} /> : <Chooser />;
}
