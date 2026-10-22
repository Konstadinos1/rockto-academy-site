import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Blocks, Inline } from '../components/RichText';
import { NotesEditor } from '../components/NotesEditor';
import { SourceCitation } from '../components/SourceCitation';
import {
  DOMAIN_BY_ID,
  GLOSSARY_BY_ID,
  LESSON_BY_ID,
  QUESTIONS,
  SOURCE_BY_ID,
  nextLesson,
  previousLesson,
} from '../content/index';
import type { Lesson } from '../content/types';
import { formatDate } from '../lib/dates';
import { isSuccess } from '../lib/grading';
import { latestAttempt } from '../lib/metrics';
import { usePageTitle } from '../lib/usePageTitle';
import { recordVisit, revealExercise, setLessonComplete, startPractice } from '../state/actions';
import { useStore } from '../state/store';
import { LAB_TITLES } from './Lab';
import { NotFoundPage } from './NotFound';

const PANEL_KEY = 'rockto-academy:panel';

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: ReactNode }) {
  return (
    <section className="lesson-section" id={id} aria-labelledby={`${id}-h`}>
      <div className="section-head">
        <span className="section-num">{num}</span>
        <h2 id={`${id}-h`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SECTIONS = [
  ['objectives', 'Objectives'],
  ['mechanism', 'Mechanism'],
  ['boundary', 'Boundary and attacker control'],
  ['scenario', 'ROCKTO scenario'],
  ['worked', 'Worked example'],
  ['controls', 'Controls and enforcement points'],
  ['misconception', 'Common misconception'],
  ['exercise', 'Exercise'],
  ['practice', 'Practice questions'],
  ['sources', 'Sources and next lesson'],
] as const;

function Exercise({ lesson }: { lesson: Lesson }) {
  const { progress, update } = useStore();
  const saved = progress.exercises[lesson.id];
  const [draft, setDraft] = useState('');
  const canReveal = draft.trim().length >= 15;
  return (
    <div className="stack">
      <p className="chip">{lesson.exercise.kind === 'tabletop' ? 'Tabletop exercise' : 'Reflection'} · unscored</p>
      <div className="prose">
        <p>
          <Inline text={lesson.exercise.prompt} />
        </p>
      </div>
      {saved ? (
        <div className="stack fade-in">
          <div className="reveal">
            <p className="eyebrow">Your response · {formatDate(saved.revealedAt)}</p>
            <p style={{ whiteSpace: 'pre-wrap', margin: '0.4rem 0 0' }}>{saved.response}</p>
          </div>
          <div className="reveal" style={{ borderColor: 'var(--accent)' }}>
            <p className="eyebrow">Model response</p>
            <div className="prose" style={{ marginTop: '0.4rem' }}>
              {lesson.exercise.modelResponse.map((t, i) => (
                <p key={i}>
                  <Inline text={t} />
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (canReveal) update((p) => revealExercise(p, lesson.id, draft));
          }}
        >
          <div className="field">
            <label htmlFor={`ex-${lesson.id}`}>Your response</label>
            <textarea id={`ex-${lesson.id}`} className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={20000} />
          </div>
          <div className="row">
            <button type="submit" className="btn" disabled={!canReveal} aria-describedby={`ex-hint-${lesson.id}`}>
              Save and show model response
            </button>
            <span id={`ex-hint-${lesson.id}`} className="muted" style={{ fontSize: '0.85rem' }}>
              {canReveal ? 'The model response appears after you save your attempt.' : 'Write at least a sentence to reveal the model response.'}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

function PracticeList({ lesson }: { lesson: Lesson }) {
  const { progress, update } = useStore();
  const navigate = useNavigate();
  const questions = QUESTIONS.filter((q) => q.lessonId === lesson.id);
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Three multiple-choice questions, one diagnosis and one control/evidence question. Feedback appears after each answer.
      </p>
      <ol className="explain-list">
        {questions.map((q, i) => {
          const last = latestAttempt(progress, q.id);
          const ok = last ? isSuccess(last.result) : undefined;
          const status = !last ? 'Not attempted' : ok === null ? 'Awaiting self-review' : ok ? 'Answered well' : 'Revisit';
          const tone = !last ? '' : ok === null ? 'info' : ok ? 'ok' : 'warn';
          return (
            <li key={q.id}>
              <span className="mono muted">{i + 1}.</span>
              <span className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  {q.kind === 'mcq' ? 'Multiple choice' : q.focus === 'diagnosis' ? 'Open: diagnosis' : 'Open: control and evidence'}{' '}
                  <span className="muted">· {q.difficulty}</span>
                </span>
                <span className={`chip ${tone}`}>{status}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          update((p) => startPractice(p, { type: 'lesson', id: lesson.id }));
          navigate('/practice');
        }}
      >
        Practice this lesson
      </button>
    </div>
  );
}

function SidePanel({ lesson, open, onToggle }: { lesson: Lesson; open: boolean; onToggle: () => void }) {
  return (
    <aside className="side-panel" aria-label="Lesson notes and evidence">
      <div className="side-panel-head">
        <strong className="side-panel-title" style={{ fontSize: '0.9rem' }}>
          Notes and evidence
        </strong>
        <button type="button" className="btn ghost small" aria-expanded={open} onClick={onToggle} aria-label={open ? 'Collapse notes panel' : 'Expand notes panel'}>
          {open ? '⟩' : '⟨'}
        </button>
      </div>
      <div className="side-panel-body">
        <nav aria-label="On this page">
          <p className="nav-group-label" style={{ padding: 0 }}>
            On this page
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.2rem' }}>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#/lesson/${lesson.id}#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView(); }}>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <NotesEditor lessonId={lesson.id} />
        {lesson.glossary.length > 0 && (
          <div>
            <p className="nav-group-label" style={{ padding: 0 }}>
              Terms
            </p>
            <div className="row" style={{ gap: '0.35rem' }}>
              {lesson.glossary.map((t) => (
                <Link key={t} className="chip" to={`/glossary?term=${t}`}>
                  {GLOSSARY_BY_ID.get(t)?.term ?? t}
                </Link>
              ))}
            </div>
          </div>
        )}
        {lesson.related.length > 0 && (
          <div>
            <p className="nav-group-label" style={{ padding: 0 }}>
              Related lessons
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {lesson.related.map((id) => (
                <li key={id}>
                  <Link to={`/lesson/${id}`}>
                    {id} {LESSON_BY_ID.get(id)?.title ?? ''}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

function readPanelOpen(): boolean {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'closed';
  } catch {
    return true;
  }
}

function CompletionControl({ lesson }: { lesson: Lesson }) {
  const { progress, update } = useStore();
  const done = Boolean(progress.completed[lesson.id]);
  return (
    <div className="row">
      <button type="button" className={done ? 'btn' : 'btn primary'} aria-pressed={done} onClick={() => update((p) => setLessonComplete(p, lesson.id, !done))}>
        {done ? '✓ Reading complete' : 'Mark reading complete'}
      </button>
      <span className="muted" style={{ fontSize: '0.85rem' }}>
        {done ? `Marked ${formatDate(progress.completed[lesson.id])}. Completing a lesson records reading, not skill.` : 'Records that you read the lesson. Skill evidence comes from practice.'}
      </span>
    </div>
  );
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = LESSON_BY_ID.get(lessonId);
  const { update } = useStore();
  const [panelOpen, setPanelOpen] = useState(readPanelOpen);
  const visited = useRef<string | null>(null);
  usePageTitle(lesson ? `${lesson.id} ${lesson.title}` : 'Lesson not found');

  useEffect(() => {
    if (lesson && visited.current !== lesson.id) {
      visited.current = lesson.id;
      update((p) => recordVisit(p, lesson.id));
    }
  }, [lesson, update]);

  if (!lesson) return <NotFoundPage what="lesson" />;
  const domain = DOMAIN_BY_ID.get(lesson.domainId);
  const next = nextLesson(lesson.id);
  const prev = previousLesson(lesson.id);
  const togglePanel = () => {
    setPanelOpen((o) => {
      try {
        localStorage.setItem(PANEL_KEY, o ? 'closed' : 'open');
      } catch {
        // Panel preference is a convenience; ignore blocked storage.
      }
      return !o;
    });
  };

  return (
    <div className="lesson-layout" data-panel={panelOpen ? 'open' : 'closed'}>
      <article className="lesson-main">
        <header>
          <p className="eyebrow">
            <Link to={`/curriculum?domain=${lesson.domainId}`}>{lesson.domainId}</Link> · {domain?.title} · Lesson {lesson.order} of 10
          </p>
          <h1 style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', marginTop: '0.5rem' }}>{lesson.title}</h1>
          <p className="lede">{lesson.summary}</p>
          <p className="row muted" style={{ fontSize: '0.84rem', marginTop: '0.8rem' }}>
            <span className="mono">{lesson.id}</span>
            <span>· about {lesson.minutes} min</span>
            <span>· content v{lesson.version}</span>
            <span>· reviewed {formatDate(lesson.reviewed)}</span>
          </p>
          <div style={{ marginTop: '1rem' }}>
            <CompletionControl lesson={lesson} />
          </div>
        </header>

        <Section id="objectives" num="01" title="Objectives">
          <ol className="objectives">
            {lesson.objectives.map((o, i) => (
              <li key={i}>
                <span>{o}</span>
              </li>
            ))}
          </ol>
          <p className="muted" style={{ marginTop: '1rem', fontSize: '0.92rem' }}>
            Prerequisites:{' '}
            {lesson.prerequisites.length === 0
              ? 'none — this lesson starts from first principles.'
              : lesson.prerequisites.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link to={`/lesson/${id}`}>
                      {id} {LESSON_BY_ID.get(id)?.title}
                    </Link>
                  </span>
                ))}
          </p>
        </Section>

        <Section id="mechanism" num="02" title="Mechanism">
          <div className="prose">
            <Blocks blocks={lesson.explanation} />
          </div>
        </Section>

        <Section id="boundary" num="03" title="Boundary and attacker control">
          <div className="boundary-grid">
            <div className="boundary-cell">
              <h3>Affected component</h3>
              <Inline text={lesson.boundary.component} />
            </div>
            <div className="boundary-cell">
              <h3>Trust boundary</h3>
              <Inline text={lesson.boundary.trustBoundary} />
            </div>
            <div className="boundary-cell">
              <h3>Attacker control</h3>
              <Inline text={lesson.boundary.attackerControl} />
            </div>
          </div>
        </Section>

        <Section id="scenario" num="04" title={`ROCKTO scenario: ${lesson.scenario.title}`}>
          <div className="prose">
            <p>
              <span className="chip warn" style={{ marginRight: '0.5rem' }}>
                Synthetic
              </span>
              <Inline text={lesson.scenario.setup} />
            </p>
            <Blocks blocks={lesson.scenario.evidence} />
          </div>
        </Section>

        <Section id="worked" num="05" title={`Worked example: ${lesson.worked.title}`}>
          <div className="prose">
            <Blocks blocks={lesson.worked.blocks} />
          </div>
          {lesson.labId && (
            <p style={{ marginTop: '0.5rem' }}>
              <Link className="btn small" to={`/lab/${lesson.labId}`}>
                Explore in the case lab: {LAB_TITLES[lesson.labId]}
              </Link>
            </p>
          )}
        </Section>

        <Section id="controls" num="06" title="Controls and enforcement points">
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Controls, where they are enforced, and their limitations</caption>
              <thead>
                <tr>
                  <th scope="col">Control</th>
                  <th scope="col">Enforcement point</th>
                  <th scope="col">Limitation</th>
                </tr>
              </thead>
              <tbody>
                {lesson.controls.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <Inline text={c.control} />
                    </td>
                    <td>
                      <Inline text={c.enforcementPoint} />
                    </td>
                    <td>
                      <Inline text={c.limitation} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="misconception" num="07" title="Common misconception">
          <div className="misconception">
            <div className="claim">
              <p className="eyebrow">Misconception</p>
              <p style={{ margin: '0.4rem 0 0' }}>
                <Inline text={lesson.misconception.claim} />
              </p>
            </div>
            <div className="fix">
              <p className="eyebrow">Correction</p>
              <p style={{ margin: '0.4rem 0 0' }}>
                <Inline text={lesson.misconception.correction} />
              </p>
            </div>
          </div>
        </Section>

        <Section id="exercise" num="08" title="Exercise">
          <Exercise key={lesson.id} lesson={lesson} />
        </Section>

        <Section id="practice" num="09" title="Practice questions">
          <PracticeList lesson={lesson} />
        </Section>

        <Section id="sources" num="10" title="Sources and next lesson">
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lesson.sourceIds.map((id) => {
              const s = SOURCE_BY_ID.get(id);
              return s ? (
                <li key={id}>
                  <SourceCitation source={s} />
                </li>
              ) : null;
            })}
          </ul>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
            Lesson content reviewed {formatDate(lesson.reviewed)}. ROCKTO scenarios are fictional teaching examples, not reports of real incidents.
          </p>
          <div style={{ marginTop: '1.4rem' }}>
            <CompletionControl lesson={lesson} />
          </div>
          <nav className="row" aria-label="Lesson navigation" style={{ justifyContent: 'space-between', marginTop: '1.6rem' }}>
            {prev ? (
              <Link className="btn" to={`/lesson/${prev.id}`}>
                ← {prev.id}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="btn primary" to={`/lesson/${next.id}`}>
                Next: {next.id} {next.title} →
              </Link>
            ) : (
              <Link className="btn primary" to="/assessment">
                Final lesson complete: take the assessment →
              </Link>
            )}
          </nav>
        </Section>
      </article>
      <SidePanel lesson={lesson} open={panelOpen} onToggle={togglePanel} />
    </div>
  );
}
