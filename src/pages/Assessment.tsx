import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { QuestionCard } from '../components/QuestionCard';
import { ASSESSMENT, DOMAINS, QUESTION_BY_ID } from '../content/index';
import { formatDate } from '../lib/dates';
import { usePageTitle } from '../lib/usePageTitle';
import {
  discardAssessment,
  finishAssessment,
  selfReview,
  setAssessmentDraft,
  setAssessmentIndex,
  startAssessment,
  submitAssessmentAnswer,
} from '../state/actions';
import type { AssessmentSession, Attempt, Draft } from '../state/schema';
import { useStore } from '../state/store';

function hasDraftAnswer(d: Draft | undefined): boolean {
  return Boolean(d?.optionId) || Boolean(d?.text?.trim());
}

function Intro() {
  const { update } = useStore();
  const count = (pred: (q: (typeof ASSESSMENT)[number]) => boolean) => ASSESSMENT.filter(pred).length;
  if (ASSESSMENT.length === 0) {
    return <div className="empty">The comprehensive assessment is not available in this build.</div>;
  }
  return (
    <div className="stack" style={{ maxWidth: '50rem' }}>
      <header>
        <p className="eyebrow">Comprehensive assessment</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>{ASSESSMENT.length} original held-out questions</h1>
        <p className="lede">
          New scenarios across all twelve domains, separate from the 600 practice questions: {count((q) => q.kind === 'mcq')} multiple
          choice and {count((q) => q.kind === 'open')} open response; {count((q) => q.difficulty === 'foundational')} foundational,{' '}
          {count((q) => q.difficulty === 'applied')} applied and {count((q) => q.difficulty === 'advanced')} advanced.
        </p>
      </header>
      <div className="grid-auto">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Coached mode</h2>
          <p className="muted">Each answer is locked and corrected as soon as you submit it, like practice.</p>
          <button type="button" className="btn primary" onClick={() => update((p) => startAssessment(p, 'coached'))}>
            Start in coached mode
          </button>
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Exam mode</h2>
          <p className="muted">
            No feedback until you finish. You can move between questions and change answers until you submit the whole assessment.
          </p>
          <button type="button" className="btn" onClick={() => update((p) => startAssessment(p, 'exam'))}>
            Start in exam mode
          </button>
        </section>
      </div>
      <p className="callout note">
        Your progress is saved after every change, so you can leave and resume. This is a self-study check: the answer key is part of the
        course files in your browser, so results are not proctored and are not a certification.
      </p>
    </div>
  );
}

