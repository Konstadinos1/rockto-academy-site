import { Fragment } from 'react';
import { Link } from 'react-router';
import { GLOSSARY_BY_ID, LESSON_BY_ID } from '../content/index';
import type { Block, FlowZone, TraceFlag } from '../content/types';
import { tokenizeInline } from '../lib/inline';

/** Lower-cases a glossary term's first letter for use mid-sentence, unless it is a proper name. */
function inlineTermName(term: string): string {
  const head = term.split(' (')[0] ?? term;
  const words = head.split(' ');
  if (words.slice(1).some((w) => /^[A-Z]/.test(w)) || /^[A-Z]{2}/.test(term)) return term;
  return term.charAt(0).toLowerCase() + term.slice(1);
}

export function Inline({ text }: { text: string }) {
  return (
    <>
      {tokenizeInline(text).map((t, i) => {
        switch (t.type) {
          case 'text':
            return <Fragment key={i}>{t.value}</Fragment>;
          // Emphasis can wrap glossary or lesson links, so its contents are tokenized again.
          case 'strong':
            return (
              <strong key={i}>
                <Inline text={t.value} />
              </strong>
            );
          case 'em':
            return (
              <em key={i}>
                <Inline text={t.value} />
              </em>
            );
          case 'code':
            return <code key={i}>{t.value}</code>;
          case 'lesson': {
            const lesson = LESSON_BY_ID.get(t.id);
            return (
              <Link key={i} className="lesson-link" to={`/lesson/${t.id}`}>
                {t.label ?? (lesson ? `${t.id} ${lesson.title}` : t.id)}
              </Link>
            );
          }
          case 'term': {
            const term = GLOSSARY_BY_ID.get(t.id);
            return (
              <Link key={i} className="term-link" to={`/glossary?term=${t.id}`} title={term?.term}>
                {t.label ?? (term ? inlineTermName(term.term) : t.id)}
              </Link>
            );
          }
        }
      })}
    </>
  );
}

const FLAG_LABEL: Record<TraceFlag, string> = {
  ok: 'allowed',
  info: 'info',
  warn: 'attention',
  violation: 'violation',
  blocked: 'blocked',
};

const ZONE_LABEL: Record<FlowZone, string> = {
  trusted: 'Trusted code',
  untrusted: 'Untrusted input',
  boundary: 'Enforcement point',
  external: 'External system',
  model: 'Model output',
};

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'p':
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
    case 'h':
      return <h3>{block.text}</h3>;
    case 'ul':
    case 'ol': {
      const List = block.t;
      return (
        <List>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </List>
      );
    }
    case 'callout':
      return (
        <div className={`callout ${block.tone}`} role="note">
          <p>
            <Inline text={block.text} />
          </p>
        </div>
      );
    case 'table':
      return (
        <figure className="block">
          <figcaption className="block-caption">{block.caption}</figcaption>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {block.head.map((h, i) => (
                    <th key={i} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) =>
                      c === 0 ? (
                        <th key={c} scope="row" style={{ background: 'transparent', fontSize: 'inherit', color: 'var(--text)' }}>
                          <Inline text={cell} />
                        </th>
                      ) : (
                        <td key={c}>
                          <Inline text={cell} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case 'code':
      return (
        <figure className="block">
          <figcaption className="block-caption">
            {block.caption} <span className="muted">· {block.lang}</span>
          </figcaption>
          <div className="codeblock">
            <pre tabIndex={0} aria-label={`${block.caption} (${block.lang})`}>
              <code>{block.code}</code>
            </pre>
            {block.notes && (
              <ol aria-label="Annotations">
                {block.notes.map((n, i) => (
                  <li key={i}>
                    <Inline text={n} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </figure>
      );
    case 'trace':
      return (
        <figure className="block">
          <figcaption className="block-caption">{block.caption}</figcaption>
          <ol className="trace" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {block.lines.map((l, i) => (
              <li key={i} className="trace-line" data-flag={l.flag ?? 'info'}>
                <span className="trace-meta">{l.at ?? `#${i + 1}`}</span>
                <span className="trace-actor">
                  {l.actor} · {l.event}
                </span>
                <span>
                  {l.flag && l.flag !== 'info' && <span className={`flag-text ${l.flag}`}>{FLAG_LABEL[l.flag]}</span>}
                  <Inline text={l.detail} />
                </span>
              </li>
            ))}
          </ol>
        </figure>
      );
    case 'flow':
      return (
        <figure className="block">
          <figcaption className="block-caption">{block.caption}</figcaption>
          <ol className="flow" aria-label={`${block.caption}: ${block.steps.length} steps`}>
            {block.steps.map((s, i) => (
              <li key={i} className="flow-step">
                <div className="flow-node" style={{ ['--zone' as string]: `var(--zone-${s.zone})` }}>
                  <span className="flow-zone">{ZONE_LABEL[s.zone]}</span>
                  <strong>{s.label}</strong>
                  {s.note && (
                    <span>
                      <Inline text={s.note} />
                    </span>
                  )}
                </div>
                {i < block.steps.length - 1 && (
                  <span className="flow-arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </figure>
      );
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}
