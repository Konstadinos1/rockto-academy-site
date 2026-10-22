import { Link, useSearchParams } from 'react-router';
import { SourceCitation } from '../components/SourceCitation';
import { LESSONS } from '../content/index';
import type { SourceKind } from '../content/types';
import { searchSources } from '../lib/search';
import { usePageTitle } from '../lib/usePageTitle';

const KINDS: { value: SourceKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'framework', label: 'Frameworks' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'specification', label: 'Specifications' },
  { value: 'standard', label: 'Standards' },
  { value: 'government-report', label: 'Government reports' },
  { value: 'research', label: 'Research' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'legislation', label: 'Legislation' },
];

const CITED_BY: ReadonlyMap<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const l of LESSONS) for (const s of l.sourceIds) map.set(s, [...(map.get(s) ?? []), l.id]);
  return map;
})();

export function SourcesPage() {
  usePageTitle('Sources');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const kind = params.get('kind') ?? 'all';
  const results = searchSources(q).filter((s) => kind === 'all' || s.kind === kind);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="stack" style={{ maxWidth: '58rem' }}>
      <header>
        <p className="eyebrow">Reference</p>
        <h1 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>Source library</h1>
        <p className="lede">
          Primary references with the version and date this course relied on. Framework requirements, implementation guidance, research
          results and the fictional ROCKTO examples are different kinds of evidence; the label on each source says which.
        </p>
      </header>
      <div className="callout note" role="note">
        <p>
          Links were requested on the access date shown. Research entries are arXiv records: titles and dates were confirmed, but later
          peer-reviewed publication is not asserted. Sources change; check the live document before relying on a specific requirement.
        </p>
      </div>
      <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field" style={{ flex: '2 1 16rem' }}>
          <label htmlFor="sq">Search sources</label>
          <input id="sq" className="input" type="search" value={q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <div className="field" style={{ flex: '1 1 12rem' }}>
          <label htmlFor="sk">Kind</label>
          <select id="sk" className="select" value={kind} onChange={(e) => set('kind', e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </form>
      <p className="muted" aria-live="polite" style={{ margin: 0 }}>
        {results.length} source{results.length === 1 ? '' : 's'}
      </p>
      {results.length === 0 && <div className="empty">No sources match these filters.</div>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.7rem' }}>
        {results.map((s) => {
          const cited = CITED_BY.get(s.id) ?? [];
          return (
            <li key={s.id}>
              <SourceCitation source={s} />
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0.35rem 0 0 0.2rem' }}>
                {cited.length ? (
                  <>
                    Cited in {cited.length} lesson{cited.length > 1 ? 's' : ''}:{' '}
                    {cited.map((id, i) => (
                      <span key={id}>
                        {i > 0 && ' · '}
                        <Link to={`/lesson/${id}`}>{id}</Link>
                      </span>
                    ))}
                  </>
                ) : (
                  'Not yet cited by a lesson; kept for reference.'
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