function Navigator({ session }: { session: AssessmentSession }) {
  const { update } = useStore();
  return (
    <nav aria-label="Assessment questions">
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(2.4rem, 1fr))', gap: '0.3rem' }}>
        {session.questionIds.map((qid, i) => {
          const done = Boolean(session.submitted[qid]) || hasDraftAnswer(session.drafts[qid]);
          const current = i === session.index;
          return (
            <li key={qid}>
              <button
                type="button"
                className="btn small"
                style={{
                  width: '100%',
                  padding: 0,
                  fontFamily: 'var(--font-mono)',
                  background: current ? 'var(--accent)' : done ? 'var(--accent-soft)' : undefined,
                  color: current ? 'var(--accent-ink)' : undefined,
                }}
                aria-current={current ? 'step' : undefined}
                aria-label={`Question ${i + 1}, ${done ? 'answered' : 'unanswered'}`}
                onClick={() => update((p) => setAssessmentIndex(p, i))}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function InProgress({ session }: { session: AssessmentSession }) {
  const { progress, update } = useStore();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const qid = session.questionIds[session.index] ?? '';
  const q = QUESTION_BY_ID.get(qid);
  const attemptId = session.submitted[qid];
  const attempt = attemptId ? progress.attempts.find((a) => a.id === attemptId) : undefined;
  const answered = session.questionIds.filter((id) => session.submitted[id] || (session.mode === 'exam' && hasDraftAnswer(session.drafts[id]))).length;
  const unanswered = session.questionIds.length - answered;
  const go = (i: number) => {
    update((p) => setAssessmentIndex(p, i));
    topRef.current?.focus();
  };

  return (
    <div className="stack">
      <div ref={topRef} tabIndex={-1} style={{ outline: 'none' }} className="row">
        <div style={{ flex: '1 1 18rem' }}>
          <p className="eyebrow">
            Assessment · {session.mode === 'exam' ? 'exam mode (feedback withheld)' : 'coached mode'} · started {formatDate(session.startedAt)}
          </p>
          <p style={{ margin: '0.3rem 0 0' }} aria-live="polite">
            <strong>{answered}</strong> answered · <strong>{unanswered}</strong> unanswered
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setConfirmFinish(true)}>
          Review and finish
        </button>
      </div>
      <Navigator session={session} />
      {q ? (
        <QuestionCard
          key={qid}
          question={q}
          optionOrder={session.optionOrder[qid]}
          draft={session.drafts[qid] ?? {}}
          attempt={attempt}
          mode={session.mode}
          revealFeedback={session.mode === 'coached' && Boolean(attempt)}
          position={`Question ${session.index + 1} of ${session.questionIds.length}`}
          onDraft={(d) => update((p) => setAssessmentDraft(p, qid, d))}
          onSubmit={session.mode === 'coached' ? () => update((p) => submitAssessmentAnswer(p, qid)) : undefined}
          onSelfReview={(id, score) => update((p) => selfReview(p, id, score))}
        />
      ) : (
        <div className="empty">This question is not available in the current content version.</div>
      )}
      <nav className="row" aria-label="Previous and next" style={{ justifyContent: 'space-between', maxWidth: '46rem' }}>
        <button type="button" className="btn" disabled={session.index === 0} onClick={() => go(session.index - 1)}>
          ← Previous
        </button>
        <button type="button" className="btn" disabled={session.index >= session.questionIds.length - 1} onClick={() => go(session.index + 1)}>
          Next →
        </button>
      </nav>
      <button type="button" className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setConfirmDiscard(true)}>
        Discard this attempt
      </button>
      <ConfirmDialog
        open={confirmFinish}
        title="Finish the assessment?"
        confirmLabel="Finish and see results"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          update(finishAssessment);
        }}
      >
        {unanswered > 0 ? (
          <p>
            {unanswered} question{unanswered === 1 ? ' is' : 's are'} unanswered. Unanswered items are reported as unanswered, not as incorrect.
            {session.mode === 'exam' && ' After finishing you cannot change answers.'}
          </p>
        ) : (
          <p>All questions are answered.{session.mode === 'exam' && ' After finishing you cannot change answers.'}</p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this attempt?"
        confirmLabel="Discard"
        danger
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          update(discardAssessment);
        }}
      >
        <p>The session is removed. Answers already submitted in coached mode stay in your attempt history.</p>
      </ConfirmDialog>
    </div>
  );
}

function Results({ session }: { session: AssessmentSession }) {
  const { progress, update } = useStore();
  const [confirmNew, setConfirmNew] = useState(false);
  const attempts = session.questionIds.map((id) => {
    const aid = session.submitted[id];
    return { id, attempt: aid ? progress.attempts.find((a) => a.id === aid) : undefined };
  });
  const mcq = attempts.filter(({ id }) => QUESTION_BY_ID.get(id)?.kind === 'mcq');
  const mcqCorrect = mcq.filter(({ attempt }) => attempt?.result.kind === 'mcq' && attempt.result.correct).length;
  const mcqAnswered = mcq.filter(({ attempt }) => attempt).length;
  const open = attempts.filter(({ id }) => QUESTION_BY_ID.get(id)?.kind === 'open');
  const openScored = open.filter(({ attempt }) => attempt?.result.kind === 'open' && attempt.result.score !== null);
  const openPoints = openScored.reduce((s, { attempt }) => s + (attempt?.result.kind === 'open' ? (attempt.result.score ?? 0) : 0), 0);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = selected ? QUESTION_BY_ID.get(selected) : undefined;
  const selAttempt: Attempt | undefined = selected ? attempts.find((a) => a.id === selected)?.attempt : undefined;

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">
          Assessment results · {session.mode === 'exam' ? 'exam mode' : 'coached mode'} · finished {formatDate(session.finishedAt)}
        </p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Results</h1>
      </header>
      <dl className="grid-auto">
        <div className="card stat">
          <dt className="stat-label">Multiple choice (deterministic)</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {mcqCorrect}/{mcq.length}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
            {mcq.length - mcqAnswered} unanswered (not counted as wrong)
          </dd>
        </div>
        <div className="card stat">
          <dt className="stat-label">Open responses (self-reviewed rubric)</dt>
          <dd className="stat-value" style={{ margin: 0 }}>
            {openPoints}/{openScored.length * 3}
          </dd>
          <dd className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
            {openScored.length} of {open.length} scored · {open.filter((o) => o.attempt && o.attempt.result.kind === 'open' && o.attempt.result.score === null).length} awaiting your self-review ·{' '}
            {open.filter((o) => !o.attempt).length} unanswered
          </dd>
        </div>
      </dl>
      <p className="muted" style={{ fontSize: '0.88rem', margin: 0 }}>
        The two parts are reported separately and not combined into one score.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">Results by domain</caption>
          <thead>
            <tr>
              <th scope="col">Domain</th>
              <th scope="col">Multiple choice correct</th>
              <th scope="col">Open (points / max scored)</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => {
              const inD = attempts.filter(({ id }) => QUESTION_BY_ID.get(id)?.domainId === d.id);
              const m = inD.filter(({ id }) => QUESTION_BY_ID.get(id)?.kind === 'mcq');
              const o = inD.filter(({ id }) => QUESTION_BY_ID.get(id)?.kind === 'open');
              const oScored = o.filter(({ attempt }) => attempt?.result.kind === 'open' && attempt.result.score !== null);
              return (
                <tr key={d.id}>
                  <th scope="row" style={{ background: 'transparent', color: 'var(--text)', fontSize: 'inherit' }}>
                    {d.id} {d.short}
                  </th>
                  <td>
                    {m.filter(({ attempt }) => attempt?.result.kind === 'mcq' && attempt.result.correct).length}/{m.length}
                  </td>
                  <td>
                    {oScored.reduce((s, { attempt }) => s + (attempt?.result.kind === 'open' ? (attempt.result.score ?? 0) : 0), 0)}/{oScored.length * 3}
                    {o.length ? ` (${o.length} item${o.length > 1 ? 's' : ''})` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="items-h">
        <h2 id="items-h" style={{ fontSize: '1.3rem', margin: '1rem 0 0.6rem' }}>
          Review each item
        </h2>
        <div className="row" style={{ gap: '0.3rem' }}>
          {attempts.map(({ id, attempt }, i) => {
            const q = QUESTION_BY_ID.get(id);
            const ok = attempt?.result.kind === 'mcq' ? attempt.result.correct : attempt?.result.kind === 'open' ? (attempt.result.score ?? -1) >= 2 : false;
            const pending = attempt?.result.kind === 'open' && attempt.result.score === null;
            return (
              <button
                key={id}
                type="button"
                className="btn small"
                aria-pressed={selected === id}
                aria-label={`Item ${i + 1}: ${!attempt ? 'unanswered' : pending ? 'awaiting self-review' : ok ? 'correct or meets' : 'incorrect or below 2'}`}
                style={{ minWidth: '2.6rem', fontFamily: 'var(--font-mono)', borderColor: !attempt ? undefined : pending ? 'var(--info)' : ok ? 'var(--ok)' : 'var(--bad)' }}
                onClick={() => setSelected(id)}
              >
                {i + 1}
                {q?.kind === 'open' ? '◦' : ''}
              </button>
            );
          })}
        </div>
        {sel && (
          <div style={{ marginTop: '1.2rem' }}>
            {selAttempt ? (
              <QuestionCard
                key={sel.id}
                question={sel}
                optionOrder={session.optionOrder[sel.id]}
                draft={{}}
                attempt={selAttempt}
                mode="coached"
                revealFeedback
                position={`Item ${session.questionIds.indexOf(sel.id) + 1}`}
                onDraft={() => undefined}
                onSelfReview={(id, score) => update((p) => selfReview(p, id, score))}
              />
            ) : (
              <div className="empty">You did not answer this item, so there is no feedback to show. It is reported as unanswered.</div>
            )}
          </div>
        )}
      </section>
      <div className="row">
        <button type="button" className="btn" onClick={() => setConfirmNew(true)}>
          Start a new attempt
        </button>
      </div>
      <ConfirmDialog
        open={confirmNew}
        title="Start a new attempt?"
        confirmLabel="Start new attempt"
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          update(discardAssessment);
        }}
      >
        <p>This results page closes. Your answers stay in your attempt history and on the Progress page.</p>
      </ConfirmDialog>
    </div>
  );
}

export function AssessmentPage() {
  usePageTitle('Comprehensive assessment');
  const { progress } = useStore();
  const s = progress.assessment;
  if (!s) return <Intro />;
  return s.finishedAt ? <Results session={s} /> : <InProgress session={s} />;
}
