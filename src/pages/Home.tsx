import { Link } from 'react-router';
import { Blocks, Inline } from '../components/RichText';
import { ASSESSMENT, DOMAINS, LESSON_BY_ID, LESSONS, QUESTIONS } from '../content/index';
import { lastVisitedLesson, nextRecommendedLesson } from '../lib/metrics';
import { usePageTitle } from '../lib/usePageTitle';
import { useStore } from '../state/store';

const PREVIEW_LESSON = 'D01-L05';

function LessonPreview() {
  const lesson = LESSON_BY_ID.get(PREVIEW_LESSON) ?? LESSONS[0];
  if (!lesson) return null;
  const trace = lesson.scenario.evidence.find((b) => b.t === 'trace');
  return (
    <aside className="preview" aria-label={`Preview of lesson ${lesson.id}`}>
      <div className="preview-head">
        <span>{lesson.id}</span>
        <span aria-hidden="true">·</span>
        <span>Lesson preview</span>
      </div>
      <div className="preview-body">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>{lesson.title}</h2>
        <div className="prose" style={{ fontSize: '0.95rem' }}>
          <p>
            <Inline text={lesson.explanation[0]?.t === 'p' ? lesson.explanation[0].text : lesson.summary} />
          </p>
        </div>
        {trace && (
          <div style={{ fontSize: '0.92rem' }}>
            <Blocks blocks={[trace]} />
          </div>
        )}
        <Link className="btn small" to={`/lesson/${lesson.id}`}>
          Open this lesson
        </Link>
      </div>
    </aside>
  );
}

export function HomePage() {
  usePageTitle('');
  const { progress } = useStore();
  const resume = lastVisitedLesson(progress);
  const next = nextRecommendedLesson(progress) ?? LESSONS[0]?.id ?? 'D01-L01';
  const hasProgress = progress.attempts.length > 0 || Object.keys(progress.visits).length > 0;
  const startTarget = hasProgress && resume ? resume : next;

  return (
    <div>
      <section className="hero">
        <div>
          <p className="eyebrow">ROCKTO Academy · AI Security Lab</p>
          <h1>
            Learn to secure AI systems by tracing what <em>actually executes</em>.
          </h1>
          <p className="lede">
            A self-study course for security practitioners: prompt injection, sensitive data leakage, training data poisoning,
            hallucinations, and the engineering that contains them. Every scenario uses ROCKTO Inc., a fictional company with
            synthetic records.
          </p>
          <div className="row" style={{ marginTop: '1.5rem' }}>
            <Link className="btn primary large" to={`/lesson/${startTarget}`}>
              {hasProgress ? 'Continue learning' : 'Start learning'}
            </Link>
            <Link className="btn large" to="/curriculum">
              Browse the curriculum
            </Link>
          </div>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: '0.9rem' }}>
            No account and no AI subscription needed. Progress stays in this browser; export it any time.
          </p>
          <dl className="row" style={{ gap: '1.5rem', marginTop: '1.6rem' }}>
            {[
              [LESSONS.length, 'lessons'],
              [QUESTIONS.length, 'practice questions'],
              [ASSESSMENT.length, 'assessment items'],
              [DOMAINS.length, 'domains'],
            ].map(([n, label]) => (
              <div key={label} className="stat">
                <dt className="stat-label">{label}</dt>
                <dd className="stat-value" style={{ margin: 0 }}>
                  {n}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <LessonPreview />
      </section>

      <section aria-labelledby="map-title" style={{ marginTop: '2.5rem' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem' }}>
          <div>
            <p className="eyebrow">Curriculum map</p>
            <h2 id="map-title" style={{ fontSize: '1.6rem', marginTop: '0.3rem' }}>
              Twelve domains, from mechanism to response
            </h2>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            <span className="chip accent">Core subject</span> marks the four core subjects.
          </p>
        </div>
        <ol className="domain-map">
          {DOMAINS.map((d) => (
            <li key={d.id}>
              <Link className="domain-tile" to={`/curriculum?domain=${d.id}`} data-core={d.core}>
                <span className="domain-id">
                  {d.id}
                  {d.core && <span className="sr-only"> (core subject)</span>}
                </span>
                <span className="domain-title">{d.title}</span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {d.prerequisites.length ? `Builds on ${d.prerequisites.join(', ')}` : 'Start here'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid-auto" style={{ marginTop: '2.5rem' }} aria-label="How the course works">
        <div className="card flat">
          <h3 style={{ fontSize: '1.05rem' }}>Coached practice</h3>
          <p className="muted" style={{ margin: '0.4rem 0 0' }}>
            One question at a time. You answer first; the correction and the reasoning for every option appear only after you submit.
          </p>
        </div>
        <div className="card flat">
          <h3 style={{ fontSize: '1.05rem' }}>Honest evidence</h3>
          <p className="muted" style={{ margin: '0.4rem 0 0' }}>
            Reading is tracked separately from answering. Open responses are self-reviewed against a published rubric and labelled that way.
          </p>
        </div>
        <div className="card flat">
          <h3 style={{ fontSize: '1.05rem' }}>Browser simulations</h3>
          <p className="muted" style={{ margin: '0.4rem 0 0' }}>
            The case lab simulates permissions, traces and evaluations with synthetic data. It teaches boundaries; it is not a security gateway.
          </p>
        </div>
      </section>
    </div>
  );
}
