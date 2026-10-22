import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Inline } from '../components/RichText';
import { LESSONS } from '../content/index';
import { searchGlossary } from '../lib/search';
import { usePageTitle } from '../lib/usePageTitle';

const BACKLINKS: ReadonlyMap<string, { id: string; title: string }[]> = (() => {
  const map = new Map<string, { id: string; title: string }[]>();
  for (const l of LESSONS) for (const t of l.glossary) map.set(t, [...(map.get(t) ?? []), { id: l.id, title: l.title }]);
  return map;
})();

export function GlossaryPage() {
  usePageTitle('Glossary');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const focusTerm = params.get('term');
  const results = searchGlossary(q);

  useEffect(() => {
    if (!focusTerm) return;
    const el = document.getElementById(`term-${focusTerm}`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  }, [focusTerm]);

  return (
    <div className="stack" style={{ maxWidth: '54rem' }}>
      <header>
        <p className="eyebrow">Reference</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Glossary</h1>
        <p className="lede">Working definitions used in this course, with links to the lessons that rely on them.</p>
      </header>
      <div className="field" role="search">
        <label htmlFor="gq">Search terms and definitions</label>
        <input
          id="gq"
          className="input"
          type="search"
          value={q}
          onChange={(e) => {
            const next = new URLSearchParams();
            if (e.target.value) next.set('q', e.target.value);
            setParams(next, { replace: true });
          }}
        />
      </div>
      <p className="muted" aria-live="polite" style={{ margin: 0 }}>
        {results.length} term{results.length === 1 ? '' : 's'}
      </p>
      {results.length === 0 && <div className="empty">No glossary terms match “{q}”.</div>}
      <dl style={{ display: 'grid', gap: '0.7rem', margin: 0 }}>
        {results.map((g) => {
          const links = BACKLINKS.get(g.id) ?? [];
          return (
            <div
              key={g.id}
              id={`term-${g.id}`}
              tabIndex={-1}
              className="card flat"
              style={{ padding: '0.9rem 1rem', borderColor: focusTerm === g.id ? 'var(--accent)' : undefined }}
            >
              <dt style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>{g.term}</dt>
              <dd style={{ margin: '0.3rem 0 0' }}>
                <Inline text={g.definition} />
                {links.length > 0 && (
                  <p className="muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                    Used in:{' '}
                    {links.map((l, i) => (
                      <span key={l.id}>
                        {i > 0 && ' · '}
                        <Link to={`/lesson/${l.id}`} title={l.title}>
                          {l.id}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
