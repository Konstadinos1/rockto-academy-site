import { Link } from 'react-router';
import { DOMAIN_BY_ID, LESSON_BY_ID } from '../content/index';
import { formatDate } from '../lib/dates';
import { DOMAIN_STATE_LABEL, allDomainEvidence, lastVisitedLesson, nextRecommendedLesson, totals } from '../lib/metrics';
import { dueReviews, upcomingReviews } from '../lib/review';
import { usePageTitle } from '../lib/usePageTitle';
import { useStore } from '../state/store';

function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : '—';
}

export function DashboardPage() {
  usePageTitle('Overview');
  const { progress, mode } = useStore();
  const t = totals(progress);
  const resumeId = lastVisitedLesson(progress);
  const resume = resumeId ? LESSON_BY_ID.get(resumeId) : undefined;
  const nextId = nextRecommendedLesson(progress);
  const next = nextId ? LESSON_BY_ID.get(nextId) : undefined;
  const due = dueReviews(progress);
  const upcoming = upcomingReviews(progress);
  const evidence = allDomainEvidence(progress);
  const fresh = progress.attempts.length === 0 && Object.keys(progress.visits).length === 0;

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">{mode === 'demo' ? 'Overview · demonstration data' : 'Overview'}</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>{fresh ? 'Welcome. Nothing recorded yet.' : 'Your learning'}</h1>
        {fresh && (
          <p className="lede">
            You have no lesson visits or answers on this device. Start with the first lesson; everything you do is saved in this browser.
          </p>
        )}
      </header>

      <div className="grid-auto">
        <section className="card" aria-labelledby="continue-h">
          <p className="eyebrow" id="continue-h">
            {resume && !progress.completed[resume.id] ? 'Continue learning' : 'Next recommended lesson'}
          </p>
          {(() => {
            const target = resume && !progress.completed[resume.id] ? resume : next;
            if (!target) return <p>You have marked every lesson complete. Use practice and review to build evidence.</p>;
            return (
              <>
                <h2 style={{ fontSize: '1.2rem', margin: '0.4rem 0' }}>
                  <span className="mono muted" style={{ fontSize: '0.85rem' }}>
                    {target.id}
                  </span>{' '}
                  {target.title}
                </h2>
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  {DOMAIN_BY_ID.get(target.domainId)?.title} · about {target.minutes} min
                </p>
                <Link className="btn primary" to={`/lesson/${target.id}`}>
                  {resume?.id === target.id ? 'Resume lesson' : 'Open lesson'}
                </Link>
              </>
            );
          })()}
        </section>

        <section className="card" aria-labelledby="due-h">
          <p className="eyebrow" id="due-h">
            Review due
          </p>
          {due.length ? (
            <>
              <p style={{ margin: '0.4rem 0' }}>
                <strong>{due.length}</strong> concept{due.length > 1 ? 's' : ''} to revisit, starting with{' '}
                <strong>{LESSON_BY_ID.get(due[0]?.lessonId ?? '')?.title}</strong> (missed on {formatDate(due[0]?.missedAt)}).
              </p>
              <Link className="btn primary" to="/practice">
                Go to review
              </Link>
            </>
          ) : (
            <p className="muted" style={{ margin: '0.4rem 0 0' }}>
              Nothing due.{' '}
              {upcoming[0] ? `Next: ${LESSON_BY_ID.get(upcoming[0].lessonId)?.title} on ${formatDate(upcoming[0].dueAt)}.` : 'Missed questions are scheduled here automatically.'}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="ev-h">
          <p className="eyebrow" id="ev-h">
            Recorded evidence
          </p>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.35rem 1rem', margin: '0.5rem 0 0', fontSize: '0.92rem' }}>
            <dt>Lessons marked read</dt>
            <dd className="mono" style={{ margin: 0 }}>
              {t.lessonsCompleted}/{t.lessonsTotal}
            </dd>
            <dt>Questions attempted</dt>
            <dd className="mono" style={{ margin: 0 }}>
              {t.questionsAttempted}/{t.questionsTotal}
            </dd>
            <dt>First-attempt MCQ accuracy</dt>
            <dd className="mono" style={{ margin: 0 }}>
              {pct(t.firstMcq.correct, t.firstMcq.total)} <span className="muted">({t.firstMcq.correct}/{t.firstMcq.total})</span>
            </dd>
            <dt>Open responses scored</dt>
            <dd className="mono" style={{ margin: 0 }}>
              {t.openScored} <span className="muted">(+{t.openUngraded} unreviewed)</span>
            </dd>
          </dl>
          <Link to="/progress" style={{ display: 'inline-block', marginTop: '0.7rem', fontSize: '0.9rem' }}>
            How evidence is counted →
          </Link>
        </section>
      </div>

      {progress.practice && (
        <div className="callout key">
          <p>
            You have a practice session in progress ({Object.keys(progress.practice.submitted).length} of {progress.practice.questionIds.length} answered).{' '}
            <Link to="/practice">Resume it</Link>.
          </p>
        </div>
      )}
      {progress.assessment && !progress.assessment.finishedAt && (
        <div className="callout key">
          <p>
            Your assessment is in progress. <Link to="/assessment">Resume the assessment</Link>.
          </p>
        </div>
      )}

      <section aria-labelledby="domains-h">
        <h2 id="domains-h" style={{ fontSize: '1.3rem', margin: '1rem 0 0.7rem' }}>
          Domains
        </h2>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Status by domain</caption>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Reading</th>
                <th scope="col">First-attempt MCQ</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((e) => (
                <tr key={e.domainId}>
                  <th scope="row" style={{ background: 'transparent', color: 'var(--text)', fontSize: 'inherit', fontWeight: 500 }}>
                    <Link to={`/curriculum?domain=${e.domainId}`}>
                      {e.domainId} {DOMAIN_BY_ID.get(e.domainId)?.short}
                    </Link>
                  </th>
                  <td>
                    <div className="progress-bar" style={{ width: '6rem', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} aria-hidden="true">
                      <span style={{ width: `${(e.lessonsCompleted / e.lessonsTotal) * 100}%` }} />
                    </div>
                    <span className="mono">
                      {e.lessonsCompleted}/{e.lessonsTotal}
                    </span>
                  </td>
                  <td className="mono">
                    {pct(e.firstAttemptMcq.correct, e.firstAttemptMcq.total)} <span className="muted">({e.firstAttemptMcq.correct}/{e.firstAttemptMcq.total})</span>
                  </td>
                  <td>
                    <span className={`chip ${e.state === 'not-assessed' ? '' : e.state === 'practiced' ? 'info' : 'ok'}`}>{DOMAIN_STATE_LABEL[e.state]}</span>
                    {e.selfReviewedOnly && e.state !== 'not-assessed' && e.state !== 'practiced' && <span className="chip warn" style={{ marginLeft: '0.3rem' }}>self-reviewed evidence</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
