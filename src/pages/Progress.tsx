import { Link } from 'react-router';
import { ASSESSMENT, DOMAIN_BY_ID, QUESTION_BY_ID } from '../content/index';
import { COACH_ENABLED } from '../lib/coach';
import { formatDate } from '../lib/dates';
import { GRADING_LABEL } from '../lib/grading';
import { DOMAIN_STATE_LABEL, THRESHOLDS, allDomainEvidence, totals } from '../lib/metrics';
import { usePageTitle } from '../lib/usePageTitle';
import type { Attempt } from '../state/schema';
import { useStore } from '../state/store';

const CONTEXT_LABEL: Record<Attempt['context'], string> = {
  practice: 'Practice',
  review: 'Spaced review',
  'assessment-coached': 'Assessment (coached)',
  'assessment-exam': 'Assessment (exam)',
};

function resultText(a: Attempt): string {
  if (a.result.kind === 'mcq') return a.result.correct ? 'Correct' : 'Incorrect';
  if (a.result.score === null) return 'Not yet reviewed';
  return `${a.result.score}/3 · ${GRADING_LABEL[a.result.grading]}`;
}

export function ProgressPage() {
  usePageTitle('Progress');
  const { progress } = useStore();
  const t = totals(progress);
  const evidence = allDomainEvidence(progress);
  const recent = [...progress.attempts].reverse().slice(0, 40);
  const assessmentAttempts = progress.attempts.filter((a) => a.context.startsWith('assessment'));

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Evidence</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Progress</h1>
        <p className="lede">
          Reading, answering and reviewing are recorded separately. Reading a lesson never counts as demonstrating a skill.
        </p>
      </header>

      <section className="card" aria-labelledby="rules-h">
        <h2 id="rules-h" style={{ fontSize: '1.2rem' }}>
          How states are defined
        </h2>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          These are this course&apos;s instructional thresholds, not an industry certification standard.
        </p>
        <dl style={{ display: 'grid', gap: '0.6rem', margin: 0 }}>
          <div>
            <dt className="label">Not assessed</dt>
            <dd style={{ margin: 0 }}>No practice answers recorded in the domain.</dd>
          </div>
          <div>
            <dt className="label">Practiced</dt>
            <dd style={{ margin: 0 }}>At least one practice answer recorded.</dd>
          </div>
          <div>
            <dt className="label">Demonstrated</dt>
            <dd style={{ margin: 0 }}>
              All 10 lessons marked read; at least {THRESHOLDS.minFirstAttemptMcq} first-attempt multiple-choice answers with at least{' '}
              {THRESHOLDS.mcqAccuracy * 100}% correct; and {THRESHOLDS.openResponses} different applied or advanced open responses scored{' '}
              {THRESHOLDS.openMinScore} or more. If those scores are self-reviewed, the domain is labelled as self-reviewed evidence.
            </dd>
          </div>
          <div>
            <dt className="label">Reviewed</dt>
            <dd style={{ margin: 0 }}>
              Demonstrated, plus {THRESHOLDS.reviewedCorrect} correct retry or spaced-review answers recorded at least {THRESHOLDS.reviewedDelayDays}{' '}
              days after your first attempt in the domain.
            </dd>
          </div>
        </dl>
        <h3 style={{ fontSize: '1rem', margin: '1.2rem 0 0.4rem' }}>Grading methods</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.93rem' }}>
          <li>Multiple choice: graded deterministically against the answer key.</li>
          <li>
            Open responses: you compare your answer with the exemplar and the published rubric (0–3) and record a <strong>self-review</strong>.{' '}
            {COACH_ENABLED
              ? 'An optional AI coach is configured on this deployment; its grades are labelled AI-graded and can be challenged.'
              : 'No AI coach is configured on this deployment, so no automated grading of free text takes place.'}
          </li>
          <li>Human-reviewed evidence is a separate status. This release has no reviewer workflow, so no answer is labelled human-reviewed.</li>
          <li>First attempts and retries are counted separately; only first attempts count toward the accuracy threshold.</li>
        </ul>
      </section>

      <section aria-labelledby="totals-h">
        <h2 id="totals-h" style={{ fontSize: '1.3rem', margin: '0.5rem 0 0.7rem' }}>
          Totals
        </h2>
        <dl className="grid-auto">
          {[
            ['Lessons marked read', `${t.lessonsCompleted}/${t.lessonsTotal}`],
            ['Practice questions attempted', `${t.questionsAttempted}/${t.questionsTotal}`],
            ['First-attempt MCQ', `${t.firstMcq.correct}/${t.firstMcq.total} correct`],
            ['MCQ retries', `${t.retryMcq.correct}/${t.retryMcq.total} correct`],
            ['Open responses scored', `${t.openScored} (${t.openUngraded} not yet reviewed)`],
            ['Assessment answers recorded', `${assessmentAttempts.length} of ${ASSESSMENT.length} items per attempt`],
          ].map(([label, value]) => (
            <div key={label} className="card flat stat">
              <dt className="stat-label">{label}</dt>
              <dd className="mono" style={{ margin: 0, fontSize: '1.1rem' }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="dom-ev-h">
        <h2 id="dom-ev-h" style={{ fontSize: '1.3rem', margin: '0.5rem 0 0.7rem' }}>
          Evidence by domain
        </h2>
        <div className="grid-auto">
          {evidence.map((e) => (
            <article key={e.domainId} className="card flat" aria-labelledby={`ev-${e.domainId}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 id={`ev-${e.domainId}`} style={{ fontSize: '1rem' }}>
                  {e.domainId} {DOMAIN_BY_ID.get(e.domainId)?.short}
                </h3>
                <span className={`chip ${e.state === 'not-assessed' ? '' : e.state === 'practiced' ? 'info' : 'ok'}`}>{DOMAIN_STATE_LABEL[e.state]}</span>
              </div>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.88rem' }}>
                <li>
                  Lessons read: {e.lessonsCompleted}/{e.lessonsTotal}
                </li>
                <li>
                  First-attempt MCQ: {e.firstAttemptMcq.correct}/{e.firstAttemptMcq.total}
                  {e.firstAttemptMcq.total ? ` (${Math.round((e.firstAttemptMcq.correct / e.firstAttemptMcq.total) * 100)}%)` : ''}; retries {e.retryMcq.correct}/{e.retryMcq.total}
                </li>
                <li>
                  Open responses ≥2: {e.openQualifying.length}
                  {e.openQualifying.length > 0 && ` (${e.openQualifying.map((o) => `${o.questionId}: ${GRADING_LABEL[o.grading]}`).join('; ')})`}
                </li>
                {e.openUngraded > 0 && <li>{e.openUngraded} open response(s) awaiting self-review</li>}
              </ul>
              {e.missing.length > 0 && (
                <p className="muted" style={{ fontSize: '0.82rem', margin: '0.5rem 0 0' }}>
                  Next: {e.missing[0]}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="hist-h">
        <h2 id="hist-h" style={{ fontSize: '1.3rem', margin: '0.5rem 0 0.7rem' }}>
          Recent attempts
        </h2>
        {recent.length === 0 ? (
          <div className="empty">
            No attempts recorded yet. <Link to="/practice">Start practising</Link>.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Most recent 40 attempts</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Question</th>
                  <th scope="col">Context</th>
                  <th scope="col">Attempt</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{formatDate(a.at)}</td>
                    <td className="mono">
                      {a.questionId}
                      {QUESTION_BY_ID.get(a.questionId)?.kind === 'open' ? ' (open)' : ''}
                    </td>
                    <td>{CONTEXT_LABEL[a.context]}</td>
                    <td>{a.first ? 'First' : 'Retry'}{a.hintUsed ? ' · hint' : ''}</td>
                    <td>{resultText(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
