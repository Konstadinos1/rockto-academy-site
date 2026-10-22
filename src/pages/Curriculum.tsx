import { Link, useSearchParams } from 'react-router';
import { DOMAINS } from '../content/index';
import type { Lesson } from '../content/types';
import { searchLessons } from '../lib/search';
import { usePageTitle } from '../lib/usePageTitle';
import type { Progress } from '../state/schema';
import { useStore } from '../state/store';

type StatusFilter = 'all' | 'not-started' | 'visited' | 'completed';

function lessonStatus(p: Progress, id: string): Exclude<StatusFilter, 'all'> {
  if (p.completed[id]) return 'completed';
  return p.visits[id] ? 'visited' : 'not-started';
}

const STATUS_LABEL: Record<Exclude<StatusFilter, 'all'>, string> = {
  'not-started': 'Not started',
  visited: 'Opened',
  completed: 'Read',
};

function LessonRow({ lesson, status }: { lesson: Lesson; status: Exclude<StatusFilter, 'all'> }) {
  return (
    <li className="card flat" style={{ padding: '0.9rem 1rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ minWidth: 0, flex: '1 1 20rem' }}>
          <Link to={`/lesson/${lesson.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
            <span className="mono" style={{ color: 'var(--accent)', fontSize: '0.82rem', marginRight: '0.5rem' }}>
              {lesson.id}
            </span>
            {lesson.title}
          </Link>
          <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            {lesson.summary}
          </p>
        </div>
        <div className="row" style={{ gap: '0.35rem' }}>
          <span className="chip">{lesson.minutes} min</span>
          <span className={`chip ${status === 'completed' ? 'ok' : status === 'visited' ? 'info' : ''}`}>{STATUS_LABEL[status]}</span>
        </div>
      </div>
    </li>
  );
}

export function CurriculumPage() {
  usePageTitle('Curriculum');
  const { progress } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const domainFilter = params.get('domain') ?? 'all';
  const status = (params.get('status') ?? 'all') as StatusFilter;
  const coreOnly = params.get('core') === '1';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '' || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const matched = new Set(searchLessons(q).map((l) => l.id));
  const domains = DOMAINS.filter((d) => (domainFilter === 'all' || d.id === domainFilter) && (!coreOnly || d.core));
  const visibleCount = domains.reduce(
    (n, d) => n + searchLessons(q).filter((l) => l.domainId === d.id && (status === 'all' || lessonStatus(progress, l.id) === status)).length,
    0,
  );

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Curriculum</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>12 domains · 120 lessons</h1>
        <p className="lede">
          Each domain builds from mechanism to implementation, evidence and response. The four core subjects are marked. This is an
          original course structure, not an official certification syllabus.
        </p>
      </header>
      <form className="toolbar card flat" role="search" onSubmit={(e) => e.preventDefault()} style={{ padding: '0.9rem' }}>
        <div className="field" style={{ flex: '2 1 16rem' }}>
          <label htmlFor="cq">Search lessons</label>
          <input id="cq" className="input" type="search" value={q} placeholder="e.g. memory, canary, MCP audience" onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 12rem' }}>
          <label htmlFor="cd">Domain</label>
          <select id="cd" className="select" value={domainFilter} onChange={(e) => setParam('domain', e.target.value)}>
            <option value="all">All domains</option>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} {d.short}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: '1 1 10rem' }}>
          <label htmlFor="cs">Reading status</label>
          <select id="cs" className="select" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="all">Any</option>
            <option value="not-started">Not started</option>
            <option value="visited">Opened</option>
            <option value="completed">Read</option>
          </select>
        </div>
        <label className="row" style={{ gap: '0.4rem', paddingBottom: '0.6rem' }}>
          <input type="checkbox" checked={coreOnly} onChange={(e) => setParam('core', e.target.checked ? '1' : null)} />
          Core subjects only
        </label>
      </form>
      <p className="muted" aria-live="polite" style={{ margin: 0 }}>
        {visibleCount} lesson{visibleCount === 1 ? '' : 's'} shown
      </p>
      {visibleCount === 0 && (
        <div className="empty">
          No lessons match these filters.{' '}
          <button type="button" className="btn small" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear filters
          </button>
        </div>
      )}
      {domains.map((d) => {
        const lessons = searchLessons('')
          .filter((l) => l.domainId === d.id && matched.has(l.id))
          .filter((l) => status === 'all' || lessonStatus(progress, l.id) === status);
        if (!lessons.length) return null;
        return (
          <section key={d.id} aria-labelledby={`dom-${d.id}`} style={{ marginTop: '1.6rem' }}>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span className="domain-id">{d.id}</span>
              <h2 id={`dom-${d.id}`} style={{ fontSize: '1.35rem' }}>
                {d.title}
              </h2>
              {d.core && <span className="chip accent">Core subject</span>}
            </div>
            <p className="muted" style={{ margin: '0.3rem 0 0.2rem', maxWidth: '50rem' }}>
              {d.description}
            </p>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
              Prerequisites: {d.prerequisites.length ? d.prerequisites.map((p) => DOMAINS.find((x) => x.id === p)?.title ?? p).join('; ') : 'none'}
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {lessons.map((l) => (
                <LessonRow key={l.id} lesson={l} status={lessonStatus(progress, l.id)} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
