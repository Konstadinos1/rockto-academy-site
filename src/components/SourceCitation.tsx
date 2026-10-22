import type { Source } from '../content/types';
import { formatDate } from '../lib/dates';

const KIND_LABEL: Record<Source['kind'], string> = {
  framework: 'Framework',
  guidance: 'Guidance',
  specification: 'Specification',
  standard: 'Standard',
  'government-report': 'Government report',
  research: 'Research (preprint record)',
  documentation: 'Documentation',
  legislation: 'Legislation',
};

export function SourceCitation({ source, compact = false }: { source: Source; compact?: boolean }) {
  return (
    <div className="card flat" style={{ padding: '0.85rem 1rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
          {source.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span className="chip">{KIND_LABEL[source.kind]}</span>
      </div>
      <p className="muted" style={{ margin: '0.3rem 0 0', fontSize: '0.85rem' }}>
        {source.publisher} · {source.version} · published {source.published} · link checked {formatDate(source.accessed)}{' '}
        {source.linkCheck === 'resolved' ? '(resolved)' : '(automated check blocked; not confirmed)'}
      </p>
      {!compact && <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem' }}>{source.note}</p>}
    </div>
  );
}
