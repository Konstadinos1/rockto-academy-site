import { Link, useNavigate } from 'react-router';
import { Inline } from '../components/RichText';
import { LESSON_BY_ID, QUESTION_BY_ID } from '../content/index';
import { formatDate } from '../lib/dates';
import { latestAttempt, mistakeQuestionIds } from '../lib/metrics';
import { pickReviewQuestion } from '../lib/review';
import { usePageTitle } from '../lib/usePageTitle';
import { startPractice } from '../state/actions';
import type { Attempt, Progress, ReviewItem } from '../state/schema';
import { useStore } from '../state/store';

function originalAnswer(attempt: Attempt): string {
  const q = QUESTION_BY_ID.get(attempt.questionId);
  if (attempt.response.kind === 'open') return attempt.response.text;
  const optionId = attempt.response.optionId;
  return q?.kind === 'mcq' ? (q.options.find((o) => o.id === optionId)?.text ?? optionId) : optionId;
}

function correction(questionId: string): string {
  const q = QUESTION_BY_ID.get(questionId);
  if (!q) return '';
  if (q.kind === 'mcq') {
    const right = q.options.find((o) => o.id === q.answer);
    return right ? `${right.text} — ${right.explanation}` : '';
  }
  return q.exemplar;
}

function followUpFor(questionId: string, progress: Progress) {
  const q = QUESTION_BY_ID.get(questionId);
  if (!q) return undefined;
  const pseudo: ReviewItem = {
    key: q.lessonId,
    lessonId: q.lessonId,
    conceptTag: q.conceptTag,
    sourceQuestionId: q.id,
    missedAt: new Date().toISOString(),
    step: 0,
    dueAt: new Date().toISOString(),
    retired: false,
    history: [],
  };
  return pickReviewQuestion(pseudo, progress);
}

export function MistakesPage() {
  usePageTitle('Mistake notebook');
  const { progress, update } = useStore();
  const navigate = useNavigate();
  const ids = mistakeQuestionIds(progress);

  return (
    <div className="stack" style={{ maxWidth: '56rem' }}>
      <header>
        <p className="eyebrow">Evidence</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Mistake notebook</h1>
        <p className="lede">
          Each entry shows the misconception, what you answered, the correction, and a different scenario on the same concept. Entries leave
          the notebook when your latest attempt on that question succeeds.
        </p>
      </header>
      {ids.length === 0 ? (
        <div className="empty">
          <p style={{ marginTop: 0 }}>No mistakes recorded. Incorrect answers and open responses you self-score below 2 appear here.</p>
          <Link className="btn" to="/practice">
            Go to practice
          </Link>
        </div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
          {ids.map((id) => {
            const q = QUESTION_BY_ID.get(id);
            const attempt = latestAttempt(progress, id);
            if (!q || !attempt) return null;
            const lesson = LESSON_BY_ID.get(q.lessonId);
            const follow = followUpFor(id, progress);
            return (
              <li key={id} className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <p className="eyebrow">
                    {id} · {q.kind === 'mcq' ? 'multiple choice' : 'open response'} · {formatDate(attempt.at)}
                  </p>
                  <span className="chip mono">{q.conceptTag}</span>
                </div>
                <dl style={{ display: 'grid', gap: '0.8rem', margin: '0.6rem 0 0' }}>
                  <div>
                    <dt className="label">Misconception</dt>
                    <dd style={{ margin: '0.2rem 0 0' }}>{lesson ? <Inline text={lesson.misconception.claim} /> : q.conceptTag}</dd>
                  </div>
                  <div>
                    <dt className="label">Question</dt>
                    <dd style={{ margin: '0.2rem 0 0' }}>
                      <Inline text={q.stem} />
                    </dd>
                  </div>
                  <div>
                    <dt className="label">Your answer</dt>
                    <dd style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap', color: 'var(--bad)' }}>{originalAnswer(attempt)}</dd>
                  </div>
                  <div>
                    <dt className="label">Correction</dt>
                    <dd style={{ margin: '0.2rem 0 0' }}>
                      <Inline text={correction(id)} />
                    </dd>
                  </div>
                  {follow && (
                    <div>
                      <dt className="label">Different follow-up scenario</dt>
                      <dd style={{ margin: '0.2rem 0 0' }}>
                        <p style={{ margin: 0 }}>
                          <Inline text={follow.stem} />
                        </p>
                        <button
                          type="button"
                          className="btn small primary"
                          style={{ marginTop: '0.5rem' }}
                          onClick={() => {
                            update((p) => startPractice(p, { type: 'question', id: follow.id }));
                            navigate('/practice');
                          }}
                        >
                          Answer this follow-up
                        </button>
                      </dd>
                    </div>
                  )}
                </dl>
                {lesson && (
                  <p style={{ margin: '0.8rem 0 0', fontSize: '0.9rem' }}>
                    Revisit <Link to={`/lesson/${lesson.id}`}>{lesson.id} {lesson.title}</Link>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
